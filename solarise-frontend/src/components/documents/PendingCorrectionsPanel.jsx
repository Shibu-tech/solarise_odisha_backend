import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import PendingCorrectionsCard from './PendingCorrectionsCard';
import { ReuploadDocumentModal } from './ReuploadDocumentModal';
import api from '../../services/api';

/**
 * PendingCorrectionsPanel
 * 
 * Main component for agents to view and manage their pending document corrections.
 * Shows all open corrections assigned to the current agent.
 */
export const PendingCorrectionsPanel = ({ userId }) => {
  const [pendingActions, setPendingActions] = useState([]);
  const [documents, setDocuments] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [reuploadModalOpen, setReuploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchPendingCorrections();
  }, [userId]);

  const fetchPendingCorrections = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call my-open-actions which returns enriched actions with document and consumer info
      let actions = [];
      try {
        const myActionsRes = await api.get('/actions/my-open-actions');
        actions = myActionsRes.data?.data || [];
      } catch {
        const allRes = await api.get('/actions');
        actions = allRes.data?.data || [];
      }

      // Filter for correction actions
      const correctionActions = actions.filter((action) => {
        if (action.status === 'resolved' || action.status === 'cancelled') return false;
        if (!['electric_bill_name_correction', 'bank_passbook_name_correction', 'bank_passbook_update', 'ownership_transfer', 'commercial_to_domestic', 'other'].includes(action.action_type)) {
          return false;
        }

        if (!userId) return true;

        const assignedTo = action.assigned_to != null ? Number(action.assigned_to) : null;
        const uploadedBy = action.document_uploaded_by != null ? Number(action.document_uploaded_by) : null;

        return assignedTo === Number(userId) || uploadedBy === Number(userId) || (assignedTo === null && uploadedBy === null);
      });

      setPendingActions(correctionActions);

      // Build document mapping for each action
      const docMap = {};
      for (const action of correctionActions) {
        if (action.document_id) {
          docMap[action.id] = {
            id: action.document_id,
            doc_type: action.doc_type || 'document',
            version: action.document_version || 1,
            status: action.document_status || 'action_required',
            file_url: action.presigned_url || action.file_url,
            presigned_url: action.presigned_url,
            file_name: action.file_name,
            consumer_name: action.consumer_name,
            uploaded_at: action.raised_at,
          };
        } else if (action.consumer_id) {
          try {
            const docsRes = await api.get(`/documents/consumer/${action.consumer_id}`);
            const docs = docsRes.data?.data || [];
            const relevantDoc = docs.find((d) => d.status === 'action_required' || d.status === 'uploaded');
            if (relevantDoc) {
              docMap[action.id] = relevantDoc;
            }
          } catch { /* ignore fallback error */ }
        }
      }
      setDocuments(docMap);
    } catch (err) {
      console.error('Error fetching pending corrections:', err);
      setError('Failed to load pending corrections');
    } finally {
      setLoading(false);
    }
  };

  const handleReupload = (documentId, action) => {
    const doc = documents[action.id] || { id: documentId, doc_type: action.action_type };
    setSelectedDocument({ ...doc, action });
    setReuploadModalOpen(true);
  };

  const handleReuploadSubmit = async (documentId, formData) => {
    try {
      setUploading(true);
      if (selectedDocument?.action?.id) {
        formData.append('action_id', selectedDocument.action.id);
      }
      const targetDocId = documentId || selectedDocument?.id;
      const res = await api.post(`/documents/${targetDocId}/reupload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.status === 201) {
        alert('✓ Document re-uploaded successfully! Please wait for Document Team verification.');
        setReuploadModalOpen(false);
        await fetchPendingCorrections();
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert(`Failed to upload document: ${err.response?.data?.error || err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleViewDetail = (action) => {
    // Could navigate to detailed view or show more info
    alert(`Action ID: ${action.id}\nStatus: ${action.status}\nType: ${action.action_type}\n\nDetail:\n${action.detail}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pending corrections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">⚠️ Pending Corrections</h1>
            <p className="text-amber-100 mt-2">
              You have {pendingActions.length} {pendingActions.length === 1 ? 'correction' : 'corrections'} assigned to you.
              Please review and correct the flagged documents.
            </p>
          </div>
          <div className="text-5xl font-bold opacity-20">{pendingActions.length}</div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <p className="font-semibold">Error: {error}</p>
          <Button
            variant="secondary"
            onClick={fetchPendingCorrections}
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Empty State */}
      {pendingActions.length === 0 && !error && (
        <div className="bg-emerald-50 border-2 border-dashed border-emerald-300 rounded-2xl p-12 text-center">
          <p className="text-5xl mb-4">✓</p>
          <h3 className="text-xl font-bold text-emerald-900 mb-2">All Clear!</h3>
          <p className="text-emerald-700">
            You don't have any pending document corrections. Great job keeping your submissions up to date!
          </p>
        </div>
      )}

      {/* Pending Corrections List */}
      <div className="space-y-4">
        {pendingActions.map((action) => (
          <PendingCorrectionsCard
            key={action.id}
            action={action}
            document={documents[action.id]}
            onReupload={handleReupload}
            onViewDetail={handleViewDetail}
          />
        ))}
      </div>

      {/* Reupload Modal */}
      <ReuploadDocumentModal
        isOpen={reuploadModalOpen}
        document={selectedDocument}
        action={selectedDocument?.action}
        onClose={() => setReuploadModalOpen(false)}
        onSubmit={handleReuploadSubmit}
        isLoading={uploading}
      />

      {/* Info Box */}
      {pendingActions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <p className="text-sm font-semibold text-blue-900">
            💡 How to Resolve a Correction:
          </p>
          <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
            <li>Review the correction reason provided by the Document Team</li>
            <li>Obtain the correct document from the consumer</li>
            <li>Click "Re-upload Corrected Doc" to submit the corrected version</li>
            <li>The Document Team will review and verify your submission</li>
            <li>You'll receive a notification once the correction is accepted</li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default PendingCorrectionsPanel;
