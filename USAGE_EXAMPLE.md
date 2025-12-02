# Mode State Management - Quick Start Guide

## ✅ Implementation Complete

Global mode state management has been successfully implemented using **React Context API**.

## 🎯 Quick Usage Examples



### Example 2: Conditional Rendering Based on Mode

```tsx
import { useModeContext } from "@/hooks/useModeContext";
import { AppMode } from "@/context/ModeContextDef";

function TrainingInterface() {
  const { mode } = useModeContext();

  return (
    <div>
      {mode === AppMode.TRAINING && <div>Training controls here...</div>}

      {mode === AppMode.RECORDING && <div>Recording controls here...</div>}

      {mode === AppMode.REPLAY && <div>Replay controls here...</div>}

      {mode === AppMode.POLICY_RUNNING && (
        <div>Policy running controls here...</div>
      )}
    </div>
  );
}
```

### Example 3: Programmatically Switch Modes

```tsx
import { useModeContext } from "@/hooks/useModeContext";
import { AppMode } from "@/context/ModeContextDef";
import { Button } from "@/components/ui/button";

function MyComponent() {
  const { setMode } = useModeContext();

  const startRecording = () => {
    setMode(AppMode.RECORDING);
    // Your recording logic here
  };

  return <Button onClick={startRecording}>Start Recording</Button>;
}
```

## 📁 Files Created

- ✅ `/src/context/ModeContextDef.ts` - Type definitions and enums
- ✅ `/src/context/ModeContext.tsx` - Context provider component
- ✅ `/src/hooks/useModeContext.ts` - Custom hook for easy access
- ✅ `/src/components/ModeSwitcher.tsx` - Pre-built UI components
- ✅ `/docs/mode-state-management.md` - Full documentation

## 🔧 What's Already Done

1. ✅ Global state provider added to `App.tsx`
2. ✅ `Train.tsx` updated to use dynamic mode label
3. ✅ All components properly typed with TypeScript
4. ✅ No compilation errors
5. ✅ Following project's existing patterns (React Context)

## 🚀 Available Modes

```typescript
AppMode.TRAINING; // "Training Mode"
AppMode.RECORDING; // "Recording Mode"
AppMode.REPLAY; // "Replay Mode"
AppMode.POLICY_RUNNING; // "Policy Running Mode"
```

## 📖 Full Documentation

See `/docs/mode-state-management.md` for complete API reference and advanced usage.

## 🎨 UI Components Ready to Use

Two pre-built components in `/src/components/ModeSwitcher.tsx`:

2. **`<ModeButtonGroup />`** - Button group

Both are fully styled and ready to drop into your UI!
