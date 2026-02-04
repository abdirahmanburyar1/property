# Receipt with Payment History Table and Barcode

## Overview

Updated the Receipt component to display all payment installments in a table format, optimized for A4 printing, and includes a barcode with full URL path for verification.

## New Features

### 1. Payment History Table

**Display:**
- All payment installments in a formatted table
- Columns: #, Date, Amount, Method, Reference
- Sorted by date (oldest to newest)
- Total row showing sum of all payments
- Professional table styling for A4 printing

**Features:**
- ✅ Shows installment numbers
- ✅ Formatted dates
- ✅ Currency amounts
- ✅ Payment methods
- ✅ Transaction references
- ✅ Total row with sum

### 2. Payment Summary Section

**Display:**
- Total Amount Paid (sum of all installments)
- Payment Method
- Number of Installments

**Benefits:**
- Quick overview of payment status
- Clear total amount
- Installment count

### 3. Barcode Integration

**Features:**
- ✅ Code128 barcode format
- ✅ Uses full URL path as barcode data
- ✅ Fallback to receipt number if URL unavailable
- ✅ Barcode image with error handling
- ✅ Verification URL displayed below barcode

**Barcode Data:**
- Primary: Full URL path (`window.location.origin + pathname + search`)
- Fallback: Receipt number (transaction reference)

**Barcode Service:**
- Uses TEC-IT barcode generation service
- Code128 format (supports alphanumeric)
- 96 DPI resolution
- URL: `https://barcode.tec-it.com/barcode.ashx`

### 4. A4 Print Optimization

**Layout:**
- ✅ 210mm width (A4 standard)
- ✅ Proper margins (15-20mm)
- ✅ Compact spacing for table
- ✅ Page break handling
- ✅ Print-friendly fonts (10px for table)

**Table Styling:**
- Compact font sizes (10px headers, 9-10px cells)
- Proper borders and spacing
- Total row highlighted
- Print-optimized borders

## Component Updates

### Receipt Component (`Receipt.tsx`)

**New Props:**
```typescript
interface ReceiptProps {
  payment: any;
  paymentHistory?: any[];  // NEW: Payment history array
  onPrint?: () => void;
}
```

**New State:**
- `history`: Payment history array
- `isLoadingHistory`: Loading state

**New Functions:**
- `loadPaymentHistory()`: Fetches payment history if not provided
- Automatic loading when `propertyId` is available

### PaymentDetails Page Updates

**Change:**
```typescript
// Before
<Receipt payment={payment} />

// After
<Receipt payment={payment} paymentHistory={paymentHistory} />
```

## Receipt Layout Structure

```
┌─────────────────────────────────────┐
│         [LOGO]                      │
│    PROPERTY REGISTRATION             │
│   OFFICIAL PAYMENT RECEIPT           │
├─────────────────────────────────────┤
│ Receipt #: PD-ABC123-3-...          │
│ Status: [PAID]  Date: Jan 24, 2026  │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ PAYMENT SUMMARY                 │ │
│ │ Total: $100.00                  │ │
│ │ Method: Mobile Money             │ │
│ │ Installments: 3                 │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ PAYMENT HISTORY                 │ │
│ │ ┌───┬────────┬────────┬──────┐ │ │
│ │ │ # │ Date   │ Amount │ Ref  │ │ │
│ │ ├───┼────────┼────────┼──────┤ │ │
│ │ │ 1 │ Jan 15 │ $30.00 │ REF1 │ │ │
│ │ │ 2 │ Jan 20 │ $40.00 │ REF2 │ │ │
│ │ │ 3 │ Jan 24 │ $30.00 │ REF3 │ │ │
│ │ ├───┴────────┴────────┴──────┤ │ │
│ │ │ TOTAL: $100.00              │ │ │
│ │ └────────────────────────────┘ │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ PROPERTY INFORMATION             │ │
│ │ Address, City, Type, Area        │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ PROPERTY OWNER                   │ │
│ │ Name, Phone, Email                │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ COLLECTED BY                    │ │
│ │ Collector Name, Email             │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│         [BARCODE IMAGE]              │
│    Receipt Number: PD-ABC123-3-...   │
│    Verification URL:                 │
│    http://localhost:9001/...      │
├─────────────────────────────────────┤
│ ✓ Official Receipt                  │
│ Keep for your records                │
│ Generated: Jan 24, 2026 10:30 AM    │
└─────────────────────────────────────┘
```

