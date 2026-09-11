import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { documentService, actionService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ALL_DOCUMENT_TYPES, DOC_TYPE_LABELS } from '../../constants/documentTypes';
import StatusTag from '../../components/tags/StatusTag';

const DocumentsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [documents, setDocuments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [openActions, setOpenActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [activeTab, setActiveTab] = useState('all');
  const [selectedDocType, setSelectedDocType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Quick Reject Modal
  const [rejectingDoc, setRejectingDoc] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Quick Flag Modal
  const [flaggingDoc, setFlaggingDoc] = useState(null);
  const [flagActionType, setFlagActionType] = useState('electric_bill_name_correction');
  const [flagReason, setFlagReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const canVerify = ['admin', 'doc_team'].includes(user?.role);
  const canFlag = ['admin', 'doc_team', 'site_manager'].includes(user?.role);

  useEffect(() => {
    fetchDocumentsData();
  }, []);

  const fetchDocumentsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [listRes, summaryRes, actionsRes] = await Promise.allSettled([
        documentService.getAll(),
        documentService.getStatusSummary(),
        actionService.getAll(),
      ]);

      if (listRes.status === 'fulfilled') {
        const data = listRes.value.data?.data || listRes.value.data;
        setDocuments(Array.isArray(data) ? data : []);
      }

      if (summaryRes.status === 'fulfilled') {
        setSummary(summaryRes.value.data);
      }

      if (actionsRes.status === 'fulfilled') {
        const actData = actionsRes.value.data?.data || actionsRes.value.data;
        setOpenActions(Array.isArray(actData) ? actData : []);
      }
    } catch (err) {
      console.error('API error fetching documents:', err);
      setError('Could not fetch document list from server');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickVerify = async (docId) => {
    try {
      setActionLoading(true);
      await documentService.verify(docId, { verified_by: user?.id || 1 });
      await fetchDocumentsData();
    } catch (err) {
      alert(err.response?.data?.error || 'Verification failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenResolverForAction = (act) => {
    let targetDocType = null;
    if (act.action_type === 'electric_bill_name_correction') targetDocType = 'electric_bill';
    else if (['bank_passbook_name_correction', 'bank_passbook_update'].includes(act.action_type)) targetDocType = 'bank_passbook';
    else if (act.action_type === 'ownership_transfer') targetDocType = 'land_ror';

    let match = documents.find(d => 
      (act.consumer_id ? d.consumer_id === act.consumer_id : true) && 
      (targetDocType ? d.doc_type === targetDocType : true) &&
      ['action_required', 'rejected', 'uploaded'].includes(d.status)
    );

    if (!match && act.consumer_id) {
      match = documents.find(d => d.consumer_id === act.consumer_id && ['action_required', 'rejected'].includes(d.status));
    }

    if (!match && targetDocType) {
      match = documents.find(d => d.doc_type === targetDocType);
    }

    if (!match && act.consumer_id) {
      match = documents.find(d => d.consumer_id === act.consumer_id);
    }

    if (match) {
      navigate(`/documents/${match.id}/resolve`);
    } else if (documents.length > 0) {
      navigate(`/documents/${documents[0].id}/resolve`);
    } else {
      navigate('/documents/upload');
    }
  };

  const handleQuickRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectingDoc || !rejectReason) return;
    try {
      setActionLoading(true);
      await documentService.reject(rejectingDoc.id, {
        verified_by: user?.id || 1,
        reject_reason: rejectReason,
      });
      setRejectingDoc(null);
      setRejectReason('');
      await fetchDocumentsData();
    } catch (err) {
      alert(err.response?.data?.error || 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickFlagSubmit = async (e) => {
    e.preventDefault();
    if (!flaggingDoc || !flagReason) return;
    try {
      setActionLoading(true);
      await documentService.flag(flaggingDoc.id, {
        flagged_by: user?.id || 1,
        action_type: flagActionType,
        detail: flagReason,
      });
      setFlaggingDoc(null);
      setFlagReason('');
      await fetchDocumentsData();
    } catch (err) {
      alert(err.response?.data?.error || 'Flagging document failed');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesDocType = selectedDocType === 'all' || doc.doc_type === selectedDocType;
    const docLabel = DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type || '';
    const matchesSearch =
      (doc.consumer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.doc_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      docLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.file_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.status || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesDocType || !matchesSearch) return false;

    if (activeTab === 'uploaded') return doc.status === 'uploaded';
    if (activeTab === 'verified') return doc.status === 'verified';
    if (activeTab === 'rejected') return doc.status === 'rejected';
    if (activeTab === 'action_required') return doc.status === 'action_required';
    return true;
  });

  const totalCount = summary?.total_documents || documents.length;
  const uploadedCount = documents.filter(d => d.status === 'uploaded').length;
  const verifiedCount = documents.filter(d => d.status === 'verified').length;
  const rejectedCount = documents.filter(d => d.status === 'rejected').length;
  const actionRequiredCount = documents.filter(d => d.status === 'action_required').length + openActions.length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Documents & Geotag Verification</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Review geotagged photos, Aadhaar, ROR, NOC, and DISCOM paperwork</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="primary"
            onClick={() => navigate('/documents/upload')}
            className="px-3.5 sm:px-4 py-2 text-xs font-semibold shadow-xs"
          >
            + Upload Document
          </Button>
        </div>
      </div>

      {/* Status KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-gray-400">Total Uploads</span>
          <p className="text-xl sm:text-2xl font-extrabold text-gray-900 mt-1">{totalCount}</p>
          <span className="text-[10px] text-gray-400 mt-0.5 sm:mt-1 block">Indexed documents</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/30 to-white shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-amber-600">Pending Review</span>
          <p className="text-xl sm:text-2xl font-extrabold text-amber-700 mt-1">{uploadedCount}</p>
          <span className="text-[10px] text-amber-600 mt-0.5 sm:mt-1 block">Awaiting approval</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/30 to-white shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Verified Docs</span>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-1">{verifiedCount}</p>
          <span className="text-[10px] text-emerald-600 mt-0.5 sm:mt-1 block">Passed compliance</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/30 to-white shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-rose-600">Rejected</span>
          <p className="text-xl sm:text-2xl font-extrabold text-rose-700 mt-1">{rejectedCount}</p>
          <span className="text-[10px] text-rose-600 mt-0.5 sm:mt-1 block">Requires re-upload</span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white p-3.5 sm:p-4 rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50/50 to-white shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-orange-600">Action Required</span>
          <p className="text-xl sm:text-2xl font-extrabold text-orange-700 mt-1">{actionRequiredCount}</p>
          <span className="text-[10px] text-orange-600 mt-0.5 sm:mt-1 block">Corrections requested</span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 bg-white p-3 sm:p-4 rounded-2xl border border-gray-200 shadow-2xs">
        {/* Horizontal scrollable tabs with touch support */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none -mx-1 px-1">
          {[
            { key: 'all', label: 'All Documents' },
            { key: 'uploaded', label: `Pending (${uploadedCount})` },
            { key: 'action_required', label: `Action (${actionRequiredCount})` },
            { key: 'verified', label: `Verified (${verifiedCount})` },
            { key: 'rejected', label: `Rejected (${rejectedCount})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100 bg-gray-50/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
          <select
            value={selectedDocType}
            onChange={(e) => setSelectedDocType(e.target.value)}
            className="w-full sm:w-56 px-3 py-2 text-xs bg-white rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 font-medium truncate"
          >
            <option value="all">All Types (28 Categories)</option>
            {ALL_DOCUMENT_TYPES.map((dt) => (
              <option key={dt.value} value={dt.value}>
                {dt.label}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:w-52">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search documents..."
              className="w-full pl-8.5 pr-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Pending Correction Actions Desk Banner */}
      {openActions.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 sm:p-5 rounded-2xl border border-amber-200 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1.5">
            <div className="flex items-center space-x-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <h3 className="text-xs font-extrabold text-amber-900 uppercase tracking-wide">
                Pending Correction Actions ({openActions.length})
              </h3>
            </div>
            <span className="text-[11px] text-amber-700 font-semibold">Raised from Projects Desk</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {openActions.map((act) => (
              <div key={act.id} className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs space-y-2 text-xs">
                <div className="flex justify-between items-start gap-2">
                  <span className="font-bold text-gray-900 truncate">{act.consumer_name || `Project #${act.project_id}`}</span>
                  <StatusTag status={act.status || 'open'} size="sm" />
                </div>
                <div className="inline-block px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-bold text-[11px] truncate max-w-full">
                  {(act.action_type || '').replace(/_/g, ' ')}
                </div>
                <p className="text-gray-600 text-[11px] line-clamp-2">{act.detail || 'Correction detail requested'}</p>
                <div className="pt-2 border-t border-amber-100 flex flex-wrap justify-between items-center gap-2 text-[11px]">
                  <span className="text-gray-400">Raised: {act.raised_by_name || 'Doc Team'}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenResolverForAction(act)}
                      className="px-2.5 py-1 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-[10px] rounded-lg transition shadow-2xs flex items-center space-x-1"
                    >
                      <span>Stepped Resolve</span>
                    </button>
                    <button
                      onClick={() => navigate(`/projects/${act.project_id}`)}
                      className="text-amber-700 font-bold hover:underline text-[10px] px-1"
                    >
                      View →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span>{error}</span>
          <button onClick={fetchDocumentsData} className="underline font-semibold text-xs">Retry</button>
        </div>
      )}

      {/* Main Records (Responsive Cards on Mobile, Table on Desktop) */}
      <div className="bg-white rounded-2xl shadow-2xs border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex min-h-[250px] items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-12 px-4">
            <svg className="h-12 w-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-base font-semibold text-gray-900">No matching document records found</h3>
            <p className="text-xs text-gray-500 mt-1">Upload consumer paperwork or adjust search filters.</p>
            <div className="mt-4">
              <Button variant="primary" onClick={() => navigate('/documents/upload')}>
                + Upload Document
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile View: Clean Card Layout (< md screens) */}
            <div className="block md:hidden divide-y divide-gray-100">
              {filteredDocs.map((doc) => (
                <div key={doc.id} className="p-4 space-y-3 hover:bg-gray-50/50 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">
                        {doc.consumer_name || `Consumer #${doc.consumer_id}`}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800 border border-gray-200">
                          {DOC_TYPE_LABELS[doc.doc_type] || (doc.doc_type || '').replace(/_/g, ' ')}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                          v{doc.version || 1}
                        </span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 text-[10px] rounded-full font-bold capitalize shrink-0 ${
                      doc.status === 'verified' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                      doc.status === 'rejected' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                      'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {doc.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-gray-400 block text-[10px]">Geotag GPS:</span>
                      {doc.geo_lat && doc.geo_lng ? (
                        <span className="text-amber-700 font-bold flex items-center gap-1 font-mono text-[10px]">
                          <svg className="w-3 h-3 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
                          <span>{parseFloat(doc.geo_lat).toFixed(3)}, {parseFloat(doc.geo_lng).toFixed(3)}</span>
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">No GPS</span>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Uploaded Date:</span>
                      <span className="text-gray-700 font-medium">
                        {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Mobile Actions Toolbar */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/documents/${doc.id}`)}
                      className="text-xs px-2.5 py-1"
                    >
                      View
                    </Button>
                    {(doc.status === 'action_required' || doc.status === 'rejected') && (
                      <button
                        onClick={() => navigate(`/documents/${doc.id}/resolve`)}
                        className="px-2.5 py-1 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs font-bold rounded-lg transition shadow-2xs"
                      >
                        Resolve
                      </button>
                    )}
                    {canFlag && doc.status !== 'action_required' && (
                      <button
                        onClick={() => setFlaggingDoc(doc)}
                        disabled={actionLoading}
                        className="px-2.5 py-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-lg transition shadow-2xs"
                      >
                        Flag
                      </button>
                    )}
                    {canVerify && (doc.status === 'uploaded' || doc.status === 'action_required') && (
                      <>
                        <button
                          onClick={() => handleQuickVerify(doc.id)}
                          disabled={actionLoading}
                          className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
                        >
                          Verify
                        </button>
                        <button
                          onClick={() => setRejectingDoc(doc)}
                          disabled={actionLoading}
                          className="px-2.5 py-1 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 disabled:opacity-50 transition"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Full Data Table (>= md screens) */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <Table.Header>
                  <Table.HeaderCell>Consumer</Table.HeaderCell>
                  <Table.HeaderCell>Document Type</Table.HeaderCell>
                  <Table.HeaderCell>Version</Table.HeaderCell>
                  <Table.HeaderCell>Geotag GPS</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Uploaded At</Table.HeaderCell>
                  <Table.HeaderCell>Actions</Table.HeaderCell>
                </Table.Header>
                <Table.Body>
                  {filteredDocs.map((doc) => (
                    <Table.Row key={doc.id}>
                      <Table.Cell className="font-medium text-gray-900">
                        {doc.consumer_name || `Consumer #${doc.consumer_id}`}
                      </Table.Cell>
                      <Table.Cell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-800 border">
                          {DOC_TYPE_LABELS[doc.doc_type] || (doc.doc_type || '').replace(/_/g, ' ')}
                        </span>
                      </Table.Cell>
                      <Table.Cell className="font-mono text-xs font-semibold text-purple-700">
                        v{doc.version || 1}
                      </Table.Cell>
                      <Table.Cell className="text-xs font-mono">
                        {doc.geo_lat && doc.geo_lng ? (
                          <span className="text-amber-700 font-bold flex items-center space-x-1">
                            <svg className="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                            <span>{parseFloat(doc.geo_lat).toFixed(3)}, {parseFloat(doc.geo_lng).toFixed(3)}</span>
                          </span>
                        ) : (
                          <span className="text-gray-400">No Geotag</span>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <span className={`px-2.5 py-1 text-[11px] rounded-full font-bold capitalize ${doc.status === 'verified' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          doc.status === 'rejected' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                            'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                          {doc.status}
                        </span>
                      </Table.Cell>
                      <Table.Cell className="text-xs text-gray-500">
                        {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'N/A'}
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/documents/${doc.id}`)}
                          >
                            View
                          </Button>
                          {(doc.status === 'action_required' || doc.status === 'rejected') && (
                            <button
                              onClick={() => navigate(`/documents/${doc.id}/resolve`)}
                              className="px-2 py-1 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-[11px] font-bold rounded-lg transition shadow-2xs"
                            >
                              Resolve
                            </button>
                          )}
                          {canFlag && doc.status !== 'action_required' && (
                            <button
                              onClick={() => setFlaggingDoc(doc)}
                              disabled={actionLoading}
                              className="px-2 py-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-[11px] font-bold rounded-lg transition shadow-2xs"
                            >
                              Flag
                            </button>
                          )}
                          {canVerify && (doc.status === 'uploaded' || doc.status === 'action_required') && (
                            <>
                              <button
                                onClick={() => handleQuickVerify(doc.id)}
                                disabled={actionLoading}
                                className="px-2 py-1 bg-emerald-600 text-white text-[11px] font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
                              >
                                Verify
                              </button>
                              <button
                                onClick={() => setRejectingDoc(doc)}
                                disabled={actionLoading}
                                className="px-2 py-1 bg-rose-600 text-white text-[11px] font-semibold rounded-lg hover:bg-rose-700 disabled:opacity-50 transition"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
          </>
        )}
      </div>

      {/* Quick Reject Modal */}
      {rejectingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-200 p-5 sm:p-6 space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-rose-900 text-base">Reject Document Upload</h3>
              <button
                onClick={() => setRejectingDoc(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="text-xs bg-gray-50 p-3 rounded-xl space-y-1">
              <p><span className="font-semibold text-gray-700">Consumer:</span> {rejectingDoc.consumer_name}</p>
              <p><span className="font-semibold text-gray-700">Document:</span> {DOC_TYPE_LABELS[rejectingDoc.doc_type] || rejectingDoc.doc_type} (v{rejectingDoc.version || 1})</p>
            </div>

            <form onSubmit={handleQuickRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Reason for Rejection *</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  required
                  rows={3}
                  placeholder="Explain rejection reason (e.g. illegible text, invalid GPS geotag, mismatch)..."
                  className="w-full px-3 py-2 rounded-xl border text-xs focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>

              <div className="pt-3 flex flex-col-reverse sm:flex-row justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setRejectingDoc(null)}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full sm:w-auto px-5 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl hover:bg-rose-700 disabled:opacity-50 transition shadow-2xs"
                >
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Flag Modal */}
      {flaggingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-200 p-5 sm:p-6 space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-gray-900 text-base">Flag Document for Correction</h3>
              <button
                onClick={() => setFlaggingDoc(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="text-xs bg-orange-50 p-3 rounded-xl border border-orange-200 space-y-1">
              <p><span className="font-semibold text-orange-900">Consumer:</span> {flaggingDoc.consumer_name}</p>
              <p><span className="font-semibold text-orange-900">Document:</span> {DOC_TYPE_LABELS[flaggingDoc.doc_type] || flaggingDoc.doc_type} (v{flaggingDoc.version || 1})</p>
            </div>

            <form onSubmit={handleQuickFlagSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Action Type / Correction Category *</label>
                <select
                  value={flagActionType}
                  onChange={(e) => setFlagActionType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-orange-500 outline-hidden"
                >
                  <option value="electric_bill_name_correction">Electric Bill Name Correction</option>
                  <option value="bank_passbook_name_correction">Bank Passbook Name Correction</option>
                  <option value="bank_passbook_update">Bank Passbook Update</option>
                  <option value="ownership_transfer">Ownership Transfer (Land RoR)</option>
                  <option value="commercial_to_domestic">Commercial to Domestic Conversion</option>
                  <option value="other">Other Issue</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Flag Details / Reason *</label>
                <textarea
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  required
                  rows={3}
                  placeholder="Specify correction needed (e.g. name discrepancy, update passbook)..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-800 focus:ring-2 focus:ring-orange-500 outline-hidden"
                />
              </div>

              <div className="pt-3 flex flex-col-reverse sm:flex-row justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setFlaggingDoc(null)}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full sm:w-auto px-5 py-2 bg-orange-600 text-white text-xs font-semibold rounded-xl hover:bg-orange-700 disabled:opacity-50 transition shadow-2xs"
                >
                  {actionLoading ? 'Flagging...' : 'Confirm Flag Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;