import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { documentService, actionService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DOC_TYPE_LABELS } from '../../constants/documentTypes';
import LocationMapPicker from '../../components/ui/LocationMapPicker';

const STEPS = [
  { id: 1, label: 'Review Issue' },
  { id: 2, label: 'Upload Correction' },
  { id: 3, label: 'Preview & Compare' },
  { id: 4, label: 'Approve & Verify' },
];

const DocumentResolvePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [doc, setDoc] = useState(null);
  const [allVersions, setAllVersions] = useState([]);
  const [relatedAction, setRelatedAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Step 2 state
  const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'url'
  const [selectedFile, setSelectedFile] = useState(null);
  const [reuploadUrl, setReuploadUrl] = useState('');
  const [reuploadFileName, setReuploadFileName] = useState('');
  const [geoLat, setGeoLat] = useState('');
  const [geoLng, setGeoLng] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadedNewVersion, setUploadedNewVersion] = useState(null);
  const [showMap, setShowMap] = useState(false);

  // Step 4 state
  const [verifying, setVerifying] = useState(false);

  const canVerify = ['admin', 'doc_team'].includes(user?.role);

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const docRes = await documentService.getById(id);
      const docData = docRes.data?.data || docRes.data;
      setDoc(docData);

      // Fetch all versions of this doc type for this consumer
      if (docData?.consumer_id) {
        try {
          const versionsRes = await documentService.getByConsumer(docData.consumer_id);
          const allDocs = versionsRes.data?.data || versionsRes.data || [];
          const sameType = allDocs.filter(d => d.doc_type === docData.doc_type).sort((a, b) => (b.version || 1) - (a.version || 1));
          setAllVersions(sameType);
        } catch { setAllVersions([docData]); }
      }

      // Find related open action for this consumer/project
      try {
        const actRes = await actionService.getAll();
        const acts = actRes.data?.data || actRes.data || [];
        const match = acts.find(a => {
          if (['resolved', 'cancelled'].includes(a.status)) return false;
          if (docData.consumer_id && a.consumer_id && String(a.consumer_id) !== String(docData.consumer_id)) return false;
          if (docData.project_id && a.project_id && String(a.project_id) !== String(docData.project_id)) return false;

          if (docData.doc_type === 'electric_bill' && a.action_type === 'electric_bill_name_correction') return true;
          if (docData.doc_type === 'bank_passbook' && ['bank_passbook_name_correction', 'bank_passbook_update'].includes(a.action_type)) return true;
          if (['land_ror', 'aadhaar_card'].includes(docData.doc_type) && a.action_type === 'ownership_transfer') return true;
          return false;
        });
        setRelatedAction(match || null);
      } catch { setRelatedAction(null); }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoLat(pos.coords.latitude.toFixed(6));
          setGeoLng(pos.coords.longitude.toFixed(6));
        },
        () => alert('Could not capture GPS')
      );
    }
  };

  const handleMapLocationSelect = useCallback(({ lat, lng }) => {
    setGeoLat(String(lat));
    setGeoLng(String(lng));
  }, []);

  const handleUploadCorrected = async (e) => {
    e.preventDefault();
    try {
      if (uploadMode === 'file' && !selectedFile) {
        alert('Please choose a file to upload to S3.');
        return;
      }
      if (uploadMode === 'url' && !reuploadUrl) {
        alert('Please enter a valid file URL.');
        return;
      }

      setUploading(true);

      let payload;
      if (uploadMode === 'file' && selectedFile) {
        payload = new FormData();
        payload.append('file', selectedFile);
        payload.append('uploaded_by', user?.id || 1);
        if (reuploadFileName) payload.append('file_name', reuploadFileName);
        if (geoLat) payload.append('geo_lat', geoLat);
        if (geoLng) payload.append('geo_lng', geoLng);
      } else {
        payload = {
          file_url: reuploadUrl,
          file_name: reuploadFileName || `corrected_${doc.doc_type}_v${(doc.version || 1) + 1}.jpg`,
          geo_lat: geoLat ? parseFloat(geoLat) : null,
          geo_lng: geoLng ? parseFloat(geoLng) : null,
          uploaded_by: user?.id || 1,
        };
      }

      const res = await documentService.reupload(id, payload);
      const newDoc = res.data?.data || res.data;
      setUploadedNewVersion(newDoc);
      await fetchData();
      setCurrentStep(3);
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleVerifyAndResolve = async () => {
    try {
      setVerifying(true);
      // Verify the new version
      const targetId = uploadedNewVersion?.id || (allVersions.length > 0 ? allVersions[0].id : id);
      await documentService.verify(targetId, { verified_by: user?.id || 1 });

      // Resolve related action if exists
      if (relatedAction?.id) {
        try {
          await actionService.resolve(relatedAction.id, { resolved_by: user?.id || 1 });
        } catch { /* action may already be resolved */ }
      }
      setCurrentStep(4);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="bg-rose-50 text-rose-800 p-6 rounded-2xl border border-rose-200 text-center space-y-4">
        <p className="font-semibold">{error || 'Document not found'}</p>
        <button onClick={() => navigate('/documents')} className="px-4 py-2 bg-rose-600 text-white text-sm rounded-lg">← Back</button>
      </div>
    );
  }

  const latestVersion = allVersions.length > 0 ? allVersions[0] : doc;
  const hasOpenAction = relatedAction && !['resolved', 'cancelled'].includes(relatedAction.status);
  const isDocFlagged = ['action_required', 'rejected'].includes(doc.status) || ['action_required', 'rejected'].includes(latestVersion.status);
  const isResolved = !hasOpenAction && !isDocFlagged && latestVersion.status === 'verified';  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white p-5 sm:p-6 rounded-2xl shadow-2xs border border-gray-200">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-mono uppercase px-2.5 py-1 bg-orange-50 text-orange-700 rounded-md font-bold border border-orange-200">
              {(doc.doc_type || 'document').replace(/_/g, ' ')}
            </span>
            <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full capitalize ${doc.status === 'action_required' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                doc.status === 'rejected' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                  doc.status === 'verified' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                    'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
              {doc.status?.replace(/_/g, ' ')}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Document Correction Workflow</h1>
          <p className="text-xs text-gray-500 mt-1">
            Consumer: <span className="font-semibold text-gray-700">{doc.consumer_name || `#${doc.consumer_id}`}</span> · Version: <span className="font-bold text-purple-600">v{doc.version || 1}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0">
          <button onClick={() => navigate('/documents/upload')} className="px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-xl hover:bg-emerald-100 transition flex items-center space-x-1">
            <span>Upload Desk</span>
          </button>
          <button onClick={() => navigate(`/documents/${id}`)} className="px-3.5 sm:px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-200 transition">View Details</button>
          <button onClick={() => navigate('/documents')} className="px-3.5 sm:px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-200 transition">← Back</button>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-3.5 sm:p-5">
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const isDone = currentStep > step.id || isResolved;
            const isActive = currentStep === step.id && !isResolved;
            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center flex-1 min-w-0">
                  <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-bold transition-all duration-300 ${isDone ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' :
                      isActive ? 'bg-orange-600 text-white shadow-md shadow-orange-200 ring-2 sm:ring-4 ring-orange-100' :
                        'bg-gray-100 text-gray-400'
                    }`}>
                    {isDone ? '✓' : step.id}
                  </div>
                  <span className={`text-[9px] sm:text-[11px] font-semibold mt-1.5 sm:mt-2 text-center truncate max-w-full px-0.5 ${isDone ? 'text-emerald-700' : isActive ? 'text-orange-700' : 'text-gray-400'
                    }`}>{step.label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all duration-500 ${currentStep > step.id || isResolved ? 'bg-emerald-400' : 'bg-gray-200'
                    }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step 1: Review Issue */}
      {currentStep === 1 && !isResolved && (
        <div className="bg-white rounded-2xl border border-orange-200 shadow-2xs overflow-hidden">
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 border-b border-orange-200">
            <h2 className="text-base font-bold text-orange-900 flex items-center space-x-2">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.78-1.34-.25-2.864 1.018-3.836 1.306-1.016 2.888-.918 4.071-.345" /></svg>
              <span>Step 1 — Review Flagged Issue</span>
            </h2>
            <p className="text-xs text-orange-700 mt-1">Understand why this document needs correction before proceeding.</p>
          </div>
          <div className="p-4 sm:p-5 space-y-4">
            {/* Current Document Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-3">
                <div><span className="text-gray-400 font-semibold block">Document Type</span><span className="capitalize font-bold text-gray-900">{DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type?.replace(/_/g, ' ')}</span></div>
                <div><span className="text-gray-400 font-semibold block">Current Status</span><span className="capitalize font-bold text-orange-700">{doc.status?.replace(/_/g, ' ')}</span></div>
                <div><span className="text-gray-400 font-semibold block">Uploaded By</span><span className="text-gray-900">{doc.uploaded_by_name || `User #${doc.uploaded_by}`}</span></div>
                <div><span className="text-gray-400 font-semibold block">Uploaded At</span><span className="text-gray-900 font-mono">{doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString() : 'N/A'}</span></div>
              </div>
              <div className="space-y-3">
                <div><span className="text-gray-400 font-semibold block">File URL</span><a href={doc.download_url || doc.file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-mono break-all">{doc.file_url}</a></div>
                {doc.geo_lat && doc.geo_lng && (
                  <div><span className="text-gray-400 font-semibold block">GPS Coordinates</span><span className="font-mono text-amber-700 font-bold">{doc.geo_lat}, {doc.geo_lng}</span></div>
                )}
              </div>
            </div>

            {/* Rejection / Action Reason */}
            {doc.reject_reason && (
              <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800 space-y-1">
                <span className="font-bold flex items-center space-x-1 text-rose-900">
                  <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.78-1.34-.25-2.864 1.018-3.836 1.306-1.016 2.888-.918 4.071-.345" /></svg>
                  <span>Rejection Reason:</span>
                </span>
                <p className="pl-5">{doc.reject_reason}</p>
              </div>
            )}

            {relatedAction && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <span className="font-bold flex items-center space-x-1 text-amber-950">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  <span>Related Action Item:</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pl-5">
                  <div><span className="font-semibold text-amber-700">Type:</span> <span className="capitalize">{relatedAction.action_type?.replace(/_/g, ' ')}</span></div>
                  <div><span className="font-semibold text-amber-700">Status:</span> <span className="capitalize">{relatedAction.status}</span></div>
                  <div className="sm:col-span-2"><span className="font-semibold text-amber-700">Detail:</span> {relatedAction.detail || 'Correction requested'}</div>
                  <div><span className="font-semibold text-amber-700">Raised by:</span> {relatedAction.raised_by_name || 'Doc Team'}</div>
                  <div><span className="font-semibold text-amber-700">Raised:</span> {relatedAction.raised_at ? new Date(relatedAction.raised_at).toLocaleDateString() : 'N/A'}</div>
                </div>
              </div>
            )}

            {/* Version history */}
            {allVersions.length > 1 && (
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 text-xs">
                <span className="font-bold text-purple-900 flex items-center space-x-1 mb-2">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                  <span>Version History ({allVersions.length} versions)</span>
                </span>
                <div className="space-y-1.5">
                  {allVersions.map(v => (
                    <div key={v.id} className="flex items-center justify-between py-1 border-b border-purple-100 last:border-0 gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-purple-700">v{v.version || 1}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold capitalize ${v.status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                            v.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                              v.status === 'action_required' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'
                          }`}>{v.status}</span>
                      </div>
                      <span className="font-mono text-purple-600 text-[11px]">{v.uploaded_at ? new Date(v.uploaded_at).toLocaleDateString() : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button onClick={() => setCurrentStep(2)} className="w-full sm:w-auto px-6 py-2.5 bg-orange-600 text-white text-xs font-bold rounded-xl hover:bg-orange-700 transition shadow-2xs">
                Proceed to Upload Correction →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Upload Correction */}
      {currentStep === 2 && !isResolved && (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-2xs overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-blue-200">
            <h2 className="text-base font-bold text-blue-900 flex items-center space-x-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              <span>Step 2 — Upload Corrected Document</span>
            </h2>
            <p className="text-xs text-blue-700 mt-1">Upload the corrected version of <span className="font-bold">{DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type?.replace(/_/g, ' ')}</span></p>
          </div>

          <form onSubmit={handleUploadCorrected} className="p-4 sm:p-5 space-y-4">
            {/* Mode Selector */}
            <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold max-w-sm">
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={`flex-1 py-1.5 rounded-lg transition ${uploadMode === 'file' ? 'bg-white text-blue-900 shadow-2xs' : 'text-gray-500'}`}
              >
                Upload File (AWS S3)
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('url')}
                className={`flex-1 py-1.5 rounded-lg transition ${uploadMode === 'url' ? 'bg-white text-blue-900 shadow-2xs' : 'text-gray-500'}`}
              >
                External URL
              </button>
            </div>

            {uploadMode === 'file' ? (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select Corrected Document File *</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.mp4"
                  required
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setSelectedFile(f);
                    if (f && !reuploadFileName) setReuploadFileName(f.name);
                  }}
                  className="w-full text-xs text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-200 rounded-xl p-2 cursor-pointer"
                />
                <p className="text-[11px] text-gray-400 mt-1">File will be safely stored in the private AWS S3 bucket.</p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Corrected File URL / Cloud Storage Path *</label>
                <input
                  type="text"
                  value={reuploadUrl}
                  onChange={(e) => setReuploadUrl(e.target.value)}
                  required
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 rounded-xl border text-xs font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">File Name (Optional)</label>
              <input
                type="text"
                value={reuploadFileName}
                onChange={(e) => setReuploadFileName(e.target.value)}
                placeholder="corrected_document.pdf"
                className="w-full px-3 py-2 rounded-xl border text-xs"
              />
            </div>

            {/* GPS Capture */}
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <label className="text-xs font-bold text-amber-900 flex items-center space-x-1">
                  <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span>Geotag Coordinates (if applicable)</span>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={handleGetLocation} className="px-3 py-1 bg-amber-600 text-white text-[11px] font-semibold rounded-lg hover:bg-amber-700 transition">
                    Auto-Detect GPS
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMap((prev) => !prev)}
                    className={`inline-flex items-center gap-1 px-3 py-1 text-[11px] font-semibold rounded-lg transition border ${
                      showMap
                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300'
                    }`}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    {showMap ? 'Hide Map' : '📍 Pick on Map'}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-amber-800 font-semibold mb-1">Latitude</label>
                  <input type="number" step="any" value={geoLat} onChange={e => setGeoLat(e.target.value)} placeholder="20.296059" className="w-full px-3 py-1.5 rounded-lg border text-xs font-mono bg-white" />
                </div>
                <div>
                  <label className="block text-[11px] text-amber-800 font-semibold mb-1">Longitude</label>
                  <input type="number" step="any" value={geoLng} onChange={e => setGeoLng(e.target.value)} placeholder="85.824539" className="w-full px-3 py-1.5 rounded-lg border text-xs font-mono bg-white" />
                </div>
              </div>

              {/* Interactive Map Picker */}
              {showMap && (
                <div className="pt-1">
                  <LocationMapPicker
                    lat={geoLat}
                    lng={geoLng}
                    onLocationSelect={handleMapLocationSelect}
                    height="260px"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-between gap-2.5 pt-2">
              <button type="button" onClick={() => setCurrentStep(1)} className="w-full sm:w-auto px-5 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-200 transition">
                ← Back to Review
              </button>
              <button type="submit" disabled={uploading} className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition shadow-2xs">
                {uploading ? 'Uploading to S3...' : 'Upload & Preview →'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 3: Preview & Compare */}
      {currentStep === 3 && !isResolved && (
        <div className="bg-white rounded-2xl border border-purple-200 shadow-2xs overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-4 border-b border-purple-200">
            <h2 className="text-base font-bold text-purple-900 flex items-center space-x-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              <span>Step 3 — Preview & Compare Versions</span>
            </h2>
            <p className="text-xs text-purple-700 mt-1">Review the corrected upload before final approval.</p>
          </div>
          <div className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Old Version */}
              <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-800">Original (Flagged Version)</span>
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded capitalize">{doc.status?.replace(/_/g, ' ')}</span>
                </div>
                <div className="text-xs space-y-1 text-gray-700">
                  <p><span className="font-semibold text-gray-500">Version:</span> v{doc.version || 1}</p>
                  <p><span className="font-semibold text-gray-500">File:</span> <span className="font-mono text-[11px]">{doc.file_name || 'N/A'}</span></p>
                  <a href={doc.download_url || doc.file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-mono text-[11px] block break-all">{doc.file_url}</a>
                  {doc.reject_reason && <p className="text-rose-700 mt-1 italic">"{doc.reject_reason}"</p>}
                </div>
              </div>

              {/* New Version */}
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800">Corrected (New Version)</span>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded">Pending Verification</span>
                </div>
                <div className="text-xs space-y-1 text-gray-700">
                  <p><span className="font-semibold text-gray-500">Version:</span> v{uploadedNewVersion?.version || (doc.version || 1) + 1}</p>
                  <p><span className="font-semibold text-gray-500">File:</span> <span className="font-mono text-[11px]">{uploadedNewVersion?.file_name || 'corrected'}</span></p>
                  <a href={uploadedNewVersion?.download_url || uploadedNewVersion?.file_url || '#'} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-mono text-[11px] block break-all">{uploadedNewVersion?.file_name || uploadedNewVersion?.file_url || 'Uploaded'}</a>
                  {uploadedNewVersion?.geo_lat && <p className="font-mono text-amber-700">GPS: {uploadedNewVersion.geo_lat}, {uploadedNewVersion.geo_lng}</p>}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-between gap-2.5 pt-2">
              <button onClick={() => setCurrentStep(2)} className="w-full sm:w-auto px-5 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-200 transition">
                ← Re-upload Different File
              </button>
              {canVerify ? (
                <button onClick={handleVerifyAndResolve} disabled={verifying} className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition shadow-2xs">
                  {verifying ? 'Verifying...' : 'Approve & Resolve →'}
                </button>
              ) : (
                <div className="text-xs text-amber-700 font-semibold bg-amber-50 px-4 py-2 rounded-xl border border-amber-200 text-center sm:text-left">
                  Awaiting Doc Team / Admin approval
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Completed */}
      {(currentStep === 4 || isResolved) && (
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-2xs overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-6 text-center space-y-3">
            <div className="w-16 h-16 mx-auto bg-emerald-500 rounded-full flex items-center justify-center text-3xl text-white shadow-lg shadow-emerald-200">✓</div>
            <h2 className="text-xl font-bold text-emerald-900">Document Correction Complete</h2>
            <p className="text-xs text-emerald-700 max-w-md mx-auto">
              The corrected version of <span className="font-bold">{DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type?.replace(/_/g, ' ')}</span> has been verified and approved.
              {relatedAction && ' The related action item has been resolved.'}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-2.5 pt-3">
              <button onClick={() => navigate(`/documents/${uploadedNewVersion?.id || id}`)} className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition shadow-2xs">
                View Verified Document
              </button>
              <button onClick={() => navigate('/documents')} className="w-full sm:w-auto px-5 py-2.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-200 transition">
                ← Back to Documents
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentResolvePage;
