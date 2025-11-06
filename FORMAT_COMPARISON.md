# Control Signal Format Comparison

## OLD FORMAT (Event-based) ❌

### Multiple messages for different events:

**Button Press:**
```json
{
  "type": "command",
  "controller": "gamepad-ps5-controller",
  "timestamp": 1762414898516,
  "source": "gamepad",
  "kind": "button",
  "button": 1,
  "value": 1,
  "phase": "press",
  "durationMs": 0,
  "repeat": 0
}
```

**Button Hold:**
```json
{
  "type": "command",
  "controller": "gamepad-ps5-controller",
  "timestamp": 1762414898536,
  "source": "gamepad",
  "kind": "button",
  "button": 1,
  "value": 1,
  "delta": 0,
  "phase": "hold",
  "durationMs": 20,
  "repeat": 1
}
```

**Axis Start:**
```json
{
  "type": "command",
  "controller": "gamepad-ps5-controller",
  "timestamp": 1762414898556,
  "source": "gamepad",
  "kind": "axis",
  "axis": 1,
  "value": 0.25,
  "delta": 0.25,
  "magnitude": 0.25,
  "phase": "start",
  "durationMs": 0
}
```

**Axis Move:**
```json
{
  "type": "command",
  "controller": "gamepad-ps5-controller",
  "timestamp": 1762414898576,
  "source": "gamepad",
  "kind": "axis",
  "axis": 1,
  "value": 0.50,
  "delta": 0.25,
  "magnitude": 0.50,
  "phase": "move",
  "durationMs": 20
}
```

**Axis Stop:**
```json
{
  "type": "command",
  "controller": "gamepad-ps5-controller",
  "timestamp": 1762414898596,
  "source": "gamepad",
  "kind": "axis",
  "axis": 1,
  "value": 0,
  "delta": -0.50,
  "magnitude": 0,
  "phase": "stop",
  "durationMs": 40
}
```

### Problems:
- ❌ Must track state across multiple messages
- ❌ Complex phase management (press/hold/release, start/move/stop)
- ❌ Only know about changed inputs, not full state
- ❌ Backend must reconstruct complete controller state
- ❌ More messages = more bandwidth

---

## NEW FORMAT (State-based) ✅

### Single message with complete state:

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

### Benefits:
- ✅ Complete controller state in every message
- ✅ Simple structure, easy to parse
- ✅ No need to track previous messages
- ✅ Direct mapping to robot commands
- ✅ Fewer messages when multiple inputs active
- ✅ Always know which buttons are pressed
- ✅ Always know all axis positions

---

## Example: Backend Processing

### Old Format (Complex):
```python
class GamepadState:
    def __init__(self):
        self.axes = {}
        self.buttons = {}
    
    def handle_message(self, msg):
        if msg["kind"] == "button":
            if msg["phase"] == "press":
                self.buttons[msg["button"]] = msg["value"]
            elif msg["phase"] == "release":
                self.buttons[msg["button"]] = 0
            elif msg["phase"] == "hold":
                self.buttons[msg["button"]] = msg["value"]
        
        elif msg["kind"] == "axis":
            if msg["phase"] in ["start", "move"]:
                self.axes[msg["axis"]] = msg["value"]
            elif msg["phase"] == "stop":
                self.axes[msg["axis"]] = 0
    
    def get_control(self):
        # Now we can finally use the state
        left_y = self.axes.get(1, 0)
        a_button = self.buttons.get(0, 0)
        return left_y, a_button

# Usage:
state = GamepadState()
# Must call handle_message for EVERY incoming message
state.handle_message(msg1)
state.handle_message(msg2)
state.handle_message(msg3)
# Finally get usable values
speed, pressed = state.get_control()
```

### New Format (Simple):
```python
def handle_control(msg):
    # Direct access to complete state
    axes = msg["axes"]
    buttons = msg["buttons"]
    
    # Get values directly
    left_y = float(axes.get("1", 0))
    a_button = float(buttons.get("0", 0))
    
    # Control robot immediately
    robot.set_speed(-left_y)
    if a_button > 0.5:
        robot.jump()

# Usage:
handle_control(msg)  # That's it!
```

---

## Message Frequency

Both formats send at ~50 Hz (every 20ms), but:

**Old Format:**
- Sends separate message for each active input
- 2 axes moving + 2 buttons pressed = 4 messages per frame
- 200 messages/second in active use

**New Format:**
- Sends one complete state snapshot
- All axes + all buttons = 1 message per frame
- 50 messages/second regardless of usage

**Result:** 75% reduction in message count during active use! 🎉
