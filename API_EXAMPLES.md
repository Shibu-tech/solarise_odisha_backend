# Document Correction Workflow - API Examples

## Complete Request/Response Examples

This document provides real-world API request and response examples for the document correction workflow.

---

## Stage 1: Flag Document for Correction

### Request
```http
PATCH /api/documents/42/flag
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
    "detail": "Name mismatch in electric bill - Shows 'RAMESH' but consumer registered as 'Ram Kumar'",
    "action_type": "electric_bill_name_correction"
}
```

### Response (200 OK)
```json
{
    "message": "Document successfully flagged for correction",
    "data": {
        "document": {
            "id": 42,
            "consumer_id": 8,
            "doc_type": "electric_bill",
            "file_url": "https://s3.amazonaws.com/solarise-bucket/consumer_8/electric_bill_v1.pdf",
            "file_name": "Electric_Bill_Nov2024.pdf",
            "mime_type": "application/pdf",
            "status": "action_required",
            "uploaded_by": 15,
            "uploaded_at": "2024-09-10T10:30:00Z",
            "verified_by": null,
            "verified_at": null,
            "reject_reason": "Name mismatch in electric bill - Shows 'RAMESH' but consumer registered as 'Ram Kumar'",
            "version": 1
        },
        "action": {
            "id": 127,
            "project_id": 45,
            "action_type": "electric_bill_name_correction",
            "detail": "Name mismatch in electric bill - Shows 'RAMESH' but consumer registered as 'Ram Kumar'",
            "status": "open",
            "raised_by": 3,
            "assigned_to": 15,
            "resolved_by": null,
            "raised_at": "2024-09-12T14:25:00Z",
            "resolved_at": null
        }
    }
}
```

### Notifications Sent
**To Agent (User ID 15):**
```
Title: "Correction Required: Electric Bill"
Body: "Document Desk has flagged your Electric Bill for correction. Reason: Name mismatch in electric bill - Shows 'RAMESH' but consumer registered as 'Ram Kumar'. Please review and re-upload the correct document."
Project ID: 45
Created At: 2024-09-12T14:25:00Z
```

**To Doc Team & Admins:**
```
Title: "Document Flagged: Electric Bill"
Body: "Document flagged and action assigned to Priya Singh. Reason: Name mismatch in electric bill - Shows 'RAMESH' but consumer registered as 'Ram Kumar'"
Project ID: 45
Created At: 2024-09-12T14:25:00Z
```

---

## Stage 2: Agent Re-uploads Corrected Document

### Request (Multipart File Upload)
```http
POST /api/documents/42/reupload
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary
Authorization: Bearer {jwt_token}

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="Electric_Bill_Correct.pdf"
Content-Type: application/pdf

[Binary PDF content here]
------WebKitFormBoundary
Content-Disposition: form-data; name="geo_lat"

20.2961
------WebKitFormBoundary
Content-Disposition: form-data; name="geo_lng"

85.8245
------WebKitFormBoundary--
```

### Alternative Request (Pre-signed S3 URL)
```http
POST /api/documents/42/reupload
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
    "file_url": "https://s3.amazonaws.com/solarise-bucket/consumer_8/electric_bill_v2_corrected.pdf",
    "file_name": "Electric_Bill_Corrected.pdf",
    "mime_type": "application/pdf",
    "geo_lat": "20.2961",
    "geo_lng": "85.8245"
}
```

### Response (201 Created)
```json
{
    "message": "Document re-uploaded as version 2 and awaiting verification",
    "data": {
        "id": 43,
        "consumer_id": 8,
        "doc_type": "electric_bill",
        "file_url": "https://s3.amazonaws.com/solarise-bucket/consumer_8/electric_bill_v2.pdf",
        "file_name": "Electric_Bill_Correct.pdf",
        "mime_type": "application/pdf",
        "status": "uploaded",
        "uploaded_by": 15,
        "uploaded_at": "2024-09-12T15:45:00Z",
        "verified_by": null,
        "verified_at": null,
        "reject_reason": null,
        "version": 2,
        "geo_lat": "20.2961",
        "geo_lng": "85.8245"
    }
}
```

