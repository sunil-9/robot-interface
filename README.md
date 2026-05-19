# Robot Teaching Interface

A comprehensive web-based interface for robot teaching and control, featuring real-time data visualization, joint management, and camera feeds. This project consists of a React frontend and Python backend that bridges ROS2 topics with WebSocket connections.

## 📝 Recent Updates

- **Model Training UI**: Added comprehensive model training interface with status tracking and controls
- **Dynamic Robot Configuration**: Robot configuration is loaded from backend services
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
- `src/hooks/useRobots.ts`: Hook for fetching robot list
- `src/services/robotService.ts`: API service layer

### Module Details

1. **Robot Discovery (Home Page)**: Fetches active robots from the cloud backend.
2. **Robot Configuration (Control Interface)**: Adapts UI to the specific robot (joints, cameras).

### Data Flow

1. **Discovery**: User visits Home -> `useRobots` calls `robotService` -> Fetches active robots.
2. **Selection**: User selects a robot -> App loads Control Page.

## 🔌 WebSocket Configuration System

Manages WebSocket connections via environment/API config. Topic roles should come from server messages.

### Camera System

Supports dynamic camera views (Head, Left Hand, Right Hand) identified by roles from server messages.

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
- **Transmission**: Active joystick/button input is streamed at ~50Hz; idle unchanged state is suppressed.

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

## 📋 Prerequisites

Ensure you have the following installed on Ubuntu 22.04:

- **ROS2 Humble**
- **uv** (Python package manager)
- **Node.js** and **npm**

## 🚀 Getting Started

To keep everything organized, we will create a workspace folder:

```bash
mkdir -p ~/im
cd ~/im
```

### Step 0: Clone and Setup `so-100-control`

```bash
git clone https://github.com/imitationmachines/so-100-control
```

Follow the instructions in the `so-100-control` README to build and source the package.

### Step 1: Clone `lerobot`

```bash
git clone https://github.com/imitationmachines/lerobot
```

_Note: You don't need to do anything else with this repo; it is used as a dependency for the backend._

### Step 2: Clone and Setup Backend

```bash
git clone https://github.com/imitationmachines/im-robot-backend
```

Follow the instructions in the `im-robot-backend` README to setup the backend properly, or use the following commands:

```bash
cd im-robot-backend
UV_PYTHON=/usr/bin/python3.10 uv sync
# Install lerobot in editable mode (adjust path as needed)
uv pip install -e ../lerobot
source /opt/ros/humble/setup.bash
uv run uvicorn app.main:app --reload --port 8000
```

_Note: This runs the robot backend server on port 8000. Ensure the port is free._

### Step 3: Clone and Setup Frontend

```bash
git clone https://github.com/imitationmachines/im-operator-interface
cd im-operator-interface
npm install
npm run dev
```

This will start the frontend server on port **8081** by default.

### Step 4: Access the Interface

Open your browser and navigate to:
[http://localhost:8081](http://localhost:8081)

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

# 🤝🏻 Help Images

All the help image src should be uploaded to the frontend repo

```
/public/help/(robot)/(controller).png
```
---

For questions or support, please open an issue on the repository.
