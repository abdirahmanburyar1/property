# P58E Portable Printer Implementation

## Overview

This document describes the implementation of Bluetooth thermal printer support for the P58E portable printer in the mobile app. The P58E is a 58mm Bluetooth thermal receipt printer that uses ESC/POS commands.

## Printer Specifications

**Model:** P58E Portable Bluetooth Thermal Printer
- **Print Width:** 58mm
- **Print Method:** Direct thermal (no ink required)
- **Resolution:** 203 DPI
- **Connectivity:** Bluetooth 4.0/5.0
- **Paper Size:** 58mm thermal paper rolls
- **Command Set:** ESC/POS

## Implementation Details

### 1. Dependencies Added

**File:** `mobile/pubspec.yaml`

```yaml
# Bluetooth Printer
esc_pos_bluetooth: ^0.4.1
esc_pos_utils: ^1.0.0
```

### 2. Printer Service

**File:** `mobile/lib/services/printer_service.dart`

**Features:**
- Bluetooth printer scanning
- Printer selection and connection
- ESC/POS command generation
- Receipt printing
- Permission handling

**Key Methods:**
- `initialize()` - Initialize printer manager
- `scanForPrinters()` - Scan for available Bluetooth printers
- `selectPrinter()` - Select a printer for printing
- `requestPermissions()` - Request Bluetooth permissions
- `printReceipt()` - Print receipt using ESC/POS commands
- `disconnect()` - Disconnect from printer

### 3. Printer Selection Dialog

**File:** `mobile/lib/widgets/printer_selection_dialog.dart`

**Features:**
- Real-time printer scanning
- Printer list display
- Printer selection
- Visual feedback for selected printer

**UI Components:**
- Scan button
- Printer list with name and MAC address
- Selection indicator
- Cancel/Select buttons

### 4. Receipt Print Data Generator

**File:** `mobile/lib/widgets/receipt_template.dart`

**Updated `ReceiptPrintData.generatePrintData()`:**
- Generates ESC/POS formatted receipt
- Handles single payment and payment history (reprints)
- Formats property details, payment details, and collector info
- Includes proper ESC/POS commands for formatting

**ESC/POS Commands Used:**
- `ESC @` - Initialize printer
- `ESC a` - Text alignment (left, center, right)
- `ESC E` - Bold text
- `GS !` - Font size (normal, double width, double height, double size)
- `LF` - Line feed
- `GS V` - Cut paper

### 5. Payment Receipt Screen Integration

**File:** `mobile/lib/screens/payment_receipt_screen.dart`

**Changes:**
- Converted from `StatelessWidget` to `StatefulWidget`
- Added `_handlePrint()` method for print functionality
- Integrated printer selection dialog
- Added loading state during printing
- Success/error feedback via SnackBar

**Print Flow:**
1. User clicks "Print Receipt" button
2. Check if printer is already selected
3. Request Bluetooth permissions if needed
4. Show printer selection dialog if no printer selected
5. Connect to selected printer
6. Generate ESC/POS receipt data
7. Send print data to printer
8. Show success/error message

### 6. Android Permissions

**File:** `mobile/android/app/src/main/AndroidManifest.xml`

**Added Permissions:**
```xml
<!-- Bluetooth permissions for printer -->
<uses-permission android:name="android.permission.BLUETOOTH"/>
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN"/>
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" android:maxSdkVersion="30"/>
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT"/>
<uses-feature android:name="android.hardware.bluetooth" android:required="false"/>
<uses-feature android:name="android.hardware.bluetooth_le" android:required="false"/>
```

## Receipt Format

### Header
- Company name: "GALKACYO PROPERTY"
- System name: "Property Management System"
- Contact: "Tel: +252-XXX-XXXXXX"

### Receipt Title
- "PAYMENT RECEIPT" (bold, double width)

### Transaction Reference
- Reference number

### Property Details
- Address
- City
- Plate Number
- Owner Name
- Owner Phone

### Payment Details
**For Single Payment:**
- Date
- Method: Mobile Money
- Status

