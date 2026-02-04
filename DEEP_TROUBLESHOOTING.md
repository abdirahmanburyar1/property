# Deep Troubleshooting Guide - Mobile Connection Issues

## Current Status

Based on the logs, your mobile app is:
- ✅ Correctly configured with IP: `192.168.100.254:9000`
- ✅ Sending requests to the right URL
- ❌ **Timing out after 30 seconds** (connection not reaching backend)

## Root Cause Analysis

The connection timeout means the request **never reaches the backend**. Possible causes:

### 1. Windows Firewall Blocking (Most Likely) ⚠️
**Symptom**: Backend is running, but mobile can't connect
**Solution**: Add firewall rule (see steps below)

### 2. Backend Not Listening on Network Interface
**Symptom**: Backend only listens on `127.0.0.1:9000` instead of `0.0.0.0:9000`
**Solution**: Restart backend after code changes

### 3. Devices on Different Networks
**Symptom**: Phone WiFi shows different IP range
**Solution**: Connect both to same WiFi network

### 4. Network/Router Isolation
**Symptom**: Router blocks device-to-device communication
**Solution**: Disable AP isolation in router settings

## Step-by-Step Fix

### Step 1: Run Diagnostics

Run the diagnostic script:
```cmd
diagnose_connection.bat
```

This will check:
- ✅ Backend is running
- ✅ Backend listening on correct interface
- ✅ Firewall rule exists
- ✅ Backend responds to requests

### Step 2: Add Firewall Rule (REQUIRED)

**Option A: Automated Script**
1. Right-click `fix_mobile_connection.bat`
2. Select "Run as administrator"
3. Press any key when prompted
4. Wait for success message

**Option B: Manual Command**
Open Command Prompt as Administrator:
```cmd
netsh advfirewall firewall add rule name="Property Backend API" dir=in action=allow protocol=TCP localport=9000
```

### Step 3: Restart Backend

**IMPORTANT**: You MUST restart your backend for changes to take effect!

1. Stop the running backend (Ctrl+C or stop debugging)
2. Start it again
3. Look for these messages in the console:

```
===========================================
=== BACKEND SERVER STARTING ===
Environment: Development
===========================================
Listening on: http://0.0.0.0:9000
API Base: http://0.0.0.0:9000/api
CORS: AllowAll (any origin)
===========================================
```

### Step 4: Verify Backend is Accessible

**From your computer (in Command Prompt):**
```cmd
netstat -ano | findstr :9000
```

You should see:
```
TCP    0.0.0.0:9000           0.0.0.0:0              LISTENING
```

**NOT this:**
```
TCP    127.0.0.1:9000         0.0.0.0:0              LISTENING
```

### Step 5: Test from Mobile

1. Open the mobile app
2. Try logging in
3. **Watch the backend console** - you should see:

```
[2026-01-24 15:30:45] POST /api/auth/login from 192.168.100.x
=================================
=== LOGIN REQUEST RECEIVED ===
Timestamp: 1/24/2026 3:30:45 PM
Remote IP: 192.168.100.xxx
Username: abdi
Password Length: 8
=================================
```

If you see this, the connection works! 🎉

## Debug Output You Should See

### Backend Console (when mobile connects):

```
[2026-01-24 15:30:45] POST /api/auth/login from 192.168.100.xxx
=================================
=== LOGIN REQUEST RECEIVED ===
Timestamp: 1/24/2026 3:30:45 PM
Remote IP: 192.168.100.xxx
Username: abdi
Password Length: 8
=================================
Looking up user: abdi
User found: abdi (ID: 123)
Verifying password...
Password verified successfully
Fetching user roles...
User roles: USER, ADMIN
Generating JWT token...
Token generated (length: 234)
=== LOGIN SUCCESSFUL ===
User: abdi
Roles: USER, ADMIN
=================================
[2026-01-24 15:30:45] POST /api/auth/login -> 200
```

### Mobile App Console (when login succeeds):

```
=== LOGIN ATTEMPT ===
Username: abdi
Stored API URL: NOT SET
Current API Base URL: http://192.168.100.254:9000/api
=== API REQUEST ===
Method: POST
Path: /auth/login
Full URL: http://192.168.100.254:9000/api/auth/login
Data: {username: abdi, password: password}
Token: None
=== API RESPONSE ===
Status: 200
Data: {token: eyJ..., user: {...}}
Login response status: 200
Login successful!
```

## If Still Not Working

### Check 1: Verify Network Configuration

**On Computer:**
```cmd
ipconfig
```
Look for: `IPv4 Address. . . . . . . . . . . : 192.168.100.254`

**On Phone:**
Settings → WiFi → Your Network → IP Address
Should be: `192.168.100.xxx` (same 192.168.100.x range)

### Check 2: Temporarily Disable Firewall (Testing Only)

```cmd
# Disable (as Administrator)
netsh advfirewall set allprofiles state off

# Try connecting from mobile app

# Re-enable immediately
netsh advfirewall set allprofiles state on
```

If it works with firewall off, the firewall is the issue. Add the rule properly.

### Check 3: Test from Another Device

Open a browser on another computer/phone on the same network:
```
http://192.168.100.254:9000/api/auth/login
```

You should see a JSON error (method not allowed for GET), which proves the server is reachable.

### Check 4: Router AP Isolation

Some routers have "AP Isolation" or "Client Isolation" enabled, which prevents devices from talking to each other.

**Fix:**
1. Open router admin page (usually `192.168.100.1`)
2. Look for "AP Isolation", "Client Isolation", or "Wireless Isolation"
3. **Disable** it
4. Restart router and reconnect devices

### Check 5: Antivirus/Security Software

Some antivirus software also has firewall features:
- Windows Defender
- Norton
- McAfee
- Kaspersky
- etc.

Check their settings and allow connections on port 9000.

## Expected Files Modified

1. ✅ `backend/PropertyRegistration.Api/Program.cs`
   - Added `app.Urls.Add("http://0.0.0.0:9000")`
   - Added request logging middleware
   - Changed CORS to `AllowAll`

2. ✅ `backend/PropertyRegistration.Api/Controllers/AuthController.cs`
   - Added comprehensive debug logging to login endpoint

3. ✅ `mobile/lib/services/api_service.dart`
   - Changed default from `localhost` to `192.168.100.254`
   - Added debug logging

4. ✅ `mobile/lib/main.dart`
   - Updated default API URL

5. ✅ `mobile/lib/providers/auth_provider.dart`
   - Added debug logging

## Quick Reference Commands

```cmd
# Check backend is running
netstat -ano | findstr :9000

# Check firewall rule
netsh advfirewall firewall show rule name="Property Backend API"

# Add firewall rule (as Admin)
netsh advfirewall firewall add rule name="Property Backend API" dir=in action=allow protocol=TCP localport=9000

# Get your IP
ipconfig | findstr IPv4

# Test backend locally
curl http://localhost:9000/api/auth/login -X POST -H "Content-Type: application/json" -d "{\"username\":\"test\",\"password\":\"test\"}"
```

## Next Steps After Fix

Once login works:
1. ✅ Remove debug logs from production code
2. ✅ Implement proper logging framework (Serilog, NLog)
3. ✅ Restrict CORS to specific origins in production
4. ✅ Use HTTPS with valid SSL certificate
5. ✅ Deploy to proper server with public domain

---

**Last Updated**: January 24, 2026

**Key Takeaway**: The most common issue is Windows Firewall blocking incoming connections on port 9000. The fix is to add a firewall rule as Administrator.
