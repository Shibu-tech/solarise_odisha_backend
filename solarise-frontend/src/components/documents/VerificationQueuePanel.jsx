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

      // Call optimized verification queue endpoint
      const queueRes = await api.get('/api/documents/verification-queue');
      const docs = queueRes.data?.data || [];
      setDocuments(docs);

      const prevVersionMap = {};
      const actionMap = {};

      docs.forEach((doc) => {
        if (doc.prev_id) {
          prevVersionMap[doc.id] = {
            id: doc.prev_id,
            file_url: doc.prev_file_url,
            prev_presigned_url: doc.prev_presigned_url,
            file_name: doc.prev_file_name,
            version: doc.prev_version,
            uploaded_at: doc.prev_uploaded_at,
            reject_reason: doc.prev_reject_reason,
          };
        }
        if (doc.action_id) {
          actionMap[doc.id] = {
            id: doc.action_id,
            action_type: doc.action_type,
            detail: doc.action_detail,
            status: doc.action_status,
            raised_at: doc.action_raised_at,
          };
        }
      });

      setPreviousVersions(prevVersionMap);
      setActions(actionMap);
      if (docs.length > 0) {
        setSelectedDocId((prev) => (prev && docs.some((d) => d.id === prev) ? prev : docs[0].id));
      }
    } catch (err) {
      console.error('Error fetching verification queue:', err);
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
