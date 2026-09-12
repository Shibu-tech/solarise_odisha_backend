# Document Correction Workflow

## Overview
This document describes the complete workflow for handling document corrections when the Document Team identifies issues with uploaded documents (e.g., name mismatches, incorrect details).

## Workflow Stages

### Stage 1: Document Team Flags Document (Doc Team → Agent)

**When:** Document Team reviews a document and identifies it's wrong/incomplete

**Action:** Doc Team calls `PATCH /api/documents/{id}/flag` with:
```json
{
    "detail": "Name mismatch in electric bill - shows different name than registered",
    "action_type": "electric_bill_name_correction"  // optional, auto-detected if omitted
}
```

**What Happens:**
1. **Document Status**: Changed from `uploaded` → `action_required`
2. **Action Item Created**: New entry in `action_required` table with:
   - Status: `open`
   - Assigned to: **The agent who originally uploaded the document**
   - Action Type: Appropriate type (e.g., `electric_bill_name_correction`)
   - Detail: The reason for flagging
3. **Project Status**: Updated to `action_required`
4. **Status History**: Entry recorded with timestamp and reason
5. **Notifications Sent:**
   - **To Agent** (uploaded_by user): Direct notification with correction instructions
     - Title: "Correction Required: {document_type}"
     - Message: Includes the reason and asks to re-upload correct document
   - **To Doc Team & Admins**: Notification that action has been assigned
     - Title: "Document Flagged: {document_type}"
     - Message: Shows who the action is assigned to and reason

---

### Stage 2: Agent Re-uploads Corrected Document (Agent → System)

**When:** Agent reviews the flagged document and uploads a corrected version

**Action:** Agent calls `POST /api/documents/{original_id}/reupload` with:
```json
{
    // File upload (multipart/form-data) OR
    "file_url": "s3://...",  // Pre-uploaded S3 URL
    "file_name": "Electric_Bill_Corrected.pdf",
    "mime_type": "application/pdf",
    "geo_lat": "20.2961",
    "geo_lng": "85.8245"
}
```

**What Happens:**
1. **New Document Version Created**: 
   - Status: `uploaded` (ready for review)
   - Version number incremented
   - Same document type and consumer
2. **Action Status Updated**: `open` → `doc_uploaded`
   - This indicates document has been re-uploaded and is pending verification
3. **Notifications Sent:**
   - **To Agent** (uploaded_by):
     - Title: "Document Re-uploaded (v{version})"
     - Message: Confirms re-upload and indicates awaiting verification
   - **To Doc Team & Admins**:
     - Title: "Document Re-uploaded for Verification: {document_type}"
     - Message: Requests review of the corrected document (Version {n})

**Key Point:** The action remains open - it will only be resolved when Doc Team verifies

---

### Stage 3: Document Team Verifies Corrected Document (Doc Team → Agent)

**When:** Document Team reviews the re-uploaded document and finds it correct

**Action:** Doc Team calls `PATCH /api/documents/{new_version_id}/verify` with:
```json
{
    "verified_by": {user_id}  // optional, uses auth user if omitted
}
```

**What Happens:**
1. **Document Status**: Changed to `verified`
   - `verified_by`: Set to the verifying user
   - `verified_at`: Set to current timestamp
   - `reject_reason`: Cleared (no longer needed)

2. **Action Item Resolved**:
   - Status: `doc_uploaded` → `resolved`
   - `resolved_by`: Set to the verifying user
   - `resolved_at`: Set to current timestamp

3. **Project Status**: Updated back to `doc_verified`
   - This indicates all required documents are verified

4. **Status History**: Entry recorded for document verification completion

5. **Notifications Sent:**
   - **To Agent** (assigned_to user):
     - Title: "Document Correction Accepted ✓"
     - Message: "Your corrected {document_type} has been verified and accepted. The action has been closed."
   - **To Doc Team & Admins**:
     - Title: "Action Resolved: Document Verified ✓"
     - Message: "Document correction for {document_type} has been verified. Action closed."
   - **To All Roles**:
     - General verification confirmation

**Key Result:** The "Pending Correction Actions" window is effectively closed because:
- Action status changed to `resolved`
- Project status changed from `action_required` to `doc_verified`
- Agents can see the action is no longer pending for them

