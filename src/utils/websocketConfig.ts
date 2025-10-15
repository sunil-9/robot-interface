import websocketConfig from "../data/websocket-config.json";

export interface Topic {
  name: string;
  type: string;
  role: string;
}

export interface Camera {
  name: string;
  topic: string;
  width: number;
  height: number;
  observation_key: string;
  encoding: string;
  queue_size: number;
}

export interface RosTopicConfig {
  topic: string;
  msg_type: string;
  queue_size: number;
}

export interface WebSocketConfig {
  robot?: {
    name: string;
    description: string;
  };
  joints?: {
    position: string[];
    velocity: string[];
  };
  ros?: {
    data_collections: {
      states: RosTopicConfig;
      actions: RosTopicConfig;
    };
    deployments: {
      states: RosTopicConfig;
      actions: RosTopicConfig;
    };
  };
  cameras?: Camera[];
  websocket: {
    port: number;
  };
  topics: Topic[];
  maxBuffer: number;
}

// Get the full configuration
export const getWebSocketConfig = (): WebSocketConfig => {
  return websocketConfig as WebSocketConfig;
};

// Get WebSocket URL with port from config
export const getWebSocketUrl = (): string => {
  const config = getWebSocketConfig();
  return `ws://localhost:${config.websocket.port}/ws`;
};

// Get topic by role
export const getTopicByRole = (role: string): Topic | undefined => {
  const config = getWebSocketConfig();
  return config.topics.find((topic) => topic.role === role);
};

// Get role by topic name
export const getRoleByTopicName = (topicName: string): string | undefined => {
  const config = getWebSocketConfig();
  const topic = config.topics.find((topic) => topic.name === topicName);
  return topic?.role;
};

// Get topic name by role
export const getTopicNameByRole = (role: string): string | undefined => {
  const config = getWebSocketConfig();
  const topic = config.topics.find((topic) => topic.role === role);
  return topic?.name;
};

// Get all available roles
export const getAllRoles = (): string[] => {
  const config = getWebSocketConfig();
  return config.topics.map((topic) => topic.role);
};

// Get all available topic names
export const getAllTopicNames = (): string[] => {
  const config = getWebSocketConfig();
  return config.topics.map((topic) => topic.name);
};

// Get buffer size
export const getMaxBufferSize = (): number => {
  const config = getWebSocketConfig();
  return config.maxBuffer;
};

// Robot configuration functions
export const getRobotInfo = () => {
  const config = getWebSocketConfig();
  return config.robot;
};

export const getRobotJoints = () => {
  const config = getWebSocketConfig();
  return config.joints;
};

export const getPositionJoints = (): string[] => {
  const config = getWebSocketConfig();
  return config.joints?.position || [];
};

export const getVelocityJoints = (): string[] => {
  const config = getWebSocketConfig();
  return config.joints?.velocity || [];
};

export const getRosConfig = () => {
  const config = getWebSocketConfig();
  return config.ros;
};

export const getDataCollectionConfig = () => {
  const config = getWebSocketConfig();
  return config.ros?.data_collections;
};

export const getDeploymentConfig = () => {
  const config = getWebSocketConfig();
  return config.ros?.deployments;
};

export const getCameras = (): Camera[] => {
  const config = getWebSocketConfig();
  return config.cameras || [];
};

export const getCameraByName = (name: string): Camera | undefined => {
  const config = getWebSocketConfig();
  return config.cameras?.find((camera) => camera.name === name);
};

export const getCameraTopics = (): string[] => {
  const config = getWebSocketConfig();
  return config.cameras?.map((camera) => camera.topic) || [];
};
