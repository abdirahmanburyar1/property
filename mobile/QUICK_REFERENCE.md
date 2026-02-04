# Quick Reference Guide - Payment & Printing

## 🚀 Quick Start

### First Time Setup
```bash
cd mobile
flutter pub get
flutter run
```

### Connect Bluetooth Printer
1. **Pair in Android Settings**
   - Settings → Bluetooth → Pair new device
   - Find your printer (e.g., "BlueTooth Printer", "RPP02N")
   - Pair it

2. **Connect in App**
   - Menu (☰) → Printer Settings
   - Tap "Scan for Printers"
   - Select your printer
   - Tap "Print Test Page"

## 💰 Collect Payment

### Quick Steps
1. Menu → **Collect Payment**
2. Select **Property**
3. Enter **Amount**
4. Choose **Payment Method**
5. Select **Date/Time** (defaults to now)
6. Add **Notes** (optional)
7. Tap **"Record Payment"**
8. Choose to **Print** or **Skip**

### Payment Methods
- 💵 **CASH** - Direct cash payment
- 🏦 **BANK_TRANSFER** - Bank transfer
- 📱 **MOBILE_MONEY** - Mobile money (EVC, Zaad, etc.)
- 📝 **CHEQUE** - Check payment

## 📊 View Payment History

### Access History
Menu → **Payment History**

### Actions
- **Tap payment** → View full details
- **Print icon (🖨️)** → Reprint receipt
- **Pull down** → Refresh list

## 🖨️ Printing

### Print Receipt
**After Payment:**
- Dialog appears automatically
- Tap "Print Receipt"

**From History:**
- Tap print icon on any payment
- Or open payment details → "Print Receipt"

### Receipt Includes
- ✅ Company header
- ✅ Receipt number
- ✅ Date & time
- ✅ Property address
- ✅ Owner info
- ✅ Amount & method
- ✅ Payment status
- ✅ Notes

### Troubleshooting Printing
| Problem | Solution |
|---------|----------|
| Printer not found | Pair in Android Bluetooth settings |
| Connection fails | Restart printer, try again |
| Blank receipt | Check paper and battery |
| Garbled text | Use ESC/POS compatible printer |

## 🏠 Property Management

### Create Property
1. Menu → **Create Property**
2. Fill in details:
   - Property type
   - Address
   - Dimensions
   - Location (auto-captured)
   - Owner info
3. Tap **"Create Property"**

### View Properties
- Home screen shows all properties
- Pull down to refresh
- Tap property for details

## 📱 Navigation

### Main Menu Items
```
Properties          → View all properties
Create Property     → Add new property
---
Collect Payment     → Record new payment
Payment History     → View all payments
---
Printer Settings    → Manage Bluetooth printer
---
Logout             → Sign out
```

## ⚙️ Settings

### Printer Settings
- **Connection Status** → Green = Connected
- **Scan for Printers** → Find paired devices
- **Print Test Page** → Verify connection
- **Disconnect** → Close connection

### API Configuration
Edit in `lib/main.dart`:
```dart
final baseUrl = 'http://your-api-url:9000/api';
```

## 🔐 Permissions

### Required Permissions
- ✅ Internet → API communication
- ✅ Location → Property coordinates
- ✅ Bluetooth → Printer connection

### Grant Permissions
Settings → Apps → Property Collector → Permissions

## 📋 Common Tasks

### Daily Workflow
1. Open app
2. Check printer connection (green badge)
3. Collect payments throughout day
4. Review payment history at end of day
5. Sync data with backend

### End of Day
1. Menu → Payment History
2. Review all payments
3. Check for any failed payments
4. Print summary if needed
5. Logout when done

## 🆘 Quick Troubleshooting

### Can't Connect to Printer
```
1. Check Bluetooth is ON
2. Check printer is paired
3. Restart printer
4. Try disconnect/reconnect
5. Unpair and pair again
```

### Payment Not Saving
```
1. Check internet connection
2. Check API is running
3. Check login status
4. Try again
```

### App Crashes
```
1. Check all permissions granted
2. Update app to latest version
3. Clear app cache
4. Reinstall if needed
```

## 📞 Support Contacts

- **Technical Issues**: Check IMPLEMENTATION_SUMMARY.md
- **User Guide**: See PAYMENT_PRINTING_GUIDE.md
- **API Docs**: Check backend documentation

## 🔄 Update App

```bash
cd mobile
git pull
flutter pub get
flutter run
```

## 📊 Keyboard Shortcuts

None - this is a mobile app with touch interface.

## 💡 Tips & Tricks

1. **Battery Life**: Keep printer charged
2. **Paper**: Always carry spare thermal paper
3. **Connection**: Connect printer at start of day
4. **Backup**: Data syncs to server automatically
5. **Receipts**: Can reprint anytime from history

## ✅ Pre-Flight Checklist

Before going to the field:
- [ ] Printer charged
- [ ] Thermal paper loaded
- [ ] Printer connected in app
- [ ] Test print successful
- [ ] Internet connection working
- [ ] Phone charged
- [ ] Logged in to app

---

**Quick Help**: Menu → ? (if implemented) or see full guides in project folder
