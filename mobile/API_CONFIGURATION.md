# Mobile App API Configuration Guide

## Problem: Login Not Working

The mobile app cannot connect to `localhost` because on Android devices, `localhost` refers to the device itself, not your computer running the backend server.

## Solution: Configure API URL

### Step 1: Find Your Computer's IP Address

**On Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your WiFi or Ethernet adapter.
Example: `192.168.1.100`

**On Mac/Linux:**
```bash
ifconfig
```
or
```bash
ip addr show
```
Look for your WiFi/Ethernet interface IP address.

### Step 2: Configure API URL in Mobile App

1. **Open the app**
2. **On Login Screen**, tap the **Settings** icon (⚙️) in the top right
3. **Enter your API URL** in this format:
   ```
   http://YOUR_IP_ADDRESS:9000/api
   ```
   Example:
   ```
   http://192.168.1.100:9000/api
   ```
4. **Tap "Save & Apply"**

### Step 3: Login

Now try logging in with your username and password.

## Important Notes

### ✅ Requirements
- Your phone and computer **MUST be on the same WiFi network**
- Your backend server must be running
- Firewall should allow connections on port 9000

### 🔧 For Android Emulator
If you're using Android Emulator on your computer:
- Use: `http://10.0.2.2:9000/api`
- `10.0.2.2` is a special IP that maps to your computer's localhost in the emulator

### 🔧 For Physical Device
If using a real Android phone:
1. Connect to the same WiFi as your computer
2. Find your computer's IP address (e.g., 192.168.1.100)
3. Use: `http://192.168.1.100:9000/api`

### 🔧 Testing the Connection

To verify your backend is accessible:

**From your computer:**
```bash
curl http://YOUR_IP:9000/api/health
```

**From your phone's browser:**
Navigate to: `http://YOUR_IP:9000/api/health`

If you see a response, the connection works!

## Debugging

### Check Backend Logs
Watch the terminal where your backend is running. You should see incoming requests when you try to login.

### Check Mobile App Logs
In Android Studio or via `flutter run`, check the console output for:
```
Login DioException: ...
Login error message: ...
Login error response: ...
```

### Common Issues

**Issue: "Failed to connect"**
- Solution: Ensure both devices are on same WiFi
- Check firewall settings
- Verify backend is running

**Issue: "Connection timeout"**
- Solution: Check IP address is correct
- Verify port 9000 is open
- Try pinging the IP from your phone

**Issue: "Network unreachable"**
- Solution: Phone WiFi might be off
- Computer might be using VPN
- Try restarting WiFi on both devices

## Production Deployment

For production, you should:
1. Deploy backend to a server with a public IP or domain
2. Use HTTPS instead of HTTP
3. Configure API URL to: `https://your-domain.com/api`

## Default URLs

- **Android Emulator**: `http://10.0.2.2:9000/api`
- **Local Network**: `http://YOUR_LOCAL_IP:9000/api`
- **Production**: `https://your-domain.com/api`

---

**Need help?** Check the backend logs and mobile app console for detailed error messages.
