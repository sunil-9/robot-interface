# Robot Teaching Interface

A comprehensive web-based interface for robot teaching and control, featuring real-time data visualization, joint management, and camera feeds. This project consists of a React frontend and Python backend that bridges ROS2 topics with WebSocket connections.

## 📝 Recent Updates

- **Model Training UI**: Added comprehensive model training interface with status tracking and controls
- **Dynamic Robot Configuration**: Added JSON-based robot configuration system
- **New Utility Functions**: Added `websocketConfig.ts` with configuration access methods
- **Robot Config Hook**: Created `useRobotConfig` hook for accessing robot specifications
- **Camera System Update**: Updated camera references to use head/left/right naming
- **Documentation**: Added detailed [robot configuration docs](./docs/robot-config.md)

## 🚀 Features

- **Real-time Robot Control**: Interactive interface for joint manipulation and control
- **Model Training Interface**: Integrated UI for managing training sessions, checkpoints, and monitoring progress
- **Camera Integration**: Live camera feeds for visual feedback during robot teaching
- **Data Visualization**: Line charts and real-time plotting of sensor data
- **Training Interface**: Comprehensive training module for robot learning
- **WebSocket Bridge**: Efficient ROS2 to WebSocket communication
- **Modern UI**: Built with React, TypeScript, and shadcn/ui components

## 📁 Project Structure

```text
├── im-cloud-backend/        # Cloud backend for datasets and training
├── im-robot-backend/        # Robot-side backend with ROS2 bridge
├── frontend/                # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── training/    # Training & Episode management
│   │   │   ├── CameraView.tsx
│   │   │   └── ...
│   │   ├── hooks/           # Custom React hooks
│   │   └── pages/           # Application pages
└── so-100-control/          # Robot control software
```

## 🤖 Dynamic Robot System

The interface discovers available robots and configures itself based on their specific capabilities (joints, cameras, ROS topics).

### File Structure

- `src/config/api.ts`: Central API configuration
- `src/data/websocket-config.json`: Default robot configuration
- `src/hooks/useRobots.ts`: Hook for fetching robot list
- `src/hooks/useRobotConfig.ts`: Hook for accessing robot capabilities
- `src/services/robotService.ts`: API service layer

### Module Details

1. **Robot Discovery (Home Page)**: Fetches active robots from the cloud backend.
2. **Robot Configuration (Control Interface)**: Adapts UI to the specific robot (joints, cameras).

### Data Flow

1. **Discovery**: User visits Home -> `useRobots` calls `robotService` -> Fetches active robots.
2. **Selection**: User selects a robot -> App loads Control Page.
3. **Configuration**: Control Page uses `useRobotConfig` -> Reads config -> Renders UI.

## 🔌 WebSocket Configuration System

Manages WebSocket connections and topics dynamically via `src/data/websocket-config.json`.

### Key Components

- **Configuration File**: `src/data/websocket-config.json`
- **Utility Functions**: `src/utils/websocketConfig.ts`
- **Context API**: `BridgeContext` for app-wide access

### Camera System

Supports dynamic camera views (Head, Left Hand, Right Hand) identified by roles in the configuration.

## 🎮 Gamepad Control

The frontend sends complete gamepad state snapshots (~50Hz) via WebRTC.

### Format

```json
{
  "type": "control",
  "timestamp": 1761528520153,
  "device": { "gamepad": { "id": "...", "index": 0 } },
  "axes": { "0": 0.25, "1": -0.02, ... },
  "buttons": { "0": 0, "1": 1, ... }
}
```

### Implementation

- **Polling**: `src/components/InputTracker.tsx` polls state using `requestAnimationFrame`.
- **Deadzone**: Automatically applied to axes.
- **Optimization**: Signals only sent on state change.

## 🔄 Mode State Management

Global mode state management using React Context API.

### Available Modes

- `AppMode.TRAINING`
- `AppMode.RECORDING`
- `AppMode.REPLAY`
- `AppMode.POLICY_RUNNING`

### Usage

Use `useModeContext()` hook to access `mode` and `setMode`.

## 🛠️ Technologies Used

### Frontend

- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **shadcn/ui** - Beautiful and accessible UI components
- **Tailwind CSS** - Utility-first CSS framework
- **WebSocket** - Real-time communication

### Backend

- **Python 3** - Backend server
- **ROS2** - Robot Operating System
- **WebSockets** - Real-time communication
- **OpenCV** - Computer vision
- **NumPy** - Numerical computations

## 📋 Prerequisites

Before running the project, ensure you have:

- **Node.js** (v16 or higher) and npm
- **Python 3.8+**
- **ROS2** (Humble or newer)
- **Conda** (recommended for Python environment management)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd web-interface
```

### 2. Setup Backend Environment

The project uses `uv` for Python dependency management.

```bash
# Setup Robot Backend
cd ../im-robot-backend
uv sync

# Setup Cloud Backend
cd ../im-cloud-backend
uv sync
```

### 3. Setup Frontend

```bash
# Navigate to frontend directory
cd ../frontend

# Install Node.js dependencies
npm install
```

## 🎯 Running the Project

The project requires the backends and frontend to run simultaneously:

### 1. Start Robot Backend (Terminal 1)

```bash
cd ../im-robot-backend
# Ensure ROS2 environment is sourced if needed
uv run uvicorn app.main:app --reload --port 8000
```

This starts the robot-side service that bridges ROS2 topics.

### 2. Start Cloud Backend (Terminal 2)

```bash
cd ../im-cloud-backend
uv run uvicorn app.main:app --reload --port 8100
```

This starts the cloud service for dataset management and training.

### 3. Start Frontend Development Server (Terminal 3)

```bash
cd ../frontend
npm run dev
```

The frontend will be available at `http://localhost:8081`.

## 🖼️ Screenshots

![Project Interface](images/image.png)
_Main interface showing robot control and camera feed_

![UI Demo](images/ui.gif)
_Interactive demonstration of the user interface_

## ⚙️ Configuration

### Backend Configuration

Edit `backend/config.json` to configure:

- ROS2 topics to subscribe to
- WebSocket server port
- Image compression settings
- Update rates

### Frontend Configuration

Key configuration files:

- `vite.config.ts` - Vite build configuration
- `tailwind.config.ts` - Tailwind CSS customization
- `tsconfig.json` - TypeScript configuration

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Adding New Components

1. Create components in `src/components/`
2. Use TypeScript interfaces for props
3. Follow the existing naming conventions
4. Add to the appropriate index files for easy imports

### Backend Development

1. Modify `backend.py` for WebSocket handling
2. Update `config.json` for new ROS topics
3. Test with `dummy_publisher.py`

## 🐛 Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**

   - Ensure backend server is running on correct port
   - Check firewall settings

2. **ROS2 Topics Not Received**

   - Verify ROS2 environment is sourced
   - Check topic names in configuration

3. **Frontend Build Issues**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check Node.js version compatibility

---

For questions or support, please open an issue on the repository.
