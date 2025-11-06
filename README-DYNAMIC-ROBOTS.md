# Robot Interface API Update

## Changes Implemented

We've updated the Home page of our robot teaching interface to fetch both robot data and control devices dynamically from the API endpoints instead of using static data.

### Key Changes

1. **API Configuration**

   - Created a central configuration file at `src/config/api.ts` for managing API endpoints
   - Separated base URLs and endpoints for better maintainability

2. **TypeScript Types**

   - Added proper TypeScript interfaces for robot and control device data in `src/types/robot.ts`
   - Created mapping between API response formats and application formats

3. **Services**

   - Implemented a robot service in `src/services/robotService.ts` for API communication
   - Added error handling and response transformation
   - Created mapping functions for both robots and operator devices

4. **Custom Hooks**

   - Created a `useRobots` hook in `src/hooks/useRobots.ts` for data fetching
   - Implemented auto-refresh of robot and control device data every 30 seconds
   - Added manual refresh functionality for both data types

5. **UI Components**

   - Added loading skeletons in `src/components/RobotSkeleton.tsx` for both robots and control devices
   - Added empty state displays when no robots or control devices are available
   - Added refresh buttons to manually update lists
   - Added status indicators for robots (online/offline)

6. **WebRTC Connection**
   - Refactored WebRTC connection test to use the service layer

## API Formats

### Robots API Endpoint

The robots API endpoint returns data in this format:

```json
{
  "robots": [
    {
      "robot_id": "jackal_kinova",
      "address": "http://127.0.0.1:8000",
      "heartbeat_interval": 5,
      "last_seen": "2025-10-22T01:24:18.082232+00:00",
      "heartbeat_age_ms": 3492.032,
      "expires_in_ms": 11507.968,
      "signaling": {
        "robot_connected": true,
        "operator_count": 0
      }
    }
  ]
}
```

### Control Devices API Endpoint

The operator devices API endpoint returns data in this format:

```json
{
  "devices": [
    {
      "name": "ps5 controller",
      "type": "gamepad",
      "image_svg": "<svg>...</svg>"
    },
    {
      "name": "keyboard",
      "type": "input",
      "image_svg": "<svg>...</svg>"
    },
    {
      "name": "KUKA smartPAD",
      "type": "industrial",
      "image_svg": "<svg>...</svg>"
    }
  ]
}
```

## Project Structure

New files added:

- `/src/config/api.ts` - API configuration for all endpoints
- `/src/types/robot.ts` - TypeScript interfaces for robots and control devices
- `/src/services/robotService.ts` - Service for API interactions with both endpoints
- `/src/hooks/useRobots.ts` - Custom hook for fetching both robot and control device data
- `/src/components/RobotSkeleton.tsx` - UI components for loading states for both robots and control devices

## Implementation Details

- Both robots and control devices are fetched simultaneously on page load
- Auto-refresh happens every 30 seconds for fresh data
- Error states are handled independently for both data types
- Loading skeletons are shown during data fetching
- Empty states are displayed when no data is available

## Future Improvements

- Add caching mechanism for both robot and control device data
- Implement filtering and sorting options
- Add robot details page with more information
- Implement SVG image rendering for control devices
- Improve error handling with retry mechanisms
