# Document Correction Workflow - Frontend Implementation Guide (UPDATED)

## Overview
This guide shows how to integrate the document correction workflow components into your React application.

The workflow has three main parts:
1. **Agent Dashboard** - View and manage pending corrections
2. **Document Team Dashboard** - Review and verify corrected documents
3. **Notification Badges** - Alert users about pending corrections

---

## Pre-Built Components

All components have been created and are ready to use. They're located in:
```
src/components/documents/
├── PendingCorrectionsCard.jsx        # Single correction card
├── ReuploadDocumentModal.jsx         # Modal for re-uploading
├── DocumentVerificationPanel.jsx     # Verification interface
├── PendingCorrectionsPanel.jsx       # Full agent corrections dashboard
├── VerificationQueuePanel.jsx        # Full doc team verification dashboard
├── CorrectionsBadge.jsx              # Badge components
└── index.js                          # Barrel export
```

---

## Component 1: Pending Corrections Dashboard (For Agents)

### Usage in Code
```jsx
import { PendingCorrectionsPanel } from '../components/documents';

export const PendingCorrectionsPage = () => {
  const { user } = useAuth();
  
  return (
    <div className="p-6">
      <PendingCorrectionsPanel userId={user.id} />
    </div>
  );
};
```

### What It Does
- Displays all corrections assigned to the current agent
- Shows correction reason and status
- Provides re-upload interface
- Tracks version numbers

### API Endpoints Used
```
GET /api/actions - Get assigned actions
GET /api/projects/:id - Get project details
GET /api/documents/consumer/:consumerId - Get consumer documents
POST /api/documents/:id/reupload - Submit corrected document
```

### User Flow (Agent)

**Show:**
- Original Document:
  - Document preview/download link
  - Uploaded date
  - Current status
  - Version number
  
- Correction Reason:
  - Clear display of why this was flagged
  - Who flagged it and when
  
- Re-upload Form:
  - File input (drag-and-drop + browse)
  - Metadata fields (optional):
    - Latitude/Longitude
    - File name override
  - Submit button
  - Loading state during upload

#### 4. **Sample Code**

