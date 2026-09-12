import React, { useState } from 'react';
import { Button } from '../ui/Button';

/**
 * PendingCorrectionsCard
 * 
 * Displays a single pending document correction action assigned to the current agent.
 * Shows the reason for correction and allows agent to navigate to re-upload.
 */
export const PendingCorrectionsCard = ({ action, document, onReupload, onViewDetail }) => {
  if (!action || !document) return null;

  const getActionTypeLabel = (type) => {
    const labels = {
      'electric_bill_name_correction': '⚡ Electric Bill - Name Correction',
      'bank_passbook_name_correction': '🏦 Bank Passbook - Name Correction',
      'bank_passbook_update': '🏦 Bank Passbook - Update',
      'ownership_transfer': '🔄 Ownership Transfer',
      'commercial_to_domestic': '🏠 Commercial to Domestic Conversion',
      'other': '📋 Other Document Correction'
    };
    return labels[type] || type?.replace(/_/g, ' ');
  };

  const statusColors = {
    'open': 'bg-amber-50 border-amber-200',
    'doc_uploaded': 'bg-blue-50 border-blue-200',
    'in_review': 'bg-purple-50 border-purple-200'
  };

  return (
    <div className={`border-l-4 border-amber-400 rounded-lg p-4 ${statusColors[action.status] || 'bg-gray-50'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg font-bold text-amber-800">
              {getActionTypeLabel(action.action_type)}
            </span>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              action.status === 'doc_uploaded' 
                ? 'bg-blue-200 text-blue-800' 
                : 'bg-amber-200 text-amber-800'
            }`}>
              {action.status === 'doc_uploaded' ? '⏳ Awaiting Verification' : '⚠️ Action Required'}
            </span>
          </div>

          <p className="text-sm text-gray-700 mb-3 leading-relaxed">
            {action.detail || 'Please review and correct this document as per the Document Team\'s feedback.'}
          </p>

          <div className="text-xs text-gray-600 space-y-1">
            <div>
              <span className="font-semibold">Document Type:</span>{' '}
              {document.doc_type?.replace(/_/g, ' ')}
            </div>
            <div>
              <span className="font-semibold">Current Version:</span> v{document.version || 1}
            </div>
            {document.uploaded_at && (
              <div>
                <span className="font-semibold">Flagged:</span>{' '}
                {new Date(document.uploaded_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 ml-4">
          {action.status === 'open' && (
            <Button
              variant="primary"
              onClick={() => onReupload(document.id, action)}
              className="text-sm px-3 py-2 whitespace-nowrap"
            >
              Re-upload Corrected Doc
            </Button>
          )}

          {action.status === 'doc_uploaded' && (
            <div className="text-xs bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-center font-semibold">
              Awaiting Doc Team Verification
            </div>
          )}

          <Button
            variant="secondary"
            onClick={() => onViewDetail(action)}
            className="text-sm px-3 py-2 whitespace-nowrap"
          >
            View Details
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PendingCorrectionsCard;
