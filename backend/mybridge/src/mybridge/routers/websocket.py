"""
WebSocket router
Handles WebSocket connections for real-time data streaming
"""

import json
import logging
from typing import Any, Dict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..models import AppState

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time data streaming
    
    Clients connect to this endpoint to receive real-time robot data
    """
    await websocket.accept()
    
    # Get app state (we'll need to access this through the app)
    app_state: AppState = getattr(websocket.app.state, 'app_state', None)
    
    if not app_state:
        # Fallback to global app_state
        try:
            from ..main import app_state
        except ImportError:
            logger.error("❌ Cannot access app_state")
            await websocket.close(code=1011, reason="Internal server error")
            return
    
    # Add client to the set
    app_state.websocket_clients.add(websocket)
    client_id = id(websocket)
    
    logger.info(f"✅ WebSocket client {client_id} connected. Total: {len(app_state.websocket_clients)}")
    
    try:
        # Send initial data if available
        for role, data in app_state.latest_data.items():
            try:
                await websocket.send_text(json.dumps(data.dict()))
                logger.debug(f"📤 Sent initial {role} data to client {client_id}")
            except Exception as e:
                logger.warning(f"⚠️ Error sending initial data to client {client_id}: {e}")
        
        # Keep connection alive and handle incoming messages
        while True:
            try:
                # Wait for messages from client
                message = await websocket.receive_text()
                
                try:
                    data = json.loads(message)
                    logger.debug(f"📨 Received from client {client_id}: {data}")
                    
                    # Handle client commands
                    await handle_client_message(websocket, data, app_state)
                    
                except json.JSONDecodeError:
                    logger.warning(f"⚠️ Invalid JSON from client {client_id}: {message}")
                    await websocket.send_text(json.dumps({
                        "error": "Invalid JSON format"
                    }))
                
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.warning(f"⚠️ Error handling message from client {client_id}: {e}")
                break
    
    except WebSocketDisconnect:
        logger.info(f"🔌 Client {client_id} disconnected normally")
    except Exception as e:
        logger.error(f"❌ WebSocket error for client {client_id}: {e}")
    finally:
        # Remove client from the set
        app_state.websocket_clients.discard(websocket)
        logger.info(f"❌ Removed client {client_id}. Total: {len(app_state.websocket_clients)}")


async def handle_client_message(websocket: WebSocket, data: Dict[str, Any], app_state: AppState):
    """
    Handle incoming messages from WebSocket clients
    
    Args:
        websocket: WebSocket connection
        data: Parsed JSON data from client
        app_state: Application state
    """
    client_id = id(websocket)
    message_type = data.get('type', '')
    
    logger.debug(f"🔄 Handling message type '{message_type}' from client {client_id}")
    
    try:
        if message_type == 'ping':
            # Handle ping/pong for keepalive
            await websocket.send_text(json.dumps({
                "type": "pong",
                "timestamp": data.get('timestamp')
            }))
            
        elif message_type == 'get_current_episode':
            # Send current episode info
            current_episode = app_state.get_current_episode()
            await websocket.send_text(json.dumps({
                "type": "current_episode",
                "episode": current_episode.dict() if current_episode else None
            }))
            
        elif message_type == 'get_latest_data':
            # Send all latest data
            latest_data = {
                role: data.dict() for role, data in app_state.latest_data.items()
            }
            await websocket.send_text(json.dumps({
                "type": "latest_data",
                "data": latest_data
            }))
            
        elif message_type == 'subscribe':
            # Handle topic subscription
            topics = data.get('topics', [])
            # TODO: Implement selective topic subscription
            logger.info(f"📡 Client {client_id} subscribed to topics: {topics}")
            
        elif message_type == 'unsubscribe':
            # Handle topic unsubscription
            topics = data.get('topics', [])
            # TODO: Implement selective topic unsubscription
            logger.info(f"📡 Client {client_id} unsubscribed from topics: {topics}")
            
        else:
            # Unknown message type
            await websocket.send_text(json.dumps({
                "error": f"Unknown message type: {message_type}"
            }))
            
    except Exception as e:
        logger.error(f"❌ Error handling client message: {e}")
        await websocket.send_text(json.dumps({
            "error": "Internal server error"
        }))