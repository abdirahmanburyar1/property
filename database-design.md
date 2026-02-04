# Database Design - Property Registration System

## Overview

This document outlines the complete database schema for the Property Registration System using PostgreSQL. The design supports property registration, payment collection, document management, user authentication, collector assignment (every 50 properties assigned to users with Collector role), and real-time updates.

## Entity Relationship Diagram

```mermaid
erDiagram
    Users ||--o{ Properties : creates
    Users ||--o{ Properties : "collects (as collector)"
    Users ||--o{ Payments : makes
    Users ||--o{ AuditLogs : generates
    Properties ||--o{ PropertyDocuments : has
    Properties ||--o{ Payments : "has payments"
    Payments ||--o{ PaymentTransactions : "has transactions"
    Payments ||--|| Receipts : generates
    Properties }o--|| PropertyTypes : "has type"
    Properties }o--|| PropertyStatuses : "has status"
    Payments }o--|| PaymentMethods : "uses method"
    Payments }o--|| PaymentStatuses : "has status"
    Tasks ||--o{ TaskLogs : "has logs"
    
    Users {
        uuid Id PK
        string Email UK
        string Username UK
        string PasswordHash
        string FirstName
        string LastName
        string PhoneNumber
        enum Role
        int CurrentPropertyCount
        bool IsActive
        datetime CreatedAt
        datetime UpdatedAt
        datetime LastLoginAt
    }
    
    Properties {
        uuid Id PK
        uuid CreatedBy FK
        uuid CollectorId FK
        uuid PropertyTypeId FK
        uuid StatusId FK
        decimal Latitude
        decimal Longitude
        string StreetAddress
        string City
        string State
        string PostalCode
        string Country
        string OwnerName
        string OwnerPhone
        string OwnerEmail
        decimal AreaSize
        string AreaUnit
        decimal EstimatedValue
        string Currency
        text Description
        json Metadata
        datetime CreatedAt
        datetime UpdatedAt
        datetime ApprovedAt
        uuid ApprovedBy FK
    }
    
    PropertyTypes {
        uuid Id PK
        string Name UK
        string Description
        bool IsActive
        int DisplayOrder
        datetime CreatedAt
    }
    
    PropertyStatuses {
        uuid Id PK
        string Name UK
        string Description
        string ColorCode
        bool IsActive
        int DisplayOrder
        datetime CreatedAt
    }
    
    PropertyDocuments {
        uuid Id PK
        uuid PropertyId FK
        string FileName
        string OriginalFileName
        string FilePath
        string FileType
        bigint FileSize
        string MimeType
        string DocumentType
        bool IsPrimary
        datetime UploadedAt
        uuid UploadedBy FK
    }
    
    Payments {
        uuid Id PK
        uuid PropertyId FK
        uuid CreatedBy FK
        uuid PaymentMethodId FK
        uuid StatusId FK
        decimal Amount
        string Currency
        string TransactionReference UK
        string ExternalReference
        text Notes
        json PaymentMetadata
        datetime PaymentDate
        datetime CreatedAt
        datetime UpdatedAt
        datetime CompletedAt
    }
    
    PaymentMethods {
        uuid Id PK
        string Name UK
        string Code UK
        string Description
        bool IsActive
        int DisplayOrder
        datetime CreatedAt
    }
    
    PaymentStatuses {
        uuid Id PK
        string Name UK
        string Description
        string ColorCode
        bool IsActive
        int DisplayOrder
        datetime CreatedAt
    }
    
    PaymentTransactions {
        uuid Id PK
        uuid PaymentId FK
        string TransactionType
        decimal Amount
        string Currency
        string Reference
        text Description
        json TransactionData
        datetime TransactionDate
        datetime CreatedAt
    }
    
    Receipts {
        uuid Id PK
        uuid PaymentId FK UK
        string ReceiptNumber UK
        text ReceiptContent
        string FilePath
        bool IsPrinted
        datetime PrintedAt
        datetime CreatedAt
    }
    
    Tasks {
        uuid Id PK
        string TaskType
        string TaskName
        string Status
        json TaskData
        json ResultData
        text ErrorMessage
        int RetryCount
        datetime CreatedAt
        datetime StartedAt
        datetime CompletedAt
        datetime FailedAt
    }
    
    TaskLogs {
        uuid Id PK
        uuid TaskId FK
        string LogLevel
        string Message
        json LogData
        datetime CreatedAt
    }
    
    AuditLogs {
        uuid Id PK
        uuid UserId FK
        string Action
        string EntityType
        uuid EntityId
        json OldValues
        json NewValues
        string IpAddress
        string UserAgent
        datetime CreatedAt
    }
```

## Database Tables

### 1. Users

