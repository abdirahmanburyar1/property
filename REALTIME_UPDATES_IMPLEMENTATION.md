# Real-Time Property Updates with SignalR and RabbitMQ

## Overview
This document describes the implementation of real-time property updates using SignalR (WebSocket) and RabbitMQ message broker. When property coordinates are updated, all connected clients viewing that property receive immediate updates without refreshing.

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│  Mobile Client  │         │  Mobile Client   │
│   (Flutter)     │         │    (Flutter)     │
└────────┬────────┘         └────────┬─────────┘
         │                           │
         │ WebSocket (SignalR)       │ WebSocket
         │                           │
         ▼                           ▼
┌──────────────────────────────────────────────┐
│         .NET Backend (SignalR Hub)           │
│  ┌────────────────────────────────────────┐  │
│  │         PropertyHub                    │  │
│  │  - Manages WebSocket connections       │  │
│  │  - Broadcasts property updates         │  │
│  │  - Handles subscribe/unsubscribe       │  │
│  └────────────────────────────────────────┘  │
│              ▲                    │           │
│              │                    │           │
│       RabbitMQ Consumer    RabbitMQ Publisher│
│              │                    │           │
└──────────────┼────────────────────┼───────────┘
               │                    │
               │    ┌───────────┐   │
               └────│  RabbitMQ │◄──┘
                    │  Message  │
                    │  Broker   │
                    └───────────┘
```

## Flow

### 1. Client Connects
1. User logs into mobile app
2. Auth token is stored
3. **SignalR connection** is established automatically
4. Connection authenticated with JWT token

### 2. Subscribe to Property
1. User opens property detail screen
2. Screen calls `SignalRService.subscribeToProperty(propertyId)`
3. SignalR Hub adds connection to property-specific group

### 3. Coordinate Update
1. User or another client updates property coordinates
2. Backend updates database
3. Backend publishes message to **RabbitMQ** exchange
4. Background service consumes message from RabbitMQ
5. Background service broadcasts via **SignalR** to:
   - Specific property group (targeted clients)
   - All clients (for dashboards/lists)
6. Mobile app receives update
7. UI updates automatically with new coordinates

### 4. Unsubscribe
1. User leaves property detail screen
2. Screen calls `SignalRService.unsubscribeFromProperty(propertyId)`
3. Connection removed from property group

## Backend Implementation

### 1. SignalR Hub
**File:** `PropertyRegistration.Api/Hubs/PropertyHub.cs`

```csharp
[Authorize]
public class PropertyHub : Hub
{
    public async Task SubscribeToProperty(string propertyId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"property_{propertyId}");
    }

    public async Task UnsubscribeFromProperty(string propertyId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"property_{propertyId}");
    }
}
```

### 2. RabbitMQ Service
**File:** `PropertyRegistration.Api/Services/RabbitMQService.cs`

**Features:**
- Publishes property update messages
- Consumes messages for broadcasting
- Automatic reconnection
- Fallback configuration

**Message Format:**
```json
{
  "propertyId": "guid",
  "updateType": "coordinates",
  "timestamp": "2026-01-24T10:30:00Z",
  "data": {
    "latitude": 2.0469348,
    "longitude": 45.9073494
  }
}
```

### 3. Background Service
**File:** `PropertyRegistration.Api/Services/PropertyUpdateBackgroundService.cs`

- Runs continuously in the background
- Listens to RabbitMQ messages
- Broadcasts via SignalR to connected clients
- Handles errors gracefully

### 4. Controller Integration
**File:** `PropertyRegistration.Api/Controllers/PropertiesController.cs`

After updating coordinates:
```csharp
_rabbitMQService.PublishPropertyUpdate(new PropertyUpdateMessage
{
    PropertyId = property.Id.ToString(),
    UpdateType = "coordinates",
    Timestamp = DateTime.UtcNow,
    Data = new { latitude, longitude }
});
```

### 5. Configuration
**File:** `appsettings.json`

```json
{
  "RabbitMQ": {
    "Host": "localhost",
    "Port": "5672",
    "Username": "guest",
    "Password": "guest",
    "VirtualHost": "/"
  }
}
```

### 6. Program.cs Registration

```csharp
// Register services
builder.Services.AddSingleton<IRabbitMQService, RabbitMQService>();
builder.Services.AddHostedService<PropertyUpdateBackgroundService>();
builder.Services.AddSignalR();

// Configure CORS for SignalR
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(origin => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Required for SignalR
    });
});

// Map hub
app.MapHub<PropertyHub>("/hubs/property");
```

## Mobile App Implementation

### 1. SignalR Service
**File:** `mobile/lib/services/signalr_service.dart`

**Features:**
- Manages WebSocket connection
- Automatic reconnection
- JWT authentication
- Subscribe/unsubscribe to properties
- Event listeners

**Methods:**
```dart
SignalRService.initialize()
SignalRService.subscribeToProperty(propertyId)
SignalRService.unsubscribeFromProperty(propertyId)
SignalRService.onPropertyUpdated(callback)
SignalRService.dispose()
```

### 2. Authentication Integration
**File:** `mobile/lib/providers/auth_provider.dart`

- Initializes SignalR after successful login
- Disposes SignalR connection on logout

### 3. Property Detail Screen
**File:** `mobile/lib/screens/property_detail_screen.dart`

**On Screen Open:**
1. Subscribe to property updates
2. Set up update listener
3. Update UI when coordinates change
4. Show notification snackbar

**On Screen Close:**
1. Unsubscribe from property updates

### 4. Package Dependencies
**File:** `mobile/pubspec.yaml`

```yaml
dependencies:
  signalr_netcore: ^1.3.7
