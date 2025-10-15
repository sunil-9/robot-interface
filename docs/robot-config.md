# Robot and WebSocket Configuration

This document explains the structure and usage of the robot and WebSocket configuration system in the frontend application.

## Configuration File

The main configuration is stored in `src/data/websocket-config.json`. It contains:

### Robot Configuration

```json
{
  "robot": {
    "name": "jackal_kinova",
    "description": "Jackal mobile base with Kinova Gen3 arm and wrist camera"
  },
  "joints": {
    "position": [
      "kinova_arm_joint_1",
      "kinova_arm_joint_2",
      "kinova_arm_joint_3",
      "kinova_arm_joint_4",
      "kinova_arm_joint_5",
      "kinova_arm_joint_6",
      "finger_joint"
    ],
    "velocity": [
      "base_linear_forward",
      "base_linear_backward",
      "base_angular_left",
      "base_angular_right"
    ]
  },
  "ros": {
    "data_collections": {
      "states": {
        "topic": "/joint_states_for_collection",
        "msg_type": "sensor_msgs/msg/JointState",
        "queue_size": 10
      },
      "actions": {
        "topic": "/joint_command_for_collection",
        "msg_type": "sensor_msgs/msg/JointState",
        "queue_size": 10
      }
    },
    "deployments": {
      "states": {
        "topic": "/joint_states_for_collection",
        "msg_type": "sensor_msgs/msg/JointState",
        "queue_size": 10
      },
      "actions": {
        "topic": "/joint_command",
        "msg_type": "sensor_msgs/msg/JointState",
        "queue_size": 10
      }
    }
  },
  "cameras": [
    {
      "name": "base",
      "topic": "/rgb_base",
      "width": 1280,
      "height": 720,
      "observation_key": "observation.images.base",
      "encoding": "bgr8",
      "queue_size": 10
    },
    {
      "name": "wrist",
      "topic": "/rgb_wrist",
      "width": 1280,
      "height": 720,
      "observation_key": "observation.images.wrist",
      "encoding": "bgr8",
      "queue_size": 10
    }
  ]
}
```

### WebSocket Configuration

```json
{
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
    }
  ],
  "maxBuffer": 1000
}
```

## Usage

### Utility Functions

The `websocketConfig.ts` file provides utility functions for accessing the configuration:

```typescript
// Get WebSocket config
const config = getWebSocketConfig();

// Get WebSocket URL
const wsUrl = getWebSocketUrl();

// Get topic by role
const stateTopic = getTopicByRole("state");

// Get robot information
const robotInfo = getRobotInfo();

// Get joint configuration
const joints = getRobotJoints();
const positionJoints = getPositionJoints();
const velocityJoints = getVelocityJoints();

// Get camera configuration
const cameras = getCameras();
const headCamera = getCameraByName("base");
```

### React Hook

The `useRobotConfig` hook provides access to all robot configuration in React components:

```tsx
import { useRobotConfig } from "@/hooks/useRobotConfig";

const MyComponent = () => {
  const {
    robotName,
    robotDescription,
    positionJoints,
    velocityJoints,
    cameras,
    getCamera,
    rosConfig,
  } = useRobotConfig();

  // Use configuration in component
  // ...
};
```

## Extending the Configuration

To add new robots or update the configuration:

1. Update the `websocket-config.json` file with your robot's specifications
2. Update the TypeScript interfaces in `websocketConfig.ts` if you've added new fields
3. Use the existing utility functions and hooks to access the configuration

For adding new types of robots, you may need to:

1. Create a mapping between robot joint names and control inputs
2. Update the topic configuration to match the robot's ROS topics
3. Configure camera streams and observation paths
