import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentService, consumerService, actionService } from '../../services/api';
import { ALL_DOCUMENT_TYPES } from '../../constants/documentTypes';
import LocationMapPicker from '../../components/ui/LocationMapPicker';

const DocumentUploadPage = () => {
  const navigate = useNavigate();

  const [consumers, setConsumers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [flaggedDocs, setFlaggedDocs] = useState([]);
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'resolve'
  const [selectedFile, setSelectedFile] = useState(null);
  const [showMap, setShowMap] = useState(false);

  const [form, setForm] = useState({
    consumer_id: '',
    doc_type: 'electric_bill',
    file_name: '',
    geo_lat: '',
    geo_lng: '',
  });

  useEffect(() => {
    fetchConsumers();
    fetchFlaggedDocs();
  }, []);

  const fetchConsumers = async () => {
    try {
      const res = await consumerService.getAll();
      const list = res.data?.data || res.data || [];
      setConsumers(list);
      if (list.length > 0) {
        setForm((prev) => ({ ...prev, consumer_id: list[0].id }));
      }
    } catch (err) {
      console.warn('Error fetching consumers:', err);
    }
  };

  const fetchFlaggedDocs = async () => {
    try {
      const [docsRes, actsRes] = await Promise.allSettled([
        documentService.getAll(),
        actionService.getAll(),
      ]);

      let list = [];
      if (docsRes.status === 'fulfilled') {
        list = docsRes.value.data?.data || docsRes.value.data || [];
      }

      let openActions = [];
      if (actsRes.status === 'fulfilled') {
        openActions = actsRes.value.data?.data || actsRes.value.data || [];
      }

      const flagged = list.filter(d => {
        if (['action_required', 'rejected'].includes(d.status)) return true;
        const hasOpenAct = openActions.some(a => 
          String(a.consumer_id) === String(d.consumer_id) && 
          !['resolved', 'cancelled'].includes(a.status)
        );
        return hasOpenAct;
      });

      setFlaggedDocs(flagged);
    } catch (err) {
      console.warn('Error fetching documents:', err);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setForm((prev) => ({
            ...prev,
            geo_lat: pos.coords.latitude.toFixed(6),
            geo_lng: pos.coords.longitude.toFixed(6),
          }));
        },
        (err) => alert('Could not capture GPS coordinates: ' + err.message)
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const handleMapLocationSelect = useCallback(({ lat, lng }) => {
    setForm((prev) => ({
      ...prev,
      geo_lat: String(lat),
      geo_lng: String(lng),
    }));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (file) {
      setForm((prev) => ({
        ...prev,
        file_name: prev.file_name || file.name,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!selectedFile) {
        throw new Error('Choose a document file to upload.');
      }

      const payload = new FormData();
      payload.append('file', selectedFile);
      payload.append('consumer_id', form.consumer_id);
      payload.append('doc_type', form.doc_type);
      payload.append('file_name', form.file_name || selectedFile.name);
      if (form.geo_lat) payload.append('geo_lat', form.geo_lat);
      if (form.geo_lng) payload.append('geo_lng', form.geo_lng);
      const res = await documentService.upload(payload);

      const newId = res.data?.data?.id || res.data?.id;
      navigate(newId ? `/documents/${newId}` : '/documents');
    } catch (err) {
      console.error('Error uploading document:', err);
      setError(err.response?.data?.error || err.message || 'Failed to upload document');
    } finally {
      setLoading(false);
    }
  };

  const matchingFlaggedDoc = flaggedDocs.find(
    (d) => String(d.consumer_id) === String(form.consumer_id) && (d.doc_type === form.doc_type || !form.doc_type)
  ) || flaggedDocs.find((d) => String(d.consumer_id) === String(form.consumer_id));

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Document Upload & Stepped Resolver Desk</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Upload new consumer documents or resolve flagged document corrections</p>
        </div>
        <button
          onClick={() => navigate('/documents')}
          className="self-start sm:self-auto px-3.5 sm:px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-200 transition"
        >
          ← Back to Documents
        </button>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-1.5 bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-2 px-3 sm:py-2.5 sm:px-4 text-xs font-bold rounded-xl transition ${
            activeTab === 'upload' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Upload New Document
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('resolve')}
          className={`flex-1 py-2 px-3 sm:py-2.5 sm:px-4 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'resolve' ? 'bg-white text-orange-800 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span>Fix Flagged Docs</span>
          {flaggedDocs.length > 0 && (
            <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 text-[10px] font-extrabold bg-orange-600 text-white rounded-full">
              {flaggedDocs.length}
            </span>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-rose-800 text-xs rounded-xl border border-rose-200">
          {error}
        </div>
      )}

      {/* Tab 2: Flagged Docs List for Resolution */}
      {activeTab === 'resolve' && (
        <div className="bg-white rounded-2xl border border-orange-200 p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex justify-between items-center border-b border-orange-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-orange-900">Flagged Documents Pending Correction ({flaggedDocs.length})</h2>
              <p className="text-xs text-orange-700 mt-0.5">Select a document to launch the 4-step upload & verification resolver workflow.</p>
            </div>
          </div>

          {flaggedDocs.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-500">
              No flagged documents requiring resolution right now.
            </div>
          ) : (
            <div className="space-y-3">
              {flaggedDocs.map((d) => (
                <div key={d.id} className="p-4 bg-orange-50/50 rounded-xl border border-orange-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-gray-900">{d.consumer_name || `Consumer #${d.consumer_id}`}</span>
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-800 font-bold rounded text-[10px] capitalize">
                        {d.status?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-gray-600 mt-1 font-semibold">
                      Category: <span className="text-purple-700 capitalize">{(d.doc_type || '').replace(/_/g, ' ')}</span> (v{d.version || 1})
                    </p>
                    {d.reject_reason && (
                      <p className="text-rose-700 italic text-[11px] mt-1">Reason: "{d.reject_reason}"</p>
                    )}
                  </div>
                  <button
                    onClick={() => navigate(`/documents/${d.id}/resolve`)}
                    className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-xs rounded-xl hover:from-orange-700 hover:to-amber-700 transition shadow-2xs shrink-0 self-start md:self-auto"
                  >
                    Launch Stepped Resolver →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 1: Upload Form */}
      {activeTab === 'upload' && (
        <>
          {/* Intelligent Flagged Warning Banner */}
          {matchingFlaggedDoc && (
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-amber-900 flex items-center space-x-1">
                  <svg className="w-4 h-4 text-orange-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.78-1.34-.25-2.864 1.018-3.836 1.306-1.016 2.888-.918 4.071-.345"/></svg>
                  <span>Flagged Document Detected for this Consumer!</span>
                </span>
                <p className="text-amber-800 text-[11px]">
                  Consumer <span className="font-semibold">{matchingFlaggedDoc.consumer_name}</span> has a document marked as{' '}
                  <span className="font-bold uppercase text-orange-900">{matchingFlaggedDoc.status?.replace(/_/g, ' ')}</span> for{' '}
                  <span className="font-semibold">{(matchingFlaggedDoc.doc_type || '').replace(/_/g, ' ')}</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/documents/${matchingFlaggedDoc.id}/resolve`)}
                className="px-4 py-2 bg-orange-600 text-white font-bold text-xs rounded-xl hover:bg-orange-700 transition shadow-2xs whitespace-nowrap shrink-0"
              >
                Fix via Stepped Resolver →
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white p-5 sm:p-6 rounded-2xl shadow-2xs border border-gray-200 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Select Consumer *</label>
              <select
                name="consumer_id"
                value={form.consumer_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2.5 rounded-xl border text-xs bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {consumers.length === 0 ? (
                  <option value="">No registered consumers found</option>
                ) : (
                  consumers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} — Elec No: {c.electric_consumer_no || 'N/A'}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Document Category *</label>
                <select
                  name="doc_type"
                  value={form.doc_type}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border text-xs bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  {ALL_DOCUMENT_TYPES.map((dt) => (
                    <option key={dt.value} value={dt.value}>
                      {dt.label} ({dt.value})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Document File Title</label>
                <input
                  type="text"
                  name="file_name"
                  value={form.file_name}
                  onChange={handleChange}
                  placeholder="e.g. Geotag_Roof_Site.jpg"
                  className="w-full px-3 py-2 rounded-xl border text-xs"
                />
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-gray-700 mb-2">Document file *</span>
              <label className="block border-2 border-dashed border-emerald-200 bg-emerald-50/50 rounded-2xl p-5 cursor-pointer hover:border-emerald-400 transition">
                <span className="block text-xs font-bold text-emerald-900">Choose a document from your device</span>
                <span className="block text-[10px] text-slate-500 mt-1">PDF, JPG, PNG, WEBP, or MP4 up to 5 MB</span>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.mp4" onChange={handleFileChange} className="sr-only" />
                <span className="mt-3 inline-flex items-center px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl">{selectedFile ? 'Change file' : 'Browse files'}</span>
                {selectedFile && <span className="block mt-2 text-xs font-semibold text-slate-700 truncate">{selectedFile.name} ({Math.ceil(selectedFile.size / 1024)} KB)</span>}
              </label>
            </div>

            {/* GPS Geotagging Card */}
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <label className="text-xs font-bold text-amber-900 flex items-center space-x-1">
                  <svg className="h-4 w-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Geotag Coordinates (Optional)</span>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    className="px-3 py-1 bg-amber-600 text-white text-[11px] font-semibold rounded-lg hover:bg-amber-700 transition"
                  >
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
                  <label className="block text-[11px] text-amber-800 font-semibold mb-1">Latitude (deg)</label>
                  <input
                    type="number"
                    step="any"
                    name="geo_lat"
                    value={form.geo_lat}
                    onChange={handleChange}
                    placeholder="20.296059"
                    className="w-full px-3 py-1.5 rounded-lg border text-xs font-mono bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-amber-800 font-semibold mb-1">Longitude (deg)</label>
                  <input
                    type="number"
                    step="any"
                    name="geo_lng"
                    value={form.geo_lng}
                    onChange={handleChange}
                    placeholder="85.824539"
                    className="w-full px-3 py-1.5 rounded-lg border text-xs font-mono bg-white"
                  />
                </div>
              </div>

              {/* Interactive Map Picker */}
              {showMap && (
                <div className="pt-1">
                  <LocationMapPicker
                    lat={form.geo_lat}
                    lng={form.geo_lng}
                    onLocationSelect={handleMapLocationSelect}
                    height="260px"
                  />
                </div>
              )}
            </div>

            <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-2.5 border-t">
              <button
                type="button"
                onClick={() => navigate('/documents')}
                className="w-full sm:w-auto px-5 py-2.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || consumers.length === 0}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition shadow-2xs"
              >
                {loading ? 'Uploading...' : 'Save & Upload Document'}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default DocumentUploadPage;