Stores user account information and authentication details.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Id | UUID | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary key |
| Email | VARCHAR(255) | NOT NULL, UNIQUE | User email address |
| Username | VARCHAR(100) | NOT NULL, UNIQUE | Username for login |
| PasswordHash | VARCHAR(255) | NOT NULL | Hashed password (BCrypt) |
| FirstName | VARCHAR(100) | NOT NULL | User first name |
| LastName | VARCHAR(100) | NOT NULL | User last name |
| PhoneNumber | VARCHAR(20) | NULL | Contact phone number |
| Role | VARCHAR(20) | NOT NULL, DEFAULT 'User' | User role (Admin, User, Collector) |
| CurrentPropertyCount | INTEGER | NOT NULL, DEFAULT 0 | Number of properties assigned (for Collector role) |
| IsActive | BOOLEAN | NOT NULL, DEFAULT true | Account active status |
| CreatedAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Account creation timestamp |
| UpdatedAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |
| LastLoginAt | TIMESTAMP | NULL | Last login timestamp |

**Indexes:**
- `IX_Users_Email` on `Email`
- `IX_Users_Username` on `Username`
- `IX_Users_Role` on `Role`
- `IX_Users_Role_IsActive` on `Role, IsActive` (for finding active collectors)
- `IX_Users_CurrentPropertyCount` on `CurrentPropertyCount` (for collector assignment)
- `IX_Users_IsActive` on `IsActive`

**Enums:**
```sql
CREATE TYPE user_role AS ENUM ('Admin', 'User', 'Collector');
```

**Collector Assignment Logic:**
- Users with role 'Collector' are assigned properties
- Every 50 properties are assigned to a collector
- `CurrentPropertyCount` tracks how many properties each collector has
- When a property is created, it's assigned to the collector with the lowest count (< 50)

---

### 2. PropertyTypes

Lookup table for property types (Residential, Commercial, Land, etc.).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Id | UUID | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary key |
| Name | VARCHAR(100) | NOT NULL, UNIQUE | Property type name |
| Description | TEXT | NULL | Type description |
| IsActive | BOOLEAN | NOT NULL, DEFAULT true | Active status |
| DisplayOrder | INTEGER | NOT NULL, DEFAULT 0 | Display order |
| CreatedAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `IX_PropertyTypes_Name` on `Name`
- `IX_PropertyTypes_IsActive` on `IsActive`

**Seed Data:**
- Residential
- Commercial
- Industrial
- Land
- Agricultural
- Mixed Use

---

### 3. PropertyStatuses

