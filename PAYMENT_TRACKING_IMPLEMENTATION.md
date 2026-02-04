# Payment Tracking Implementation

## Overview

Implemented comprehensive payment tracking for properties with support for partial payments.

## Features Added

### 1. Property Payment Tracking

#### New Fields in Property Entity:
- **`PaidAmount`**: `decimal` - Total amount paid for the property
- **`PaymentStatus`**: `string` - Current payment status with enum values:
  - `Pending` - No payment made yet
  - `Paid` - Fully paid
  - `Paid_partially` - Partial payment made
  - `Exemption` - Property is exempt from payment

### 2. PaymentDetail Entity (NEW)

Tracks individual payment installments for partial payments.

#### Fields:
- `PropertyId` - Property this payment is for
- `PaymentId` - Optional link to main Payment record
- `CollectedBy` - User who collected the payment
- `PaymentMethodId` - Method of payment (Cash, Bank Transfer, Mobile Money, etc.)
- `Amount` - Amount paid in this installment
- `Currency` - Payment currency (default: USD)
- `PaymentDate` - Date payment was received
- `TransactionReference` - Unique transaction reference
- `ReceiptNumber` - Receipt number issued
- `InstallmentNumber` - Sequence number (1st, 2nd, 3rd payment)
- `Notes` - Additional notes

## Database Changes

### Migration 009: Add Payment Tracking to Property
```sql
-- Adds PaidAmount and PaymentStatus columns to Properties table
ALTER TABLE "Properties" 
ADD COLUMN "PaidAmount" DECIMAL(18, 2) NOT NULL DEFAULT 0;

ALTER TABLE "Properties" 
ADD COLUMN "PaymentStatus" VARCHAR(50) NOT NULL DEFAULT 'Pending';

-- Constraint to ensure valid payment status values
ALTER TABLE "Properties"
ADD CONSTRAINT "CHK_Properties_PaymentStatus" 
CHECK ("PaymentStatus" IN ('Pending', 'Paid', 'Paid_partially', 'Exemption'));
```

### Migration 010: Create PaymentDetails Table
```sql
-- Creates PaymentDetails table for tracking partial payments
CREATE TABLE "PaymentDetails" (
    "Id" UUID PRIMARY KEY,
    "PropertyId" UUID NOT NULL REFERENCES "Properties"("Id"),
    "PaymentId" UUID NULL REFERENCES "Payments"("Id"),
    "CollectedBy" UUID NOT NULL REFERENCES "Users"("Id"),
    "PaymentMethodId" UUID NOT NULL REFERENCES "PaymentMethods"("Id"),
    "Amount" DECIMAL(18, 2) NOT NULL,
    "Currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "PaymentDate" TIMESTAMP NOT NULL,
    "TransactionReference" VARCHAR(100) NOT NULL UNIQUE,
    "ReceiptNumber" VARCHAR(50) NULL,
    "Notes" TEXT NULL,
    "InstallmentNumber" INTEGER NOT NULL DEFAULT 1,
    "CreatedAt" TIMESTAMP NOT NULL,
    "UpdatedAt" TIMESTAMP NOT NULL,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT FALSE
);
```

## API Endpoints

### PaymentDetailsController

#### 1. Get Payment Details for Property
```http
GET /api/paymentdetails/property/{propertyId}
```

**Response:**
```json
[
  {
    "id": "uuid",
    "propertyId": "uuid",
    "amount": 500.00,
    "currency": "USD",
    "paymentDate": "2026-01-24T10:00:00Z",
    "transactionReference": "PD-ABC12345-1-20260124100000",
    "receiptNumber": "RCP-001",
    "installmentNumber": 1,
    "notes": "First installment",
    "collectedBy": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "username": "john.doe"
    },
    "paymentMethod": {
      "id": "uuid",
      "name": "Cash",
      "code": "CASH"
    },
    "createdAt": "2026-01-24T10:00:00Z"
  }
]
```

#### 2. Create Payment Detail
```http
POST /api/paymentdetails
```

**Request Body:**
```json
{
  "propertyId": "uuid",
  "paymentId": "uuid", // optional
  "paymentMethodId": "uuid",
  "amount": 500.00,
  "currency": "USD",
  "paymentDate": "2026-01-24T10:00:00Z",
  "receiptNumber": "RCP-001",
  "notes": "First installment"
}
```