```jsx
import React, { useState, useEffect } from 'react';
import { Button, Modal, Alert, Spinner, Badge } from 'react-bootstrap';
import { getAgentActions, reuploadDocument } from '../services/actionService';

export const PendingCorrectionsComponent = ({ agentId }) => {
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAction, setSelectedAction] = useState(null);
    const [reuploadFile, setReuploadFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        loadPendingActions();
    }, [agentId]);

    const loadPendingActions = async () => {
        try {
            setLoading(true);
            // Fetch all open actions assigned to this agent
            const response = await fetch(`/api/actions?assigned_to=${agentId}`);
            const data = await response.json();
            setActions(data.data.filter(a => a.status === 'open'));
        } catch (err) {
            console.error('Error loading actions:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleReupload = async (actionId, documentId) => {
        if (!reuploadFile) {
            alert('Please select a file to upload');
            return;
        }

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('file', reuploadFile);
            
            const response = await fetch(`/api/documents/${documentId}/reupload`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                alert('Document re-uploaded successfully. Awaiting verification from Document Desk.');
                setSelectedAction(null);
                loadPendingActions();
            } else {
                const error = await response.json();
                alert(`Upload failed: ${error.error}`);
            }
        } catch (err) {
            console.error('Upload error:', err);
            alert('Error uploading document');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="pending-corrections-container">
            <div className="d-flex align-items-center mb-4">
                <h3>My Pending Corrections</h3>
                <Badge 
                    bg="danger" 
                    className="ms-2"
                    pill
                >
                    {actions.length}
                </Badge>
            </div>

            {loading ? (
                <Spinner animation="border" />
            ) : actions.length === 0 ? (
                <Alert variant="success">
                    ✓ No pending corrections. All documents are verified!
                </Alert>
            ) : (
                <div className="corrections-list">
                    {actions.map((action) => (
                        <div key={action.id} className="correction-card mb-3 p-3 border rounded">
                            <div className="row">
                                <div className="col-md-6">
                                    <h5>{action.action_type?.replace(/_/g, ' ')}</h5>
                                    <p className="text-muted mb-2">{action.detail}</p>
                                </div>
                                <div className="col-md-6 text-end">
                                    <Badge bg="warning" className="me-2">
                                        {action.status === 'open' ? 'Open' : 'Awaiting Verification'}
                                    </Badge>
                                    <small className="text-muted d-block">
                                        Flagged {new Date(action.raised_at).toLocaleDateString()}
                                    </small>
                                </div>
                            </div>
                            <div className="mt-3">
                                <Button 
                                    variant="primary" 
                                    onClick={() => setSelectedAction(action)}
                                    className="me-2"
                                >
                                    Re-upload Correct Document
                                </Button>
                                <Button 
                                    variant="outline-secondary"
                                    href={`/projects/${action.project_id}`}
                                >
                                    View Project
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Reupload Modal */}
            <Modal show={!!selectedAction} onHide={() => setSelectedAction(null)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        Re-upload: {selectedAction?.action_type?.replace(/_/g, ' ')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Alert variant="info">
                        <strong>Reason for Correction:</strong><br />
                        {selectedAction?.detail}
                    </Alert>

                    <div className="mb-4">
                        <label className="form-label">Select File to Upload</label>
                        <input 
                            type="file" 
                            className="form-control"
                            onChange={(e) => setReuploadFile(e.target.files[0])}
                            disabled={uploading}
                        />
                        <small className="text-muted d-block mt-2">
                            Supported: PDF, JPG, PNG (Max 10MB)
                        </small>
                    </div>

                    {reuploadFile && (
                        <div className="alert alert-success">
                            ✓ {reuploadFile.name} ({(reuploadFile.size / 1024 / 1024).toFixed(2)}MB)
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button 
                        variant="secondary" 
                        onClick={() => setSelectedAction(null)}
                        disabled={uploading}
                    >
                        Cancel
                    </Button>
                    <Button 
                        variant="primary"
                        onClick={() => handleReupload(selectedAction.id, selectedAction.document_id)}
                        disabled={!reuploadFile || uploading}
                    >
                        {uploading ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Uploading...
                            </>
                        ) : (
                            'Confirm & Upload'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default PendingCorrectionsComponent;
```

---

## Component 2: Document Review Panel (For Doc Team)

### Location
`src/components/DocumentVerificationPanel.jsx` or within Document Review Dashboard

### Functionality
Display documents that have been re-uploaded and need verification.

### API Endpoints
```
GET /api/documents - Filter for status 'uploaded' with action status 'doc_uploaded'
GET /api/documents/{id} - Get document details
GET /api/documents/{id}/download-url - Get presigned S3 download URL
PATCH /api/documents/{id}/verify - Verify/Accept document
PATCH /api/documents/{id}/reject - Reject document
```

### Component Features

#### 1. **Verification Queue List**
- Show documents with status `uploaded` that have associated actions in `doc_uploaded` status
- Display:
  - Document type
  - Consumer name
  - Agent name who uploaded correction
  - Version number
  - Date re-uploaded
  - Correction reason

#### 2. **Document Comparison View**

**Side-by-side or Tabs:**
- **Original Version**: Link to download/preview original document
- **Current Version**: Display the re-uploaded corrected version
- **Correction Reason**: Show why it was flagged

#### 3. **Verification Actions**
Buttons:
- **✓ Accept/Verify**: Approves the correction (closes the action)
- **✗ Reject**: Sends back to agent with new reason
- **View More Info**: Show consumer details, project status, etc.

#### 4. **Sample Code**