## Payment History Table

### Table Structure

| Column | Description | Format |
|--------|-------------|--------|
| # | Installment number | Number (1, 2, 3...) |
| Date | Payment date | Short date (Jan 15, 2026) |
| Amount | Payment amount | Currency + Amount |
| Method | Payment method | Method name |
| Reference | Transaction reference | Monospace font |

### Table Features

- **Header Row:** Gray background, bold text
- **Data Rows:** Alternating hover effect, borders
- **Total Row:** Gray background, bold, border-top
- **Font Sizes:** 10px headers, 9-10px cells (print-optimized)
- **Spacing:** Compact padding (px-3 py-2)

### Example Table

```
┌───┬──────────────┬─────────────┬──────────────┬──────────────────┐
│ # │ Date         │ Amount      │ Method       │ Reference         │
├───┼──────────────┼─────────────┼──────────────┼──────────────────┤
│ 1 │ Jan 15, 2026 │ USD 30.00  │ Mobile Money │ PD-ABC123-1-...  │
│ 2 │ Jan 20, 2026 │ USD 40.00  │ Cash         │ PD-ABC123-2-...  │
│ 3 │ Jan 24, 2026 │ USD 30.00  │ Mobile Money │ PD-ABC123-3-...  │
├───┴──────────────┴─────────────┴──────────────┴──────────────────┤
│ TOTAL                              USD 100.00                     │
└───────────────────────────────────────────────────────────────────┘
```

## Barcode Implementation

### Barcode Generation

**Service:** TEC-IT Barcode Generator
**Format:** Code128 (supports alphanumeric)
**Data:** Full URL path or receipt number

**URL Format:**
```
https://barcode.tec-it.com/barcode.ashx?
  data={encoded_url_or_receipt_number}
  &code=Code128
  &dpi=96
  &dataseparator=
  &translate-esc=on
```

### Barcode Data Priority

1. **Primary:** Full URL path
   ```
   http://localhost:9001/payments/203820e2-0219-4e68-90f0-b3dc013a943b
   ```

2. **Fallback:** Receipt number
   ```
   PD-ABC123-3-202601241030
   ```

### Barcode Display

- **Height:** 50px
- **Width:** Auto (responsive)
- **Image Rendering:** Crisp edges
- **Error Handling:** Hides if image fails to load
- **Alt Text:** Descriptive for accessibility

### Verification URL

- Displayed below barcode
- Full path shown
- Monospace font
- Small font size (9px)
- Word wrapping for long URLs

## A4 Print Optimization

### Page Settings

```css
@page {
  size: A4;
  margin: 10mm;
}
```

### Container Settings

- **Width:** 210mm (A4 width)
- **Padding:** 15-20mm (print), 20-25mm (screen)
- **Min Height:** Auto
- **Box Sizing:** Border-box

### Table Print Settings

```css
table {
  page-break-inside: auto;
}
tr {
  page-break-inside: avoid;
  page-break-after: auto;
}
thead {
  display: table-header-group;
}
```

### Font Sizes (Print Optimized)

- **Headers:** 10px
- **Table Cells:** 9-10px
- **Labels:** 10-12px
- **Body Text:** 11-12px
- **Small Text:** 9px

## Data Flow

### Payment History Loading

1. **If provided as prop:**
   - Uses `paymentHistory` prop directly
   - No API call needed

2. **If not provided:**
   - Extracts `propertyId` from payment object
   - Calls `/api/paymentdetails/property/{propertyId}`
   - Sets history state

3. **Sorting:**
   - Sorts by payment date (oldest first)
   - Ensures chronological order

