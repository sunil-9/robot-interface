#!/usr/bin/env python3
"""
ROS2 to WebSocket Bridge - Python Version
This bridges ROS2 topics to WebSocket for the frontend
"""

import asyncio
import base64
import json
import signal
import sys
from threading import Thread

import cv2
import numpy as np
import rclpy
import websockets
from cv_bridge import CvBridge
from rclpy.node import Node
from sensor_msgs.msg import Image, JointState
from std_msgs.msg import Float64MultiArray
from trajectory_msgs.msg import JointTrajectory


class ROS2WebSocketBridge(Node):
    def __init__(self):
        super().__init__('ros2_websocket_bridge')
        
        # Load config
        with open('config.json', 'r') as f:
            self.config = json.load(f)
        
        self.bridge = CvBridge()
        self.ws_clients = set()  # Changed from clients to ws_clients
        self.latest_data = {}
        
        # Create subscriptions based on config
        self.create_subscriptions()
        
        # Start WebSocket server
        self.start_websocket_server()
    
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
            elif topic_type == "trajectory_msgs/msg/JointTrajectory":
                self.create_subscription(
                    JointTrajectory,
                    topic_name,
                    lambda msg, r=role, tn=topic_name: self.trajectory_callback(msg, r, tn),
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
        self.latest_data[role] = data
        asyncio.run_coroutine_threadsafe(self.broadcast_data(data), self.loop)
    
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
        self.latest_data[role] = data
        asyncio.run_coroutine_threadsafe(self.broadcast_data(data), self.loop)
    
    def image_callback(self, msg, role, topic_name):
        """Handle Image messages"""
        try:
            # Convert ROS image to OpenCV image
            cv_image = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')
            
            # Encode as JPEG
            _, buffer = cv2.imencode('.jpg', cv_image)
            
            # Convert to base64
            img_base64 = base64.b64encode(buffer).decode('utf-8')
            
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
            
            self.latest_data[role] = data
            self.get_logger().info(f"Camera {role} received: {msg.width}x{msg.height}")
            asyncio.run_coroutine_threadsafe(self.broadcast_data(data), self.loop)
            
        except Exception as e:
            self.get_logger().error(f"Error processing image: {e}")
    
    def trajectory_callback(self, msg, role, topic_name):
        """Handle JointTrajectory messages"""
        points = msg.points if msg.points else []
        last_positions = points[-1].positions if points else []
        
        data = {
            'topic': topic_name,
            'role': role,
            'received_at': self.get_clock().now().nanoseconds,
            'normalized': {
                'joint_names': list(msg.joint_names) if msg.joint_names else [],
                'last_point_positions': list(last_positions)
            }
        }
        self.latest_data[role] = data
        asyncio.run_coroutine_threadsafe(self.broadcast_data(data), self.loop)
    
    async def broadcast_data(self, data):
        """Broadcast data to all connected WebSocket clients"""
        if self.ws_clients:
            message = json.dumps(data)
            disconnected = set()
            
            for client in self.ws_clients:
                try:
                    await client.send(message)
                except websockets.exceptions.ConnectionClosed:
                    disconnected.add(client)
                except Exception as e:
                    print(f"Error sending to client: {e}")
                    disconnected.add(client)
            
            # Remove disconnected clients
            self.ws_clients -= disconnected
    
    async def handle_client(self, websocket, path):
        """Handle new WebSocket client connection"""
        self.ws_clients.add(websocket)
        print(f"Client connected. Total clients: {len(self.ws_clients)}")
        
        # Send latest data to new client
        for role, data in self.latest_data.items():
            try:
                await websocket.send(json.dumps(data))
            except:
                pass
        
        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    # Handle client subscriptions if needed
                    print(f"Received from client: {data}")
                except json.JSONDecodeError:
                    pass
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self.ws_clients.discard(websocket)
            print(f"Client disconnected. Total clients: {len(self.ws_clients)}")
    
    def start_websocket_server(self):
        """Start the WebSocket server"""
        port = self.config.get('websocket', {}).get('port', 8080)
        
        # Create event loop for WebSocket server
        self.loop = asyncio.new_event_loop()
        
        def run_server():
            asyncio.set_event_loop(self.loop)
            start_server = websockets.serve(self.handle_client, "0.0.0.0", port)
            print(f"✅ WebSocket server listening on ws://0.0.0.0:{port}")
            self.loop.run_until_complete(start_server)
            self.loop.run_forever()
        
        # Start server in separate thread
        server_thread = Thread(target=run_server, daemon=True)
        server_thread.start()

def signal_handler(sig, frame):
    print("\n🛑 Shutting down...")
    rclpy.shutdown()
    sys.exit(0)

def main():
    # Handle Ctrl+C gracefully
    signal.signal(signal.SIGINT, signal_handler)
    
    print("🚀 Starting ROS2 WebSocket Bridge...")
    
    try:
        rclpy.init()
        bridge_node = ROS2WebSocketBridge()
        
        print("✅ Bridge initialized, spinning...")
        rclpy.spin(bridge_node)
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        rclpy.shutdown()

if __name__ == '__main__':
    main()
