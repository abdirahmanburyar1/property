# Payment Collection Modal - Web Application

## Feature

Added a payment collection modal in the Payment Details page that allows users to enter a custom payment amount (up to the remaining balance) and automatically determines if the payment status should be "Paid" or "Partially Paid".

## Problem Solved

**Before:**
- "Mark as Paid" button would mark the entire payment as completed
- No way to collect partial payments from the web interface
- No validation of payment amounts
- Didn't integrate with the PaymentDetails system

**After:**
- Opens a modal for entering payment amount
- Validates amount against remaining balance
- Shows real-time preview of payment status
- Creates PaymentDetail records
- Automatically calculates Paid vs Paid_partially status
- Updates payment history and property payment status

## User Flow

### Step 1: Click "Collect Payment" Button

```
┌─────────────────────────────────────┐
│ Payment Details Page               │
├─────────────────────────────────────┤
│ [← Back]  [Collect Payment] 💵     │
│                                     │
│ Payment Information                 │
│ Amount: $5,000                      │
│ Property: 123 Main St               │
│ ...                                 │
└─────────────────────────────────────┘
         ↓ Click "Collect Payment"
```

### Step 2: Modal Opens with Payment Summary

```
┌─────────────────────────────────┐
│ Collect Payment            ✕    │
├─────────────────────────────────┤
│ ╔═══════════════════════════╗   │
│ ║ Expected Amount:  $10,000 ║   │
│ ║ Already Paid:      $3,000 ║   │
│ ║ ─────────────────────────  ║   │
│ ║ Remaining Balance: $7,000 ║   │
│ ╚═══════════════════════════╝   │
│                                 │
│ Payment Amount *                │
│ [USD] [________7000.00_____]    │
│       Maximum: USD 7,000.00     │
│                                 │
│ After this payment:             │
│ [Fully Paid] ✓                  │
│                                 │
│       [Cancel] [Collect Payment]│
└─────────────────────────────────┘
```

### Step 3: User Enters Partial Amount

```
┌─────────────────────────────────┐
│ Collect Payment            ✕    │
├─────────────────────────────────┤
│ ╔═══════════════════════════╗   │
│ ║ Expected Amount:  $10,000 ║   │
│ ║ Already Paid:      $3,000 ║   │
│ ║ ─────────────────────────  ║   │
│ ║ Remaining Balance: $7,000 ║   │
│ ╚═══════════════════════════╝   │
│                                 │
│ Payment Amount *                │
│ [USD] [________2000.00_____]    │
│       Maximum: USD 7,000.00     │
│                                 │
│ After this payment:             │
│ [Partially Paid]                │
│ (Remaining: USD 5,000.00)       │
│                                 │
│       [Cancel] [Collect Payment]│
└─────────────────────────────────┘
```

### Step 4: Success - Payment History Updates

