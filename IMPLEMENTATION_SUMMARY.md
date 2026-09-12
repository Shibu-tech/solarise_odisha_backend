# Document Correction Workflow - Implementation Summary

## Overview
A complete end-to-end workflow has been implemented for handling document corrections when the Document Team identifies issues. The system automatically notifies the appropriate agents, tracks corrections through multiple stages, and ensures proper verification before closing actions.

## Files Modified & Created

### 1. Backend Controller Updates
**File:** `solarise-api/controllers/documents.controller.js`

#### Modified Functions:
1. **flagDocument()**
   - Now assigns action to the agent who originally uploaded the document
   - Sends specific notification to that agent with correction instructions
   - Sends separate notification to doc_team
   - Status transition: `uploaded` → `action_required`
   - Action status: `open`

2. **reuploadDocument()**
   - Creates new version with status `uploaded`
   - Updates associated action status: `open` → `doc_uploaded`
   - Sends notification to doc_team to verify the re-uploaded document
   - Sends notification to agent confirming re-upload received
   - Keeps action open until verified

3. **verifyDocument()**
   - When document status changes to `verified`
   - Checks for associated action in `doc_uploaded` status
   - Resolves the action: `doc_uploaded` → `resolved`
   - Updates project status back to `doc_verified`
   - Sends notification to agent confirming acceptance
   - Sends notification to doc_team confirming resolution
   - Records status history with timestamps

### 2. New Utility File
**File:** `solarise-api/utils/documentCorrectionHelper.js`

**Helper Functions:**
- `getDocumentCorrectionAction()` - Get pending action for a document
- `getAgentPendingCorrections()` - Get all pending corrections for an agent
- `getDocumentsPendingVerification()` - Get docs awaiting verification by doc_team
- `sendCorrectionNotificationToAgent()` - Send correction notification
- `sendReuploadNotificationToDocTeam()` - Notify team of re-upload
- `sendVerificationAcceptedNotification()` - Confirm acceptance to agent
- `sendActionResolvedNotification()` - Notify team of resolution
- `getDocumentCorrectionHistory()` - Get version history and corrections
- `getCorrectionWorkflowStats()` - Get workflow statistics
- `getOverdueCorrections()` - Get overdue correction actions

### 3. Documentation Files Created

1. **DOCUMENT_CORRECTION_WORKFLOW.md**
   - Complete workflow explanation
   - Stage-by-stage process breakdown
   - Status transition diagrams
   - API endpoints used
   - Database tables involved
   - Example timeline
   - Testing checklist

2. **FRONTEND_IMPLEMENTATION_GUIDE.md**
   - Component architecture recommendations
   - Three main UI components with code samples:
     - PendingCorrectionsComponent (for agents)
     - DocumentVerificationPanel (for doc_team)
     - CorrectionsBadge (global notification)
   - API integration guide
   - Real-time update recommendations
   - Testing checklist

---

## Workflow Process

### Stage 1: Flag Document (Doc Team Action)
```
Endpoint: PATCH /api/documents/{id}/flag
Payload: { detail: "Name mismatch", action_type: "electric_bill_name_correction" }

Result:
- Document status: uploaded → action_required
- Action created: status=open, assigned_to=uploading_agent
- Notification to Agent: "Correction Required: {doc_type}"
- Notification to Doc Team: "Document Flagged: {doc_type}"
- Project status: current → action_required
```

### Stage 2: Re-upload Document (Agent Action)
```
Endpoint: POST /api/documents/{id}/reupload
Payload: { file: <binary> or file_url: "...", metadata... }

Result:
- New document version created: status=uploaded
- Action status: open → doc_uploaded
- Notification to Agent: "Document Re-uploaded (v{n})"
- Notification to Doc Team: "Document Re-uploaded for Verification: {doc_type}"
- Project status: unchanged (still action_required)
```

