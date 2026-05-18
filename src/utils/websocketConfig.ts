import { cloudConfig } from "@/lib/config";

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
    url?: string;
    host?: string;
    port?: number;
    path?: string;
  };
  topics: Topic[];
  maxBuffer: number;
}

// Get the full configuration
export const getWebSocketConfig = (): WebSocketConfig => {
  return websocketConfig as WebSocketConfig;
};

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

const ensureLeadingSlash = (value: string): string =>
  value.startsWith("/") ? value : `/${value}`;

const resolveProtocol = (secure?: boolean, inferred?: string): "ws" | "wss" => {
  if (secure !== undefined) {
    return secure ? "wss" : "ws";
  }
  return inferred === "https:" ? "wss" : "ws";
};

const buildUrlFromHost = (
  host: string,
  port: number | undefined,
  path: string
): string => {
  const normalizedPath = ensureLeadingSlash(path || "/ws");
  const inferredProtocol = port === 443 ? "https:" : undefined;
  const scheme = resolveProtocol(undefined, inferredProtocol);
  const portSegment = port ? `:${port}` : "";
  return `${scheme}://${host}${portSegment}${normalizedPath}`;
};

const inferFromApiBase = (path: string): string => {
  const normalizedPath = ensureLeadingSlash(path || "/ws");
  try {
    const base = new URL(cloudConfig.apiBaseUrl);
    const scheme = resolveProtocol(undefined, base.protocol);
    return `${scheme}://${base.host}${normalizedPath}`;
  } catch (error) {
    console.warn("Failed to infer WebSocket URL from apiBaseUrl:", error);
    const fallbacks = [
      import.meta.env.VITE_CLOUD_API_BASE_URL as string | undefined,
    ].filter(Boolean) as string[];

    for (const candidate of fallbacks) {
      try {
        const base = new URL(candidate);
        const scheme = resolveProtocol(undefined, base.protocol);
        return `${scheme}://${base.host}${normalizedPath}`;
      } catch (innerError) {
        console.warn("Failed to infer WebSocket URL from env base:", candidate, innerError);
      }
    }

    if (typeof window !== "undefined" && window.location?.host) {
      const scheme = resolveProtocol(undefined, window.location.protocol);
      return `${scheme}://${window.location.host}${normalizedPath}`;
    }

    throw error;
  }
};

// Get WebSocket URL with overrides from config/environment
export const getWebSocketUrl = (): string => {
  const config = getWebSocketConfig();
  const path = config.websocket?.path ?? "/ws";
  const envOverride = import.meta.env.VITE_BRIDGE_WEBSOCKET_URL as
    | string
    | undefined;

  if (envOverride && typeof envOverride === "string") {
    return trimTrailingSlash(envOverride);
  }

  if (config.websocket?.url) {
    return trimTrailingSlash(config.websocket.url);
  }

  if (config.websocket?.host) {
    return buildUrlFromHost(config.websocket.host, config.websocket.port, path);
  }

  if (config.websocket?.port) {
    return buildUrlFromHost("localhost", config.websocket.port, path);
  }

  return inferFromApiBase(path);
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