import { useState, useEffect } from "react";
import { LineChart } from "./LineChart";
import { useWebSocket } from "@/hooks/useWebSocket";

interface JointManagerProps {
  title: string;
  type: "state" | "action";
}

export const JointManager = ({ title, type }: JointManagerProps) => {
  const [availableJoints, setAvailableJoints] = useState<string[]>([]);

  // WebSocket connection to extract joint names
  const { lastMessage } = useWebSocket({
    url: 'ws://localhost:8080',
    reconnectInterval: 3000,
    maxReconnectAttempts: 10
  });

  // Extract available joints from WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    // Handle replay messages to get joint names
    if (lastMessage.replay) {
      const relevantMessages = lastMessage.replay.filter(msg => msg.role === type);
      if (relevantMessages.length > 0) {
        const firstMessage = relevantMessages[0];
        const joints = extractJointNames(firstMessage);
        if (joints.length > 0) {
          setAvailableJoints(joints);
        }
      }
      return;
    }

    // Handle real-time messages
    if (lastMessage.role === type) {
      const joints = extractJointNames(lastMessage);
      if (joints.length > 0 && joints.length !== availableJoints.length) {
        setAvailableJoints(joints);
      }
    }
  }, [lastMessage, type, availableJoints.length]);

  const extractJointNames = (message: any): string[] => {
    const normalized = message.normalized;
    if (!normalized) return [];

    // For JointState messages
    if (normalized.names && Array.isArray(normalized.names)) {
      return normalized.names;
    }

    // For JointTrajectory messages
    if (normalized.joint_names && Array.isArray(normalized.joint_names)) {
      return normalized.joint_names;
    }

    // For Float64MultiArray or unknown formats, create generic joint names
    if (normalized.positions && typeof normalized.positions === 'object') {
      const keys = Object.keys(normalized.positions);
      return keys.map(key => `Joint ${parseInt(key) + 1}`);
    }

    if (normalized.data && Array.isArray(normalized.data)) {
      return normalized.data.map((_, index) => `Joint ${index + 1}`);
    }

    return [];
  };

  return (
    <LineChart
      title={title}
      type={type}
      availableJoints={availableJoints}
    />
  );
};