```
┌─────────────────────────────────────┐
│ Payment Details Page               │
├─────────────────────────────────────┤
│ Payment Tracking Overview          │
│ ╔════════════════════════════════╗  │
│ ║ Expected: $10,000  Total: $5,000║ │
│ ║ [████████░░░░░░░░] 50% paid    ║  │
│ ║ Remaining: $5,000              ║  │
│ ║ Status: Paid_partially         ║  │
│ ╚════════════════════════════════╝  │
│                                     │
│ Payment History                     │
│ ┌─────────────────────────────────┐ │
│ │ #1 - $3,000 - Jan 20, 2026     │ │
│ │ #2 - $2,000 - Jan 24, 2026 ← New│ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## Implementation Details

### File: `frontend/src/pages/PaymentDetails.tsx`

#### New State Variables

```typescript
const [showPaymentModal, setShowPaymentModal] = useState(false);
const [paymentAmount, setPaymentAmount] = useState('');
const [paymentAmountError, setPaymentAmountError] = useState('');
```

#### Updated `handlePay` Function

**Before:**
```typescript
const handlePay = async () => {
  // Marked payment as "Completed" status
  // Updated payment.statusId
  // No PaymentDetail creation
}
```

**After:**
```typescript
const handlePay = () => {
  // Calculate remaining amount
  const expectedAmount = (propertyPaymentInfo.propertyType?.price || 0) * (propertyPaymentInfo.areaSize || 0);
  const paidAmount = propertyPaymentInfo.paidAmount || 0;
  const remainingAmount = expectedAmount - paidAmount;
  
  // Set default amount to remaining balance
  setPaymentAmount(remainingAmount.toString());
  setPaymentAmountError('');
  setShowPaymentModal(true);
}
```

#### New `handlePaymentSubmit` Function

```typescript
const handlePaymentSubmit = async () => {
  // 1. Validate amount
  const amount = parseFloat(paymentAmount);
  if (isNaN(amount) || amount <= 0) {
    setPaymentAmountError('Please enter a valid amount greater than 0');
    return;
  }
  
  // 2. Check against remaining balance
  const remainingAmount = expectedAmount - paidAmount;
  if (amount > remainingAmount) {
    setPaymentAmountError(`Amount cannot exceed remaining balance of ${remainingAmount}`);
    return;
  }

  // 3. Get payment method
  const paymentMethodId = await getDefaultPaymentMethod();

  // 4. Create PaymentDetail record
  await apiClient.post('/paymentdetails', {
    propertyId: payment.propertyId,
    paymentId: payment.id,
    paymentMethodId: paymentMethodId,
    amount: amount,
    currency: payment.currency || 'USD',
    paymentDate: new Date().toISOString(),
  });

  // 5. Reload data
  await loadPaymentHistory(payment.propertyId);
  await loadPropertyPaymentInfo(payment.propertyId);
  
  // 6. Close modal and show success
  setShowPaymentModal(false);
  alert('Payment collected successfully!');
}
```

## Modal UI Components

### 1. Payment Summary Panel

```tsx
<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
  <div className="flex justify-between text-sm">
    <span className="text-gray-600">Expected Amount:</span>
    <span className="font-semibold text-gray-900">
      USD 10,000.00
    </span>
  </div>
  <div className="flex justify-between text-sm">
    <span className="text-gray-600">Already Paid:</span>
    <span className="font-semibold text-green-600">
      USD 3,000.00
    </span>
  </div>
  <div className="flex justify-between text-sm pt-2 border-t border-blue-300">
    <span className="text-gray-700 font-medium">Remaining Balance:</span>
    <span className="font-bold text-blue-900">
      USD 7,000.00
    </span>
  </div>
</div>
```

### 2. Amount Input with Validation

```tsx
<div className="relative">
  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
    USD
  </span>
  <input
    type="number"
    step="0.01"
    min="0.01"
    max={remainingAmount}
    className={`input pl-16 py-2.5 w-full ${paymentAmountError ? 'border-red-300' : ''}`}
    value={paymentAmount}
    onChange={(e) => {
      setPaymentAmount(e.target.value);
      setPaymentAmountError('');
    }}
    placeholder="0.00"
  />
</div>
{paymentAmountError && (
  <p className="mt-1 text-sm text-red-600">{paymentAmountError}</p>
)}
<p className="mt-1 text-xs text-gray-500">
  Maximum: USD {remainingAmount.toFixed(2)}
</p>
```

### 3. Real-time Status Preview

```tsx
<div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
  <p className="text-sm text-gray-600 mb-1">After this payment:</p>
  <div className="flex items-center gap-2">
    {(() => {
      const amount = parseFloat(paymentAmount) || 0;
      const newPaidAmount = (paidAmount || 0) + amount;
      const newRemaining = expectedAmount - newPaidAmount;
      const isPaid = newRemaining <= 0.01;

      return (
        <>
          <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
            isPaid 
              ? 'bg-green-100 text-green-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {isPaid ? 'Fully Paid' : 'Partially Paid'}
          </span>
          {!isPaid && (
            <span className="text-sm text-gray-600">
              (Remaining: USD {newRemaining.toFixed(2)})
            </span>
          )}
        </>
      );
    })()}
  </div>
</div>
```

## Validation Rules

### 1. Amount Must Be Valid Number

```typescript
const amount = parseFloat(paymentAmount);
if (isNaN(amount) || amount <= 0) {
  setPaymentAmountError('Please enter a valid amount greater than 0');
  return;
}
```

**Error Messages:**
- Empty field → "Please enter a valid amount greater than 0"
- Zero or negative → "Please enter a valid amount greater than 0"
- Non-numeric → "Please enter a valid amount greater than 0"

### 2. Amount Cannot Exceed Remaining Balance

```typescript
const expectedAmount = (propertyPaymentInfo.propertyType?.price || 0) * (propertyPaymentInfo.areaSize || 0);
const paidAmount = propertyPaymentInfo.paidAmount || 0;
const remainingAmount = expectedAmount - paidAmount;

