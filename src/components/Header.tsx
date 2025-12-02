import { AppMode } from "@/context/ModeContextDef";
import { useModeContext } from "@/hooks/useModeContext";
import { ArrowLeft, Circle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

interface HeaderProps {
  page: string;
  selectedRobot?: boolean;
  selectedControl?: boolean;
}
export const Header = ({
  page,
  selectedRobot,
  selectedControl,
}: HeaderProps) => {
  const navigate = useNavigate();
  const { getModeLabel, mode } = useModeContext();

  return page == "main" ? (
    <header className="border-b border-gray-800 p-4 bg-black">
      <div className="container mx-auto">
        <h1 className="text-2xl font-bold text-purple-400">
          Robot Teaching Interface
        </h1>
        <p className="text-gray-400 text-sm">
          Select a robot and control device to begin
        </p>
      </div>
    </header>
  ) : page == "train" ? (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto py-3 px-4">
        <div className="flex items-center justify-center">
          <div className="bg-black/30 backdrop-blur-sm py-1.5 px-4 rounded-full flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white mr-2 h-7 w-7"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <h1
              className={`text-lg font-semibold mr-2 flex items-center gap-2 ${
                mode === AppMode.RECORDING ? "text-red-400" : "text-purple-300"
              }`}
            >
              {mode === AppMode.RECORDING && (
                <Circle className="h-3 w-3 fill-current animate-pulse" />
              )}
              {getModeLabel()}
            </h1>
            <p className="text-xs text-gray-300">
              {selectedRobot ? `${selectedRobot}` : ""}
              {selectedControl ? ` · ${selectedControl}` : ""}
            </p>
          </div>
        </div>
      </div>
    </header>
  ) : (
    <header className="h-12 bg-card border-b border-border flex items-center px-4 sticky top-0 z-20">
      <div className="flex-1 flex justify-center">
        <h1 className="text-xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Imitation Machines
        </h1>
      </div>
      <div className="w-10" /> {/* Spacer for balance */}
    </header>
  );
};
