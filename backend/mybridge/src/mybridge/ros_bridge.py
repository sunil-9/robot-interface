"""
ROS2 Bridge for WebSocket communication
"""

import asyncio
import base64
import json
import logging
import math
import threading
from typing import Any, Dict, Optional

import cv2
import numpy as np
import rclpy
from rclpy.executors import SingleThreadedExecutor
from rclpy.node import Node
from sensor_msgs.msg import Image, JointState
from std_msgs.msg import Float64MultiArray

from .config import load_ros_config
from .models import AppState, RobotData

logger = logging.getLogger(__name__)


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


class ROSBridgeNode(Node):
    """ROS2 node for subscribing to topics"""
    
    def __init__(self, app_state: AppState, config: Dict[str, Any]):
        super().__init__('robot_teaching_bridge')
        self.app_state = app_state
        self.config = config
        
        logger.info("🔧 Setting up ROS2 subscriptions...")
        
        # Create subscriptions based on config
        for topic_config in self.config.get('topics', []):
            self._create_subscription(topic_config)
    
    def _create_subscription(self, topic_config: Dict[str, Any]):
        """Create a subscription for a topic"""
        topic_name = topic_config['name']
        topic_type = topic_config['type']
        role = topic_config['role']
        
        logger.info(f"📡 Subscribing to {topic_name} with role {role}")
        
        if topic_type == "sensor_msgs/msg/JointState":
            self.create_subscription(
                JointState,
                topic_name,
                lambda msg, r=role, tn=topic_name: self._joint_callback(msg, r, tn),
                10
            )
        elif topic_type == "std_msgs/msg/Float64MultiArray":
            self.create_subscription(
                Float64MultiArray,
                topic_name,
                lambda msg, r=role, tn=topic_name: self._array_callback(msg, r, tn),
                10
            )
        elif topic_type == "sensor_msgs/msg/Image":
            self.create_subscription(
                Image,
                topic_name,
                lambda msg, r=role, tn=topic_name: self._image_callback(msg, r, tn),
                10
            )
    
    def _joint_callback(self, msg: JointState, role: str, topic_name: str):
        """Handle joint state messages"""
        data = RobotData(
            topic=topic_name,
            role=role,
            received_at=self.get_clock().now().nanoseconds,
            normalized={
                'names': list(msg.name) if msg.name else [],
                'positions': list(msg.position) if msg.position else [],
                'velocities': list(msg.velocity) if msg.velocity else [],
                'efforts': list(msg.effort) if msg.effort else []
            }
        )
        
        self.app_state.latest_data[role] = data
        self.app_state.add_data_to_buffer(data)
        logger.debug(f"📊 Joint {role} data updated")
    
    def _array_callback(self, msg: Float64MultiArray, role: str, topic_name: str):
        """Handle float array messages"""
        data = RobotData(
            topic=topic_name,
            role=role,
            received_at=self.get_clock().now().nanoseconds,
            normalized={
                'data': list(msg.data) if msg.data else []
            }
        )
        
        self.app_state.latest_data[role] = data
        self.app_state.add_data_to_buffer(data)
        logger.debug(f"📊 Array {role} data updated")
    
    def _image_callback(self, msg: Image, role: str, topic_name: str):
        """Handle image messages"""
        try:
            logger.debug(f"🔍 {role}: encoding={msg.encoding}, size={len(msg.data)}, dims={msg.height}x{msg.width}")
            
            # Convert to numpy array
            img_array = self._convert_ros_image(msg)
            if img_array is None:
                return
            
            # Resize and compress for web display
            small_img = cv2.resize(img_array, (320, 240), interpolation=cv2.INTER_NEAREST)
            
            # Compress based on role
            if role.startswith('mask'):
                _, buffer = cv2.imencode('.png', small_img)
                encoding = 'png'
            else:
                encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 60]
                _, buffer = cv2.imencode('.jpg', small_img, encode_param)
                encoding = 'jpeg'
            
            img_base64 = base64.b64encode(buffer).decode('utf-8')
            
            data = RobotData(
                topic=topic_name,
                role=role,
                received_at=self.get_clock().now().nanoseconds,
                normalized={
                    'width': 320,
                    'height': 240,
                    'encoding': encoding,
                    'data': img_base64
                }
            )
            
            self.app_state.latest_data[role] = data
            self.app_state.add_data_to_buffer(data)
            logger.debug(f"📸 {role}: 320x240 ({encoding})")
            
        except Exception as e:
            logger.error(f"❌ Image processing error ({role}): {e}")
    
    def _convert_ros_image(self, msg: Image) -> Optional[np.ndarray]:
        """Convert ROS Image message to numpy array"""
        try:
            if msg.encoding in ['bgr8', 'rgb8']:
                expected_size = msg.height * msg.width * 3
                if len(msg.data) != expected_size:
                    logger.warning(f"Size mismatch. Expected {expected_size}, got {len(msg.data)}")
                    return None
                
                img_array = np.frombuffer(msg.data, dtype=np.uint8).reshape((msg.height, msg.width, 3))
                if msg.encoding == 'rgb8':
                    img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
                return img_array
                
            elif msg.encoding == 'mono8':
                expected_size = msg.height * msg.width
                if len(msg.data) != expected_size:
                    # Try to handle as RGB data mislabeled as mono8
                    if len(msg.data) == msg.height * msg.width * 3:
                        logger.info("Treating as RGB data despite mono8 encoding")
                        img_array = np.frombuffer(msg.data, dtype=np.uint8).reshape((msg.height, msg.width, 3))
                        return cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
                    return None
                
                return np.frombuffer(msg.data, dtype=np.uint8).reshape((msg.height, msg.width))
            
            else:
                # Auto-detect based on data size
                total_pixels = msg.height * msg.width
                if len(msg.data) == total_pixels:
                    return np.frombuffer(msg.data, dtype=np.uint8).reshape((msg.height, msg.width))
                elif len(msg.data) == total_pixels * 3:
                    return np.frombuffer(msg.data, dtype=np.uint8).reshape((msg.height, msg.width, 3))
                else:
                    logger.error(f"Unknown encoding {msg.encoding} with size {len(msg.data)}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error converting image: {e}")
            return None


