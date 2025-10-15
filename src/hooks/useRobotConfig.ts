import { useCallback } from "react";
import {
  getCameraByName,
  getCameras,
  getDataCollectionConfig,
  getDeploymentConfig,
  getPositionJoints,
  getRobotInfo,
  getRobotJoints,
  getRosConfig,
  getVelocityJoints,
} from "../utils/websocketConfig";

/**
 * Hook for accessing robot configuration data
 */
export const useRobotConfig = () => {
  const robotInfo = getRobotInfo();
  const joints = getRobotJoints();
  const cameras = getCameras();
  const rosConfig = getRosConfig();

  const getCamera = useCallback((name: string) => {
    return getCameraByName(name);
  }, []);

  const getJointsByType = useCallback((type: "position" | "velocity") => {
    return type === "position" ? getPositionJoints() : getVelocityJoints();
  }, []);

  return {
    // Basic info
    robotName: robotInfo?.name,
    robotDescription: robotInfo?.description,

    // Joints
    positionJoints: joints?.position || [],
    velocityJoints: joints?.velocity || [],
    getJointsByType,

    // Cameras
    cameras,
    getCamera,

    // ROS configuration
    rosConfig,
    dataCollectionConfig: getDataCollectionConfig(),
    deploymentConfig: getDeploymentConfig(),

    // Full data objects
    robotInfo,
    joints,
  };
};