**Response:**
```json
{
  "id": "uuid",
  "propertyId": "uuid",
  "amount": 500.00,
  "currency": "USD",
  "paymentDate": "2026-01-24T10:00:00Z",
  "transactionReference": "PD-ABC12345-1-20260124100000",
  "receiptNumber": "RCP-001",
  "installmentNumber": 1,
  "collectedBy": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe"
  },
  "paymentMethod": {
    "id": "uuid",
    "name": "Cash"
  },
  "property": {
    "id": "uuid",
    "paidAmount": 500.00,
    "paymentStatus": "Paid_partially"
  }
}
```

#### 3. Get Payment Detail by ID
```http
GET /api/paymentdetails/{id}
```

### PropertiesController Updates

All property endpoints now include:
- `paidAmount` - Total amount paid
- `paymentStatus` - Current payment status

## Business Logic

### Automatic Payment Status Calculation

When a payment detail is created:

1. **Calculate Total Paid:**
   ```csharp
   totalPaid = SUM(PaymentDetails.Amount) WHERE PropertyId = {propertyId}
   ```

2. **Calculate Expected Amount:**
   ```csharp
   expectedAmount = PropertyType.Price × Property.AreaSize
   ```

3. **Determine Payment Status:**
   ```csharp
   if (totalPaid >= expectedAmount)
       status = "Paid"
   else if (totalPaid > 0)
       status = "Paid_partially"
   else
       status = "Pending"
   ```

4. **Update Property:**
   ```csharp
   property.PaidAmount = totalPaid
   property.PaymentStatus = status
   ```

## Use Cases

### Scenario 1: Full Payment
```
Property: Commercial building
Expected Amount: $10,000 (PropertyType.Price * AreaSize)

Action: Create PaymentDetail with Amount = $10,000
Result: 
- PaidAmount = $10,000
- PaymentStatus = "Paid"
- InstallmentNumber = 1
```

### Scenario 2: Partial Payment (Multiple Installments)
```
Property: Residential house
Expected Amount: $5,000

Payment 1: Create PaymentDetail with Amount = $2,000
Result:
- PaidAmount = $2,000
- PaymentStatus = "Paid_partially"
- InstallmentNumber = 1

Payment 2: Create PaymentDetail with Amount = $2,000
Result:
- PaidAmount = $4,000
- PaymentStatus = "Paid_partially"
- InstallmentNumber = 2

Payment 3: Create PaymentDetail with Amount = $1,000
Result:
- PaidAmount = $5,000
- PaymentStatus = "Paid"
- InstallmentNumber = 3
```

### Scenario 3: Exemption
```
Property: Government building
Action: Manually set PaymentStatus = "Exemption"
Result:
- PaidAmount = $0
- PaymentStatus = "Exemption"
- No PaymentDetails required
```

## Frontend Integration (Web App)

### TypeScript Interfaces

```typescript
interface Property {
  // ... existing fields ...
  paidAmount: number;
  paymentStatus: 'Pending' | 'Paid' | 'Paid_partially' | 'Exemption';
}

interface PaymentDetail {
  id: string;
  propertyId: string;
  paymentId?: string;
  amount: number;
  currency: string;
  paymentDate: string;
  transactionReference: string;
  receiptNumber?: string;
  installmentNumber: number;
  notes?: string;
  collectedBy: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
  paymentMethod: {
    id: string;
    name: string;
    code: string;
  };
  createdAt: string;
}
```

### Display Payment Status

```tsx
// Payment status badge component
const PaymentStatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    Pending: { color: 'orange', icon: '⏳', label: 'Pending' },
    Paid: { color: 'green', icon: '✅', label: 'Paid' },
    Paid_partially: { color: 'blue', icon: '📊', label: 'Partially Paid' },
    Exemption: { color: 'gray', icon: '🏛️', label: 'Exemption' }
  };
  
  const config = statusConfig[status] || statusConfig.Pending;
  
  return (
    <span className={`badge badge-${config.color}`}>
      {config.icon} {config.label}
    </span>
  );
};

// Display payment progress
const PaymentProgress = ({ property }: { property: Property }) => {
  const expectedAmount = property.propertyType.price * property.areaSize;
  const percentage = (property.paidAmount / expectedAmount) * 100;
  
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span>Payment Progress</span>
        <span>${property.paidAmount} / ${expectedAmount}</span>
      </div>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-sm">{percentage.toFixed(1)}% paid</p>
    </div>
  );
};
```

### Record Payment Detail

