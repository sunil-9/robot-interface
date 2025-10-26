# WebSocket Configuration System

This document provides an overview of the dynamic WebSocket configuration system implemented in the frontend application.

## Overview

The WebSocket configuration system provides a way to manage WebSocket connections and topics dynamically. The configuration is stored in a central JSON file and accessed through utility functions and a React Context.

## Key Components

1. **Configuration File**: `src/data/websocket-config.json`

   - Contains WebSocket settings and topic definitions

2. **Utility Functions**: `src/utils/websocketConfig.ts`

   - Functions to access WebSocket configuration

3. **Context API**:
   - `src/context/BridgeContextDef.ts` - Context definition
   - `src/context/BridgeContext.tsx` - Context provider
   - `src/context/useBridgeConfig.ts` - Hook to access context

## Benefits

- **Centralized Configuration**: All WebSocket settings in one place
- **Dynamic Updates**: Change settings without code modification
- **Type Safety**: TypeScript interfaces for configuration
- **Consistent Access**: Standardized way to access WebSocket configuration
- **Role-based Access**: Access topics by their role instead of hardcoded names

## Camera System

The system now supports three camera views:

- Head Camera
- Left Hand Camera
- Right Hand Camera

Each camera is identified by a role in the configuration file, making it easy to change the underlying topic names without modifying components.

## Further Documentation

For more detailed information about the WebSocket configuration system, see the [WebSocket Configuration Documentation](./docs/websocket-config.md).




ros2 topic pub  /toy_robot/move_right_hand_forward std_msgs/msg/Bool "{data: true}"
ros2 topic pub  /toy_robot/move_left_hand_backward std_msgs/msg/Bool "{data: true}"