### Stage 3: Verify Document (Doc Team Action)
```
Endpoint: PATCH /api/documents/{id}/verify
Payload: { verified_by: user_id } (optional)

Result:
- Document status: uploaded → verified
- Action status: doc_uploaded → resolved
- Notification to Agent: "Document Correction Accepted ✓"
- Notification to Doc Team: "Action Resolved: Document Verified ✓"
- Project status: action_required → doc_verified
- Status History: Recorded with timestamp
- "Pending Corrections" window: CLOSED for this action
```

---

## Database State Transitions

### Documents Table
```
Status Flow: uploaded → [FLAG] → action_required → [REUPLOAD] → uploaded → [VERIFY] → verified
Version: Incremented on each re-upload
Reject_reason: Set when flagged, cleared when verified
Verified_by: Set when verified
Verified_at: Timestamp when verified
```

### Action_Required Table
```
Status Flow: open → [ON REUPLOAD] → doc_uploaded → [ON VERIFY] → resolved
Assigned_to: Set to uploading agent when action created
Resolved_by: Set when action resolved
Resolved_at: Timestamp when resolved
```

### Projects Table
```
Status Flow: ... → [FLAG] → action_required → [VERIFY] → doc_verified → ...
Updated_at: Timestamp of last update
```

### Status_History Table
```
Entries created for:
1. When document is flagged
2. When action is created
3. When document is verified and action resolved
Each with from_status, to_status, changed_by, remarks, and timestamp
```

---

## Notification Flow

### Agents Receive:
1. **Flag Notification** (Stage 1)
   - Title: "Correction Required: {document_type}"
   - Body: "Document Desk has flagged your {type} for correction. Reason: {detail}. Please review and re-upload the correct document."

2. **Re-upload Confirmation** (Stage 2)
   - Title: "Document Re-uploaded (v{n})"
   - Body: "Your corrected {type} has been re-uploaded (Version {n}). Awaiting verification from Document Desk."

3. **Acceptance Notification** (Stage 3)
   - Title: "Document Correction Accepted ✓"
   - Body: "Your corrected {type} has been verified and accepted. The action has been closed."

### Doc Team Receives:
1. **Flag Confirmation** (Stage 1)
   - Title: "Document Flagged: {document_type}"
   - Body: "Document flagged and action assigned to {agent_name}. Reason: {detail}"

2. **Re-upload Notification** (Stage 2)
   - Title: "Document Re-uploaded for Verification: {document_type}"
   - Body: "{agent_name} has re-uploaded {type} (Version {n}). Please review and verify the document."

3. **Resolution Confirmation** (Stage 3)
   - Title: "Action Resolved: Document Verified ✓"
   - Body: "Document correction for {type} has been verified. Action closed."

---

## Key Features Implemented

### 1. **Automatic Agent Assignment**
- When document is flagged, the action is automatically assigned to the agent who uploaded it
- This ensures accountability and direct communication

### 2. **Two-Phase Notification**
- First notification: "You need to fix this"
- Second notification: "We received your fix, verifying now"
- Third notification: "Fix accepted! ✓"

### 3. **Action Status Tracking**
- `open`: Waiting for agent to re-upload
- `doc_uploaded`: Waiting for doc_team to verify
- `resolved`: Correction complete

### 4. **Automatic Status Management**
- Document, Action, and Project statuses are automatically updated
- Status history records all transitions with timestamps

### 5. **Versioning**
- Each re-upload creates a new version
- Original document preserved for comparison
- Version number helps track correction iterations

### 6. **Closed Action Detection**
- Frontend can hide "Pending Corrections" window when:
  - Action status = `resolved`
  - Project status = `doc_verified`

---

## API Endpoints Summary