---

## Status Transitions Summary

### Document Status Flow
```
uploaded/rejected → [FLAG] → action_required → [REUPLOAD] → uploaded → [VERIFY] → verified
```

### Action Status Flow
```
open → [ON REUPLOAD] → doc_uploaded → [ON VERIFY] → resolved
```

### Project Status Flow
```
doc_uploaded/doc_verified → [FLAG] → action_required → [VERIFY] → doc_verified
```

---

## Key Features

### 1. **Agent Assignment**
- Action is automatically assigned to the agent who originally uploaded the document
- Agent receives direct notification with clear instructions

### 2. **Two-Step Verification**
- First notification: When action is created (agent needs to act)
- Second notification: When document is re-uploaded (doc team needs to verify)

### 3. **Status Tracking**
- Every transition is recorded in `status_history` table
- Timestamps capture when each step occurred
- Remarks provide context for each transition

### 4. **Action Resolution**
- Action only resolves when doc team verifies the corrected document
- This prevents premature closure of pending actions

### 5. **Clear Messaging**
- Each notification is role-specific and contextual
- Messages clearly indicate what action is needed

---

## API Endpoints Used

| Step | Endpoint | Method | Role | Body |
|------|----------|--------|------|------|
| 1. Flag | `/api/documents/{id}/flag` | PATCH | doc_team | detail, action_type (optional) |
| 2. Reupload | `/api/documents/{id}/reupload` | POST | agent | file or file_url, optional metadata |
| 3. Verify | `/api/documents/{id}/verify` | PATCH | doc_team | verified_by (optional) |

---

## Database Tables Involved

1. **documents** - Track document versions and status
2. **action_required** - Track correction tasks and assignments
3. **projects** - Track overall project status
4. **status_history** - Audit trail of all status changes
5. **notifications** - Send messages to appropriate users
6. **users** - User information and roles

---

## Frontend Workflow (UI Components)

### For Agents:
1. **Dashboard**: View "Pending Actions Assigned to You"
   - Shows actions with status `open` or `doc_uploaded`
   - Lists reason for each correction
   - Link to original document and to re-upload portal

2. **Re-upload Modal**:
   - Shows document type and correction reason
   - File upload interface
   - Confirmation and submission

3. **Notification Badge**: 
   - Shows count of pending corrections
   - Link to action detail page

### For Document Team:
1. **Review Queue**: View "Documents Pending Review"
   - Shows documents with status `uploaded` (re-uploaded)
   - Links action details
   - Verification buttons

2. **Verification Modal**:
   - Side-by-side comparison of old vs new version
   - Acceptance/Rejection buttons

3. **Closed Actions**: View "Resolved Corrections"
   - Historical record of all corrections
   - Timestamps and who verified each

---

## Error Handling

- If document not found: Returns 404
- If invalid status transition: Returns 400 with clear message
- If user not found: Uses fallback user (first admin)
- Database transaction rolled back on any error
- S3 file cleanup on upload failure

---

## Example Complete Workflow Sequence

```
Timeline:

10:30 AM - Doc Team: Reviews electric bill, finds name mismatch
10:31 AM - System: 
  - Flags document (status: action_required)
  - Creates action (status: open, assigned to Agent John)
  - Agent John receives notification

11:00 AM - Agent John: Opens notification, reads the correction needed
11:15 AM - Agent John: Collects correct electric bill from consumer, uploads
11:16 AM - System:
  - Creates new version (v2)
  - Updates action (status: doc_uploaded)
  - Doc Team receives notification to verify

2:00 PM - Doc Team: Reviews v2, finds it correct, verifies
2:01 PM - System:
  - Document marked verified
  - Action marked resolved
  - Project status back to doc_verified
  - Agent John receives "Document Accepted" notification
  - "Pending Correction Actions" window closes

Result: Complete correction workflow done successfully!
```

---

## Testing Checklist

- [ ] Agent can see pending correction actions assigned to them
- [ ] Re-upload creates new version with incremented version number
- [ ] Doc Team can see re-uploaded documents in verification queue
- [ ] Verification resolves the action
- [ ] Project status transitions correctly
- [ ] All notifications are received by correct roles
- [ ] Status history records all transitions
- [ ] "Pending Corrections" window shows/hides based on action status
