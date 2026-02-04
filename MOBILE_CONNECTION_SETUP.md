# Mobile App Connection Setup Guide

## Problem
Your mobile app cannot connect to the backend because:
1. ✅ **FIXED**: Backend was only listening on `localhost` (127.0.0.1)
2. ✅ **FIXED**: CORS policy only allowed `localhost:9001`
3. ⚠️ **NEEDS ACTION**: Windows Firewall is blocking incoming connections on port 9000

## What I Fixed

### 1. Backend Network Configuration
**File**: `backend/PropertyRegistration.Api/Program.cs`

Changed the backend to listen on all network interfaces:
```csharp
// Configure URLs to listen on all network interfaces for mobile app access
app.Urls.Add("http://0.0.0.0:9000");
```

### 2. CORS Policy
**File**: `backend/PropertyRegistration.Api/Program.cs`

Updated CORS to allow requests from any origin (including mobile devices):
```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});
```

### 3. Mobile App Configuration
**Files**: 
- `mobile/lib/main.dart`
- `mobile/lib/services/api_service.dart`
- `mobile/lib/screens/api_config_screen.dart`

Set default API URL to your computer's IP address:
```dart
static String _baseUrl = 'http://192.168.100.254:9000/api';
```

## What You Need to Do

### Step 1: Add Windows Firewall Rule (REQUIRED)

**Option A: Run the Script (Easiest)**
1. Right-click `fix_mobile_connection.bat` in the project root
2. Select "Run as administrator"
3. Click "Yes" when prompted

**Option B: Manual Command**
Open Command Prompt as Administrator and run:
```cmd
netsh advfirewall firewall add rule name="Property Backend API" dir=in action=allow protocol=TCP localport=9000
```

### Step 2: Restart Your Backend
Stop and restart your .NET backend application for the changes to take effect.

### Step 3: Verify Backend is Accessible

**Check on your computer:**
```cmd
netstat -ano | findstr :9000
```
You should see: `TCP    0.0.0.0:9000           0.0.0.0:0              LISTENING`

**Test from your phone's browser:**
Open: `http://192.168.100.254:9000/api/health` (or any endpoint)

### Step 4: Test Mobile Login
1. Open the mobile app
2. Try logging in with username and password
3. Check the console for successful connection logs

## Network Requirements

✅ **Computer IP**: `192.168.100.254`
✅ **Backend Port**: `9000`
✅ **Backend URL**: `http://192.168.100.254:9000/api`
⚠️ **Both devices MUST be on the same WiFi network** (192.168.100.x)

## Troubleshooting

### Connection Still Timing Out?

**1. Check if backend is running:**
```cmd
netstat -ano | findstr :9000
```
Should show `0.0.0.0:9000` (not just `127.0.0.1:9000`)

**2. Check firewall rule:**
```cmd
netsh advfirewall firewall show rule name="Property Backend API"
```
Should show the rule details

**3. Test from computer browser:**
Open: `http://192.168.100.254:9000/api` (should work)

**4. Check if phone is on same WiFi:**
- Phone WiFi settings should show IP like `192.168.100.x`
- Computer IP is `192.168.100.254`

**5. Temporarily disable firewall (testing only):**
```cmd
netsh advfirewall set allprofiles state off
```
Try connecting from mobile. If it works, the firewall was the issue.
Re-enable firewall:
```cmd
netsh advfirewall set allprofiles state on
```
Then add the proper firewall rule.

### Still Not Working?

**Check mobile app logs for:**
- `Full URL: http://192.168.100.254:9000/api/auth/login` ✅
- `=== API RESPONSE ===` (should see this instead of timeout)

**Check backend logs for:**
- Incoming request from `192.168.100.x` IP address

## Debug Logs

The mobile app now has comprehensive debug logging:
- `=== APP STARTUP ===` - Shows initial configuration
- `=== LOGIN ATTEMPT ===` - Shows username and API URL
- `=== API REQUEST ===` - Shows full URL and request data
- `=== API RESPONSE ===` - Shows successful response
- `=== API ERROR ===` - Shows error details

## Production Considerations

For production deployment:
1. Use HTTPS instead of HTTP
2. Restrict CORS to specific origins
3. Deploy backend to a server with a public domain
4. Update mobile app API URL to production domain
5. Implement proper SSL certificate validation

## Quick Reference

| Item | Value |
|------|-------|
| Computer IP | 192.168.100.254 |
| Backend Port | 9000 |
| API Base URL | http://192.168.100.254:9000/api |
| Login Endpoint | http://192.168.100.254:9000/api/auth/login |
| Firewall Rule | Port 9000 TCP Inbound |

---

**Last Updated**: January 24, 2026