if (amount > remainingAmount) {
  setPaymentAmountError(`Amount cannot exceed remaining balance of ${currency} ${remainingAmount.toFixed(2)}`);
  return;
}
```

**Error Messages:**
- Amount > Remaining → "Amount cannot exceed remaining balance of USD 7,000.00"

### 3. Payment Method Must Exist

```typescript
if (!paymentMethodId) {
  throw new Error('No payment method found');
}
```

## Backend Integration

### API Endpoint: `POST /api/paymentdetails`

**Request Body:**
```json
{
  "propertyId": "123e4567-e89b-12d3-a456-426614174000",
  "paymentId": "123e4567-e89b-12d3-a456-426614174001",
  "paymentMethodId": "123e4567-e89b-12d3-a456-426614174002",
  "amount": 2000.00,
  "currency": "USD",
  "paymentDate": "2026-01-24T12:00:00Z"
}
```

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174003",
  "propertyId": "123e4567-e89b-12d3-a456-426614174000",
  "paymentId": "123e4567-e89b-12d3-a456-426614174001",
  "paymentMethodId": "123e4567-e89b-12d3-a456-426614174002",
  "amount": 2000.00,
  "currency": "USD",
  "paymentDate": "2026-01-24T12:00:00Z",
  "transactionReference": "TXN-20260124-0001",
  "installmentNumber": 2,
  "createdAt": "2026-01-24T12:00:00Z"
}
```

### Automatic Status Calculation

The backend automatically calculates and updates the property payment status:

```csharp
// Backend logic (PaymentDetailsController.cs)
var expectedAmount = property.PropertyType.Price * property.AreaSize;
var totalPaid = paymentDetails.Sum(pd => pd.Amount);
var remainingAmount = expectedAmount - totalPaid;

if (remainingAmount <= 0.01m)
{
    property.PaymentStatus = PaymentStatus.Paid;
}
else if (totalPaid > 0)
{
    property.PaymentStatus = PaymentStatus.Paid_partially;
}
else
{
    property.PaymentStatus = PaymentStatus.Pending;
}
```

## Button Visibility Logic

The "Collect Payment" button only shows when:

1. **Property payment info is loaded** (`propertyPaymentInfo` exists)
2. **Remaining balance exists** (`remainingAmount > 0.01`)

```typescript
{propertyPaymentInfo && (
  ((propertyPaymentInfo.propertyType?.price || 0) * (propertyPaymentInfo.areaSize || 0)) - 
  (propertyPaymentInfo.paidAmount || 0) > 0.01
) && (
  <button onClick={handlePay} className="btn-primary bg-success-600">
    <CurrencyDollarIcon className="h-5 w-5 mr-2" />
    Collect Payment
  </button>
)}
```

**Scenarios:**
- ✅ Remaining balance = $7,000 → Button shows
- ✅ Remaining balance = $0.05 → Button shows
- ❌ Remaining balance = $0.00 → Button hidden (fully paid)
- ❌ Property info not loaded → Button hidden

## User Experience Flow

### Scenario 1: Full Payment

```
1. Property owes $7,000 (remaining)
2. User clicks "Collect Payment"
3. Modal opens with $7,000 pre-filled
4. User clicks "Collect Payment"
5. Status preview shows: "Fully Paid" ✅
6. Payment collected
7. Property status → Paid
8. Button disappears (no more balance)
```

### Scenario 2: Partial Payment

```
1. Property owes $7,000 (remaining)
2. User clicks "Collect Payment"
3. Modal opens with $7,000 pre-filled
4. User changes amount to $2,000
5. Status preview shows: "Partially Paid (Remaining: $5,000)"
6. User clicks "Collect Payment"
7. Payment collected
8. Property status → Paid_partially
9. Button remains visible (still has balance)
10. Remaining balance now shows $5,000
```

### Scenario 3: Multiple Partial Payments

```
Payment 1: $3,000 → Partially Paid (Remaining: $7,000)
Payment 2: $2,000 → Partially Paid (Remaining: $5,000)
Payment 3: $5,000 → Fully Paid (Remaining: $0)
```

### Scenario 4: Validation Error

```
1. Property owes $7,000 (remaining)
2. User clicks "Collect Payment"
3. User enters $8,000 (more than remaining)
4. Error shows: "Amount cannot exceed remaining balance of USD 7,000.00"
5. Submit button still enabled
6. User corrects to $7,000
7. Error disappears
8. Payment proceeds
```

## Testing

### Test Case 1: Full Payment Collection

