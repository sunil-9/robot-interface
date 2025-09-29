"""
Data models for the Robot Teaching Interface Backend
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Set
from uuid import uuid4

from pydantic import BaseModel, Field


class EpisodeStatus(str, Enum):
    """Episode status enumeration"""
    IDLE = "idle"
    RECORDING = "recording"
    PAUSED = "paused"
    COMPLETED = "completed"
    REPLAYING = "replaying"
    REWINDING = "rewinding"


class RobotData(BaseModel):
    """Robot data from ROS2 topics"""
    topic: str
    role: str
    received_at: int
    normalized: Dict[str, Any]


class EpisodeInfo(BaseModel):
    """Episode information"""
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: Optional[str] = None
    status: EpisodeStatus = EpisodeStatus.IDLE
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration: Optional[float] = None  # seconds
    data_count: int = 0
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class EpisodeResponse(BaseModel):
    """Standard episode response format"""
    success: bool
    message: str
    episode: Optional[EpisodeInfo] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class AppState:
    """Global application state"""
    
    def __init__(self):
        # WebSocket clients
        self.websocket_clients: Set = set()
        
        # Latest data from ROS2 topics
        self.latest_data: Dict[str, RobotData] = {}
        
        # Current episode
        self.current_episode: Optional[EpisodeInfo] = None
        
        # Episode history
        self.episodes: List[EpisodeInfo] = []
        
        # Recording buffer
        self.recording_buffer: List[RobotData] = []
        
        # Maximum buffer size
        self.max_buffer_size: int = 1000
    
    def start_episode(self, name: Optional[str] = None) -> EpisodeInfo:
        """Start a new episode"""
        if self.current_episode and self.current_episode.status == EpisodeStatus.RECORDING:
            raise ValueError("Episode already in progress")
        
        episode = EpisodeInfo(
            name=name or f"Episode_{len(self.episodes) + 1}",
            status=EpisodeStatus.RECORDING,
            start_time=datetime.now()
        )
        
        self.current_episode = episode
        self.episodes.append(episode)
        self.recording_buffer.clear()
        
        return episode
    
    def end_episode(self) -> Optional[EpisodeInfo]:
        """End the current episode"""
        if not self.current_episode or self.current_episode.status != EpisodeStatus.RECORDING:
            return None
        
        now = datetime.now()
        self.current_episode.status = EpisodeStatus.COMPLETED
        self.current_episode.end_time = now
        self.current_episode.updated_at = now
        
        if self.current_episode.start_time:
            self.current_episode.duration = (
                now - self.current_episode.start_time
            ).total_seconds()
        
        self.current_episode.data_count = len(self.recording_buffer)
        
        episode = self.current_episode
        self.current_episode = None
        
        return episode
    
    def get_current_episode(self) -> Optional[EpisodeInfo]:
        """Get current episode information"""
        return self.current_episode
    
    def add_data_to_buffer(self, data: RobotData):
        """Add data to recording buffer"""
        if self.current_episode and self.current_episode.status == EpisodeStatus.RECORDING:
            self.recording_buffer.append(data)
            
            # Limit buffer size
            if len(self.recording_buffer) > self.max_buffer_size:
                self.recording_buffer.pop(0)
    
    def get_episode_by_id(self, episode_id: str) -> Optional[EpisodeInfo]:
        """Get episode by ID"""
        for episode in self.episodes:
            if episode.id == episode_id:
                return episode
        return None
    
    def get_all_episodes(self) -> List[EpisodeInfo]:
        """Get all episodes"""
        return self.episodes.copy()
    
    def clear_episodes(self):
        """Clear all episodes"""
        self.episodes.clear()
        self.current_episode = None
        self.recording_buffer.clear()


# Response models
class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    ros2_bridge: str
    websocket_clients: int
    latest_data_keys: List[str]


class RootResponse(BaseModel):
    """Root endpoint response"""
    message: str
    version: str
    status: str
    ros_connected: bool