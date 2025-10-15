"""
Configuration settings for the Robot Teaching Interface Backend
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # Server configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8080
    DEBUG: bool = False
    
    # ROS2 configuration
    ROS2_DOMAIN_ID: int = 0
    
    # WebSocket configuration
    WEBSOCKET_BROADCAST_INTERVAL: float = 0.5  # seconds
    MAX_BUFFER_SIZE: int = 1000
    
    # Paths
    CONFIG_FILE: str = "config.json"
    
    class Config:
        env_file = ".env"


# Global settings instance
settings = Settings()


def load_ros_config(config_path: str = None) -> Dict[str, Any]:
    """Load ROS2 topics configuration from JSON file"""
    
    if config_path is None:
        config_path = settings.CONFIG_FILE
    
    # Try multiple possible locations
    possible_paths = [
        config_path,
        Path(__file__).parent.parent.parent.parent / "config.json",  # backend/config.json
        Path(__file__).parent / "config.json",  # same directory
        "config.json"  # current working directory
    ]
    
    for path in possible_paths:
        try:
            with open(path, 'r') as f:
                config = json.load(f)
                print(f"✅ Loaded config from: {path}")
                return config
        except FileNotFoundError:
            continue
        except json.JSONDecodeError as e:
            print(f"❌ Error parsing config file {path}: {e}")
            continue
    
    # Return default config if no file found
    print("⚠️ No config file found, using default configuration")
    return get_default_config()


def get_default_config() -> Dict[str, Any]:
    """Get default ROS2 configuration"""
    return {
        "websocket": {
            "port": 8080
        },
        "topics": [
            {
                "name": "/joint_states_for_collection",
                "type": "sensor_msgs/msg/JointState",
                "role": "state"
            },
            {
                "name": "/joint_command_for_collection",
                "type": "sensor_msgs/msg/JointState",
                "role": "command"
            },
            {
                "name": "/head_camera/image_raw",
                "type": "sensor_msgs/msg/Image",
                "role": "camera_head"
            },
            {
                "name": "/left_hand_camera/image_raw",
                "type": "sensor_msgs/msg/Image",
                "role": "camera_left"
            },
            {
                "name": "/right_hand_camera/image_raw",
                "type": "sensor_msgs/msg/Image",
                "role": "camera_right"
            },
            {
                "name": "/head_camera/attention_mask",
                "type": "sensor_msgs/msg/Image",
                "role": "mask_head"
            },
            {
                "name": "/left_hand_camera/attention_mask",
                "type": "sensor_msgs/msg/Image",
                "role": "mask_left"
            },
            {
                "name": "/right_hand_camera/attention_mask",
                "type": "sensor_msgs/msg/Image",
                "role": "mask_right"
            },
            {
                "name": "/action_variance_windows",
                "type": "std_msgs/msg/Float64MultiArray",
                "role": "action_variance"
            }
        ],
        "maxBuffer": 1000
    }