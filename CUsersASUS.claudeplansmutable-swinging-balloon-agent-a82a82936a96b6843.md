# Document Correction Workflow Exploration Plan

## Goals
Explore the codebase to understand how to implement a document correction workflow, focusing on document management, action items, notifications, project status, and the frontend.

## Steps

### 1. Backend Exploration (solarise-api)
- [ ] **Document Management**:
    - Search for `solarise.documents` to identify controllers, services, and routes.
    - Analyze how documents are uploaded and verified.
- [ ] **Action Items**:
    - Search for `solarise.action_required` to find endpoints and logic for creating/resolving actions.
- [ ] **Notifications**:
    - Search for `solarise.notifications` to find notification services and logic.
- [ ] **Project Status**:
    - Search for `solarise.projects.current_status` to see how status updates are handled.

### 2. Frontend Exploration (solarise-frontend)
- [ ] **Document Upload**:
    - Find components and logic responsible for uploading documents.
- [ ] **Action Items UI**:
    - Search for existing UI related to pending actions or corrections.
    - Identify suitable locations for a 'Pending Correction Actions' window.

### 3. Final Report
- [ ] Summarize all findings with absolute file paths and relevant code snippets/function summaries.