**For Reprints (Payment History):**
- Payment history list (#1, #2, etc.)
- Date and reference for each payment
- Total paid amount

### Amount Section
- "TOTAL AMOUNT" (centered, bold, double size)
- Currency and amount

### Collector Information
- Collected by: [Collector Name]

### Footer
- "Thank you for your payment!"
- Print timestamp
- "--- END OF RECEIPT ---"

## Usage

### First Time Setup

1. **Enable Bluetooth** on the mobile device
2. **Turn on P58E printer** and ensure it's in pairing mode
3. **Open payment receipt screen** after collecting payment
4. **Click "Print Receipt"** button
5. **Grant Bluetooth permissions** when prompted
6. **Select P58E printer** from the list
7. **Receipt will print automatically**

### Subsequent Prints

1. **Open payment receipt screen**
2. **Click "Print Receipt"** button
3. **Receipt prints immediately** (printer is remembered)

### Reprinting Receipts

1. **Open fully paid payment card** in collect payment screen
2. **Tap "Fully Paid - View Receipt"** badge
3. **Click "Reprint Receipt"** button
4. **Receipt with full payment history prints**

## ESC/POS Command Reference

### Initialization
```dart
ESCPOSCommands.initialize() // ESC @
```

### Text Alignment
```dart
ESCPOSCommands.alignLeft()   // ESC a 0
ESCPOSCommands.alignCenter() // ESC a 1
ESCPOSCommands.alignRight()  // ESC a 2
```

### Text Formatting
```dart
ESCPOSCommands.bold(true)           // ESC E 1
ESCPOSCommands.doubleWidth(true)    // GS ! 16
ESCPOSCommands.doubleHeight(true)   // GS ! 1
ESCPOSCommands.doubleSize(true)     // GS ! 17
```

### Paper Control
```dart
ESCPOSCommands.lineFeed(2)  // LF (2 lines)
ESCPOSCommands.cutPaper()   // GS V 0
```

## Error Handling

### Common Issues

**1. "No printer selected"**
- **Solution:** Select a printer from the selection dialog

**2. "Bluetooth permissions required"**
- **Solution:** Grant location and Bluetooth permissions in app settings

**3. "Failed to connect to printer"**
- **Solution:** 
  - Ensure printer is turned on
  - Check Bluetooth is enabled
  - Move closer to printer
  - Try selecting printer again

**4. "Print error"**
- **Solution:**
  - Check printer has paper
  - Ensure printer is not in error state
  - Try disconnecting and reconnecting

## Testing

### Test Case 1: First Time Print

1. Collect a payment
2. Open receipt screen
3. Click "Print Receipt"
4. **VERIFY:** Permission dialog appears
5. Grant permissions
6. **VERIFY:** Printer selection dialog appears
7. Select P58E printer
8. **VERIFY:** Receipt prints successfully
9. **VERIFY:** Success message appears

### Test Case 2: Subsequent Prints

1. Open receipt screen (printer already selected)
2. Click "Print Receipt"
3. **VERIFY:** Receipt prints immediately (no selection dialog)
4. **VERIFY:** Success message appears

### Test Case 3: Reprint with History

1. Open fully paid payment
2. Tap "Fully Paid - View Receipt"
3. Click "Reprint Receipt"
4. **VERIFY:** Receipt with payment history prints
5. **VERIFY:** All payment installments are listed
6. **VERIFY:** Total amount is correct

### Test Case 4: Printer Selection

1. Open printer selection dialog
2. Click "Scan for Printers"
3. **VERIFY:** Loading indicator appears
4. **VERIFY:** Available printers appear in list
5. Select a printer
6. **VERIFY:** Selected printer is highlighted
7. Click "Select"
8. **VERIFY:** Dialog closes, printer is selected

### Test Case 5: Error Handling

1. Turn off printer
2. Try to print
3. **VERIFY:** Error message appears
4. **VERIFY:** Error message is clear and helpful

## Code Structure

```
mobile/
├── lib/
│   ├── services/
│   │   └── printer_service.dart       # Printer service
│   ├── widgets/
│   │   ├── receipt_template.dart      # Receipt template & ESC/POS generator
│   │   └── printer_selection_dialog.dart  # Printer selection UI
│   └── screens/
│       └── payment_receipt_screen.dart # Receipt screen with print button
└── android/
    └── app/
        └── src/
            └── main/
                └── AndroidManifest.xml  # Bluetooth permissions
```

## Benefits

### User Experience ✅
- **Quick Printing:** One-tap printing after payment
- **Printer Memory:** Selected printer is remembered
- **Visual Feedback:** Loading states and success/error messages
- **Easy Selection:** Simple printer selection dialog

### Functionality ✅
- **ESC/POS Support:** Proper thermal printer formatting
- **Payment History:** Reprints show full payment history
- **Error Handling:** Clear error messages
- **Permission Handling:** Automatic permission requests

### Developer Experience ✅
- **Clean Architecture:** Separated service, widgets, and screens
- **Reusable Service:** Printer service can be used elsewhere
- **Type Safety:** Proper error handling and type checking
- **Maintainable:** Well-documented code

## Summary

✅ **P58E Printer Integration Complete!**

**Features:**
- ✅ Bluetooth printer scanning
- ✅ Printer selection dialog
- ✅ ESC/POS receipt generation
- ✅ Single payment printing
- ✅ Payment history reprinting
- ✅ Permission handling
- ✅ Error handling
- ✅ Loading states
- ✅ Success/error feedback

**Result:**
- Professional receipt printing
- Easy printer setup
- Reliable printing experience
- Support for payment history reprints

---

**Last Updated:** January 24, 2026  
**Status:** ✅ Complete - Ready for Testing  
**Files Modified:**
- `mobile/pubspec.yaml`
- `mobile/lib/services/printer_service.dart` (NEW)
- `mobile/lib/widgets/printer_selection_dialog.dart` (NEW)
- `mobile/lib/widgets/receipt_template.dart` (MODIFIED)
- `mobile/lib/screens/payment_receipt_screen.dart` (MODIFIED)
- `mobile/android/app/src/main/AndroidManifest.xml` (MODIFIED)