class ROSBridge:
    """ROS2 WebSocket Bridge Manager"""
    
    def __init__(self, app_state: AppState):
        self.app_state = app_state
        self.config = load_ros_config()
        self.node: Optional[ROSBridgeNode] = None
        self.executor: Optional[SingleThreadedExecutor] = None
        self.ros_thread: Optional[threading.Thread] = None
        self.is_connected = False
        self._shutdown_event = threading.Event()
    
    async def initialize(self):
        """Initialize ROS2 bridge"""
        try:
            logger.info("🚀 Initializing ROS2 bridge...")
            
            # Start ROS2 in separate thread
            self.ros_thread = threading.Thread(target=self._ros_spin_thread, daemon=True)
            self.ros_thread.start()
            
            # Wait for initialization
            await asyncio.sleep(1)
            
            self.is_connected = True
            logger.info("✅ ROS2 bridge initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize ROS2 bridge: {e}")
            raise
    
    def _ros_spin_thread(self):
        """Run ROS2 in separate thread"""
        try:
            rclpy.init()
            self.node = ROSBridgeNode(self.app_state, self.config)
            self.executor = SingleThreadedExecutor()
            self.executor.add_node(self.node)
            
            logger.info("✅ ROS2 node spinning...")
            
            while not self._shutdown_event.is_set():
                self.executor.spin_once(timeout_sec=0.1)
                
        except Exception as e:
            logger.error(f"❌ ROS2 thread error: {e}")
        finally:
            if self.executor:
                self.executor.shutdown()
            if rclpy.ok():
                rclpy.shutdown()
    
    async def start_broadcasting(self):
        """Start broadcasting data to WebSocket clients"""
        logger.info("📡 Starting data broadcast...")
        
        while True:
            try:
                if self.app_state.websocket_clients and self.app_state.latest_data:
                    await self._broadcast_to_clients()
                
                await asyncio.sleep(0.5)  # 2Hz broadcast rate
                
            except asyncio.CancelledError:
                logger.info("📡 Broadcast task cancelled")
                break
            except Exception as e:
                logger.error(f"❌ Broadcast error: {e}")
                await asyncio.sleep(1)
    
    async def _broadcast_to_clients(self):
        """Broadcast latest data to all connected clients"""
        if not self.app_state.websocket_clients:
            return
        
        disconnected = []
        
        for client in list(self.app_state.websocket_clients):
            try:
                # Send all latest data
                for role, data in self.app_state.latest_data.items():
                    message = json.dumps(data.dict(), cls=NaNSafeJSONEncoder)
                    await client.send_text(message)
                    
            except Exception as e:
                logger.warning(f"❌ Error sending to client: {e}")
                disconnected.append(client)
        
        # Remove disconnected clients
        for client in disconnected:
            self.app_state.websocket_clients.discard(client)
            logger.info(f"❌ Removed disconnected client. Total: {len(self.app_state.websocket_clients)}")
    
    async def cleanup(self):
        """Cleanup resources"""
        logger.info("🧹 Cleaning up ROS2 bridge...")
        
        self.is_connected = False
        self._shutdown_event.set()
        
        if self.ros_thread and self.ros_thread.is_alive():
            self.ros_thread.join(timeout=5)
        
        logger.info("✅ ROS2 bridge cleanup complete")