# Global Mode State Management

This project uses **React Context API** for global state management to handle different operational modes.

## Available Modes

The application supports four different operational modes:

1. **Training Mode** - For training the robot
2. **Recording Mode** - For recording robot actions
3. **Replay Mode** - For replaying recorded actions
4. **Policy Running Mode** - For running trained policies

## Architecture

### Files Structure

```
src/
├── context/
│   ├── ModeContextDef.ts      # Type definitions and enums
│   └── ModeContext.tsx        # Context provider component
├── hooks/
│   └── useModeContext.ts      # Custom hook for accessing mode state
└── components/
    └── ModeSwitcher.tsx       # Example UI components for switching modes
```

## Usage

### 1. Basic Usage - Reading the Current Mode

```tsx
import { useModeContext } from "@/hooks/useModeContext";

function MyComponent() {
  const { mode, getModeLabel } = useModeContext();

  return (
    <div>
      <h1>Current Mode: {getModeLabel()}</h1>
      <p>Mode value: {mode}</p>
    </div>
  );
}
```

### 2. Changing the Mode

```tsx
import { useModeContext } from "@/hooks/useModeContext";
import { AppMode } from "@/context/ModeContextDef";

function MyComponent() {
  const { setMode } = useModeContext();

  return (
    <button onClick={() => setMode(AppMode.RECORDING)}>
      Switch to Recording Mode
    </button>
  );
}
```

### 3. Conditional Rendering Based on Mode

```tsx
import { useModeContext } from "@/hooks/useModeContext";
import { AppMode } from "@/context/ModeContextDef";

function MyComponent() {
  const { mode } = useModeContext();

  return (
    <div>
      {mode === AppMode.TRAINING && <TrainingInterface />}
      {mode === AppMode.RECORDING && <RecordingInterface />}
      {mode === AppMode.REPLAY && <ReplayInterface />}
      {mode === AppMode.POLICY_RUNNING && <PolicyInterface />}
    </div>
  );
}
```

### 4. Using the Pre-built Mode Switcher Components

We've provided two ready-to-use components:

**Dropdown Selector:**

```tsx
import { ModeSwitcher } from "@/components/ModeSwitcher";

function Header() {
  return (
    <header>
      <ModeSwitcher />
    </header>
  );
}
```

**Button Group:**

```tsx
import { ModeButtonGroup } from "@/components/ModeSwitcher";

function Toolbar() {
  return (
    <div className="toolbar">
      <ModeButtonGroup />
    </div>
  );
}
```

## API Reference

### `useModeContext()`

Custom hook to access the mode context.

**Returns:**

- `mode: AppMode` - Current active mode
- `setMode: (mode: AppMode) => void` - Function to change the mode
- `getModeLabel: () => string` - Function to get the display label for current mode

**Throws:** Error if used outside of `ModeProvider`

### `AppMode` Enum

```typescript
enum AppMode {
  TRAINING = "training",
  RECORDING = "recording",
  REPLAY = "replay",
  POLICY_RUNNING = "policy_running",
}
```

### `MODE_LABELS`

Object mapping modes to their display labels:

```typescript
const MODE_LABELS: Record<AppMode, string> = {
  [AppMode.TRAINING]: "Training Mode",
  [AppMode.RECORDING]: "Recording Mode",
  [AppMode.REPLAY]: "Replay Mode",
  [AppMode.POLICY_RUNNING]: "Policy Running Mode",
};
```

## Implementation Details

### Provider Setup

The `ModeProvider` is already set up in `App.tsx` and wraps the entire application:

```tsx
<ModeProvider>
  <BridgeProvider>{/* Rest of app */}</BridgeProvider>
</ModeProvider>
```

### Initial Mode

By default, the application starts in **Training Mode**. You can change this by passing an `initialMode` prop to the `ModeProvider`:

```tsx
<ModeProvider initialMode={AppMode.RECORDING}>{/* App content */}</ModeProvider>
```

## Example: Train Page Implementation

The `Train.tsx` page has been updated to use the mode context:

```tsx
export default function TrainPage() {
  const { getModeLabel } = useModeContext();

  return (
    <div>
      <h1>{getModeLabel()}</h1>
      {/* Rest of the component */}
    </div>
  );
}
```

The mode label now dynamically updates based on the global mode state instead of being hardcoded as "Training Mode".

## Why Context API?

We chose React Context API over Redux because:

1. **Simpler Setup** - No additional dependencies required
2. **Built-in to React** - Part of React core, well-supported
3. **Sufficient for This Use Case** - Mode state is relatively simple
4. **Better Performance** - Less boilerplate and overhead for simple state
5. **Consistency** - The project already uses Context API for `BridgeContext`

## Future Enhancements

If the state management needs grow more complex, consider:

- Adding mode-specific configurations
- Implementing mode transition validation
- Adding middleware for mode changes
- Persisting mode state to localStorage
- Adding mode change history/undo functionality
