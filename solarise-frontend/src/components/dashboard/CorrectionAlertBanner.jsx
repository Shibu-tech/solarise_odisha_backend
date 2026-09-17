import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const CorrectionAlertBanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [corrections, setCorrections] = useState([]);
  const [verificationQueue, setVerificationQueue] = useState([]);

  const role = user?.role || 'agent';

  useEffect(() => {
    let isMounted = true;

    const fetchAlerts = async () => {
      try {
        if (role === 'agent' || role === 'admin') {
          const res = await api.get('/actions/my-open-actions').catch(() => null);
          if (res?.data?.data && isMounted) {
            const list = res.data.data.filter(a =>
              ['open', 'doc_uploaded'].includes(a.status) &&
              ['electric_bill_name_correction', 'bank_passbook_name_correction', 'bank_passbook_update', 'ownership_transfer', 'commercial_to_domestic', 'other'].includes(a.action_type)
            );
            setCorrections(list);
          }
        }
        if (role === 'doc_team' || role === 'admin') {
          const res = await api.get('/api/documents/verification-queue').catch(() => null);
          if (res?.data?.data && isMounted) {
            setVerificationQueue(res.data.data);
          }
        }
      } catch { /* ignore */ }
    };

    fetchAlerts();
  }, [role, user?.id]);

  const hasCorrections = (role === 'agent' || role === 'admin') && corrections.length > 0;
  const hasQueue = (role === 'doc_team' || role === 'admin') && verificationQueue.length > 0;

  if (!hasCorrections && !hasQueue) return null;

  return (
    <div className="space-y-4">
      {/* Agent Correction Alert */}
      {hasCorrections && (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-300/80 rounded-[24px] p-5 shadow-sm backdrop-blur-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
              ⚠️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-amber-950">
                  Document Corrections Required ({corrections.length})
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-amber-200 text-amber-900 rounded-full">
                  Action Needed
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1">
                The Document Team has flagged {corrections.length} {corrections.length === 1 ? 'document' : 'documents'} that need to be re-uploaded.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/pending-corrections')}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all whitespace-nowrap cursor-pointer shrink-0"
          >
            Review & Fix Documents →
          </button>
        </div>
      )}

      {/* Doc Team Queue Alert */}
      {hasQueue && (
        <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/5 border border-blue-300/80 rounded-[24px] p-5 shadow-sm backdrop-blur-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
              📋
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-blue-950">
                  Verification Queue Awaiting Review ({verificationQueue.length})
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-blue-200 text-blue-900 rounded-full">
                  Doc Team
                </span>
              </div>
              <p className="text-xs text-blue-800 mt-1">
                Agents have re-uploaded {verificationQueue.length} corrected {verificationQueue.length === 1 ? 'document' : 'documents'} for your verification.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/verification-queue')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all whitespace-nowrap cursor-pointer shrink-0"
          >
            Open Verification Queue →
          </button>
        </div>
      )}
    </div>
  );
};

export default CorrectionAlertBanner;