### Database Changes
```sql
-- Document created
INSERT INTO documents (...) VALUES (...) -- New record with version=2, status='uploaded'

-- Action updated
UPDATE action_required SET status = 'doc_uploaded' WHERE id = 127;

-- Notifications created
INSERT INTO notifications (user_id, project_id, title, body) VALUES
    (3, 45, 'Document Re-uploaded for Verification: Electric Bill', ...),  -- Doc team
    (1, 45, 'Document Re-uploaded for Verification: Electric Bill', ...),  -- Admin
    (15, 45, 'Document Re-uploaded (v2)', ...);  -- Agent confirmation
```

### Notifications Sent

**To Doc Team & Admins:**
```
Title: "Document Re-uploaded for Verification: Electric Bill"
Body: "Priya Singh has re-uploaded Electric Bill (Version 2). Please review and verify the document."
Project ID: 45
Created At: 2024-09-12T15:45:00Z
```

**To Agent (Confirmation):**
```
Title: "Document Re-uploaded (v2)"
Body: "Your corrected Electric Bill has been re-uploaded (Version 2). Awaiting verification from Document Desk."
Project ID: 45
Created At: 2024-09-12T15:45:00Z
```

---

## Stage 3: Document Team Verifies Corrected Document

### Request
```http
PATCH /api/documents/43/verify
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
    "verified_by": 3
}
```

### Response (200 OK)
```json
{
    "message": "Document verified and action resolved",
    "data": {
        "id": 43,
        "consumer_id": 8,
        "doc_type": "electric_bill",
        "file_url": "https://s3.amazonaws.com/solarise-bucket/consumer_8/electric_bill_v2.pdf",
        "file_name": "Electric_Bill_Correct.pdf",
        "mime_type": "application/pdf",
        "status": "verified",
        "uploaded_by": 15,
        "uploaded_at": "2024-09-12T15:45:00Z",
        "verified_by": 3,
        "verified_at": "2024-09-12T16:20:00Z",
        "reject_reason": null,
        "version": 2
    }
}
```

### Database Changes
```sql
-- Document marked verified
UPDATE documents 
SET status = 'verified', verified_by = 3, verified_at = '2024-09-12T16:20:00Z', reject_reason = NULL
WHERE id = 43;

-- Action resolved
UPDATE action_required 
SET status = 'resolved', resolved_by = 3, resolved_at = '2024-09-12T16:20:00Z'
WHERE id = 127;

-- Project status updated
UPDATE projects 
SET current_status = 'doc_verified', updated_at = '2024-09-12T16:20:00Z'
WHERE id = 45;

-- Status history recorded
INSERT INTO status_history (project_id, from_status, to_status, changed_by, remarks, created_at)
VALUES (45, 'action_required', 'doc_verified', 3, 'Document correction verified and action resolved', NOW());

-- Notifications created
INSERT INTO notifications (user_id, project_id, title, body) VALUES
    (15, 45, 'Document Correction Accepted ✓', ...),  -- Agent
    (3, 45, 'Action Resolved: Document Verified ✓', ...),  -- Doc team member who verified
    (1, 45, 'Action Resolved: Document Verified ✓', ...);  -- Admin
```

### Notifications Sent

**To Agent (Acceptance):**
```
Title: "Document Correction Accepted ✓"
Body: "Your corrected Electric Bill has been verified and accepted. The action has been closed."
Project ID: 45
Created At: 2024-09-12T16:20:00Z
```

**To Doc Team & Admins (Resolution):**
```
Title: "Action Resolved: Document Verified ✓"
Body: "Document correction for Electric Bill has been verified. Action closed."
Project ID: 45
Created At: 2024-09-12T16:20:00Z
```