| Action | Endpoint | Method | Role | Body | Result |
|--------|----------|--------|------|------|--------|
| **1. Flag** | `/api/documents/{id}/flag` | PATCH | doc_team | detail, action_type | Document → action_required, Action created (open) |
| **2. Reupload** | `/api/documents/{id}/reupload` | POST | agent | file/file_url | New version, Action → doc_uploaded |
| **3. Verify** | `/api/documents/{id}/verify` | PATCH | doc_team | verified_by | Document → verified, Action → resolved |
| **4. Reject** | `/api/documents/{id}/reject` | PATCH | doc_team | reject_reason | Document → rejected |
| Get Actions | `/api/actions` | GET | any | - | All open actions |
| Get Actions by Project | `/api/actions/project/{projectId}` | GET | any | - | Project-specific actions |
| Update Action | `/api/actions/{id}/status` | PATCH | any | status, resolved_by | Update action status |

---

## How to Test the Workflow

### Test Scenario: Electric Bill Name Mismatch

1. **Setup**
   - Create a Consumer: "Ramesh Kumar"
   - Create an Agent: "Priya Singh" (assigned to consumer)
   - Create a Project for consumer
   - Upload electric bill document from agent (uploaded_by: Priya)

2. **Stage 1 - Document Team Flags**
   - Login as doc_team
   - Call: `PATCH /api/documents/{id}/flag`
   - Body: `{ "detail": "Name shows 'Ramesh' but bill header shows 'Ram'" }`
   - Verify:
     - Document status changed to `action_required`
     - Action created with status `open`
     - Action assigned to Priya (agent)
     - Priya received notification

3. **Stage 2 - Agent Re-uploads**
   - Login as Priya (agent)
   - See pending action in dashboard
   - Call: `POST /api/documents/{id}/reupload`
   - Upload corrected bill
   - Verify:
     - New version created (v2)
     - Action status changed to `doc_uploaded`
     - Doc team received notification

4. **Stage 3 - Doc Team Verifies**
   - Login as doc_team
   - See re-uploaded document in verification queue
   - Call: `PATCH /api/documents/{new_version_id}/verify`
   - Verify:
     - Document status changed to `verified`
     - Action status changed to `resolved`
     - Priya received acceptance notification
     - Project status back to `doc_verified`
     - "Pending Corrections" window closed

---

## Integration Checklist

- [x] Modified `flagDocument()` to assign actions to uploading agent
- [x] Modified `reuploadDocument()` to update action status and notify doc_team
- [x] Modified `verifyDocument()` to resolve actions and close workflow
- [x] Created `documentCorrectionHelper.js` with utility functions
- [x] Created comprehensive workflow documentation
- [x] Created frontend implementation guide with code samples
- [ ] Frontend: Implement PendingCorrectionsComponent for agents
- [ ] Frontend: Implement DocumentVerificationPanel for doc_team
- [ ] Frontend: Add CorrectionsBadge to navigation
- [ ] Frontend: Update dashboard to hide closed actions
- [ ] Testing: Execute complete test scenario
- [ ] Deployment: Roll out to production
- [ ] Monitoring: Track correction workflow metrics

---

## Notes for Development Team

### For Backend Developers:
- Helper functions in `documentCorrectionHelper.js` can be imported and used in other controllers
- All status transitions are atomic (use transactions)
- Notifications are fire-and-forget (errors don't block the main operation)

### For Frontend Developers:
- Refer to `FRONTEND_IMPLEMENTATION_GUIDE.md` for component architecture
- Use helper functions to fetch data (defined in guide)
- Consider real-time updates for better UX
- Test all three user journeys: Agent, Doc Team, Admin

### For QA/Testing Team:
- Use `DOCUMENT_CORRECTION_WORKFLOW.md` testing checklist
- Test with different document types
- Test with multiple agents and projects
- Verify notification delivery
- Check status history records

---

## Future Enhancements

1. **Bulk Operations**: Flag/verify multiple documents at once
2. **Escalation**: Auto-escalate after N days without action
3. **Templates**: Pre-defined correction reasons for common issues
4. **Analytics**: Dashboard showing correction rates, average time to resolution
5. **Machine Learning**: Auto-flag common document issues
6. **Audit Trail**: Detailed audit logs for compliance
7. **Mobile Support**: Mobile app for agents to receive/respond to corrections
8. **SLA Tracking**: Track correction completion time against SLAs
