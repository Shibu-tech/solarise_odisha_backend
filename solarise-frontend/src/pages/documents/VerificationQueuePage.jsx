import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { VerificationQueuePanel } from '../../components/documents';

export const VerificationQueuePage = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
              Document Desk
            </span>
            <span className="text-xs text-slate-400 font-semibold">• Verification & Compliance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Document Verification Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review re-uploaded and corrected documents, compare against original versions, and verify or reject.
          </p>
        </div>
      </div>

      <VerificationQueuePanel />
    </div>
  );
};

export default VerificationQueuePage;