```
1. Navigate to Payment Details page
2. Verify "Collect Payment" button is visible
3. Click "Collect Payment"
4. VERIFY: Modal opens with payment summary ✅
5. VERIFY: Amount is pre-filled with remaining balance ✅
6. VERIFY: Status preview shows "Fully Paid" ✅
7. Click "Collect Payment" button
8. VERIFY: Payment collected successfully ✅
9. VERIFY: Payment history updates ✅
10. VERIFY: Property status shows "Paid" ✅
11. VERIFY: "Collect Payment" button disappears ✅
```

### Test Case 2: Partial Payment Collection

```
1. Navigate to Payment Details page
2. Click "Collect Payment"
3. Change amount to 50% of remaining balance
4. VERIFY: Status preview shows "Partially Paid" ✅
5. VERIFY: Shows correct remaining amount ✅
6. Click "Collect Payment"
7. VERIFY: Payment collected ✅
8. VERIFY: Property status shows "Paid_partially" ✅
9. VERIFY: "Collect Payment" button still visible ✅
10. VERIFY: Remaining balance updated correctly ✅
```

### Test Case 3: Amount Validation - Too High

```
1. Open payment modal
2. Enter amount greater than remaining balance
3. Click "Collect Payment"
4. VERIFY: Error message shows ✅
5. VERIFY: Payment NOT collected ✅
6. VERIFY: Modal stays open ✅
```

### Test Case 4: Amount Validation - Zero or Negative

```
1. Open payment modal
2. Enter 0 or negative amount
3. Click "Collect Payment"
4. VERIFY: Error message shows ✅
5. VERIFY: Payment NOT collected ✅
```

### Test Case 5: Amount Validation - Invalid Input

```
1. Open payment modal
2. Enter "abc" or empty field
3. Click "Collect Payment"
4. VERIFY: Error message shows ✅
5. VERIFY: Payment NOT collected ✅
```

### Test Case 6: Multiple Installments

```
1. Make 1st partial payment
2. VERIFY: Installment #1 in history ✅
3. Make 2nd partial payment
4. VERIFY: Installment #2 in history ✅
5. Make 3rd payment (full remaining)
6. VERIFY: Installment #3 in history ✅
7. VERIFY: Status = "Paid" ✅
8. VERIFY: Button disappears ✅
```

### Test Case 7: Cancel Payment

```
1. Open payment modal
2. Enter amount
3. Click "Cancel"
4. VERIFY: Modal closes ✅
5. VERIFY: No payment collected ✅
6. VERIFY: Can reopen modal ✅
```

## Benefits

### User Experience ✅
- **Flexible payments** - Can collect any amount up to remaining
- **Real-time feedback** - Shows payment status before submitting
- **Clear validation** - Helpful error messages
- **Visual summary** - Shows expected, paid, and remaining amounts
- **Installment tracking** - Each payment recorded separately

### Business Logic ✅
- **Automatic status** - Backend calculates Paid vs Paid_partially
- **No overpayment** - Validates against remaining balance
- **Payment history** - Full audit trail of all installments
- **Consistent data** - Property status always accurate

### Technical ✅
- **Backend integration** - Uses PaymentDetails API
- **Data integrity** - Reloads data after collection
- **Error handling** - Catches and displays API errors
- **Validation** - Client-side and server-side checks

## Files Modified

- `frontend/src/pages/PaymentDetails.tsx`
  - Added payment collection modal
  - Added amount validation logic
  - Added real-time status preview
  - Updated "Mark as Paid" → "Collect Payment"
  - Integrated with PaymentDetails API
  - **Lines Added:** ~130
  - **Lines Changed:** ~20

## Summary

🎉 **Payment Collection Modal Complete!**

**Before:**
- "Mark as Paid" button → marks entire payment as completed
- No partial payment support
- No amount validation
- No PaymentDetails integration

**After:**
- "Collect Payment" button → opens modal
- Can enter any amount (up to remaining balance)
- Real-time status preview
- Validates amount against remaining balance
- Creates PaymentDetail records
- Automatically calculates Paid vs Paid_partially
- Full payment history tracking

**Changes:**
- ✅ Added payment collection modal
- ✅ Added amount input with validation
- ✅ Added payment summary panel
- ✅ Added real-time status preview
- ✅ Integrated with PaymentDetails API
- ✅ Updated button visibility logic
- ✅ Full installment tracking

**Impact:**
- Can collect partial payments from web app
- Flexible payment amounts
- Automatic status calculation
- Complete audit trail

---

**Last Updated:** January 24, 2026  
**Status:** ✅ Complete - Ready for Testing  
**Platform:** Web (React/TypeScript)  
**API Integration:** PaymentDetails Controller
