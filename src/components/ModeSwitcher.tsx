import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppMode } from "@/context/ModeContextDef";
import { useModeContext } from "@/hooks/useModeContext";

/**
 * ModeSwitcher component - Example component showing how to switch between modes
 * You can place this in your UI wherever you want users to switch modes
 */
export const ModeSwitcher = () => {
  const { mode, setMode, getModeLabel } = useModeContext();

  return (
    <div className="flex items-center gap-2">
      <Select value={mode} onValueChange={(value) => setMode(value as AppMode)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select mode" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={AppMode.TRAINING}>Training Mode</SelectItem>
          <SelectItem value={AppMode.RECORDING}>Recording Mode</SelectItem>
          <SelectItem value={AppMode.REPLAY}>Replay Mode</SelectItem>
          <SelectItem value={AppMode.POLICY_RUNNING}>
            Policy Running Mode
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

/**
 * Alternative: Simple button group for mode switching
 */
export const ModeButtonGroup = () => {
  const { mode, setMode } = useModeContext();

  const modes = [
    { value: AppMode.TRAINING, label: "Training" },
    { value: AppMode.RECORDING, label: "Recording" },
    { value: AppMode.REPLAY, label: "Replay" },
    { value: AppMode.POLICY_RUNNING, label: "Policy Running" },
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {modes.map((m) => (
        <Button
          key={m.value}
          variant={mode === m.value ? "default" : "outline"}
          size="sm"
          onClick={() => setMode(m.value)}
        >
          {m.label}
        </Button>
      ))}
    </div>
  );
};