4. **Total Calculation:**
   - Sums all payment amounts
   - Uses currency from first payment

## API Integration

### Endpoint Used

**GET** `/api/paymentdetails/property/{propertyId}`

**Response:**
```json
[
  {
    "id": "uuid",
    "propertyId": "uuid",
    "amount": 30.00,
    "currency": "USD",
    "paymentDate": "2026-01-15T10:30:00Z",
    "transactionReference": "PD-ABC123-1-202601151030",
    "installmentNumber": 1,
    "paymentMethod": {
      "name": "Mobile Money",
      "code": "MOBILE_MONEY"
    }
  }
]
```

## Testing

### Test Case 1: Receipt with Payment History

1. Navigate to payment detail page
2. Click "View Receipt"
3. **VERIFY:** Payment history table displays
4. **VERIFY:** All installments shown
5. **VERIFY:** Total row shows correct sum
6. **VERIFY:** Table is properly formatted

### Test Case 2: Barcode Display

1. View receipt
2. **VERIFY:** Barcode image displays
3. **VERIFY:** Receipt number shown below barcode
4. **VERIFY:** Full URL path displayed
5. **VERIFY:** Barcode is scannable (if using barcode scanner)

### Test Case 3: Print Layout

1. View receipt
2. Click "Print Receipt" or Ctrl+P
3. **VERIFY:** A4 size maintained
4. **VERIFY:** Table fits on page
5. **VERIFY:** All content visible
6. **VERIFY:** No content cut off
7. **VERIFY:** Barcode prints correctly

### Test Case 4: Empty Payment History

1. View receipt for payment with no history
2. **VERIFY:** Payment summary shows "0 payments"
3. **VERIFY:** Table not shown (or shows empty state)
4. **VERIFY:** Total shows 0.00

### Test Case 5: Multiple Installments

1. View receipt with 5+ installments
2. **VERIFY:** All installments in table
3. **VERIFY:** Table scrolls if needed (screen)
4. **VERIFY:** Table fits on one page (print)
5. **VERIFY:** Total is sum of all amounts

### Test Case 6: Barcode Error Handling

1. Simulate barcode service failure
2. **VERIFY:** Image hides gracefully
3. **VERIFY:** Receipt number still displays
4. **VERIFY:** URL still displays
5. **VERIFY:** No broken image icon

## Benefits

### User Experience ✅
- Complete payment history visible
- Professional table format
- Easy to read and verify
- Barcode for quick verification

### Data Integrity ✅
- Shows all payment installments
- Accurate totals
- Chronological order
- Complete transaction references

### Print Quality ✅
- A4 optimized layout
- Professional appearance
- Proper spacing
- Print-friendly fonts

### Verification ✅
- Barcode for scanning
- Full URL for verification
- Receipt number displayed
- Multiple verification methods

## Customization

### Barcode Service

To use a different barcode service, update:

```typescript
const barcodeUrl = `YOUR_SERVICE_URL?data=${encodeURIComponent(barcodeData)}&format=code128`;
```

**Alternative Services:**
- Google Charts API
- ZXing Online
- Custom backend endpoint

### Table Styling

To customize table appearance:

```typescript
// In Receipt.tsx, update table className and inline styles
<table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
  // Customize as needed
</table>
```

### Font Sizes

To adjust font sizes for print:

```typescript
style={{ fontSize: '10px' }}  // Adjust as needed
```

## Summary

✅ **Receipt with Payment History & Barcode Complete!**

**Features:**
- ✅ Payment history table with all installments
- ✅ Payment summary section
- ✅ Barcode with full URL path
- ✅ A4 print optimization
- ✅ Professional table formatting
- ✅ Error handling for barcode

**Benefits:**
- Complete payment record
- Easy verification
- Professional appearance
- Print-ready format

---

**Last Updated:** January 24, 2026  
**Status:** ✅ Complete - Ready for Testing  
**Files Modified:**
- `frontend/src/components/Receipt.tsx`
- `frontend/src/pages/PaymentDetails.tsx`
