# Payment Receipt Design & Printing

## 📝 Receipt Design Overview

The payment receipt has been designed for **58mm thermal POS printers** (the most common size for mobile receipt printers).

### Receipt Layout

```
================================
    GALKACYO PROPERTY
Property Management System
   Tel: +252-XXX-XXXXXX

--------------------------------
    PAYMENT RECEIPT

Ref#: PAY-12345678-20260124143022

--------------------------------

PROPERTY DETAILS
Address: 123 Main Street
City: Galkacyo
Plate#: ABC-1234
Owner: Mohamed Ali
Phone: +252-XXX-XXXXXX

--------------------------------

PAYMENT DETAILS
Date: 24/01/2026 14:30
Method: Mobile Money
Status: Completed

================================
     AMOUNT PAID
   USD 1,250.00
================================

Collected by: Abdi Hassan

--------------------------------
Thank you for your payment!

Printed: 24/01/2026 14:30:22

--- END OF RECEIPT ---
```

## 🎨 Design Features

### 1. **Header Section**
- Company name (bold, centered)
- System name
- Contact information

### 2. **Transaction Reference**
- Unique transaction ID
- Format: `PAY-[PropertyID]-[Timestamp]`

### 3. **Property Details**
- Full address
- Plate number
- Owner name and phone

### 4. **Payment Information**
- Payment date and time
- Payment method (Mobile Money)
- Payment status

### 5. **Amount Display**
- Large, prominent font
- Currency and amount
- Double-size text for emphasis

### 6. **Collector Information**
- Name of person who collected payment
- For accountability and tracking

### 7. **Footer**
- Thank you message
- Print timestamp
- End of receipt marker

## 🖨️ Printer Options

Here are the recommended POS printer options for mobile use:

### **Option 1: Bluetooth Thermal Printers (Recommended)**

#### **A. Sunmi Portable Printers**
- **Model**: Sunmi V2 Pro with built-in printer
- **Pros**: 
  - All-in-one device (phone + printer)
  - No separate printer needed
  - Built-in ESC/POS support
  - 58mm thermal printing
- **Cons**: 
  - More expensive
  - Need to replace if device breaks
- **Price Range**: $200-$400

#### **B. Portable Bluetooth Printers**
- **Models**: 
  - MUNBYN IMP001 58mm
  - Rongta RPP210 58mm
  - GOOJPRT PT-210 58mm
  - Epson TM-P60II
- **Pros**:
  - Portable and lightweight
  - Rechargeable battery
  - Connect via Bluetooth
  - Works with any Android phone
  - ESC/POS compatible
- **Cons**:
  - Additional device to carry
  - Need to charge separately
- **Price Range**: $60-$150

#### **C. MUNBYN IMP001 (Best Budget Option)**
- **Features**:
  - 58mm thermal printer
  - Bluetooth 4.0
  - 1500mAh battery
  - 100mm/s print speed
  - ESC/POS compatible
  - Small and portable
- **Price**: ~$70-$90

### **Option 2: USB Printers**
- **Models**: Epson TM-T20, Star TSP100
- **Pros**: 
  - More reliable
  - Faster printing
  - Cheaper per unit
- **Cons**: 
  - Need USB OTG cable
  - Less portable
  - Need to plug in
- **Price Range**: $100-$250

### **Recommended Choice**

For mobile payment collection, we recommend:

**MUNBYN IMP001 or Rongta RPP210**
- ✅ Portable and lightweight
- ✅ Affordable ($70-$100)
- ✅ Good battery life
- ✅ Bluetooth connectivity
- ✅ ESC/POS compatible
- ✅ Available on Amazon/AliExpress

## 📦 Flutter Packages for Printing

### **Option 1: blue_thermal_printer** (Bluetooth)
```yaml
dependencies:
  blue_thermal_printer: ^1.2.2
```
- Pros: Simple to use, good for Bluetooth
- Cons: Only Bluetooth, not actively maintained

### **Option 2: esc_pos_bluetooth** (Recommended)
```yaml
dependencies:
  esc_pos_bluetooth: ^0.4.1
  esc_pos_utils: ^1.1.0
```
- Pros: Modern, ESC/POS support, well maintained
- Cons: Bluetooth only

### **Option 3: print_bluetooth_thermal**
```yaml
dependencies:
  print_bluetooth_thermal: ^1.1.1
```
- Pros: Simple API, active development
- Cons: Limited to thermal printers

### **Option 4: esc_pos_printer** (Network/USB)
```yaml
dependencies:
  esc_pos_printer: ^4.1.0
  esc_pos_utils: ^1.1.0
```
- Pros: Supports network and USB printers
- Cons: Not for portable Bluetooth

## 🚀 Implementation Status

### ✅ **Completed**
1. Receipt template design (`ReceiptTemplate` widget)
2. Visual receipt preview
3. ESC/POS command structure (`ESCPOSCommands` class)
4. Print data generator (`ReceiptPrintData` class)
5. Success dialog with "Preview Receipt" button
6. Receipt preview dialog with print button

### 🔄 **Next Steps**
1. Choose printer model (recommend MUNBYN IMP001)
2. Add Bluetooth printer package
3. Implement Bluetooth connection
4. Add printer selection screen
5. Implement actual printing using ESC/POS commands
6. Add print settings (copies, paper size)
7. Handle printer errors

## 🔧 Code Structure

### Files Created:
- `lib/widgets/receipt_template.dart` - Receipt design and print data generator
- `RECEIPT_PRINTING_DESIGN.md` - This documentation

### Files Modified:
- `lib/screens/collect_payment_screen.dart` - Added receipt preview functionality

## 💡 How to Test

1. **Hot restart** the app (press `R`)
2. Go to **Collect Payment**
3. Tap any pending payment to collect
4. After successful collection, tap **"Preview Receipt"**
5. See the receipt design in print preview format
6. Tap **"Print Receipt"** to see "Coming Soon" message

## 📱 Receipt Preview Features

- 58mm width simulation (384px)
- Exact layout as will be printed
- Scrollable preview
- Border and shadow for paper effect
- Close and Print buttons

## 🎯 Next Actions

1. **Decide on printer**: Choose between Sunmi device or portable Bluetooth printer
2. **Order printer**: MUNBYN IMP001 recommended for budget + quality
3. **Test receipt**: Current preview shows exact print layout
4. **Integrate package**: Add chosen Flutter printer package
5. **Implement printing**: Connect preview to actual printer

The receipt design is **production-ready** and follows standard POS receipt formats. Once you choose a printer, integration will be straightforward using the existing `ReceiptPrintData.generatePrintData()` method.
