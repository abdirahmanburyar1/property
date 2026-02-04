# Property Collector Mobile App - Payment & Printing Features

## Overview
This mobile application is designed for property collectors to create properties, collect payments, and print receipts using handheld Bluetooth thermal printers.

## Features

### 1. Property Management
- Create and register properties with location tracking
- Store owner information
- Track property types and regions

### 2. Payment Collection
- Record payments for properties
- Support multiple payment methods:
  - Cash
  - Bank Transfer
  - Mobile Money
  - Cheque
- Automatic receipt number generation
- Payment history tracking

### 3. Bluetooth Printer Integration
- Connect to handheld Bluetooth thermal printers
- Print payment receipts instantly
- Test printer connection
- Reprint receipts from payment history

## Setup Instructions

### Prerequisites
1. Android device with Bluetooth capability
2. Bluetooth thermal printer (58mm or 80mm)
3. Flutter SDK installed

### Installation

1. **Install Dependencies**
   ```bash
   cd mobile
   flutter pub get
   ```

2. **Pair Your Bluetooth Printer**
   - Go to your Android device Settings > Bluetooth
   - Turn on Bluetooth
   - Pair with your thermal printer (usually named something like "BlueTooth Printer" or "RPP02N")
   - Note the device name for later

3. **Run the App**
   ```bash
   flutter run
   ```

### Printer Setup

1. **First Time Setup**
   - Open the app
   - Tap the hamburger menu (☰)
   - Select "Printer Settings"
   - Tap "Scan for Printers"
   - Select your paired printer from the list
   - Tap "Print Test Page" to verify connection

2. **Supported Printers**
   - Most 58mm and 80mm Bluetooth thermal printers
   - ESC/POS compatible printers
   - Examples: RPP02N, MTP-II, ZJ-5802, etc.

## Usage Guide

### Collecting a Payment

1. **Navigate to Payment Collection**
   - Open the app
   - Tap the menu icon (☰)
   - Select "Collect Payment"

2. **Enter Payment Details**
   - Select the property
   - Enter the amount
   - Choose payment method (Cash, Bank Transfer, etc.)
   - Select payment date/time
   - Add notes (optional)
   - Tap "Record Payment"

3. **Print Receipt**
   - After recording payment, a dialog will appear
   - Tap "Print Receipt" to print immediately
   - Or tap "No" to print later from payment history

### Viewing Payment History

1. **Access Payment History**
   - Open the menu (☰)
   - Select "Payment History"

2. **View Details**
   - Tap on any payment to view full details
   - Tap the print icon (🖨️) to reprint a receipt

3. **Reprint a Receipt**
   - Make sure printer is connected
   - Tap the print icon on any payment
   - Receipt will print automatically

## Receipt Format

The printed receipt includes:
- Company header (configurable)
- Receipt number
- Payment date and time
- Property details (address, type, region)
- Owner information (name, phone)
- Payment amount and method
- Payment status
- Notes (if any)

## Troubleshooting

### Bluetooth Connection Issues

**Problem: Can't find printer**
- Solution: Make sure the printer is paired in Android Bluetooth settings first
- Go to Settings > Bluetooth and pair the device

**Problem: Connection fails**
- Solution: 
  - Turn printer off and on
  - Disconnect and reconnect Bluetooth
  - Try unpairing and pairing again

**Problem: Printer connected but won't print**
- Solution:
  - Check printer paper
  - Check printer battery
  - Print a test page from Printer Settings
  - Restart the app

### Print Quality Issues

**Problem: Faded or light printing**
- Solution: Check printer battery level or paper quality

**Problem: Garbled text**
- Solution: Ensure you're using an ESC/POS compatible printer

## Payment Methods

The app supports the following payment methods:

1. **CASH** - Direct cash payment
2. **BANK_TRANSFER** - Bank-to-bank transfer
3. **MOBILE_MONEY** - Mobile money services (e.g., EVC Plus, Zaad)
4. **CHEQUE** - Check payment

## API Integration

The app communicates with a backend API for:
- Property management
- Payment recording
- Data synchronization

Default API endpoint: `http://localhost:9000/api`

To change the API endpoint:
1. Go to Settings (implementation may vary)
2. Update the base URL
3. Or modify in `lib/main.dart`

## Permissions Required

### Android Permissions
- **INTERNET** - API communication
- **ACCESS_FINE_LOCATION** - Property location tracking
- **ACCESS_COARSE_LOCATION** - Property location tracking
- **BLUETOOTH** - Printer connection
- **BLUETOOTH_ADMIN** - Bluetooth management
- **BLUETOOTH_CONNECT** - Android 12+ requirement
- **BLUETOOTH_SCAN** - Android 12+ requirement

## Security Notes

1. **Local Storage**: Authentication tokens are stored securely using SharedPreferences
2. **Network**: Always use HTTPS in production for API communication
3. **Receipts**: Receipt numbers are generated server-side to prevent duplicates

## Development

### Key Files

```
lib/
├── main.dart                           # App entry point
├── providers/
│   ├── auth_provider.dart              # Authentication state
│   ├── property_provider.dart          # Property management
│   └── payment_provider.dart           # Payment management
├── screens/
│   ├── home_screen.dart                # Main dashboard
│   ├── create_property_screen.dart     # Property creation
│   ├── collect_payment_screen.dart     # Payment collection
│   ├── payment_history_screen.dart     # Payment history
│   └── printer_settings_screen.dart    # Printer setup
└── services/
    ├── api_service.dart                # API client
    └── printer_service.dart            # Bluetooth printing
```

### Dependencies

```yaml
dependencies:
  provider: ^6.1.1                    # State management
  http: ^1.1.0                        # HTTP client
  dio: ^5.4.0                         # Advanced HTTP
  shared_preferences: ^2.2.2          # Local storage
  geolocator: ^10.1.0                 # Location services
  permission_handler: ^11.1.0         # Permissions
  blue_thermal_printer: ^1.2.3        # Bluetooth printing
  esc_pos_utils: ^1.1.0               # Thermal printer utilities
  intl: ^0.19.0                       # Date formatting
  image: ^4.1.7                       # Image processing
```

## Future Enhancements

Potential features for future versions:
- [ ] PDF receipt generation
- [ ] Email receipt to customers
- [ ] SMS receipt notifications
- [ ] Multiple receipt templates
- [ ] Offline payment queue
- [ ] Payment statistics and reports
- [ ] Multiple currency support
- [ ] QR code on receipts
- [ ] Photo capture for properties
- [ ] Digital signature collection

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review printer compatibility
3. Ensure all permissions are granted
4. Check API connectivity

## License

Copyright © 2024 Property Management System
