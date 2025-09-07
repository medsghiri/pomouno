# Audio Fix for Non-Authenticated Users on Homepage

## Issue
Users without accounts were not getting audio on the homepage timer, but audio worked in the settings panel.

## Root Cause
The homepage timer components were using `AudioService` directly but weren't ensuring that audio metadata was loaded via React Query hooks. The `useAudioMetadata()` hook loads the necessary audio metadata from Firebase, but it wasn't being called in the homepage components.

## Solution
Added the `useAudioMetadata()` hook to all timer-related components that use `AudioService`:

### Components Fixed:

1. **`timer-with-title.tsx`** (Homepage timer component)
   - Added import: `import { useAudioMetadata } from "@/hooks/use-audio";`
   - Added hook call: `useAudioMetadata();`

2. **`timer-display.tsx`** (Timer display UI)
   - Added import: `import { useAudioMetadata } from "@/hooks/use-audio";`
   - Added hook call: `useAudioMetadata();`

3. **`timer-container.tsx`** (Timer container logic)
   - Added import: `import { useAudioMetadata } from "@/hooks/use-audio";`
   - Added hook call: `useAudioMetadata();`

4. **`sound-control-popover.tsx`** (Sound controls)
   - Added import: `import { useAudioMetadata } from "@/hooks/use-audio";`
   - Added hook call: `useAudioMetadata();`

## How It Works

The `useAudioMetadata()` hook:
- Has `enabled: true` so it loads for all users (authenticated and non-authenticated)
- Uses React Query with `staleTime: Infinity` for optimal caching
- Loads audio metadata from Firebase once and caches it indefinitely
- Allows `AudioService` to access cached audio data via React Query cache

## Component Chain
```
app/page.tsx 
└── homepage-with-interactions.tsx 
    └── timer-app.tsx 
        └── timer-with-title.tsx ✅ Fixed
            └── timer-display.tsx ✅ Fixed
                └── sound-control-popover.tsx ✅ Fixed
```

## Expected Result
- ✅ Audio now works for non-authenticated users on homepage
- ✅ Audio continues to work for authenticated users
- ✅ Audio works in settings panel (was already working)
- ✅ Optimal caching prevents unnecessary Firebase reads
- ✅ No breaking changes to existing functionality

## Technical Details

### Before Fix
- Settings panel worked because it already had the `useAudioMetadata()` hook
- Homepage components only used `AudioService.getInstance()` without ensuring metadata was loaded
- Non-authenticated users: No audio metadata → Silent timer

### After Fix
- All timer components now call `useAudioMetadata()` to ensure metadata is loaded
- React Query cache shares the audio metadata across all components
- AudioService can access the cached metadata regardless of authentication status

The fix ensures audio metadata is loaded early and cached properly, making audio available to all users across the entire application.
