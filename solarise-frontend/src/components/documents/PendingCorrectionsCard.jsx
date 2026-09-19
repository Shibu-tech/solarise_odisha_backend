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

  const previewUrl = document.presigned_url;

  return (
    <div className={`border-l-4 border-amber-400 rounded-2xl p-5 shadow-2xs border border-slate-200/80 ${statusColors[action.status] || 'bg-white'}`}>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-base font-extrabold text-amber-900">
              {getActionTypeLabel(action.action_type)}
            </span>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
              action.status === 'doc_uploaded' 
                ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                : 'bg-amber-100 text-amber-800 border border-amber-200'
            }`}>
              {action.status === 'doc_uploaded' ? '⏳ Awaiting Verification' : '⚠️ Action Required'}
            </span>
          </div>

          {action.consumer_name && (
            <div className="text-xs text-slate-600 mb-2 font-medium flex items-center gap-2">
              <span className="font-bold text-slate-800">Consumer:</span> {action.consumer_name}
              {action.consumer_number && (
                <span className="text-slate-400 font-mono">({action.consumer_number})</span>
              )}
            </div>
          )}

          <div className="p-3 bg-amber-500/10 border border-amber-200/80 rounded-xl mb-3">
            <p className="text-xs font-bold text-amber-950 uppercase tracking-wider mb-1">
              Feedback from Document Desk:
            </p>
            <p className="text-sm text-amber-900 leading-relaxed font-medium">
              {action.detail || 'Please review and correct this document as per the Document Team\'s feedback.'}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
            <div>
              <span className="font-semibold text-slate-700">Document Type:</span>{' '}
              <span className="capitalize">{document.doc_type?.replace(/_/g, ' ')}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Flagged Version:</span> v{document.version || 1}
            </div>
            {document.uploaded_at && (
              <div>
                <span className="font-semibold text-slate-700">Flagged On:</span>{' '}
                {new Date(document.uploaded_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        <div className="flex sm:flex-col gap-2 shrink-0">
          {((previewUrl && typeof previewUrl === 'string' && previewUrl.startsWith('http')) ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200"
            >
              👁️ View Flagged File
            </a>
          ) : null)}

          {action.status === 'open' && (
            <Button
              variant="primary"
              onClick={() => onReupload(document.id, action)}
              className="text-xs px-4 py-2.5 whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
            >
              Re-upload Corrected Doc →
            </Button>
          )}

          {action.status === 'doc_uploaded' && (
            <div className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-2 rounded-xl text-center font-bold">
              Awaiting Doc Desk Review
            </div>
          )}

          <Button
            variant="secondary"
            onClick={() => onViewDetail(action)}
            className="text-xs px-3.5 py-2 whitespace-nowrap bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl"
          >
            View Details
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PendingCorrectionsCard;
