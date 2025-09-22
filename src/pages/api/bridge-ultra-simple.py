#!/usr/bin/env python3
"""
Ultra Simple ROS2 to WebSocket Bridge
No threading, pure asyncio approach
"""

import asyncio
import json
import base64
import websockets
import rclpy
from rclpy.node import Node
from rclpy.executors import SingleThreadedExecutor
from sensor_msgs.msg import JointState, Image
from std_msgs.msg import Float64MultiArray
import signal
import sys
import threading

# Global variables
websocket_clients = set()
latest_data = {}
ros_executor = None
bridge_node = None

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
        # Schedule broadcast for next event loop iteration
        if websocket_clients:
            for client in list(websocket_clients):
                try:
                    asyncio.create_task(client.send(json.dumps(data)))
                except:
                    pass
    
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
        if websocket_clients:
            for client in list(websocket_clients):
                try:
                    asyncio.create_task(client.send(json.dumps(data)))
                except:
                    pass
    
    def image_callback(self, msg, role, topic_name):
        try:
            img_base64 = base64.b64encode(bytes(msg.data)).decode('utf-8')
            data = {
                'topic': topic_name,
                'role': role,
                'received_at': self.get_clock().now().nanoseconds,
                'normalized': {
                    'width': msg.width,
                    'height': msg.height,
                    'encoding': msg.encoding,
                    'data': img_base64
                }
            }
            latest_data[role] = data
            print(f"📸 Camera {role}: {msg.width}x{msg.height}")
            
            if websocket_clients:
                for client in list(websocket_clients):
                    try:
                        asyncio.create_task(client.send(json.dumps(data)))
                    except:
                        pass
        except Exception as e:
            print(f"❌ Image error: {e}")

async def handle_client(websocket):
    global websocket_clients
    
    websocket_clients.add(websocket)
    print(f"✅ Client connected. Total: {len(websocket_clients)}")
    
    # Send latest data
    for role, data in latest_data.items():
        try:
            await websocket.send(json.dumps(data))
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
    
    try:
        async with websockets.serve(handle_client, "0.0.0.0", port):
            print(f"🌐 WebSocket server running on ws://0.0.0.0:{port}")
            await asyncio.Future()  # Run forever
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
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
