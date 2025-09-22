#!/usr/bin/env python3
"""
Simple ROS2 to WebSocket Bridge - Fixed Version
"""

import asyncio
import json
import base64
import websockets
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import JointState, Image
from std_msgs.msg import Float64MultiArray
import threading
import signal
import sys

# Global variables for the bridge
bridge_node = None
websocket_clients = set()
latest_data = {}

class ROS2Bridge(Node):
    def __init__(self):
        super().__init__('ros2_websocket_bridge')
        
        # Load config
        with open('config.json', 'r') as f:
            self.config = json.load(f)
        
        # Create subscriptions
        self.create_subscriptions()
    
    def create_subscriptions(self):
        """Create ROS2 subscriptions based on config"""
        for topic_config in self.config['topics']:
            topic_name = topic_config['name']
            topic_type = topic_config['type']
            role = topic_config['role']
            
            self.get_logger().info(f"Subscribing to {topic_name} ({topic_type}) with role {role}")
            
            if topic_type == "sensor_msgs/msg/JointState":
                self.create_subscription(
                    JointState,
                    topic_name,
                    lambda msg, r=role, tn=topic_name: self.joint_state_callback(msg, r, tn),
                    10
                )
            elif topic_type == "std_msgs/msg/Float64MultiArray":
                self.create_subscription(
                    Float64MultiArray,
                    topic_name,
                    lambda msg, r=role, tn=topic_name: self.float_array_callback(msg, r, tn),
                    10
                )
            elif topic_type == "sensor_msgs/msg/Image":
                self.create_subscription(
                    Image,
                    topic_name,
                    lambda msg, r=role, tn=topic_name: self.image_callback(msg, r, tn),
                    10
                )
    
    def joint_state_callback(self, msg, role, topic_name):
        """Handle JointState messages"""
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
        broadcast_to_clients(data)
    
    def float_array_callback(self, msg, role, topic_name):
        """Handle Float64MultiArray messages"""
        data = {
            'topic': topic_name,
            'role': role,
            'received_at': self.get_clock().now().nanoseconds,
            'normalized': {
                'data': list(msg.data) if msg.data else []
            }
        }
        latest_data[role] = data
        broadcast_to_clients(data)
    
    def image_callback(self, msg, role, topic_name):
        """Handle Image messages"""
        try:
            # Simple base64 encoding without cv_bridge
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
            self.get_logger().info(f"Camera {role} received: {msg.width}x{msg.height}")
            broadcast_to_clients(data)
            
        except Exception as e:
            self.get_logger().error(f"Error processing image: {e}")

def broadcast_to_clients(data):
    """Broadcast data to all WebSocket clients"""
    if websocket_clients:
        message = json.dumps(data)
        # Use thread-safe method to send to all clients
        disconnected = []
        for client in list(websocket_clients):
            try:
                # Send message asynchronously
                asyncio.run_coroutine_threadsafe(client.send(message), websocket_loop)
            except Exception as e:
                print(f"Error sending to client: {e}")
                disconnected.append(client)
        
        # Remove disconnected clients
        for client in disconnected:
            websocket_clients.discard(client)

async def handle_websocket_client(websocket, path):
    """Handle WebSocket client connections"""
    global websocket_clients
    
    websocket_clients.add(websocket)
    print(f"✅ Client connected. Total clients: {len(websocket_clients)}")
    
    # Send latest data to new client
    for role, data in latest_data.items():
        try:
            await websocket.send(json.dumps(data))
        except:
            pass
    
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                print(f"📨 Received from client: {data}")
            except json.JSONDecodeError:
                pass
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        websocket_clients.discard(websocket)
        print(f"❌ Client disconnected. Total clients: {len(websocket_clients)}")

def start_websocket_server():
    """Start WebSocket server in separate thread"""
    global websocket_loop
    
    # Create new event loop for this thread
    websocket_loop = asyncio.new_event_loop()
    asyncio.set_event_loop(websocket_loop)
    
    # Load port from config
    with open('config.json', 'r') as f:
        config = json.load(f)
    port = config.get('websocket', {}).get('port', 8080)
    
    # Start WebSocket server
    start_server = websockets.serve(handle_websocket_client, "0.0.0.0", port)
    print(f"✅ WebSocket server listening on ws://0.0.0.0:{port}")
    
    websocket_loop.run_until_complete(start_server)
    websocket_loop.run_forever()

def signal_handler(sig, frame):
    print("\n🛑 Shutting down...")
    rclpy.shutdown()
    sys.exit(0)

def main():
    global bridge_node
    
    # Handle Ctrl+C gracefully
    signal.signal(signal.SIGINT, signal_handler)
    
    print("🚀 Starting ROS2 WebSocket Bridge...")
    
    try:
        # Initialize ROS2
        rclpy.init()
        bridge_node = ROS2Bridge()
        
        # Start WebSocket server in separate thread
        websocket_thread = threading.Thread(target=start_websocket_server, daemon=True)
        websocket_thread.start()
        
        print("✅ Bridge initialized, spinning...")
        rclpy.spin(bridge_node)
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        rclpy.shutdown()

if __name__ == '__main__':
    main()
