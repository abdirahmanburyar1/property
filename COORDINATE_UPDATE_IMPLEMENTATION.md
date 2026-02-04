# GPS Coordinate Update Implementation

## Overview
This document describes the implementation of GPS coordinate updates for properties in the mobile app and backend.

## Backend Changes

### New Endpoint: PATCH /api/properties/{id}/coordinates

A dedicated, lightweight endpoint for updating only GPS coordinates.

**Location:** `PropertyRegistration.Api/Controllers/PropertiesController.cs`

**Features:**
- Simple, focused update for coordinates only
- No complex validation logic
- Faster execution than full property update
- Detailed debug logging
- Returns updated coordinates and timestamp

**Request:**
```json
{
  "latitude": 2.0469348,
  "longitude": 45.9073494
}
```

**Response:**
```json
{
  "id": "guid",
  "latitude": 2.0469348,
  "longitude": 45.9073494,
  "updatedAt": "2026-01-24T10:30:00Z",
  "message": "Coordinates updated successfully"
}
```

### Enhanced Full Update Endpoint

**Location:** `PropertyRegistration.Api/Controllers/PropertiesController.cs`

**Improvements:**
- Added debug logging for coordinate updates
- Better error messages
- Logs OwnerId/NewOwner presence to diagnose issues

## Mobile App Changes

### New API Service Method

**File:** `mobile/lib/services/api_service.dart`

**Added:**
```dart
static Future<Response> patch(String path, {dynamic data}) async
```

This enables PATCH HTTP requests for the coordinates endpoint.

### New Provider Method

**File:** `mobile/lib/providers/property_provider.dart`

**Added:**
```dart
Future<bool> updatePropertyCoordinates(
  String propertyId, 
  double latitude, 
  double longitude
)
```

**Benefits:**
- Type-safe method specifically for coordinates
- Uses dedicated PATCH endpoint
- Updates local property list
- Better error handling

### Enhanced Property Detail Screen

**File:** `mobile/lib/screens/property_detail_screen.dart`

**Features:**

#### 1. **Visual Coordinate Display (Read-Only Mode)**
- Coordinates shown in prominent blue card
- Monospace font for easy reading
- "Not set" fallback for missing coordinates
- Always visible, not hidden behind edit mode

#### 2. **Smart GPS Update Button**
- Always visible (not just in edit mode)
- Two behaviors:
  - **View Mode:** Gets GPS → Saves immediately via PATCH endpoint
  - **Edit Mode:** Gets GPS → Updates text fields → Saves on "Save" button
- Loading state with spinner
- Clear contextual help text

#### 3. **Manual Coordinate Entry**
- Text fields appear only in edit mode
- Supports decimal input
- Latitude and longitude side-by-side

#### 4. **Update Flow**

**Quick Update (View Mode):**
```
User clicks "Update from GPS"
  ↓
App gets GPS coordinates
  ↓
App calls PATCH /properties/{id}/coordinates
  ↓
Backend saves immediately
  ↓
UI updates, shows success message
```

**Manual Update (Edit Mode):**
```
User clicks Edit button
  ↓
Coordinate text fields appear
  ↓
User types coordinates OR clicks "Update from GPS"
  ↓
Coordinates populate text fields
  ↓
User clicks Save
  ↓
App calls PUT /properties/{id} with all fields
  ↓
Backend saves all changes
  ↓
UI exits edit mode, shows success
```

## Benefits of This Approach

### Performance
✅ **Faster Updates:** PATCH endpoint skips all Owner/ResponsiblePerson logic  
✅ **Less Network Data:** Only sends latitude/longitude  
✅ **Quicker Response:** Simpler backend processing

### User Experience
✅ **One-Tap Updates:** Quick GPS update without entering edit mode  
✅ **Always Visible:** Coordinates prominently displayed  
✅ **Clear Feedback:** Context-aware messages  
✅ **Flexible:** Can still manually edit if needed

### Code Quality
✅ **Separation of Concerns:** Dedicated endpoint for coordinates  
✅ **Type Safety:** Strongly-typed coordinate update method  
✅ **Debug Logging:** Easy troubleshooting  
✅ **Error Handling:** Graceful failure with user feedback

## Testing Checklist

### Backend
- [ ] Build backend successfully (`dotnet build`)
- [ ] Start backend (`dotnet run`)
- [ ] Test PATCH endpoint with Postman/curl
- [ ] Verify coordinates update in database
- [ ] Check debug logs appear

### Mobile App
- [ ] Hot reload app (`r` in terminal)
- [ ] Open any property detail screen
- [ ] Verify blue coordinates card appears
- [ ] Test "Update from GPS" in view mode (should save immediately)
- [ ] Test "Update from GPS" in edit mode (should update fields)
- [ ] Test manual coordinate entry
- [ ] Verify GPS permissions work
- [ ] Check error handling (disable GPS, test)

## Future Enhancements

1. **Map View:** Show property location on map
2. **Coordinate Validation:** Verify coordinates are within expected region
3. **Coordinate History:** Track coordinate changes over time
4. **Bulk Update:** Update coordinates for multiple properties
5. **Offline Support:** Queue coordinate updates when offline

## Related Files

### Backend
- `PropertyRegistration.Api/Controllers/PropertiesController.cs`
- `PropertyRegistration.Core/Entities/Property.cs`

### Mobile
- `mobile/lib/screens/property_detail_screen.dart`
- `mobile/lib/providers/property_provider.dart`
- `mobile/lib/services/api_service.dart`

### Documentation
- `COORDINATE_UPDATE_IMPLEMENTATION.md` (this file)

---

**Last Updated:** January 24, 2026  
**Author:** AI Assistant  
**Status:** ✅ Complete - Ready for Testing