```tsx
const recordPayment = async (propertyId: string, amount: number) => {
  const response = await fetch('/api/paymentdetails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      propertyId,
      paymentMethodId: selectedPaymentMethodId,
      amount,
      currency: 'USD',
      paymentDate: new Date().toISOString(),
      receiptNumber: generateReceiptNumber(),
      notes: paymentNotes
    })
  });
  
  const result = await response.json();
  
  // Show updated status
  console.log('Payment Status:', result.property.paymentStatus);
  console.log('Total Paid:', result.property.paidAmount);
};
```

## Testing

### 1. Run Migrations
```bash
# Connect to PostgreSQL and run:
psql -U property_user -d property_registration -f Migrations/009_AddPaymentTrackingToProperty.sql
psql -U property_user -d property_registration -f Migrations/010_CreatePaymentDetailsTable.sql
```

### 2. Test Payment Status Update
```bash
# Create first partial payment
curl -X POST http://localhost:9000/api/paymentdetails \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "propertyId": "{propertyId}",
    "paymentMethodId": "{paymentMethodId}",
    "amount": 1000.00
  }'

# Verify property updated
curl -X GET http://localhost:9000/api/properties/{propertyId} \
  -H "Authorization: Bearer {token}"
```

### 3. Test Payment History
```bash
# Get all payment details for property
curl -X GET http://localhost:9000/api/paymentdetails/property/{propertyId} \
  -H "Authorization: Bearer {token}"
```

## Files Modified/Created

### Backend - Core
- ✅ `PropertyRegistration.Core/Entities/Property.cs` - Added PaidAmount, PaymentStatus, PaymentDetails collection
- ✅ `PropertyRegistration.Core/Entities/PaymentDetail.cs` - NEW entity

### Backend - Infrastructure  
- ✅ `PropertyRegistration.Infrastructure/Mappings/PropertyMap.cs` - Added new field mappings
- ✅ `PropertyRegistration.Infrastructure/Mappings/PaymentDetailMap.cs` - NEW mapping

### Backend - API
- ✅ `PropertyRegistration.Api/Controllers/PropertiesController.cs` - Include new fields in responses
- ✅ `PropertyRegistration.Api/Controllers/PaymentDetailsController.cs` - NEW controller
- ✅ `PropertyRegistration.Api/Migrations/009_AddPaymentTrackingToProperty.sql` - NEW migration
- ✅ `PropertyRegistration.Api/Migrations/010_CreatePaymentDetailsTable.sql` - NEW migration

### Documentation
- ✅ `PAYMENT_TRACKING_IMPLEMENTATION.md` - This file

## Next Steps for Frontend

1. **Update Property Types:**
   - Add `paidAmount` and `paymentStatus` to Property interface

2. **Property Details Page:**
   - Display payment status badge
   - Show payment progress bar
   - Add "Record Payment" button
   - Display payment history table

3. **Payment Recording Modal:**
   - Form to enter payment amount
   - Select payment method
   - Optional receipt number and notes
   - Auto-calculate remaining balance

4. **Properties List:**
   - Add payment status column with color coding
   - Filter by payment status
   - Show paid amount vs expected

5. **Dashboard:**
   - Payment collection statistics
   - Pending payments report
   - Recent payments list

## Follow-Up System

A comprehensive payment follow-up system has been implemented to track properties with partial payments.

See: [PAYMENT_FOLLOWUP_IMPLEMENTATION.md](PAYMENT_FOLLOWUP_IMPLEMENTATION.md)

**Features:**
- Daily follow-up reports
- Urgency classification (Urgent/Moderate/Recent)
- Remaining balance calculations
- Contact information for follow-ups
- Payment history tracking

**New Endpoints:**
- `GET /api/paymentfollowup/partial-payments` - Get all partial payments
- `GET /api/paymentfollowup/summary` - Get follow-up statistics
- `GET /api/paymentfollowup/property/{id}/history` - Get payment history
- `GET /api/paymentfollowup/urgent` - Get urgent cases
- `GET /api/paymentfollowup/daily-report` - Get daily report

## Summary

✅ **Payment tracking infrastructure complete!**

- 📊 Track total paid amount per property
- 🔄 Automatic payment status calculation  
- 💰 Support for partial payments with installments
- 📝 Detailed payment history
- 📞 Daily follow-up system with urgency tracking
- 💳 Remaining balance calculations
- 🎯 Ready for frontend integration

---

**Last Updated:** January 24, 2026  
**Status:** ✅ Complete with Follow-Up System