---

## Alternative Scenario: Document Rejected During Re-upload

### Request
```http
PATCH /api/documents/43/reject
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
    "reject_reason": "Still shows wrong name. This bill must be issued in consumer's registered name: Ram Kumar, not RAMESH"
}
```

### Response (200 OK)
```json
{
    "message": "Document rejected",
    "data": {
        "id": 43,
        "consumer_id": 8,
        "doc_type": "electric_bill",
        "status": "rejected",
        "verified_by": 3,
        "verified_at": "2024-09-12T16:20:00Z",
        "reject_reason": "Still shows wrong name. This bill must be issued in consumer's registered name: Ram Kumar, not RAMESH",
        "version": 2
    }
}
```

### Notifications Sent

**To Agent (Rejection):**
```
Title: "Document Rejected"
Body: "Document Electric Bill rejected. Reason: Still shows wrong name. This bill must be issued in consumer's registered name: Ram Kumar, not RAMESH"
Project ID: 45
Created At: 2024-09-12T16:20:00Z
```

**Action Status:** Remains in `doc_uploaded` until agent re-uploads again

---

## Query Examples: Get Pending Corrections

### Get All Pending Actions
```http
GET /api/actions
Authorization: Bearer {jwt_token}
```

Response:
```json
{
    "count": 3,
    "data": [
        {
            "id": 127,
            "project_id": 45,
            "action_type": "electric_bill_name_correction",
            "detail": "Name mismatch",
            "status": "open",
            "raised_by": 3,
            "raised_by_name": "Amit Sharma",
            "raised_at": "2024-09-12T14:25:00Z",
            "assigned_to": 15,
            "assigned_to_name": "Priya Singh",
            "resolved_by": null,
            "resolved_at": null
        },
        {
            "id": 128,
            "project_id": 46,
            "action_type": "bank_passbook_name_correction",
            "detail": "Account holder name mismatch",
            "status": "doc_uploaded",
            "raised_by": 3,
            "raised_by_name": "Amit Sharma",
            "raised_at": "2024-09-11T10:00:00Z",
            "assigned_to": 16,
            "assigned_to_name": "Rajesh Kumar",
            "resolved_by": null,
            "resolved_at": null
        }
    ]
}
```

### Get Agent's Pending Corrections
```http
GET /api/actions?assigned_to=15
Authorization: Bearer {jwt_token}
```

Response:
```json
{
    "count": 1,
    "data": [
        {
            "id": 127,
            "project_id": 45,
            "action_type": "electric_bill_name_correction",
            "detail": "Name mismatch in electric bill",
            "status": "open",
            "raised_by": 3,
            "raised_by_name": "Amit Sharma",
            "raised_at": "2024-09-12T14:25:00Z",
            "assigned_to": 15,
            "assigned_to_name": "Priya Singh"
        }
    ]
}
```

### Get Documents Pending Verification
```http
GET /api/documents?status=uploaded
Authorization: Bearer {jwt_token}
```

Response:
```json
{
    "count": 2,
    "data": [
        {
            "id": 43,
            "consumer_id": 8,
            "consumer_name": "Ram Kumar",
            "doc_type": "electric_bill",
            "file_url": "https://s3.amazonaws.com/...",
            "status": "uploaded",
            "uploaded_by": 15,
            "uploaded_by_name": "Priya Singh",
            "uploaded_at": "2024-09-12T15:45:00Z",
            "version": 2,
            "reject_reason": null
        }
    ]
}
```

---

## Status History Timeline Example

### Query
```http
GET /api/status-history?project_id=45
Authorization: Bearer {jwt_token}
```

