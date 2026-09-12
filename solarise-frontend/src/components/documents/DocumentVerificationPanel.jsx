import React, { useState } from 'react';
import { Button } from '../ui/Button';

/**
 * DocumentVerificationPanel
 * 
 * Component for Document Team to review and verify re-uploaded documents.
 * Displays document details, versions, and verification controls.
 */
export const DocumentVerificationPanel = ({ 
  document, 
  previousVersion,
  action,
  onVerify,
  onReject,
  isLoading 
}) => {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  if (!document) return null;

  const handleVerify = () => {
    if (onVerify) {
      onVerify(document.id);
    }
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    if (onReject) {
      onReject(document.id, rejectReason);
      setRejectReason('');
      setShowRejectForm(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'uploaded': { bg: 'bg-blue-100', text: 'text-blue-800', label: '📤 Pending Review' },
      'verified': { bg: 'bg-emerald-100', text: 'text-emerald-800', label: '✓ Verified' },
      'rejected': { bg: 'bg-red-100', text: 'text-red-800', label: '✗ Rejected' },
      'action_required': { bg: 'bg-amber-100', text: 'text-amber-800', label: '⚠️ Action Required' }
    };
    const badge = badges[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
    return badge;
  };

  const statusBadge = getStatusBadge(document.status);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">
                {document.doc_type?.replace(/_/g, ' ')}
              </h3>
              <p className="text-blue-100 text-sm mt-1">
                Uploaded by: {document.uploaded_by_name || 'Unknown Agent'}
              </p>
            </div>
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
              {statusBadge.label}
            </span>
          </div>
        </div>

        <div className="px-6 py-4 space-y-3">
          {/* Document Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Version</p>
              <p className="text-lg font-bold text-gray-900">v{document.version || 1}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Uploaded At</p>
              <p className="text-sm font-semibold text-gray-900">
                {new Date(document.uploaded_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">File Name</p>
              <p className="text-sm font-semibold text-gray-900 truncate">
                {document.file_name || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Consumer</p>
              <p className="text-sm font-semibold text-gray-900">
                {document.consumer_name || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Correction Reason (if available) */}
      {action?.detail && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide mb-2">
            ⚠️ Correction Reason
          </p>
          <p className="text-sm text-amber-800 leading-relaxed">
            {action.detail}
          </p>
        </div>
      )}

      {/* Document Preview */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Previous Version (if available) */}
        {previousVersion && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-semibold text-gray-700">
                Previous Version (v{previousVersion.version || 1})
              </p>
            </div>
            <div className="p-4">
              {previousVersion.file_url ? (
                <a
                  href={previousVersion.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold text-gray-700 transition"
                >
                  📥 View Previous Document
                </a>
              ) : (
                <p className="text-sm text-gray-600">No previous version available</p>
              )}
              {previousVersion.reject_reason && (
                <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
                  <p className="text-xs font-semibold text-red-800 mb-1">Rejection Reason:</p>
                  <p className="text-sm text-red-700">{previousVersion.reject_reason}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Current Version (Corrected) */}
        <div className="bg-white rounded-lg border border-emerald-200 overflow-hidden">
          <div className="bg-emerald-100 px-4 py-3 border-b border-emerald-200">
            <p className="text-sm font-semibold text-emerald-900">
              ✓ Corrected Version (v{document.version || 1})
            </p>
          </div>
          <div className="p-4">
            {document.file_url ? (
              <a
                href={document.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 hover:bg-emerald-200 rounded-lg text-sm font-semibold text-emerald-700 transition"
              >
                📥 View Corrected Document
              </a>
            ) : (
              <p className="text-sm text-gray-600">No document available</p>
            )}
            {document.geo_lat && document.geo_lng && (
              <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-xs font-semibold text-blue-800 mb-1">📍 Location Metadata:</p>
                <p className="text-sm text-blue-700">
                  {document.geo_lat.toFixed(6)}, {document.geo_lng.toFixed(6)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-900">Verification Action:</p>

        {!showRejectForm ? (
          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={handleVerify}
              disabled={isLoading || document.status === 'verified'}
              className="flex-1"
            >
              {document.status === 'verified' 
                ? '✓ Already Verified' 
                : isLoading ? '⏳ Processing...' : '✓ Verify & Accept'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowRejectForm(true)}
              disabled={isLoading || document.status === 'rejected'}
              className="flex-1"
            >
              {document.status === 'rejected' ? '✗ Rejected' : '✗ Reject'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Please provide a detailed reason for rejection..."
              className="w-full px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
              rows="4"
            />
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowRejectForm(false);
                  setRejectReason('');
                }}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleReject}
                disabled={isLoading || !rejectReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {isLoading ? '⏳ Processing...' : '✗ Confirm Rejection'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">💡 Verification Note:</span> Accepting this document will resolve the correction action and close the pending task for the agent.
        </p>
      </div>
    </div>
  );
};

export default DocumentVerificationPanel;
