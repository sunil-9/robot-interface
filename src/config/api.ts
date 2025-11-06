import { cloudConfig } from "@/lib/config";

const API_BASE_URL = cloudConfig.apiBaseUrl;

// API configuration for the application
export const API_CONFIG = {
  // Base URL for API services
  BASE_URL: API_BASE_URL,

  // API endpoints
  ENDPOINTS: {
    ROBOTS: "/robots/",
    OPERATOR_DEVICES: "/robots/operator_device",
    SIGNALING_CONFIG: "/config/signaling",
    WEBRTC_BASE: "/api/webrtc",
    WEBRTC_TEST: "/api/webrtc/test",
    WEBRTC_OFFER: "/api/webrtc/offer",
    WEBRTC_ICE: "/api/webrtc/ice",
    WEBRTC_HEALTH: "/api/webrtc/health",
    EPISODES: "/episodes",
    DATASETS: "/datasets",
  },

  // Timeout configurations (in milliseconds)
  TIMEOUT: {
    DEFAULT: 10000, // 10 seconds
  },
};
