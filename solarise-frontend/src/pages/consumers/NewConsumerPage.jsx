import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { consumerService, areaBlockService } from '../../services/api';
import { validateMobile, validateEmail, validatePAN, validateAadhaar } from '../../utils/validators';
import { useToast } from '../../context/ToastContext';
import LocationMapPicker from '../../components/ui/LocationMapPicker';

const NewConsumerPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [areaBlocks, setAreaBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoAccuracy, setGeoAccuracy] = useState(null);
  const [showMap, setShowMap] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    address: '',
    area_block_id: '',
    email: '',
    phone_primary: '',
    phone_secondary: '',
    contact_person_name: '',
    contact_person_phone: '',
    contact_person_relation: 'Spouse',
    same_as_contact_person: false,
    electric_consumer_no: '',
    name_on_electric_bill: '',
    phone_on_electric_bill: '',
    geo_lat: '',
    geo_lng: '',
    age: '35',
    aadhaar_no: '',
    pan_no: '',
    bank_account_no: '',
    payment_mode: 'cash',
    land_owned_by_consumer: true,
    occupation: 'self_employed',
  });

  useEffect(() => {
    fetchAreaBlocks();
  }, []);

  const fetchAreaBlocks = async () => {
    try {
      const res = await areaBlockService.getAll();
      const blocks = res.data?.data || res.data || [];
      setAreaBlocks(blocks);
      if (blocks.length > 0) {
        setForm((prev) => ({ ...prev, area_block_id: blocks[0].id }));
      }
    } catch (e) {
      console.warn('Could not fetch area blocks');
    }
  };



  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalVal = type === 'checkbox' ? checked : value;
    if (name === 'pan_no' && typeof finalVal === 'string') {
      finalVal = finalVal.toUpperCase();
    }

    setForm((prev) => {
      const updated = {
        ...prev,
        [name]: finalVal,
      };

      if (name === 'same_as_contact_person' && checked) {
        updated.contact_person_name = prev.full_name;
        updated.contact_person_phone = prev.phone_primary;
        updated.contact_person_relation = 'Self';
      }
      return updated;
    });
  };

  const handleFetchLocation = () => {
    if (!navigator.geolocation) {
      if (toast?.showError) {
        toast.showError('Geolocation is not supported by your browser.', 'GPS Unavailable');
      } else {
        alert('Geolocation is not supported by your browser.');
      }
      return;
    }
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        const accuracy = Math.round(position.coords.accuracy);

        setForm((prev) => ({
          ...prev,
          geo_lat: lat,
          geo_lng: lng,
        }));
        setGeoAccuracy(accuracy);
        setGeoLocating(false);
        if (toast?.showSuccess) {
          toast.showSuccess(`GPS coordinates captured (Accuracy: ±${accuracy}m)`, 'Location Detected');
        }
      },
      (err) => {
        console.error('Error fetching GPS coordinates:', err);
        let errorMsg = 'Could not fetch location. Please enter coordinates manually.';
        if (err.code === 1) {
          errorMsg = 'Location permission was denied. Please allow location access in your browser.';
        } else if (err.code === 2) {
          errorMsg = 'Location unavailable. Please ensure GPS / location service is enabled.';
        } else if (err.code === 3) {
          errorMsg = 'GPS location request timed out. Please try again.';
        }
        if (toast?.showError) {
          toast.showError(errorMsg, 'GPS Error');
        } else {
          alert(errorMsg);
        }
        setGeoLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleClearLocation = () => {
    setForm((prev) => ({ ...prev, geo_lat: '', geo_lng: '' }));
    setGeoAccuracy(null);
    if (toast?.showInfo) {
      toast.showInfo('GPS coordinates cleared', 'Notice');
    }
  };

  const handleMapLocationSelect = useCallback(({ lat, lng }) => {
    setForm((prev) => ({
      ...prev,
      geo_lat: String(lat),
      geo_lng: String(lng),
    }));
    setGeoAccuracy(null);
    if (toast?.showSuccess) {
      toast.showSuccess(`Location selected on map: ${lat}, ${lng}`, 'Map Pin Set');
    }
  }, [toast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Frontend Validations
    const phoneErr = validateMobile(form.phone_primary, 'Primary phone number');
    if (phoneErr) {
      setError(phoneErr);
      return;
    }

    if (form.phone_secondary) {
      const secPhoneErr = validateMobile(form.phone_secondary, 'Secondary phone number');
      if (secPhoneErr) {
        setError(secPhoneErr);
        return;
      }
    }

    if (form.contact_person_phone) {
      const cpPhoneErr = validateMobile(form.contact_person_phone, 'Contact person phone');
      if (cpPhoneErr) {
        setError(cpPhoneErr);
        return;
      }
    }

    if (form.email) {
      const emailErr = validateEmail(form.email, 'Email address');
      if (emailErr) {
        setError(emailErr);
        return;
      }
    }

    const panErr = validatePAN(form.pan_no);
    if (panErr) {
      setError(panErr);
      return;
    }

    const aadhaarErr = validateAadhaar(form.aadhaar_no);
    if (aadhaarErr) {
      setError(aadhaarErr);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...form,
        age: parseInt(form.age, 10),
        geo_lat: form.geo_lat ? parseFloat(form.geo_lat) : null,
        geo_lng: form.geo_lng ? parseFloat(form.geo_lng) : null,
      };
      const res = await consumerService.create(payload);
      const newId = res.data?.data?.id || res.data?.id;
      navigate(newId ? `/consumers/${newId}` : '/consumers');
    } catch (err) {
      console.error('Error registering consumer:', err);
      setError(err.response?.data?.error || 'Failed to register consumer');
    } finally {
      setLoading(false);
    }
  };

  const ageNum = parseInt(form.age || '0', 10);
  const isSurpassedMAC = ageNum > 64;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Register New Consumer</h1>
          <p className="text-xs text-slate-500 mt-1">Complete consumer profile, electric bill no, contact person, & MAC age check</p>
        </div>
        <button
          onClick={() => navigate('/consumers')}
          className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-full hover:bg-slate-200 transition"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-rose-800 text-xs rounded-2xl border border-rose-200 font-semibold shadow-2xs">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-[28px] shadow-sm border border-slate-200/80 space-y-6">

        {/* Personal Details */}
        <div className="space-y-4">
          <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2.5 font-mono flex items-center space-x-2">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>1. Primary Personal Information</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                required
                placeholder="e.g. Ramesh Chandra Das"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Primary Phone Number *</label>
              <input
                type="text"
                name="phone_primary"
                value={form.phone_primary}
                onChange={handleChange}
                required
                placeholder="e.g. 9876543210"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Secondary Phone</label>
              <input
                type="text"
                name="phone_secondary"
                value={form.phone_secondary}
                onChange={handleChange}
                placeholder="e.g. 9437012345"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="e.g. consumer@example.com"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Age (18 - 120) *</label>
              <input
                type="number"
                name="age"
                value={form.age}
                onChange={handleChange}
                min="18"
                max="120"
                required
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-mono"
              />
              {isSurpassedMAC && (
                <p className="text-[11px] text-rose-600 font-bold mt-1">
                  ⚠️ Age &gt; 64 years: Surpassed MAC threshold! Co-applicant required.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Area Block *</label>
              <select
                name="area_block_id"
                value={form.area_block_id}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs"
              >
                {areaBlocks.length === 0 ? (
                  <option value="1">Default Block (Bhubaneswar)</option>
                ) : (
                  areaBlocks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Installation Address *</label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              required
              rows={2}
              placeholder="House No, Village/Locality, District, Odisha"
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs focus:bg-white transition"
            />
          </div>
        </div>

        {/* Contact Person Details */}
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
            <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider font-mono flex items-center space-x-2">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>2. Emergency / Contact Person Details</span>
            </h2>
            <label className="flex items-center space-x-2 text-xs font-bold text-emerald-700 cursor-pointer">
              <input
                type="checkbox"
                name="same_as_contact_person"
                checked={form.same_as_contact_person}
                onChange={handleChange}
                className="h-4 w-4 text-emerald-600 rounded"
              />
              <span>Same as primary consumer</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Person Name</label>
              <input
                type="text"
                name="contact_person_name"
                value={form.contact_person_name}
                onChange={handleChange}
                placeholder="e.g. Sunita Das"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Person Phone</label>
              <input
                type="text"
                name="contact_person_phone"
                value={form.contact_person_phone}
                onChange={handleChange}
                placeholder="e.g. 9876500000"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Relation</label>
              <input
                type="text"
                name="contact_person_relation"
                value={form.contact_person_relation}
                onChange={handleChange}
                placeholder="e.g. Spouse / Son / Legal Heir"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs"
              />
            </div>
          </div>
        </div>

        {/* DISCOM Connection, KYC & Geolocation */}
        <div className="space-y-4">
          <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2.5 font-mono flex items-center space-x-2">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>3. DISCOM Electric Bill & Geolocation</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Electric Consumer No. *</label>
              <input
                type="text"
                name="electric_consumer_no"
                value={form.electric_consumer_no}
                onChange={handleChange}
                required
                placeholder="e.g. ELE-2026-9090"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Name on Electric Bill *</label>
              <input
                type="text"
                name="name_on_electric_bill"
                value={form.name_on_electric_bill}
                onChange={handleChange}
                required
                placeholder="Exact name on DISCOM bill"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Aadhaar No. (12 Digits)</label>
              <input
                type="text"
                name="aadhaar_no"
                value={form.aadhaar_no}
                onChange={handleChange}
                maxLength={12}
                placeholder="123456789012"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">PAN Card No. (10 Chars)</label>
              <input
                type="text"
                name="pan_no"
                value={form.pan_no}
                onChange={handleChange}
                maxLength={10}
                placeholder="ABCDE1234F"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-mono uppercase"
              />
            </div>

            {/* Site Geolocation Section */}
            <div className="md:col-span-2 bg-linear-to-r from-emerald-50/70 via-teal-50/40 to-slate-50 border border-emerald-100/90 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <span>Site GPS Geotagging</span>
                      {form.geo_lat && form.geo_lng && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-200">
                          ✓ Synced {geoAccuracy ? `(±${geoAccuracy}m)` : ''}
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-500">Auto-detect rooftop solar coordinates or enter manually</p>
                  </div>
                </div>

                {/* Action Buttons Group */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {form.geo_lat && form.geo_lng && (
                    <>
                      <a
                        href={`https://www.google.com/maps?q=${form.geo_lat},${form.geo_lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition active:scale-95"
                        title="Preview pin on Google Maps"
                      >
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span>View Map</span>
                      </a>
                      <button
                        type="button"
                        onClick={handleClearLocation}
                        className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 px-2 py-1.5 rounded-xl hover:bg-rose-50 transition"
                        title="Clear coordinates"
                      >
                        Clear
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={handleFetchLocation}
                    disabled={geoLocating}
                    className={`relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 shadow-xs active:scale-95 cursor-pointer disabled:cursor-not-allowed ${geoLocating
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 ring-2 ring-emerald-400/30'
                        : form.geo_lat && form.geo_lng
                          ? 'bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 hover:border-emerald-400 hover:shadow-emerald-500/10'
                          : 'bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/25 hover:shadow-emerald-600/35 hover:-translate-y-0.5'
                      }`}
                  >
                    {geoLocating ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin text-emerald-700 shrink-0" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                        </svg>
                        <span className="animate-pulse">Acquiring GPS...</span>
                      </>
                    ) : (
                      <>
                        <svg className={`w-3.5 h-3.5 shrink-0 ${form.geo_lat && form.geo_lng ? 'text-emerald-600' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{form.geo_lat && form.geo_lng ? 'Re-detect GPS' : 'Auto-detect GPS'}</span>
                      </>
                    )}
                  </button>

                  {/* Pick on Map Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowMap((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 shadow-xs active:scale-95 cursor-pointer border ${
                      showMap
                        ? 'bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-200/50'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <span>{showMap ? 'Hide Map' : '📍 Pick on Map'}</span>
                  </button>
                </div>
              </div>

              {/* Coordinates Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Latitude (Lat)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[10px] font-mono font-bold text-slate-400">
                      LAT
                    </span>
                    <input
                      type="text"
                      name="geo_lat"
                      value={form.geo_lat}
                      onChange={handleChange}
                      placeholder="e.g. 20.296059"
                      className="w-full pl-11 pr-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Longitude (Lng)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[10px] font-mono font-bold text-slate-400">
                      LNG
                    </span>
                    <input
                      type="text"
                      name="geo_lng"
                      value={form.geo_lng}
                      onChange={handleChange}
                      placeholder="e.g. 85.824539"
                      className="w-full pl-11 pr-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Interactive Map Picker */}
              {showMap && (
                <div className="pt-2">
                  <LocationMapPicker
                    lat={form.geo_lat}
                    lng={form.geo_lng}
                    onLocationSelect={handleMapLocationSelect}
                    height="280px"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment & Occupation */}
        <div className="space-y-4">
          <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2.5 font-mono flex items-center space-x-2">
            <span>💳 4. Payment Mode & Property Ownership</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Payment Mode *</label>
              <select
                name="payment_mode"
                value={form.payment_mode}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs"
              >
                <option value="cash">Cash Payment</option>
                <option value="bank_loan">Bank Loan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Occupation</label>
              <select
                name="occupation"
                value={form.occupation}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs"
              >
                <option value="self_employed">Self Employed</option>
                <option value="farmer">Farmer</option>
                <option value="housewife">Housewife</option>
                <option value="government_service">Government Service</option>
                <option value="private_job">Private Job</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer pt-2">
            <input
              type="checkbox"
              name="land_owned_by_consumer"
              checked={form.land_owned_by_consumer}
              onChange={handleChange}
              className="h-4 w-4 text-emerald-600 rounded"
            />
            <span>Roof / Land property is directly owned by consumer</span>
          </label>
        </div>

        <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => navigate('/consumers')}
            className="px-5 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-full hover:bg-slate-200 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-full hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
          >
            {loading ? 'Registering Consumer...' : 'Save & Register Consumer'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewConsumerPage;
