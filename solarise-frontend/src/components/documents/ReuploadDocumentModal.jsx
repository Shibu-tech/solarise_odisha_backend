import React, { useState, useRef } from 'react';
import { Button } from '../ui/Button';

/**
 * ReuploadDocumentModal
 * 
 * Modal component for agents to re-upload corrected documents.
 * Supports file selection, geolocation capture, and progress tracking.
 */
export const ReuploadDocumentModal = ({ 
  isOpen, 
  document, 
  action, 
  onClose, 
  onSubmit, 
  isLoading 
}) => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [geoLocation, setGeoLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen || !document) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleCaptureLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setLocationLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Could not capture location. Please allow location access.');
        setLocationLoading(false);
      }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!file && !fileName) {
      alert('Please select a file to upload');
      return;
    }

    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    if (fileName) {
      formData.append('file_name', fileName);
    }
    if (geoLocation) {
      formData.append('geo_lat', geoLocation.latitude.toString());
      formData.append('geo_lng', geoLocation.longitude.toString());
    }

    onSubmit(document.id, formData);
  };

  const handleClose = () => {
    setFile(null);
    setFileName('');
    setGeoLocation(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4 flex items-center justify-between sticky top-0">
          <div>
            <h2 className="text-xl font-bold text-white">Re-upload Corrected Document</h2>
            <p className="text-emerald-100 text-sm mt-1">{document.doc_type?.replace(/_/g, ' ')} - Version {(document.version || 1) + 1}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:bg-emerald-700 rounded-lg p-2 transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Correction Details */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="font-semibold text-amber-900 mb-2">Correction Required:</h3>
            <p className="text-amber-800 text-sm leading-relaxed">
              {action?.detail || 'Please review the Document Team\'s feedback and upload the corrected document.'}
            </p>
          </div>

          {/* Current Document Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Current Version</p>
              <p className="text-lg font-bold text-gray-900">v{document.version || 1}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">New Version</p>
              <p className="text-lg font-bold text-emerald-600">v{(document.version || 1) + 1}</p>
            </div>
          </div>

          {/* File Upload Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              📄 Select Corrected Document
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition"
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              {file ? (
                <div>
                  <p className="text-lg font-semibold text-emerald-600">✓ File Selected</p>
                  <p className="text-sm text-gray-600 mt-1">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 font-medium">Click to select or drag and drop</p>
                  <p className="text-xs text-gray-500 mt-2">
                    PDF, JPG, PNG, DOC (Max 10MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Optional File Name */}
          {!file && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                File Name (optional, if using S3 pre-upload)
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="e.g., electric_bill_corrected.pdf"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* Geolocation */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              📍 Geolocation (optional)
            </label>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCaptureLocation}
              disabled={locationLoading}
              className="w-full"
            >
              {locationLoading ? '⏳ Capturing Location...' : '📍 Capture Current Location'}
            </Button>
            {geoLocation && (
              <div className="mt-2 p-3 bg-emerald-50 rounded-lg text-sm">
                <p className="text-emerald-700 font-semibold">✓ Location Captured</p>
                <p className="text-emerald-600 text-xs mt-1">
                  Latitude: {geoLocation.latitude.toFixed(6)}, Longitude: {geoLocation.longitude.toFixed(6)}
                </p>
                <p className="text-emerald-600 text-xs">
                  Accuracy: ±{geoLocation.accuracy.toFixed(0)} meters
                </p>
              </div>
            )}
          </div>

          {/* Submission Notes */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">💡 Note:</span> Your re-uploaded document will be reviewed by the Document Team. You'll receive a notification once it's verified.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading || (!file && !fileName)}
              className="flex-1"
            >
              {isLoading ? '⏳ Uploading...' : '✓ Submit Corrected Document'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReuploadDocumentModal;
