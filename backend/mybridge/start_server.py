#!/usr/bin/env python3
"""
Startup script for Robot Teaching Interface Backend
This script sets up the ROS2 environment and starts the FastAPI server
"""

import os
import subprocess
import sys
from pathlib import Path


def check_ros2_environment():
    """Check if ROS2 environment is properly set up"""
    required_vars = ['ROS_DISTRO', 'ROS_VERSION']
    missing_vars = []
    
    for var in required_vars:
        if var not in os.environ:
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing ROS2 environment variables: {missing_vars}")
        print("Please source your ROS2 setup script first:")
        print("  source /opt/ros/<your-ros-distro>/setup.bash")
        return False
    
    print(f"✅ ROS2 environment detected: {os.environ.get('ROS_DISTRO')}")
    return True

def check_conda_environment():
    """Check if conda environment is activated"""
    conda_env = os.environ.get('CONDA_DEFAULT_ENV')
    if conda_env:
        print(f"✅ Conda environment: {conda_env}")
        return True
    else:
        print("⚠️ No conda environment detected")
        return False

def main():
    """Main startup function"""
    print("🚀 Starting Robot Teaching Interface Backend...")
    
    # Check ROS2 environment
    if not check_ros2_environment():
        print("\n📋 Setup Instructions:")
        print("1. Source your ROS2 environment:")
        print("   source /opt/ros/humble/setup.bash  # or your ROS2 distro")
        print("2. Activate your conda environment:")
        print("   conda activate lerobot  # or your environment name")
        print("3. Run this script again")
        sys.exit(1)
    
    # Check conda environment
    check_conda_environment()
    
    # Start the FastAPI server
    try:
        print("🌐 Starting FastAPI server...")
        
        # Use uv to run the application in the virtual environment
        cmd = ["uv", "run", "uvicorn", "mybridge.main:app", "--host", "0.0.0.0", "--port", "8080", "--reload"]
        
        print(f"🔧 Running command: {' '.join(cmd)}")
        subprocess.run(cmd, check=True)
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to start server: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down server...")
        sys.exit(0)

if __name__ == "__main__":
    main()