Lookup table for property registration statuses.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Id | UUID | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary key |
| Name | VARCHAR(50) | NOT NULL, UNIQUE | Status name |
| Description | TEXT | NULL | Status description |
| ColorCode | VARCHAR(7) | NULL | Hex color for UI (e.g., #FF5733) |
| IsActive | BOOLEAN | NOT NULL, DEFAULT true | Active status |
| DisplayOrder | INTEGER | NOT NULL, DEFAULT 0 | Display order |
| CreatedAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `IX_PropertyStatuses_Name` on `Name`

**Seed Data:**
- Pending (Yellow: #FFC107)
- Approved (Green: #4CAF50)
- Rejected (Red: #F44336)
- Under Review (Blue: #2196F3)
- Draft (Gray: #9E9E9E)

---

### 4. Properties

Main table storing property registration information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Id | UUID | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary key |
| CreatedBy | UUID | FK → Users.Id, NOT NULL | User who created the property |
| CollectorId | UUID | FK → Users.Id, NULL | Assigned collector (user with Collector role) for payment collection |
| PropertyTypeId | UUID | FK → PropertyTypes.Id, NOT NULL | Property type reference |
| StatusId | UUID | FK → PropertyStatuses.Id, NOT NULL | Current status |
| Latitude | DECIMAL(10, 8) | NOT NULL | GPS latitude coordinate |
| Longitude | DECIMAL(11, 8) | NOT NULL | GPS longitude coordinate |
| StreetAddress | VARCHAR(255) | NOT NULL | Street address |
| City | VARCHAR(100) | NOT NULL | City name |
| State | VARCHAR(100) | NULL | State/Province |
| PostalCode | VARCHAR(20) | NULL | Postal/ZIP code |
| Country | VARCHAR(100) | NOT NULL, DEFAULT 'Ethiopia' | Country name |
| OwnerName | VARCHAR(255) | NOT NULL | Property owner name |
| OwnerPhone | VARCHAR(20) | NULL | Owner contact phone |
| OwnerEmail | VARCHAR(255) | NULL | Owner email address |
| AreaSize | DECIMAL(12, 2) | NOT NULL | Property area/size |
| AreaUnit | VARCHAR(20) | NOT NULL, DEFAULT 'sqm' | Unit (sqm, hectares, acres) |
| EstimatedValue | DECIMAL(18, 2) | NULL | Estimated property value |
| Currency | VARCHAR(3) | NOT NULL, DEFAULT 'ETB' | Currency code (ISO 4217) |
| Description | TEXT | NULL | Property description |
| Metadata | JSONB | NULL | Additional flexible data |
| CreatedAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| UpdatedAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |
| ApprovedAt | TIMESTAMP | NULL | Approval timestamp |
| ApprovedBy | UUID | FK → Users.Id, NULL | User who approved |

**Indexes:**
- `IX_Properties_CreatedBy` on `CreatedBy`
- `IX_Properties_CollectorId` on `CollectorId` (references Users.Id where Role = 'Collector')
- `IX_Properties_PropertyTypeId` on `PropertyTypeId`
- `IX_Properties_StatusId` on `StatusId`
- `IX_Properties_Latitude_Longitude` on `Latitude, Longitude` (for spatial queries)
- `IX_Properties_City` on `City`
- `IX_Properties_CreatedAt` on `CreatedAt`
- `IX_Properties_OwnerName` on `OwnerName`
- `GIN_Properties_Metadata` on `Metadata` (GIN index for JSONB)

**Spatial Index:**
```sql
CREATE INDEX IX_Properties_Location ON Properties USING GIST (
    POINT(Longitude, Latitude)
);
```

---

### 5. PropertyDocuments

Stores file attachments (documents, photos) for properties.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Id | UUID | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary key |
| PropertyId | UUID | FK → Properties.Id, NOT NULL | Property reference |
| FileName | VARCHAR(255) | NOT NULL | Stored file name |
| OriginalFileName | VARCHAR(255) | NOT NULL | Original uploaded filename |
| FilePath | VARCHAR(500) | NOT NULL | File storage path |
| FileType | VARCHAR(50) | NOT NULL | File extension |
| FileSize | BIGINT | NOT NULL | File size in bytes |
| MimeType | VARCHAR(100) | NOT NULL | MIME type |
| DocumentType | VARCHAR(50) | NOT NULL | Type (Photo, Document, Certificate, etc.) |
| IsPrimary | BOOLEAN | NOT NULL, DEFAULT false | Primary image flag |
| UploadedAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Upload timestamp |
| UploadedBy | UUID | FK → Users.Id, NOT NULL | User who uploaded |

**Indexes:**
- `IX_PropertyDocuments_PropertyId` on `PropertyId`
- `IX_PropertyDocuments_DocumentType` on `DocumentType`
- `IX_PropertyDocuments_IsPrimary` on `IsPrimary`

**Enums:**
```sql
CREATE TYPE document_type AS ENUM ('Photo', 'Document', 'Certificate', 'Map', 'Other');
```

---

### 6. PaymentMethods

Lookup table for payment methods.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Id | UUID | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary key |
| Name | VARCHAR(100) | NOT NULL, UNIQUE | Method name |
| Code | VARCHAR(20) | NOT NULL, UNIQUE | Method code |
| Description | TEXT | NULL | Method description |
| IsActive | BOOLEAN | NOT NULL, DEFAULT true | Active status |
| DisplayOrder | INTEGER | NOT NULL, DEFAULT 0 | Display order |
| CreatedAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `IX_PaymentMethods_Code` on `Code`

**Seed Data:**
- Cash (CASH)
- Credit Card (CARD)
- Debit Card (DEBIT)
- Mobile Money (MOBILE)
- Bank Transfer (BANK)

---

### 7. PaymentStatuses

Lookup table for payment statuses.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Id | UUID | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary key |
| Name | VARCHAR(50) | NOT NULL, UNIQUE | Status name |
| Description | TEXT | NULL | Status description |
| ColorCode | VARCHAR(7) | NULL | Hex color for UI |
| IsActive | BOOLEAN | NOT NULL, DEFAULT true | Active status |
| DisplayOrder | INTEGER | NOT NULL, DEFAULT 0 | Display order |
| CreatedAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |

**Seed Data:**
- Pending (Yellow: #FFC107)
- Completed (Green: #4CAF50)
- Failed (Red: #F44336)
- Refunded (Orange: #FF9800)
- Cancelled (Gray: #9E9E9E)

---

### 8. Payments

Main table storing payment records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Id | UUID | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary key |
| PropertyId | UUID | FK → Properties.Id, NOT NULL | Property reference |
| CreatedBy | UUID | FK → Users.Id, NOT NULL | User who created payment |
| PaymentMethodId | UUID | FK → PaymentMethods.Id, NOT NULL | Payment method |
| StatusId | UUID | FK → PaymentStatuses.Id, NOT NULL | Current status |
| Amount | DECIMAL(18, 2) | NOT NULL | Payment amount |
| Currency | VARCHAR(3) | NOT NULL, DEFAULT 'ETB' | Currency code |
| TransactionReference | VARCHAR(100) | NOT NULL, UNIQUE | Internal transaction reference |
| ExternalReference | VARCHAR(255) | NULL | External payment gateway reference |
| Notes | TEXT | NULL | Payment notes |
| PaymentMetadata | JSONB | NULL | Additional payment data |
| PaymentDate | TIMESTAMP | NOT NULL, DEFAULT NOW() | Payment date/time |
| CreatedAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| UpdatedAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |
| CompletedAt | TIMESTAMP | NULL | Completion timestamp |

**Indexes:**
- `IX_Payments_PropertyId` on `PropertyId`
- `IX_Payments_CreatedBy` on `CreatedBy`
- `IX_Payments_PaymentMethodId` on `PaymentMethodId`
- `IX_Payments_StatusId` on `StatusId`
- `IX_Payments_TransactionReference` on `TransactionReference`
- `IX_Payments_PaymentDate` on `PaymentDate`
- `IX_Payments_CreatedAt` on `CreatedAt`
- `GIN_Payments_PaymentMetadata` on `PaymentMetadata`

---

### 9. PaymentTransactions

Stores transaction history and audit trail for payments.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Id | UUID | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary key |
| PaymentId | UUID | FK → Payments.Id, NOT NULL | Payment reference |
| TransactionType | VARCHAR(50) | NOT NULL | Type (Payment, Refund, Adjustment) |
| Amount | DECIMAL(18, 2) | NOT NULL | Transaction amount |
| Currency | VARCHAR(3) | NOT NULL, DEFAULT 'ETB' | Currency code |
| Reference | VARCHAR(100) | NULL | Transaction reference |
| Description | TEXT | NULL | Transaction description |
| TransactionData | JSONB | NULL | Additional transaction data |
| TransactionDate | TIMESTAMP | NOT NULL, DEFAULT NOW() | Transaction timestamp |
| CreatedAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `IX_PaymentTransactions_PaymentId` on `PaymentId`
- `IX_PaymentTransactions_TransactionType` on `TransactionType`
- `IX_PaymentTransactions_TransactionDate` on `TransactionDate`

---

### 10. Receipts

Stores receipt information for payments.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Id | UUID | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary key |
| PaymentId | UUID | FK → Payments.Id, NOT NULL, UNIQUE | Payment reference (one receipt per payment) |
| ReceiptNumber | VARCHAR(50) | NOT NULL, UNIQUE | Receipt number |
| ReceiptContent | TEXT | NOT NULL | Receipt content (formatted text) |
| FilePath | VARCHAR(500) | NULL | PDF receipt file path (if generated) |
| IsPrinted | BOOLEAN | NOT NULL, DEFAULT false | Print status |
| PrintedAt | TIMESTAMP | NULL | Print timestamp |
| CreatedAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `IX_Receipts_PaymentId` on `PaymentId`
- `IX_Receipts_ReceiptNumber` on `ReceiptNumber`
- `IX_Receipts_IsPrinted` on `IsPrinted`

**Receipt Number Format:**
`REC-{YYYYMMDD}-{SEQUENCE}` (e.g., REC-20240115-0001)

---

### 11. Tasks

Stores RabbitMQ task queue tracking information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Id | UUID | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary key |
| TaskType | VARCHAR(100) | NOT NULL | Task type identifier |
| TaskName | VARCHAR(255) | NOT NULL | Task name/description |
| Status | VARCHAR(50) | NOT NULL, DEFAULT 'Pending' | Task status |
| TaskData | JSONB | NULL | Task input data |
| ResultData | JSONB | NULL | Task result data |
| ErrorMessage | TEXT | NULL | Error message if failed |
| RetryCount | INTEGER | NOT NULL, DEFAULT 0 | Number of retry attempts |
| CreatedAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| StartedAt | TIMESTAMP | NULL | Start timestamp |
| CompletedAt | TIMESTAMP | NULL | Completion timestamp |
| FailedAt | TIMESTAMP | NULL | Failure timestamp |

**Indexes:**
- `IX_Tasks_TaskType` on `TaskType`
- `IX_Tasks_Status` on `Status`
- `IX_Tasks_CreatedAt` on `CreatedAt`
- `IX_Tasks_Status_CreatedAt` on `Status, CreatedAt` (for queue processing)

**Task Types:**
- PropertyValidation
- ReportGeneration
- EmailNotification
- ImageProcessing
- ReceiptGeneration
- PaymentProcessing

**Task Statuses:**
- Pending
- Processing
- Completed
- Failed
- Cancelled

---

### 12. TaskLogs

Stores detailed logs for task execution.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Id | UUID | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary key |
| TaskId | UUID | FK → Tasks.Id, NOT NULL | Task reference |
| LogLevel | VARCHAR(20) | NOT NULL | Log level (Info, Warning, Error) |
| Message | TEXT | NOT NULL | Log message |
| LogData | JSONB | NULL | Additional log data |
| CreatedAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Log timestamp |

**Indexes:**
- `IX_TaskLogs_TaskId` on `TaskId`
- `IX_TaskLogs_LogLevel` on `LogLevel`
- `IX_TaskLogs_CreatedAt` on `CreatedAt`

---

### 13. AuditLogs

Stores system audit trail for tracking user actions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Id | UUID | PK, NOT NULL, DEFAULT gen_random_uuid() | Primary key |
| UserId | UUID | FK → Users.Id, NULL | User who performed action |
| Action | VARCHAR(100) | NOT NULL | Action performed (Create, Update, Delete, Login, etc.) |
| EntityType | VARCHAR(100) | NOT NULL | Entity type (Property, Payment, User, etc.) |
| EntityId | UUID | NULL | Entity ID |
| OldValues | JSONB | NULL | Old values (for updates) |
| NewValues | JSONB | NULL | New values |
| IpAddress | VARCHAR(45) | NULL | Client IP address |
| UserAgent | VARCHAR(500) | NULL | User agent string |
| CreatedAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Action timestamp |

**Indexes:**
- `IX_AuditLogs_UserId` on `UserId`
- `IX_AuditLogs_Action` on `Action`
- `IX_AuditLogs_EntityType` on `EntityType`
- `IX_AuditLogs_EntityType_EntityId` on `EntityType, EntityId`
- `IX_AuditLogs_CreatedAt` on `CreatedAt`
- `GIN_AuditLogs_OldValues` on `OldValues`
- `GIN_AuditLogs_NewValues` on `NewValues`

---

## Foreign Key Relationships

```sql
-- Properties
ALTER TABLE Properties
    ADD CONSTRAINT FK_Properties_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(Id) ON DELETE RESTRICT,
    ADD CONSTRAINT FK_Properties_CollectorId FOREIGN KEY (CollectorId) REFERENCES Users(Id) ON DELETE SET NULL,
    ADD CONSTRAINT FK_Properties_PropertyTypeId FOREIGN KEY (PropertyTypeId) REFERENCES PropertyTypes(Id) ON DELETE RESTRICT,
    ADD CONSTRAINT FK_Properties_StatusId FOREIGN KEY (StatusId) REFERENCES PropertyStatuses(Id) ON DELETE RESTRICT,
    ADD CONSTRAINT FK_Properties_ApprovedBy FOREIGN KEY (ApprovedBy) REFERENCES Users(Id) ON DELETE SET NULL;
    
-- Note: CollectorId references Users.Id where Role = 'Collector'

-- PropertyDocuments
ALTER TABLE PropertyDocuments
    ADD CONSTRAINT FK_PropertyDocuments_PropertyId FOREIGN KEY (PropertyId) REFERENCES Properties(Id) ON DELETE CASCADE,
    ADD CONSTRAINT FK_PropertyDocuments_UploadedBy FOREIGN KEY (UploadedBy) REFERENCES Users(Id) ON DELETE RESTRICT;

-- Payments
ALTER TABLE Payments
    ADD CONSTRAINT FK_Payments_PropertyId FOREIGN KEY (PropertyId) REFERENCES Properties(Id) ON DELETE RESTRICT,
    ADD CONSTRAINT FK_Payments_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(Id) ON DELETE RESTRICT,
    ADD CONSTRAINT FK_Payments_PaymentMethodId FOREIGN KEY (PaymentMethodId) REFERENCES PaymentMethods(Id) ON DELETE RESTRICT,
    ADD CONSTRAINT FK_Payments_StatusId FOREIGN KEY (StatusId) REFERENCES PaymentStatuses(Id) ON DELETE RESTRICT;
    
-- Note: Payments can be linked to Collectors through Properties.CollectorId (which references Users with Role = 'Collector')

-- PaymentTransactions
ALTER TABLE PaymentTransactions
    ADD CONSTRAINT FK_PaymentTransactions_PaymentId FOREIGN KEY (PaymentId) REFERENCES Payments(Id) ON DELETE CASCADE;

-- Receipts
ALTER TABLE Receipts
    ADD CONSTRAINT FK_Receipts_PaymentId FOREIGN KEY (PaymentId) REFERENCES Payments(Id) ON DELETE CASCADE;

-- TaskLogs
ALTER TABLE TaskLogs
    ADD CONSTRAINT FK_TaskLogs_TaskId FOREIGN KEY (TaskId) REFERENCES Tasks(Id) ON DELETE CASCADE;

-- AuditLogs
ALTER TABLE AuditLogs
    ADD CONSTRAINT FK_AuditLogs_UserId FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE SET NULL;
```

---

## Database Functions & Triggers

### UpdatedAt Trigger

Automatically update `UpdatedAt` timestamp on row updates:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.UpdatedAt = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with UpdatedAt column
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON Properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON Payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Receipt Number Generation

Generate unique receipt numbers:

```sql
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
DECLARE
    receipt_seq INTEGER;
    receipt_date VARCHAR(8);
BEGIN
    receipt_date := TO_CHAR(NOW(), 'YYYYMMDD');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(ReceiptNumber FROM 13) AS INTEGER)), 0) + 1
    INTO receipt_seq
    FROM Receipts
    WHERE ReceiptNumber LIKE 'REC-' || receipt_date || '-%';
    
    NEW.ReceiptNumber := 'REC-' || receipt_date || '-' || LPAD(receipt_seq::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_receipt_number_trigger BEFORE INSERT ON Receipts
    FOR EACH ROW WHEN (NEW.ReceiptNumber IS NULL)
    EXECUTE FUNCTION generate_receipt_number();
```

### Collector Assignment Function

Automatically assign collector (user with Collector role) to property based on the "every 50 properties" rule:

```sql
CREATE OR REPLACE FUNCTION assign_collector_to_property()
RETURNS TRIGGER AS $$
DECLARE
    available_collector_id UUID;
    collector_count INTEGER;
    max_properties_per_collector INTEGER := 50;
BEGIN
    -- Only assign if collector is not already set
    IF NEW.CollectorId IS NULL THEN
        -- Find collector (user with Collector role) with less than 50 properties
        SELECT Id, CurrentPropertyCount
        INTO available_collector_id, collector_count
        FROM Users
        WHERE Role = 'Collector'
          AND IsActive = true
          AND CurrentPropertyCount < max_properties_per_collector
        ORDER BY CurrentPropertyCount ASC, CreatedAt ASC
        LIMIT 1;
        
        -- If no available collector, assign to collector with lowest count (may exceed 50 temporarily)
        IF available_collector_id IS NULL THEN
            SELECT Id
            INTO available_collector_id
            FROM Users
            WHERE Role = 'Collector'
              AND IsActive = true
            ORDER BY CurrentPropertyCount ASC, CreatedAt ASC
            LIMIT 1;
        END IF;
        
        -- Assign collector
        IF available_collector_id IS NOT NULL THEN
            NEW.CollectorId := available_collector_id;
            
            -- Update collector's property count
            UPDATE Users
            SET CurrentPropertyCount = CurrentPropertyCount + 1,
                UpdatedAt = NOW()
            WHERE Id = available_collector_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assign_collector_trigger BEFORE INSERT ON Properties
    FOR EACH ROW
    EXECUTE FUNCTION assign_collector_to_property();
```

**Note:** This trigger automatically assigns collectors (users with Role = 'Collector') when properties are created. The assignment follows the rule: every 50 properties are assigned to a collector. When a collector reaches 50 properties, the next available collector is assigned.

### Collector Property Count Update Function

Update collector count when property is deleted or reassigned:

```sql
CREATE OR REPLACE FUNCTION update_collector_count_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Decrease count when property is deleted
    IF OLD.CollectorId IS NOT NULL THEN
        UPDATE Users
        SET CurrentPropertyCount = GREATEST(CurrentPropertyCount - 1, 0),
            UpdatedAt = NOW()
        WHERE Id = OLD.CollectorId AND Role = 'Collector';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_collector_count_delete_trigger AFTER DELETE ON Properties
    FOR EACH ROW
    EXECUTE FUNCTION update_collector_count_on_delete();

CREATE OR REPLACE FUNCTION update_collector_count_on_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle collector reassignment
    IF OLD.CollectorId IS DISTINCT FROM NEW.CollectorId THEN
        -- Decrease old collector count
        IF OLD.CollectorId IS NOT NULL THEN
            UPDATE Users
            SET CurrentPropertyCount = GREATEST(CurrentPropertyCount - 1, 0),
                UpdatedAt = NOW()
            WHERE Id = OLD.CollectorId AND Role = 'Collector';
        END IF;
        
        -- Increase new collector count
        IF NEW.CollectorId IS NOT NULL THEN
            UPDATE Users
            SET CurrentPropertyCount = CurrentPropertyCount + 1,
                UpdatedAt = NOW()
            WHERE Id = NEW.CollectorId AND Role = 'Collector';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_collector_count_update_trigger AFTER UPDATE ON Properties
    FOR EACH ROW
    WHEN (OLD.CollectorId IS DISTINCT FROM NEW.CollectorId)
    EXECUTE FUNCTION update_collector_count_on_update();
```

---

## Database Views

### PropertiesWithDetails View

Combines property data with related information including collector details:

```sql
CREATE VIEW PropertiesWithDetails AS
SELECT 
    p.Id,
    p.Latitude,
    p.Longitude,
    p.StreetAddress,
    p.City,
    p.State,
    p.PostalCode,
    p.Country,
    p.OwnerName,
    p.OwnerPhone,
    p.OwnerEmail,
    p.AreaSize,
    p.AreaUnit,
    p.EstimatedValue,
    p.Currency,
    p.Description,
    p.CreatedAt,
    p.UpdatedAt,
    pt.Name AS PropertyTypeName,
    ps.Name AS StatusName,
    ps.ColorCode AS StatusColor,
    u.Username AS CreatedByUsername,
    u.Email AS CreatedByEmail,
    c.Id AS CollectorId,
    c.Username AS CollectorUsername,
    c.FirstName AS CollectorFirstName,
    c.LastName AS CollectorLastName,
    c.PhoneNumber AS CollectorPhone,
    c.Email AS CollectorEmail,
    c.CurrentPropertyCount AS CollectorPropertyCount,
    COUNT(DISTINCT pd.Id) AS DocumentCount,
    COUNT(DISTINCT pay.Id) AS PaymentCount,
    COALESCE(SUM(pay.Amount), 0) AS TotalPayments
FROM Properties p
LEFT JOIN PropertyTypes pt ON p.PropertyTypeId = pt.Id
LEFT JOIN PropertyStatuses ps ON p.StatusId = ps.Id
LEFT JOIN Users u ON p.CreatedBy = u.Id
LEFT JOIN Users c ON p.CollectorId = c.Id AND c.Role = 'Collector'
LEFT JOIN PropertyDocuments pd ON p.Id = pd.PropertyId
LEFT JOIN Payments pay ON p.Id = pay.PropertyId AND pay.StatusId IN (
    SELECT Id FROM PaymentStatuses WHERE Name = 'Completed'
)
GROUP BY p.Id, pt.Name, ps.Name, ps.ColorCode, u.Username, u.Email, 
         c.Id, c.Username, c.FirstName, c.LastName, c.PhoneNumber, c.Email, c.CurrentPropertyCount;
```

### CollectorSummary View

Summary view for collectors (users with Collector role) with their assigned properties and payment statistics:

```sql
CREATE VIEW CollectorSummary AS
SELECT 
    u.Id AS CollectorId,
    u.Username,
    u.Email,
    u.FirstName,
    u.LastName,
    u.PhoneNumber,
    u.CurrentPropertyCount,
    u.IsActive,
    50 AS MaxProperties,
    COUNT(DISTINCT p.Id) AS TotalPropertiesAssigned,
    COUNT(DISTINCT pay.Id) AS TotalPaymentsProcessed,
    COALESCE(SUM(pay.Amount), 0) AS TotalCollectionAmount,
    COUNT(DISTINCT CASE WHEN pay.StatusId IN (
        SELECT Id FROM PaymentStatuses WHERE Name = 'Completed'
    ) THEN pay.Id END) AS CompletedPayments,
    COUNT(DISTINCT CASE WHEN pay.StatusId IN (
        SELECT Id FROM PaymentStatuses WHERE Name = 'Pending'
    ) THEN pay.Id END) AS PendingPayments
FROM Users u
LEFT JOIN Properties p ON u.Id = p.CollectorId
LEFT JOIN Payments pay ON p.Id = pay.PropertyId
WHERE u.Role = 'Collector'
GROUP BY u.Id, u.Username, u.Email, u.FirstName, u.LastName, 
         u.PhoneNumber, u.CurrentPropertyCount, u.IsActive;
```

### PaymentSummary View

Payment summary with related information:

```sql
CREATE VIEW PaymentSummary AS
SELECT 
    pay.Id,
    pay.Amount,
    pay.Currency,
    pay.TransactionReference,
    pay.PaymentDate,
    pay.CreatedAt,
    pay.CompletedAt,
    pm.Name AS PaymentMethodName,
    pm.Code AS PaymentMethodCode,
    ps.Name AS StatusName,
    ps.ColorCode AS StatusColor,
    p.Id AS PropertyId,
    p.StreetAddress AS PropertyAddress,
    p.OwnerName AS PropertyOwner,
    u.Username AS CreatedByUsername,
    r.ReceiptNumber,
    r.IsPrinted AS ReceiptPrinted
FROM Payments pay
LEFT JOIN PaymentMethods pm ON pay.PaymentMethodId = pm.Id
LEFT JOIN PaymentStatuses ps ON pay.StatusId = ps.Id
LEFT JOIN Properties p ON pay.PropertyId = p.Id
LEFT JOIN Users u ON pay.CreatedBy = u.Id
LEFT JOIN Receipts r ON pay.Id = r.PaymentId;
```

---

## Data Seeding

### Initial Seed Data Script

```sql
-- Property Types
INSERT INTO PropertyTypes (Name, Description, DisplayOrder) VALUES
('Residential', 'Residential properties including houses, apartments, condos', 1),
('Commercial', 'Commercial properties including offices, shops, retail spaces', 2),
('Industrial', 'Industrial properties including warehouses, factories', 3),
('Land', 'Vacant land plots', 4),
('Agricultural', 'Agricultural land and farms', 5),
('Mixed Use', 'Properties with mixed residential and commercial use', 6);

-- Property Statuses
INSERT INTO PropertyStatuses (Name, Description, ColorCode, DisplayOrder) VALUES
('Draft', 'Property registration in draft state', '#9E9E9E', 1),
('Pending', 'Property registration pending approval', '#FFC107', 2),
('Under Review', 'Property registration under review', '#2196F3', 3),
('Approved', 'Property registration approved', '#4CAF50', 4),
('Rejected', 'Property registration rejected', '#F44336', 5);

-- Payment Methods
INSERT INTO PaymentMethods (Name, Code, Description, DisplayOrder) VALUES
('Cash', 'CASH', 'Cash payment', 1),
('Credit Card', 'CARD', 'Credit card payment', 2),
('Debit Card', 'DEBIT', 'Debit card payment', 3),
('Mobile Money', 'MOBILE', 'Mobile money payment (M-Pesa, etc.)', 4),
('Bank Transfer', 'BANK', 'Bank transfer payment', 5);

-- Payment Statuses
INSERT INTO PaymentStatuses (Name, Description, ColorCode, DisplayOrder) VALUES
('Pending', 'Payment pending processing', '#FFC107', 1),
('Completed', 'Payment completed successfully', '#4CAF50', 2),
('Failed', 'Payment processing failed', '#F44336', 3),
('Refunded', 'Payment refunded', '#FF9800', 4),
('Cancelled', 'Payment cancelled', '#9E9E9E', 5);

-- Default Admin User (password: Admin@123)
INSERT INTO Users (Email, Username, PasswordHash, FirstName, LastName, Role, IsActive)
VALUES ('admin@property.local', 'admin', '$2a$11$KIXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx', 'System', 'Administrator', 'Admin', true);

-- Sample Collector Users
-- Note: In production, collectors should be created through the application
-- Example: Create users with Role = 'Collector'
/*
INSERT INTO Users (Email, Username, PasswordHash, FirstName, LastName, PhoneNumber, Role, IsActive, CurrentPropertyCount)
VALUES 
    ('collector1@property.local', 'collector1', '$2a$11$...', 'John', 'Collector', '+251911111111', 'Collector', true, 0),
    ('collector2@property.local', 'collector2', '$2a$11$...', 'Jane', 'Collector', '+251922222222', 'Collector', true, 0);
*/
```

---

## Performance Considerations

1. **Spatial Indexing**: Use PostGIS extension for advanced spatial queries if needed
2. **Partitioning**: Consider partitioning `AuditLogs` and `TaskLogs` by date for large datasets
3. **Archiving**: Implement archiving strategy for old audit logs and completed tasks
4. **Connection Pooling**: Configure appropriate connection pool size
5. **Query Optimization**: Use EXPLAIN ANALYZE for slow queries
6. **Materialized Views**: Consider materialized views for complex reporting queries

---

## Security Considerations

1. **Row Level Security**: Implement RLS policies for multi-tenant scenarios
2. **Encryption**: Encrypt sensitive fields (e.g., owner email, phone)
3. **Backup Strategy**: Regular automated backups
4. **Access Control**: Database user roles with minimal required permissions
5. **Audit Trail**: All sensitive operations logged in AuditLogs

---

## Migration Strategy

1. Create initial migration with all tables
2. Seed lookup tables (PropertyTypes, PropertyStatuses, PaymentMethods, PaymentStatuses)
3. Create indexes after data insertion for better performance
4. Set up triggers and functions
5. Create views for reporting
6. Implement database-level constraints and validations
