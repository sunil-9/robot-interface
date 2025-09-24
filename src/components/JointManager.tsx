import { useBridgeData } from "@/hooks/useBridgeData";
import { useEffect, useState } from "react";
import { LineChart } from "./LineChart";

interface JointManagerProps {
  title: string;
  type: "state" | "command";
}

export const JointManager = ({ title, type }: JointManagerProps) => {
  const [availableJoints, setAvailableJoints] = useState<string[]>([]);
  const bridgeData = useBridgeData();

  // Extract available joints from bridge data
  useEffect(() => {
    const data = type === "state" ? bridgeData.state : bridgeData.command;

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
  }, [bridgeData, type]);

  return <LineChart title={title} />;
};
