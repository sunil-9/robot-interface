# Robot Teaching Interface Backend

A structured FastAPI backend with WebSocket support for ROS2 robot teaching interface.

## 🏗️ Architecture

```
mybridge/
├── src/
│   └── mybridge/
│       ├── __init__.py          # Package initialization
│       ├── main.py              # FastAPI application
│       ├── config.py            # Configuration management
│       ├── models.py            # Pydantic models
│       ├── ros_bridge.py        # ROS2 WebSocket bridge
│       └── routers/
│           ├── __init__.py
│           ├── episodes.py      # Episode management API
│           └── websocket.py     # WebSocket endpoints
├── config.json                 # ROS2 topics configuration
├── start_server.py             # Startup script
├── pyproject.toml              # UV project configuration
└── README.md                   # This file
```

## 🚀 Features

- **FastAPI Backend**: Modern, fast web framework with automatic API documentation
- **WebSocket Support**: Real-time data streaming at `/ws` endpoint
- **Episode Management**: Start, end, rewind, and replay episodes
- **ROS2 Integration**: Bridge between ROS2 topics and WebSocket clients
- **UV Package Management**: Modern Python package management
- **Structured Code**: Clean, maintainable architecture

## 📋 Prerequisites

1. **Python 3.10+**
2. **UV Package Manager**: Install from [https://docs.astral.sh/uv/](https://docs.astral.sh/uv/)
3. **ROS2 Environment**: Humble or newer
4. **Conda Environment**: With ROS2 packages installed

## 🛠️ Installation

### 1. Install UV (if not already installed)

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. Navigate to the mybridge directory

```bash
cd /home/sunil/opt/web-project/frontend/backend/mybridge
```

### 3. Install Python dependencies

```bash
uv sync
```

### 4. Install ROS2 dependencies in your conda environment

```bash
# Activate your conda environment
conda activate lerobot

# Install ROS2 packages
conda install -c conda-forge rclpy sensor_msgs std_msgs cv_bridge
```

## 🚀 Running the Backend

### Method 1: Using the startup script (Recommended)

```bash
# Make sure ROS2 environment is sourced
source /opt/ros/humble/setup.bash

# Activate conda environment
conda activate lerobot

# Run the startup script
python3 start_server.py
```

### Method 2: Direct UV run

```bash
# Make sure ROS2 environment is sourced and conda activated
uv run uvicorn mybridge.main:app --host 0.0.0.0 --port 8080 --reload
```

### Method 3: Using the entry point

```bash
uv run mybridge
```

## 🌐 API Endpoints

### WebSocket

- `ws://localhost:8080/ws` - Real-time data streaming

### Episode Management

- `POST /api/episodes/start` - Start a new episode
- `POST /api/episodes/end` - End current episode
- `POST /api/episodes/rewind` - Rewind current episode
- `POST /api/episodes/replay` - Replay an episode
- `GET /api/episodes/current` - Get current episode info
- `GET /api/episodes/` - Get all episodes
- `GET /api/episodes/{episode_id}` - Get specific episode
- `DELETE /api/episodes/` - Clear all episodes

### Health Check

- `GET /` - Basic health check
- `GET /health` - Detailed health check

## 📡 WebSocket Protocol

### Client -> Server Messages

```json
{
  "type": "ping",
  "timestamp": 1234567890
}
```

```json
{
  "type": "get_current_episode"
}
```

```json
{
  "type": "subscribe",
  "topics": ["camera_base", "action_variance"]
}
```

### Server -> Client Messages

```json
{
  "topic": "/action_variance_windows",
  "role": "action_variance",
  "received_at": 1758774405519693000,
  "normalized": {
    "data": [0.017, 0.006, 0.033, 0.007, 0.048, 0.027, 0.04, 0.028, 0.012, 0.02]
  }
}
```

## 🔧 Configuration

Edit `config.json` to configure ROS2 topics:

```json
{
  "websocket": {
    "port": 8080
  },
  "topics": [
    {
      "name": "/action_variance_windows",
      "type": "std_msgs/msg/Float64MultiArray",
      "role": "action_variance"
    }
  ],
  "maxBuffer": 1000
}
```

## 🏃‍♂️ Development

### Install in development mode

```bash
uv sync --dev
```

### Run with hot reload

```bash
uv run uvicorn mybridge.main:app --reload --host 0.0.0.0 --port 8080
```

### Access API documentation

- Swagger UI: http://localhost:8080/docs
- ReDoc: http://localhost:8080/redoc

## 📝 Episode Management

### Start Episode

```bash
curl -X POST "http://localhost:8080/api/episodes/start" \
  -H "Content-Type: application/json" \
  -d '{"name": "Training Session 1"}'
```

Response:

```json
{
  "success": true,
  "message": "Episode 'Training Session 1' started successfully",
  "episode": {
    "id": "uuid-here",
    "name": "Training Session 1",
    "status": "recording",
    "start_time": "2025-09-29T10:00:00Z"
  }
}
```

### End Episode

```bash
curl -X POST "http://localhost:8080/api/episodes/end"
```

### Rewind Episode

```bash
curl -X POST "http://localhost:8080/api/episodes/rewind"
```

### Replay Episode

```bash
curl -X POST "http://localhost:8080/api/episodes/replay" \
  -H "Content-Type: application/json" \
  -d '{"episode_id": "uuid-here", "speed": 1.5}'
```

## 🐛 Troubleshooting

### Common Issues

1. **ROS2 not found**

   ```bash
   source /opt/ros/humble/setup.bash
   ```

2. **Conda environment not activated**

   ```bash
   conda activate lerobot
   ```

3. **Port already in use**

   ```bash
   # Change port in config.json or use environment variable
   export PORT=8081
   ```

4. **WebSocket connection failed**
   - Check if backend is running
   - Verify port configuration
   - Check firewall settings

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:8080/health
```

Response:

```json
{
  "status": "healthy",
  "ros2_bridge": "connected",
  "websocket_clients": 2,
  "latest_data_keys": ["action_variance", "camera_base", "state"]
}
```

## 🔄 Migration from Old Backend

The new backend maintains compatibility with the existing frontend. Key changes:

1. **WebSocket endpoint**: Now at `/ws` instead of root level
2. **Episode APIs**: New structured endpoints for episode management
3. **Configuration**: Same `config.json` format
4. **Data format**: Same WebSocket message format

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details
