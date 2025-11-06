# Dataset Selection Feature

## Overview

Added a dataset selection and creation feature to the Training Interface, allowing users to organize their training episodes by dataset.

## Changes Made

### 1. API Layer (`src/lib/api.ts`)

Added two new API functions:

#### `fetchDatasets()`

- **Endpoint**: `GET /datasets/`
- **Returns**: Array of dataset names
- **Response Format**:
  ```json
  {
    "datasets": ["example_dataset", "another_dataset"]
  }
  ```

#### `createDataset(datasetId: string)`

- **Endpoint**: `POST /datasets/upload`
- **Parameters**: `dataset_id` (as FormData)
- **Returns**: void (throws error on failure)

### 2. UI Components (`src/components/TrainingInterface.tsx`)

#### New Imports

- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` - Dropdown for dataset selection
- `Dialog`, `DialogContent`, `DialogHeader`, etc. - Modal for creating new datasets
- `Input` - Text input for dataset name
- `Label` - Form labels
- `FolderPlus` icon - Icon for "Create New Dataset" option

#### New State Variables

- `datasets: string[]` - List of available datasets
- `selectedDataset: string` - Currently selected dataset
- `isLoadingDatasets: boolean` - Loading state for datasets fetch
- `isCreateDialogOpen: boolean` - Controls the create dataset dialog visibility
- `newDatasetName: string` - Name input for new dataset
- `isCreatingDataset: boolean` - Loading state for dataset creation

#### New Functions

- `loadDatasets()` - Fetches datasets from API and sets the first one as default
- `handleCreateDataset()` - Creates a new dataset and refreshes the list

#### UI Layout

**Dataset Selection Section** (in sidebar):

- Located at the top of the Episode Management sidebar
- Dropdown select with all available datasets
- "Create New Dataset" option at the bottom of the dropdown (with FolderPlus icon)
- Shows current dataset selection with a helper text

**Create Dataset Dialog**:

- Modal dialog that appears when "Create New Dataset" is selected
- Input field for dataset name
- Cancel and Create buttons
- Enter key support for quick creation
- Validation for empty names

## User Flow

1. User opens the Episode Management sidebar
2. Datasets are automatically loaded and the first one is selected by default
3. User can:
   - Select an existing dataset from the dropdown
   - Click "Create New Dataset" to open the creation dialog
4. When creating a new dataset:
   - Enter a dataset name
   - Press Enter or click "Create Dataset"
   - Dialog closes and the new dataset is automatically selected
   - Success toast notification appears

## API Integration

The feature integrates with the backend API at `http://127.0.0.1:8100`:

- Base URL is configurable via `VITE_CLOUD_API_BASE_URL` environment variable
- Uses the existing `buildApiUrl()` helper for consistent URL construction
- Follows the same error handling patterns as other API calls

## Styling

- Consistent with the existing dark theme (gray-900 background)
- Purple accents for primary actions
- Green color for "Create New Dataset" option
- Proper focus states and hover effects
- Disabled states for loading scenarios

## Error Handling

- Toast notifications for errors and success messages
- Proper loading states to prevent multiple submissions
- Validation for empty dataset names
- Try-catch blocks with proper error logging

## Code Quality

- TypeScript interfaces for type safety
- Proper use of React hooks (useState, useEffect, useCallback)
- Clean separation of concerns (API layer vs UI layer)
- Follows existing code patterns and conventions
- No ESLint errors