```jsx
import React, { useState, useEffect } from 'react';
import { Button, Modal, Alert, Spinner, Badge, Card } from 'react-bootstrap';

export const DocumentVerificationPanel = () => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        loadDocumentsForVerification();
    }, []);

    const loadDocumentsForVerification = async () => {
        try {
            setLoading(true);
            // Get all documents in 'uploaded' status (these are re-uploads)
            const response = await fetch('/api/documents?status=uploaded');
            const data = await response.json();
            
            // Filter for those with pending actions
            const withActions = data.data.filter(doc => 
                doc.status === 'uploaded'
            );
            setDocuments(withActions);
        } catch (err) {
            console.error('Error loading documents:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (documentId) => {
        try {
            setVerifying(true);
            const response = await fetch(`/api/documents/${documentId}/verify`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({})
            });

            if (response.ok) {
                alert('Document verified! Action has been closed.');
                setSelectedDoc(null);
                loadDocumentsForVerification();
            } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
            }
        } catch (err) {
            console.error('Verification error:', err);
            alert('Error verifying document');
        } finally {
            setVerifying(false);
        }
    };

    const handleReject = async (documentId, reason) => {
        try {
            setVerifying(true);
            const response = await fetch(`/api/documents/${documentId}/reject`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ reject_reason: reason })
            });

            if (response.ok) {
                alert('Document rejected. Agent will be notified.');
                setSelectedDoc(null);
                loadDocumentsForVerification();
            } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
            }
        } catch (err) {
            console.error('Rejection error:', err);
            alert('Error rejecting document');
        } finally {
            setVerifying(false);
        }
    };

    return (
        <div className="verification-panel">
            <div className="d-flex align-items-center mb-4">
                <h3>Documents Pending Verification</h3>
                <Badge bg="info" className="ms-2" pill>
                    {documents.length}
                </Badge>
            </div>

            {loading ? (
                <Spinner animation="border" />
            ) : documents.length === 0 ? (
                <Alert variant="success">
                    ✓ All re-uploaded documents have been verified!
                </Alert>
            ) : (
                <div className="documents-grid">
                    {documents.map((doc) => (
                        <Card key={doc.id} className="mb-3">
                            <Card.Body>
                                <div className="row">
                                    <div className="col-md-8">
                                        <h5>{doc.doc_type?.replace(/_/g, ' ')}</h5>
                                        <p className="mb-1">
                                            <strong>Consumer:</strong> {doc.consumer_name}
                                        </p>
                                        <p className="mb-1">
                                            <strong>Uploaded by:</strong> {doc.uploader_name}
                                        </p>
                                        <p className="mb-1">
                                            <strong>Version:</strong> {doc.version}
                                        </p>
                                        <small className="text-muted">
                                            Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                                        </small>
                                    </div>
                                    <div className="col-md-4 text-end">
                                        <Badge bg="warning">Re-uploaded</Badge>
                                    </div>
                                </div>

                                <div className="mt-3">
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => setSelectedDoc(doc)}
                                        className="me-2"
                                    >
                                        Review & Verify
                                    </Button>
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        href={doc.file_url}
                                        target="_blank"
                                    >
                                        Download
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    ))}
                </div>
            )}

            {/* Verification Modal */}
            <Modal show={!!selectedDoc} onHide={() => setSelectedDoc(null)} size="xl">
                <Modal.Header closeButton>
                    <Modal.Title>
                        Verify: {selectedDoc?.doc_type?.replace(/_/g, ' ')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedDoc?.correction_reason && (
                        <Alert variant="warning">
                            <strong>Original Issue:</strong><br />
                            {selectedDoc.correction_reason}
                        </Alert>
                    )}

                    <div className="row mb-4">
                        <div className="col-md-6">
                            <h6>Original Document</h6>
                            <Button 
                                variant="outline-secondary"
                                href={selectedDoc?.file_url}
                                target="_blank"
                                block
                            >
                                Download Original
                            </Button>
                        </div>
                        <div className="col-md-6">
                            <h6>Re-uploaded Document (v{selectedDoc?.version})</h6>
                            <Button 
                                variant="outline-primary"
                                href={selectedDoc?.file_url}
                                target="_blank"
                                block
                            >
                                Preview Re-uploaded
                            </Button>
                        </div>
                    </div>

                    <div className="alert alert-info">
                        <p className="mb-2">Does the re-uploaded document address the correction issue?</p>
                        <small>
                            Uploaded by: {selectedDoc?.uploader_name}<br />
                            On: {selectedDoc?.uploaded_at ? new Date(selectedDoc.uploaded_at).toLocaleString() : 'N/A'}
                        </small>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button 
                        variant="outline-danger"
                        onClick={() => {
                            const reason = prompt('Enter reason for rejection:');
                            if (reason) handleReject(selectedDoc.id, reason);
                        }}
                        disabled={verifying}
                    >
                        ✗ Reject
                    </Button>
                    <Button 
                        variant="success"
                        onClick={() => handleVerify(selectedDoc.id)}
                        disabled={verifying}
                    >
                        {verifying ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Verifying...
                            </>
                        ) : (
                            '✓ Accept & Verify'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default DocumentVerificationPanel;
```

