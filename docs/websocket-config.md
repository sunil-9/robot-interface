# WebSocket Configuration

This document explains how the WebSocket configuration works in the frontend application.

## Configuration File

The WebSocket configuration is stored in `src/data/websocket-config.json`. This file contains:

- WebSocket port settings
- Topic definitions with their names, types, and roles
- Buffer settings

## Dynamic Configuration System

The application uses a dynamic configuration system that allows for changing WebSocket topics and settings without modifying the code directly:

1. **Configuration Utilities**: The `src/utils/websocketConfig.ts` file provides utility functions to access configuration values:

   - `getWebSocketConfig()`: Get the full configuration
   - `getWebSocketUrl()`: Get the WebSocket URL
   - `getTopicByRole()`: Find topic by role
   - `getRoleByTopicName()`: Find role by topic name
   - `getTopicNameByRole()`: Get topic name by role

2. **Context Provider**: The application uses a React Context (`BridgeContext`) to share the WebSocket configuration across components:
   - `BridgeProvider`: Context provider wrapping the application
   - `useBridgeConfig()`: Hook to access the configuration in any component

## Usage Examples

### Accessing a Topic Name

```tsx
import { getTopicNameByRole } from "@/utils/websocketConfig";

// Get the topic name for a specific role
const actionVarianceTopicName = getTopicNameByRole("action_variance");
```

### Using the Context

```tsx
import { useBridgeConfig } from "@/context/useBridgeConfig";

function MyComponent() {
  const { config } = useBridgeConfig();
  // Access the configuration
  console.log(config.topics);
}
```

### WebSocket Connection

The `useWebSocket` hook automatically uses the configuration settings:

```tsx
import { useWebSocket } from "@/hooks/useWebSocket";

const { isConnected } = useWebSocket({
  // No need to specify URL - automatically uses the one from config
  onMessage: handleWebSocketMessage,
});
```

## Adding a New Topic

To add a new topic, simply update the `websocket-config.json` file with the new topic's details. The application will automatically use the updated configuration.
