# Gamepad Control Signal Format

## Overview
The frontend now sends complete gamepad state snapshots instead of individual button/axis events. This makes it easier to control the robot by providing a full picture of the controller state at any given moment.

## New Format

```json
{
  "type": "control",
  "timestamp": 1761528520153,
  "device": {
    "gamepad": {
      "id": "Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)",
      "index": 0
    }
  },
  "axes": {
    "0": 0.25,
    "1": -0.02,
    "2": 0,
    "3": -0.61
  },
  "buttons": {
    "0": 0,
    "1": 1,
    "2": 0,
    "3": 1,
    "4": 0,
    "5": 0,
    "6": 0,
    "7": 0,
    "8": 0,
    "9": 0,
    "10": 0,
    "11": 0,
    "12": 0,
    "13": 0,
    "14": 0,
    "15": 0,
    "16": 0
  }
}
```

## Field Descriptions

### `type`
- Always `"control"` for gamepad control signals

### `timestamp`
- Unix timestamp in milliseconds when the state was captured

### `device.gamepad`
- `id`: Human-readable gamepad identifier from browser
- `index`: Numeric index of the gamepad (0-3)

### `axes`
- Object with string keys (axis index) and numeric values
- Values range from -1.0 to 1.0
- Values with absolute value < 0.1 are automatically set to 0 (deadzone)
- Common axis mappings (Standard Gamepad):
  - `0`: Left stick X axis (left: -1, right: +1)
  - `1`: Left stick Y axis (up: -1, down: +1)
  - `2`: Right stick X axis (left: -1, right: +1)
  - `3`: Right stick Y axis (up: -1, down: +1)

### `buttons`
- Object with string keys (button index) and numeric values
- Values range from 0 (not pressed) to 1 (fully pressed)
- Binary buttons are either 0 or 1
- Analog triggers can have intermediate values
- Common button mappings (Standard Gamepad):
  - `0`: Bottom button (A/Cross)
  - `1`: Right button (B/Circle)
  - `2`: Left button (X/Square)
  - `3`: Top button (Y/Triangle)
  - `4`: Left shoulder (LB/L1)
  - `5`: Right shoulder (RB/R1)
  - `6`: Left trigger (LT/L2)
  - `7`: Right trigger (RT/R2)
  - `8`: Select/Back/Share
  - `9`: Start/Menu/Options
  - `10`: Left stick press (L3)
  - `11`: Right stick press (R3)
  - `12`: D-pad up
  - `13`: D-pad down
  - `14`: D-pad left
  - `15`: D-pad right
  - `16`: Center button (Xbox/PS/Home)

## Sending Frequency

- Signals are sent at approximately **50 Hz** (every 20ms)
- Signals are **only sent when the state changes**
- This prevents flooding the channel with redundant data

## Backend Processing

To process this format on the robot backend:

```python
def handle_control_signal(data):
    # Extract gamepad info
    gamepad_id = data["device"]["gamepad"]["id"]
    gamepad_index = data["device"]["gamepad"]["index"]
    
    # Get all axes
    axes = data["axes"]
    left_x = float(axes.get("0", 0))
    left_y = float(axes.get("1", 0))
    right_x = float(axes.get("2", 0))
    right_y = float(axes.get("3", 0))
    
    # Get all buttons
    buttons = data["buttons"]
    a_button = float(buttons.get("0", 0))
    b_button = float(buttons.get("1", 0))
    # ... etc
    
    # Control robot based on inputs
    # For example, drive with left stick:
    linear_velocity = -left_y  # Forward/backward
    angular_velocity = left_x  # Turn left/right
```

## Changes from Previous Format

### Old Format (Event-based)
```json
{
  "type": "command",
  "controller": "gamepad-ps5-controller",
  "timestamp": 1762414898516,
  "source": "gamepad",
  "kind": "axis",
  "axis": 1,
  "value": 0,
  "delta": -0.10588235294117654,
  "magnitude": 0,
  "phase": "stop",
  "durationMs": 1839
}
```

### New Format (State-based)
- Provides **complete snapshot** of all axes and buttons
- Simpler to process - no need to track individual events
- Easier to implement robot control logic
- Better for real-time teleoperation
- Consistent structure regardless of which input changed

## Implementation Details

See `src/components/InputTracker.tsx` for the implementation. The component:
1. Polls gamepad state using `requestAnimationFrame()`
2. Applies deadzone filtering to axes
3. Detects state changes
4. Sends complete state snapshot via WebRTC data channel
5. Only sends when something changes (optimization)
