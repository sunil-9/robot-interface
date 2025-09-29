"""
Episodes API router
Handles episode management: start, end, rewind, replay
"""

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from ..models import EpisodeInfo, EpisodeResponse, EpisodeStatus

logger = logging.getLogger(__name__)

router = APIRouter()


class StartEpisodeRequest(BaseModel):
    """Request model for starting an episode"""
    name: Optional[str] = None


class ReplayEpisodeRequest(BaseModel):
    """Request model for replaying an episode"""
    episode_id: str
    speed: float = 1.0  # Playback speed multiplier


@router.post("/start", response_model=EpisodeResponse)
async def start_episode(request: Request, episode_request: StartEpisodeRequest):
    """
    Start a new episode recording
    
    Returns:
        JSON response with episode started confirmation
    """
    try:
        app_state = request.app.state.app_state if hasattr(request.app.state, 'app_state') else None
        
        if not app_state:
            # Get from main app globals (fallback)
            from ..main import app_state
        
        episode = app_state.start_episode(episode_request.name)
        
        logger.info(f"📝 Started episode: {episode.name} (ID: {episode.id})")
        
        return EpisodeResponse(
            success=True,
            message=f"Episode '{episode.name}' started successfully",
            episode=episode
        )
        
    except ValueError as e:
        logger.warning(f"⚠️ Cannot start episode: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Error starting episode: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/end", response_model=EpisodeResponse)
async def end_episode(request: Request):
    """
    End the current episode recording
    
    Returns:
        JSON response with episode ended confirmation
    """
    try:
        app_state = request.app.state.app_state if hasattr(request.app.state, 'app_state') else None
        
        if not app_state:
            # Get from main app globals (fallback)
            from ..main import app_state
        
        episode = app_state.end_episode()
        
        if not episode:
            raise HTTPException(
                status_code=400, 
                detail="No active episode to end"
            )
        
        logger.info(f"🏁 Ended episode: {episode.name} (Duration: {episode.duration:.2f}s)")
        
        return EpisodeResponse(
            success=True,
            message=f"Episode '{episode.name}' ended successfully",
            episode=episode
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error ending episode: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/rewind", response_model=EpisodeResponse)
async def rewind_episode(request: Request):
    """
    Rewind the current episode (reset to beginning)
    
    Returns:
        JSON response with rewind success confirmation
    """
    try:
        app_state = request.app.state.app_state if hasattr(request.app.state, 'app_state') else None
        
        if not app_state:
            # Get from main app globals (fallback)
            from ..main import app_state
        
        current_episode = app_state.get_current_episode()
        
        if not current_episode:
            raise HTTPException(
                status_code=400,
                detail="No active episode to rewind"
            )
        
        # Reset episode to beginning (clear buffer, reset timestamps)
        current_episode.status = EpisodeStatus.RECORDING
        current_episode.start_time = datetime.now()
        current_episode.updated_at = datetime.now()
        app_state.recording_buffer.clear()
        
        logger.info(f"⏪ Rewound episode: {current_episode.name}")
        
        return EpisodeResponse(
            success=True,
            message=f"Episode '{current_episode.name}' rewound successfully",
            episode=current_episode
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error rewinding episode: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/replay", response_model=EpisodeResponse)
async def replay_episode(request: Request, replay_request: ReplayEpisodeRequest):
    """
    Replay a completed episode
    
    Returns:
        JSON response with replay status
    """
    try:
        app_state = request.app.state.app_state if hasattr(request.app.state, 'app_state') else None
        
        if not app_state:
            # Get from main app globals (fallback)
            from ..main import app_state
        
        episode = app_state.get_episode_by_id(replay_request.episode_id)
        
        if not episode:
            raise HTTPException(
                status_code=404,
                detail=f"Episode with ID {replay_request.episode_id} not found"
            )
        
        if episode.status != EpisodeStatus.COMPLETED:
            raise HTTPException(
                status_code=400,
                detail="Can only replay completed episodes"
            )
        
        # Set episode status to replaying
        episode.status = EpisodeStatus.REPLAYING
        episode.updated_at = datetime.now()
        
        # TODO: Implement actual replay logic
        # This would involve publishing the recorded data back to ROS2 topics
        
        logger.info(f"▶️ Replaying episode: {episode.name} at {replay_request.speed}x speed")
        
        return EpisodeResponse(
            success=True,
            message=f"Replaying episode '{episode.name}' at {replay_request.speed}x speed",
            episode=episode
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error replaying episode: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/current", response_model=EpisodeResponse)
async def get_current_episode(request: Request):
    """
    Get information about the current episode
    
    Returns:
        JSON response with current episode information
    """
    try:
        app_state = request.app.state.app_state if hasattr(request.app.state, 'app_state') else None
        
        if not app_state:
            # Get from main app globals (fallback)
            from ..main import app_state
        
        current_episode = app_state.get_current_episode()
        
        return EpisodeResponse(
            success=True,
            message="Current episode retrieved" if current_episode else "No active episode",
            episode=current_episode
        )
        
    except Exception as e:
        logger.error(f"❌ Error getting current episode: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/", response_model=List[EpisodeInfo])
async def get_all_episodes(request: Request):
    """
    Get all episodes
    
    Returns:
        List of all episodes
    """
    try:
        app_state = request.app.state.app_state if hasattr(request.app.state, 'app_state') else None
        
        if not app_state:
            # Get from main app globals (fallback)
            from ..main import app_state
        
        episodes = app_state.get_all_episodes()
        
        logger.info(f"📋 Retrieved {len(episodes)} episodes")
        
        return episodes
        
    except Exception as e:
        logger.error(f"❌ Error getting episodes: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{episode_id}", response_model=EpisodeResponse)
async def get_episode(request: Request, episode_id: str):
    """
    Get specific episode by ID
    
    Returns:
        JSON response with episode information
    """
    try:
        app_state = request.app.state.app_state if hasattr(request.app.state, 'app_state') else None
        
        if not app_state:
            # Get from main app globals (fallback)
            from ..main import app_state
        
        episode = app_state.get_episode_by_id(episode_id)
        
        if not episode:
            raise HTTPException(
                status_code=404,
                detail=f"Episode with ID {episode_id} not found"
            )
        
        return EpisodeResponse(
            success=True,
            message="Episode retrieved successfully",
            episode=episode
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting episode {episode_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/", response_model=EpisodeResponse)
async def clear_all_episodes(request: Request):
    """
    Clear all episodes
    
    Returns:
        JSON response with clear confirmation
    """
    try:
        app_state = request.app.state.app_state if hasattr(request.app.state, 'app_state') else None
        
        if not app_state:
            # Get from main app globals (fallback)
            from ..main import app_state
        
        app_state.clear_episodes()
        
        logger.info("🗑️ Cleared all episodes")
        
        return EpisodeResponse(
            success=True,
            message="All episodes cleared successfully"
        )
        
    except Exception as e:
        logger.error(f"❌ Error clearing episodes: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")