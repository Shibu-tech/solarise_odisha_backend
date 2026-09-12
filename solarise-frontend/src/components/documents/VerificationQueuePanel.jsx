import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { DocumentVerificationPanel } from './DocumentVerificationPanel';
import api from '../../services/api';

/**
 * VerificationQueuePanel
 * 
 * Main component for Document Team to view and verify re-uploaded documents.
 * Shows all documents awaiting verification.
 */
export const VerificationQueuePanel = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [previousVersions, setPreviousVersions] = useState({});
  const [actions, setActions] = useState({});
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchDocumentsAwaitingVerification();
  }, []);

  const fetchDocumentsAwaitingVerification = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all documents with status 'uploaded' (re-uploaded versions awaiting verification)
      const docsRes = await api.get('/api/documents');
      const allDocs = docsRes.data?.data || [];

      // Filter for documents that are 'uploaded' and have version > 1 (re-uploads) OR status 'action_required'
      const pendingVerification = allDocs.filter(
        (doc) => doc.status === 'uploaded' && doc.version > 1
      );

      setDocuments(pendingVerification);

      // Fetch previous versions and action details
      const prevVersionMap = {};
      const actionMap = {};

      for (const doc of pendingVerification) {
        try {
          // Get all versions of this document to find previous version
          const consumerDocsRes = await api.get(`/api/documents/consumer/${doc.consumer_id}`);
          const consumerDocs = consumerDocsRes.data?.data || [];
          const previousDoc = consumerDocs.find(
            (d) => d.doc_type === doc.doc_type && d.version === (doc.version - 1)
          );
          if (previousDoc) {
            prevVersionMap[doc.id] = previousDoc;
          }

          // Get action for this project
          if (doc.consumer_id) {
            const projectRes = await api.get(`/api/projects`);
            const projects = projectRes.data?.data || [];
            const project = projects.find((p) => p.consumer_id === doc.consumer_id);
            if (project) {
              const actionsRes = await api.get(`/api/actions/project/${project.id}`);
              const projectActions = actionsRes.data?.data || [];
              const correctionAction = projectActions.find(
                (a) => a.status === 'doc_uploaded' || a.status === 'open'
              );
              if (correctionAction) {
                actionMap[doc.id] = correctionAction;
              }
            }
          }
        } catch (err) {
          console.error(`Error fetching details for document ${doc.id}:`, err);
        }
      }

      setPreviousVersions(prevVersionMap);
      setActions(actionMap);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents for verification');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (documentId) => {
    try {
      setProcessing(true);
      const res = await api.patch(`/api/documents/${documentId}/verify`, {});

      if (res.status === 200) {
        alert('✓ Document verified successfully! Correction action has been resolved.');
        setSelectedDocId(null);
        await fetchDocumentsAwaitingVerification();
      }
    } catch (err) {
      console.error('Verification error:', err);
      alert(`Failed to verify document: ${err.response?.data?.error || err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (documentId, rejectReason) => {
    try {
      setProcessing(true);
      const res = await api.patch(`/api/documents/${documentId}/reject`, {
        reject_reason: rejectReason
      });

      if (res.status === 200) {
        alert('✗ Document rejected. Agent has been notified to re-upload.');
        setSelectedDocId(null);
        await fetchDocumentsAwaitingVerification();
      }
    } catch (err) {
      console.error('Rejection error:', err);
      alert(`Failed to reject document: ${err.response?.data?.error || err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading documents for verification...</p>
        </div>
      </div>
    );
  }

  const selectedDoc = documents.find((d) => d.id === selectedDocId);

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {/* Documents List */}
      <div className="md:col-span-1 space-y-4">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
          <h1 className="text-2xl font-bold">📋 Verification Queue</h1>
          <p className="text-blue-100 mt-2 text-sm">
            {documents.length} {documents.length === 1 ? 'document' : 'documents'} awaiting your review
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
            <p className="font-semibold">Error: {error}</p>
            <Button
              variant="secondary"
              onClick={fetchDocumentsAwaitingVerification}
              className="mt-2 text-xs"
            >
              Retry
            </Button>
          </div>
        )}

        {documents.length === 0 ? (
          <div className="bg-emerald-50 border-2 border-dashed border-emerald-300 rounded-lg p-6 text-center">
            <p className="text-3xl mb-2">✓</p>
            <h3 className="text-lg font-bold text-emerald-900 mb-1">All Verified!</h3>
            <p className="text-sm text-emerald-700">No documents awaiting verification.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={`w-full text-left p-3 rounded-lg border-2 transition ${
                  selectedDocId === doc.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-blue-300'
                }`}
              >
                <p className="font-semibold text-gray-900 text-sm">
                  {doc.doc_type?.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  v{doc.version || 1} • {doc.consumer_name || 'Unknown Consumer'}
                </p>
                <p className="text-xs text-blue-600 font-semibold mt-2">
                  {actions[doc.id]?.status === 'doc_uploaded' 
                    ? '⏳ Awaiting Review' 
                    : '📤 Uploaded'}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Document Details Panel */}
      <div className="md:col-span-2">
        {selectedDoc ? (
          <DocumentVerificationPanel
            document={selectedDoc}
            previousVersion={previousVersions[selectedDoc.id]}
            action={actions[selectedDoc.id]}
            onVerify={handleVerify}
            onReject={handleReject}
            isLoading={processing}
          />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-5xl mb-4">📄</p>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Select a Document</h3>
            <p className="text-gray-600">
              Choose a document from the list to review and verify it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerificationQueuePanel;
