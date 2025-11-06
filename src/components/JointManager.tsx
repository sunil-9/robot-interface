import { useBridgeData } from "@/hooks/useBridgeData";
import { useRobotConfig } from "@/hooks/useRobotConfig";
import { useEffect, useState } from "react";
import { LineChart } from "./LineChart";

interface JointManagerProps {
  title: string;
  type: "state" | "command";
}

export const JointManager = ({ title, type }: JointManagerProps) => {
  const [availableJoints, setAvailableJoints] = useState<string[]>([]);
  const bridgeData = useBridgeData();
  const { positionJoints, velocityJoints } = useRobotConfig();

  // Extract available joints from bridge data and configuration
  useEffect(() => {
    const data = type === "state" ? bridgeData.state : bridgeData.command;

    // First try to use the joint names from the robot config
    if (positionJoints.length > 0) {
      setAvailableJoints(positionJoints);
      return;
    }

    // Otherwise fall back to data from the bridge
    if (data) {
      let joints: string[] = [];

      if (type === "state") {
        const stateData = data as typeof bridgeData.state;
        if (stateData?.names) {
          joints = stateData.names;
        } else if (stateData?.positions) {
          joints = stateData.positions.map((_, index) => `Joint ${index + 1}`);
        }
      } else if (type === "command") {
        const commandData = data as typeof bridgeData.command;
        if (commandData?.data) {
          joints = commandData.data.map((_, index) => `Joint ${index + 1}`);
        }
      }

      if (joints.length > 0) {
        setAvailableJoints(joints);
      }
    }
  }, [bridgeData, type, positionJoints, velocityJoints]);

  return <LineChart title={title} />;
};