### Response
```json
{
    "count": 4,
    "data": [
        {
            "id": 1,
            "project_id": 45,
            "from_status": "doc_verified",
            "to_status": "action_required",
            "changed_by": 3,
            "changed_by_name": "Amit Sharma",
            "remarks": "Document Flagged: Name mismatch in electric bill",
            "created_at": "2024-09-12T14:25:00Z"
        },
        {
            "id": 2,
            "project_id": 45,
            "from_status": "action_required",
            "to_status": "action_required",
            "changed_by": 15,
            "changed_by_name": "Priya Singh",
            "remarks": "Document re-uploaded (Version 2)",
            "created_at": "2024-09-12T15:45:00Z"
        },
        {
            "id": 3,
            "project_id": 45,
            "from_status": "action_required",
            "to_status": "doc_verified",
            "changed_by": 3,
            "changed_by_name": "Amit Sharma",
            "remarks": "Document correction verified and action resolved",
            "created_at": "2024-09-12T16:20:00Z"
        }
    ]
}
```

---

## Error Scenarios

### Error: Document Not Found
```http
PATCH /api/documents/999/flag
Authorization: Bearer {jwt_token}

{
    "detail": "Name mismatch"
}
```

Response (404):
```json
{
    "error": "Document not found"
}
```

### Error: Invalid Status Transition
```http
PATCH /api/documents/43/verify
Authorization: Bearer {jwt_token}

{
    "verified_by": 3
}
```

Response (400):
```json
{
    "error": "Cannot verify document with status 'rejected'. Only 'uploaded', 'action_required', or 'rejected' documents can be verified."
}
```

### Error: Missing Required Field
```http
PATCH /api/documents/42/flag
Authorization: Bearer {jwt_token}

{
    "action_type": "electric_bill_name_correction"
}
```

Response (400):
```json
{
    "error": "detail (flag reason) is required"
}
```

---

## Response Status Codes

| Code | Scenario |
|------|----------|
| 200 | Successful operation (update) |
| 201 | Document created/re-uploaded |
| 400 | Bad request (missing fields, invalid status transition) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Document/Action not found |
| 500 | Server error |

---

## Timeline Example: Complete Workflow

```
09:30 - Document uploaded by Agent Priya (Doc ID: 42, status: uploaded)
09:30 - Agent Priya receives notification: "Document uploaded"

14:25 - Doc Team flags document (PATCH /api/documents/42/flag)
14:25 - DB: Document 42 → action_required
14:25 - DB: Action 127 created (status: open, assigned_to: Priya)
14:25 - Priya receives: "Correction Required: Electric Bill"
14:25 - Doc Team receives: "Document Flagged: Electric Bill"

15:45 - Agent Priya re-uploads correction (POST /api/documents/42/reupload)
15:45 - DB: Document 43 created (v2, status: uploaded)
15:45 - DB: Action 127 → status: doc_uploaded
15:45 - Doc Team receives: "Document Re-uploaded for Verification: Electric Bill"
15:45 - Priya receives: "Document Re-uploaded (v2)"

16:20 - Doc Team verifies (PATCH /api/documents/43/verify)
16:20 - DB: Document 43 → verified
16:20 - DB: Action 127 → resolved
16:20 - DB: Project 45 → doc_verified
16:20 - Priya receives: "Document Correction Accepted ✓"
16:20 - Doc Team receives: "Action Resolved: Document Verified ✓"
16:20 - Status history entry recorded
16:20 - Pending Corrections badge disappears for Priya
```

---

## Testing with cURL

### Flag Document
```bash
curl -X PATCH http://localhost:3000/api/documents/42/flag \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "detail": "Name mismatch in electric bill",
    "action_type": "electric_bill_name_correction"
  }'
```

### Re-upload Document
```bash
curl -X POST http://localhost:3000/api/documents/42/reupload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/corrected_bill.pdf" \
  -F "geo_lat=20.2961" \
  -F "geo_lng=85.8245"
```

### Verify Document
```bash
curl -X PATCH http://localhost:3000/api/documents/43/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"verified_by": 3}'
```

### Get Pending Actions
```bash
curl -X GET "http://localhost:3000/api/actions?assigned_to=15" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