---

## Component 3: Pending Corrections Badge (Global)

### Location
`src/components/Sidebar.jsx` or Header Navigation

### Functionality
Show a notification badge with count of pending corrections for current user

### Code Sample
```jsx
import React, { useState, useEffect } from 'react';
import { Badge } from 'react-bootstrap';

export const CorrectionsBadge = ({ userId, userRole }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (userRole === 'agent') {
            loadAgentCorrections();
        }
    }, [userId, userRole]);

    const loadAgentCorrections = async () => {
        try {
            const response = await fetch(`/api/actions?assigned_to=${userId}`);
            const data = await response.json();
            const pendingCount = data.data.filter(
                a => a.status === 'open' || a.status === 'doc_uploaded'
            ).length;
            setCount(pendingCount);
        } catch (err) {
            console.error('Error loading corrections count:', err);
        }
    };

    if (count === 0) return null;

    return (
        <Badge 
            bg="danger" 
            className="correction-badge"
            title="You have pending document corrections"
        >
            {count} Correction{count !== 1 ? 's' : ''}
        </Badge>
    );
};

export default CorrectionsBadge;
```

---

## API Integration Summary

### For Agents:
1. **Get pending actions**: `GET /api/actions?assigned_to={agentId}`
2. **Get document details**: `GET /api/documents/{documentId}`
3. **Re-upload document**: `POST /api/documents/{documentId}/reupload`

### For Doc Team:
1. **Get all documents**: `GET /api/documents` (filter for status='uploaded')
2. **Verify document**: `PATCH /api/documents/{documentId}/verify`
3. **Reject document**: `PATCH /api/documents/{documentId}/reject`

### For Admins:
1. **Get all actions**: `GET /api/actions`
2. **Get overdue actions**: `GET /api/actions/overdue`

---

## Real-time Updates (Optional Enhancement)

Implement WebSocket/Socket.IO listeners for real-time updates:

```jsx
useEffect(() => {
    const socket = io('/notifications');
    
    socket.on('document_flagged', (data) => {
        // Refresh pending corrections
        loadPendingActions();
    });
    
    socket.on('document_verified', (data) => {
        // Remove from list or show success message
        loadDocumentsForVerification();
    });
    
    return () => socket.disconnect();
}, []);
```

---

## Testing Checklist

- [ ] Agent sees badge with count of pending corrections
- [ ] Agent can click to view correction details
- [ ] Agent can re-upload corrected document
- [ ] Doc team sees re-uploaded documents in verification queue
- [ ] Doc team can verify document (closes action)
- [ ] Agent receives notification when document is accepted
- [ ] Project status changes from 'action_required' to 'doc_verified'
- [ ] Rejected documents show rejection reason to agent
- [ ] All notifications are received in correct order
