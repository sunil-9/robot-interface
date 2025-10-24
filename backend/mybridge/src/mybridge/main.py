#!/usr/bin/env python3
"""
Robot Teaching Interface Backend
FastAPI application with WebSocket bridge for ROS2
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .models import AppState
from .ros_bridge import ROSBridge
from .routers import episodes
from .routers import webrtc as webrtc_router
from .routers import websocket

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global app state
app_state = AppState()
ros_bridge = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    global ros_bridge
    
    logger.info("🚀 Starting Robot Teaching Interface Backend...")
    
    # Store app_state in app.state for router access
    app.state.app_state = app_state
    
    # Initialize ROS2 bridge
    try:
        ros_bridge = ROSBridge(app_state)
        await ros_bridge.initialize()
        logger.info("✅ ROS2 bridge initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize ROS2 bridge: {e}")
        raise
    
    # Start background tasks
    broadcast_task = asyncio.create_task(ros_bridge.start_broadcasting())
    
    yield
    
    # Cleanup
    logger.info("🛑 Shutting down...")
    broadcast_task.cancel()
    if ros_bridge:
        await ros_bridge.cleanup()
    logger.info("✅ Shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="Robot Teaching Interface Backend",
    description="WebSocket bridge for ROS2 with episode management APIs",
    version="0.1.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(episodes.router, prefix="/api/episodes", tags=["episodes"])
app.include_router(websocket.router, tags=["websocket"])
app.include_router(webrtc_router.router, prefix="/api/webrtc", tags=["webrtc"])


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Robot Teaching Interface Backend",
        "version": "0.1.0",
        "status": "running",
        "ros_connected": ros_bridge.is_connected if ros_bridge else False
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "ros2_bridge": "connected" if ros_bridge and ros_bridge.is_connected else "disconnected",
        "websocket_clients": len(app_state.websocket_clients),
        "latest_data_keys": list(app_state.latest_data.keys()) if app_state.latest_data else []
    }


def main():
    """Entry point for the application"""
    import uvicorn
    
    uvicorn.run(
        "mybridge.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )


if __name__ == "__main__":
    main()