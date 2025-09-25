#!/usr/bin/env python3
"""
WebSocket Bridge for ROS2
- Uses asyncio and websockets for handling multiple clients efficiently
- Subscribes to ROS2 topics and broadcasts latest data to connected clients
- Optimized image handling with compression to reduce bandwidth
- Configurable via config.json for topics and WebSocket port
- Improved logging and error handling
"""

import asyncio
import base64
import json
import math
import signal
import sys
import threading

import rclpy
import websockets
from rclpy.executors import SingleThreadedExecutor
from rclpy.node import Node
from sensor_msgs.msg import Image, JointState
from std_msgs.msg import Float64MultiArray

# Global variables
websocket_clients = set()
latest_data = {}
ros_executor = None
bridge_node = None

class NaNSafeJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder that converts NaN and Infinity to null"""
    def encode(self, obj):
        if isinstance(obj, float):
            if math.isnan(obj) or math.isinf(obj):
                return 'null'
        return super().encode(obj)
    
    def iterencode(self, obj, _one_shot=False):
        """Encode the given object and return an iterator of string chunks."""
        if isinstance(obj, dict):
            obj = {k: (None if isinstance(v, float) and (math.isnan(v) or math.isinf(v)) else v) 
                   for k, v in obj.items()}
        elif isinstance(obj, list):
            obj = [None if isinstance(item, float) and (math.isnan(item) or math.isinf(item)) else item 
                   for item in obj]
        return super().iterencode(obj, _one_shot)

class SimpleBridge(Node):
    def __init__(self):
        super().__init__('simple_bridge')
        
        # Load config
        with open('config.json', 'r') as f:
            self.config = json.load(f)
        
        # Create subscriptions
        for topic_config in self.config['topics']:
            topic_name = topic_config['name']
            topic_type = topic_config['type']
            role = topic_config['role']
            
            print(f"📡 Subscribing to {topic_name} with role {role}")
            
            if topic_type == "sensor_msgs/msg/JointState":
                self.create_subscription(
                    JointState,
                    topic_name,
                    lambda msg, r=role, tn=topic_name: self.joint_callback(msg, r, tn),
                    10
                )
            elif topic_type == "std_msgs/msg/Float64MultiArray":
                self.create_subscription(
                    Float64MultiArray,
                    topic_name,
                    lambda msg, r=role, tn=topic_name: self.array_callback(msg, r, tn),
                    10
                )
            elif topic_type == "sensor_msgs/msg/Image":
                self.create_subscription(
                    Image,
                    topic_name,
                    lambda msg, r=role, tn=topic_name: self.image_callback(msg, r, tn),
                    10
                )
    
    def joint_callback(self, msg, role, topic_name):
        data = {
            'topic': topic_name,
            'role': role,
            'received_at': self.get_clock().now().nanoseconds,
            'normalized': {
                'names': list(msg.name) if msg.name else [],
                'positions': list(msg.position) if msg.position else [],
                'velocities': list(msg.velocity) if msg.velocity else [],
                'efforts': list(msg.effort) if msg.effort else []
            }
        }
        latest_data[role] = data
        print(f"📊 Joint {role} data updated")
        # Note: We'll let WebSocket clients poll for latest data instead of pushing
    
    def array_callback(self, msg, role, topic_name):
        data = {
            'topic': topic_name,
            'role': role,
            'received_at': self.get_clock().now().nanoseconds,
            'normalized': {
                'data': list(msg.data) if msg.data else []
            }
        }
        latest_data[role] = data
        print(f"📊 Array {role} data updated")
    def image_callback(self, msg, role, topic_name):
        try:
            import cv2
            import numpy as np
            
            print(f"🔍 {role}: encoding={msg.encoding}, size={len(msg.data)}, dims={msg.height}x{msg.width}, step={msg.step}")
            
            # Convert to numpy array
            if msg.encoding in ['bgr8', 'rgb8']:
                expected_size = msg.height * msg.width * 3
                if len(msg.data) != expected_size:
                    print(f"❌ {role}: Size mismatch. Expected {expected_size}, got {len(msg.data)}")
                    return
                img_array = np.frombuffer(msg.data, dtype=np.uint8).reshape((msg.height, msg.width, 3))
                if msg.encoding == 'rgb8':
                    img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
            elif msg.encoding == 'mono8':
                expected_size = msg.height * msg.width
                if len(msg.data) != expected_size:
                    print(f"❌ {role}: Size mismatch. Expected {expected_size}, got {len(msg.data)}")
                    # Try to handle as if it's actually RGB data mislabeled as mono8
                    if len(msg.data) == msg.height * msg.width * 3:
                        print(f"🔧 {role}: Treating as RGB data despite mono8 encoding")
                        img_array = np.frombuffer(msg.data, dtype=np.uint8).reshape((msg.height, msg.width, 3))
                        img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
                    else:
                        return
                else:
                    img_array = np.frombuffer(msg.data, dtype=np.uint8).reshape((msg.height, msg.width))
            else:
                # Try to auto-detect channels based on data size
                total_pixels = msg.height * msg.width
                if len(msg.data) == total_pixels:
                    # Single channel
                    img_array = np.frombuffer(msg.data, dtype=np.uint8).reshape((msg.height, msg.width))
                elif len(msg.data) == total_pixels * 3:
                    # 3 channels
                    img_array = np.frombuffer(msg.data, dtype=np.uint8).reshape((msg.height, msg.width, 3))
                else:
                    print(f"❌ {role}: Unknown encoding {msg.encoding} with size {len(msg.data)}")
                    return            # Resize for web display
            small_img = cv2.resize(img_array, (320, 240), interpolation=cv2.INTER_NEAREST)

            # Compress: JPEG for RGB, PNG for mask
            if role.startswith('mask'):
                # Masks: single channel -> PNG lossless
                _, buffer = cv2.imencode('.png', small_img)
                encoding = 'png'
            else:
                # RGB: JPEG lossy
                encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 60]
                _, buffer = cv2.imencode('.jpg', small_img, encode_param)
                encoding = 'jpeg'

            img_base64 = base64.b64encode(buffer).decode('utf-8')

            data = {
                'topic': topic_name,
                'role': role,
                'received_at': self.get_clock().now().nanoseconds,
                'normalized': {
                    'width': 320,
                    'height': 240,
                    'encoding': encoding,
                    'data': img_base64
                }
            }
            latest_data[role] = data
            print(f"📸 {role}: 320x240 ({encoding}, base64 len: {len(img_base64)})")

        except Exception as e:
            print(f"❌ Image error ({role}): {e}")
    


async def broadcast_latest_data():
    """Periodically broadcast latest data to all clients"""
    while True:
        if websocket_clients and latest_data:
            print(f"📤 Broadcasting to {len(websocket_clients)} clients, {len(latest_data)} data items")
            disconnected = []
            for client in list(websocket_clients):
                try:
                    # Send all latest data
                    for role, data in latest_data.items():
                        message = json.dumps(data, cls=NaNSafeJSONEncoder)
                        await client.send(message)
                        print(f"📤 Sent {role} data (size: {len(message)} chars)")
                except websockets.exceptions.ConnectionClosed:
                    disconnected.append(client)
                    print(f"❌ Client connection closed")
                except Exception as e:
                    print(f"❌ Error sending to client: {e}")
                    disconnected.append(client)
            
            # Remove disconnected clients
            for client in disconnected:
                websocket_clients.discard(client)
                print(f"❌ Removed disconnected client. Total: {len(websocket_clients)}")
        
        await asyncio.sleep(0.5)  # Slower broadcast at 2Hz instead of 10Hz

async def handle_client(websocket):
    global websocket_clients
    
    websocket_clients.add(websocket)
    print(f"✅ Client connected. Total: {len(websocket_clients)}")
    
    # Send latest data
    for role, data in latest_data.items():
        try:
            await websocket.send(json.dumps(data, cls=NaNSafeJSONEncoder))
        except:
            pass
    
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                print(f"📨 Client message: {data}")
            except:
                pass
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        websocket_clients.discard(websocket)
        print(f"❌ Client disconnected. Total: {len(websocket_clients)}")

def ros_spin_thread():
    """Run ROS2 in separate thread"""
    global ros_executor, bridge_node
    
    rclpy.init()
    bridge_node = SimpleBridge()
    ros_executor = SingleThreadedExecutor()
    ros_executor.add_node(bridge_node)
    
    print("✅ ROS2 node spinning...")
    ros_executor.spin()

async def main():
    # Load config
    with open('config.json', 'r') as f:
        config = json.load(f)
    port = config.get('websocket', {}).get('port', 8080)
    
    print("🚀 Starting Simple ROS2 WebSocket Bridge...")
    
    # Start ROS2 in separate thread
    ros_thread = threading.Thread(target=ros_spin_thread, daemon=True)
    ros_thread.start()
    
    # Wait a bit for ROS2 to initialize
    await asyncio.sleep(1)
    
    # Start WebSocket server
    print(f"✅ WebSocket server starting on ws://0.0.0.0:{port}")
    
    # Start the broadcast task
    broadcast_task = asyncio.create_task(broadcast_latest_data())
    
    try:
        async with websockets.serve(handle_client, "0.0.0.0", port):
            print(f"🌐 WebSocket server running on ws://0.0.0.0:{port}")
            await asyncio.Future()  # Run forever
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
        broadcast_task.cancel()
    finally:
        if ros_executor:
            ros_executor.shutdown()
        rclpy.shutdown()

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
        if ros_executor:
            ros_executor.shutdown()
        rclpy.shutdown()
        sys.exit(0)