```

## Setup Instructions

### Backend Setup

#### 1. Install RabbitMQ

**Windows:**
```bash
# Install using Chocolatey
choco install rabbitmq

# Or download from https://www.rabbitmq.com/download.html
```

**Linux:**
```bash
sudo apt-get update
sudo apt-get install rabbitmq-server
sudo systemctl start rabbitmq-server
sudo systemctl enable rabbitmq-server
```

**Docker:**
```bash
docker run -d --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management
```

#### 2. Verify RabbitMQ

Open RabbitMQ Management UI: http://localhost:15672
- Username: `guest`
- Password: `guest`

#### 3. Build and Run Backend

```bash
cd backend/PropertyRegistration.Api
dotnet restore
dotnet build
dotnet run
```

### Mobile App Setup

#### 1. Install Dependencies

```bash
cd mobile
flutter pub get
```

#### 2. Run App

```bash
flutter run
```

## Testing Real-Time Updates

### Test Scenario

1. **Setup:**
   - Start RabbitMQ
   - Start backend (dotnet run)
   - Start mobile app on Device A
   - Start mobile app on Device B (or emulator)

2. **Test:**
   - Login on both devices
   - Open same property on both devices
   - On Device A: Click "Update from GPS"
   - **Expected Result:** Device B receives update immediately
   - Device B shows: "📍 Coordinates updated in real-time"

3. **Verify:**
   - Check backend logs for RabbitMQ publish/consume
   - Check SignalR connection logs
   - Verify coordinates match on both devices

### Debug Logs

**Backend:**
```
=== UPDATING PROPERTY COORDINATES ===
Property ID: {guid}
Latitude: 2.0469348
Longitude: 45.9073494
=== COORDINATES UPDATED SUCCESSFULLY ===
=== PUBLISHED COORDINATES UPDATE TO RABBITMQ ===
```

**Mobile App (Device A - Updater):**
```
=== UPDATING COORDINATES ONLY (via PATCH endpoint) ===
Property ID: {guid}
Update coordinates response status: 200
```

**Mobile App (Device B - Receiver):**
```
SignalR: message received
=== PROPERTY UPDATE RECEIVED IN UI ===
Property ID: {guid}
Update Type: coordinates
Update is for current property
📍 Coordinates updated in real-time
```

## Benefits

✅ **Instant Updates:** No polling, no refresh needed  
✅ **Scalable:** RabbitMQ handles message distribution  
✅ **Reliable:** Automatic reconnection on both SignalR and RabbitMQ  
✅ **Efficient:** Only subscribed clients receive updates  
✅ **Extensible:** Easy to add more update types (status, details, etc.)  
✅ **Graceful Degradation:** Works even if RabbitMQ is unavailable

## Future Enhancements

1. **More Update Types:** Property status, owner changes, payments
2. **Presence Indicators:** Show who else is viewing a property
3. **Conflict Resolution:** Handle simultaneous edits
4. **Offline Queue:** Store updates when offline, sync when online
5. **Push Notifications:** Mobile notifications even when app is closed
6. **Analytics:** Track real-time user activity

## Troubleshooting

### SignalR Connection Fails

**Problem:** Mobile app can't connect to SignalR  
**Solution:**
1. Check backend is running on `0.0.0.0:9000`
2. Verify mobile device can reach backend IP
3. Check JWT token is valid
4. Enable SignalR debug logs in mobile app

### RabbitMQ Connection Fails

**Problem:** Backend can't connect to RabbitMQ  
**Solution:**
1. Verify RabbitMQ is running: `rabbitmqctl status`
2. Check port 5672 is accessible
3. Try default credentials (guest/guest)
4. Check `appsettings.json` configuration

### Updates Not Received

**Problem:** Mobile app doesn't receive real-time updates  
**Solution:**
1. Verify SignalR is connected: check logs
2. Confirm property subscription: check `subscribeToProperty` call
3. Test RabbitMQ publish/consume: check backend logs
4. Verify update message format matches expected structure

### Multiple Updates Received

**Problem:** Same update received multiple times  
**Solution:**
1. Check if multiple `onPropertyUpdated` listeners registered
2. Verify unsubscribe is called on screen dispose
3. Ensure SignalR connection is not duplicated

## Related Files

### Backend
- `PropertyRegistration.Api/Hubs/PropertyHub.cs`
- `PropertyRegistration.Api/Services/RabbitMQService.cs`
- `PropertyRegistration.Api/Services/PropertyUpdateBackgroundService.cs`
- `PropertyRegistration.Api/Controllers/PropertiesController.cs`
- `PropertyRegistration.Api/Program.cs`
- `PropertyRegistration.Api/appsettings.json`

### Mobile
- `mobile/lib/services/signalr_service.dart`
- `mobile/lib/providers/auth_provider.dart`
- `mobile/lib/screens/property_detail_screen.dart`
- `mobile/pubspec.yaml`

### Documentation
- `REALTIME_UPDATES_IMPLEMENTATION.md` (this file)
- `COORDINATE_UPDATE_IMPLEMENTATION.md`

---

**Last Updated:** January 24, 2026  
**Author:** AI Assistant  
**Status:** ✅ Complete - Ready for Testing

## Quick Start Checklist

- [ ] Install RabbitMQ
- [ ] Start RabbitMQ service
- [ ] Verify RabbitMQ management UI accessible
- [ ] Run `flutter pub get` in mobile directory
- [ ] Start backend: `dotnet run`
- [ ] Verify SignalR hub mapped: Check logs for "/hubs/property"
- [ ] Start mobile app on two devices
- [ ] Test coordinate update propagation
- [ ] Check logs on both backend and mobile apps
