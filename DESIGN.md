---
name: Synthetic Command
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#849495'
  outline-variant: '#3b494b'
  surface-tint: '#00dbe9'
  primary: '#dbfcff'
  on-primary: '#00363a'
  primary-container: '#00f0ff'
  on-primary-container: '#006970'
  inverse-primary: '#006970'
  secondary: '#ddb7ff'
  on-secondary: '#490080'
  secondary-container: '#6f00be'
  on-secondary-container: '#d6a9ff'
  tertiary: '#d8ffe7'
  on-tertiary: '#003824'
  tertiary-container: '#65f2b5'
  on-tertiary-container: '#006d4a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#7df4ff'
  primary-fixed-dim: '#00dbe9'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#ddb7ff'
  on-secondary-fixed: '#2c0051'
  on-secondary-fixed-variant: '#6900b3'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  data-lg:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 20px
  data-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.08em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 12px
  margin: 20px
---

## Brand & Style

This design system establishes a high-fidelity operational environment for robotics and teleoperation. The brand personality is **precise, industrial, and mission-critical**. It is designed for professional operators who require rapid information processing and low cognitive load during high-stakes maneuvers.

The visual style is a blend of **Corporate Modernism** and **Tactile Industrialism**. It utilizes a "Command Center" aesthetic—balancing dense data visualization with clean, purposeful white space (or "dark space"). The interface evokes the feeling of high-end hardware through subtle bevels, precise borders, and a depth model that prioritizes utility over decoration. Every element feels grounded and responsive, mirroring the physical machines being controlled.

## Colors

The palette is optimized for long-duration monitoring in low-light environments. 

- **Primary (Electric Cyan):** Reserved for primary actions, active telemetry states, and critical system indicators.
- **Secondary (Cyber Purple):** Used for auxiliary controls, specialized modes (like "Poses"), and secondary data streams.
- **Tertiary (Robot Green):** Indicates healthy status, successful connections, and "Ready" states.
- **Base Tones:** A strict hierarchy of deep charcoals and slates. The background is near-black to maximize contrast with data visualizations. 
- **Functional Accents:** Vibrant oranges (#F59E0B) and reds (#EF4444) are used sparingly for warnings and emergency stops to ensure immediate visual salience.

## Typography

The typographic system prioritizes legibility and technical clarity. 

1. **Hanken Grotesk** is used for headers and titles, providing a modern, sharp geometric feel that reflects engineering precision.
2. **Inter** handles all standard UI labels and body text, ensuring maximum readability at small sizes.
3. **JetBrains Mono** is the "Data Voice." It is used for telemetry, timestamps, robot IDs, and terminal outputs. Its monospaced nature prevents layout shifting when numerical values update rapidly.

Use **label-caps** for section headers and non-interactive metadata to create a clear structural hierarchy.

## Layout & Spacing

The layout utilizes a **Fixed-Fluid Hybrid** model. Navigation and sidebars are fixed-width to ensure control stability, while the central viewport (the "Camera Feed" or "World View") scales fluidly.

- **The Control Grid:** A strict 4px baseline grid ensures alignment across dense telemetry panels.
- **Panel Logic:** Content is grouped into "Modules" with 12px gutters. This density is necessary for a professional dashboard where seeing all data at once is more important than excessive whitespace.
- **Responsive Reflow:** On smaller displays (Tablets), sidebars collapse into "Drawers" to prioritize the camera feed. Desktop viewports should maintain a persistent 3-column layout (System Status | Live Feed | Dataset/Controls).

## Elevation & Depth

This design system uses **Tonal Layering** combined with **Low-Contrast Outlines** to create a sense of physical hardware.

- **Background:** The absolute base is `#0B0B0C`.
- **Primary Containers:** Elevated one step to `#121212` with a 1px solid border of `#333336`.
- **Interactive Elements:** Buttons and inputs use a "Tactile" approach. This is achieved through a subtle inner-glow (top edge) and a slight drop shadow (2px) to make them appear raised from the panel surface.
- **Active Overlay:** Modal windows and pop-overs use a heavy backdrop blur (12px) and a slightly brighter border (`#444448`) to detach them from the operational layer.
- **Depth Indicators:** Use subtle inner shadows for input fields to make them appear "etched" into the surface.

## Shapes

The shape language is **Soft (0.25rem)**. This provides a professional, industrial look that feels more modern than sharp 90-degree corners, yet more serious than rounded pill-shaped interfaces.

- **Standard Elements (Buttons, Inputs, Cards):** 4px (0.25rem) radius.
- **Large Containers (Viewports, Sidebars):** 8px (0.5rem) radius.
- **Status Indicators:** Use circular shapes (100% radius) for connection pips and status lights.
- **Selection States:** Use sharp-cornered accent bars (2px wide) on the left side of active list items to reinforce the industrial "indicator" feel.

## Components

### Buttons
- **Primary:** Solid Cyan fill with black text. On hover, apply a high-density outer glow of the primary color.
- **Ghost/Outline:** 1px border of the accent color with transparent background.
- **Tactile Toggle:** Buttons that represent a persistent state (like "Record") should use a saturated color fill when active and a dark, inset style when inactive.

### Inputs & Selectors
- Background should be `#121212` with a 1px border.
- Focus state: Border changes to Primary Cyan with a 0 0 0 2px Cyan/20% spread.
- Dropdowns: Use JetBrains Mono for the list items to maintain the technical aesthetic.

### Status Indicators
- **Connected:** Pulsing Green (`#10B981`) dot.
- **Warning:** Static Amber (`#F59E0B`) triangle icon.
- **Critical/Disconnected:** Flashing Red (`#EF4444`) dot with label.

### Cards & Modules
- Every card must have a "Header Bar" using the `label-caps` typography and a 1px bottom border. 
- Content within cards should use the `md` spacing unit (16px) for internal padding.

### Data Visualization
- Line charts should use 2px stroke widths with no area fill, unless tracking "Cumulative" data.
- Grid lines in charts should be `#222225` with dotted patterns to keep the focus on the data trends.