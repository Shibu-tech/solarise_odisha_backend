import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { consumerService, bankLoanService, documentService, projectService, userService, transferService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { WhatsAppShareButton } from '../../components/WhatsAppShareButton';

const ConsumerDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [consumer, setConsumer] = useState(null);
  const [bankLoan, setBankLoan] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [linkedProject, setLinkedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const { showSuccess, showError } = useToast();

  // Edit Consumer form state
  const [editForm, setEditForm] = useState({
    full_name: '',
    address: '',
    area_block_id: '',
    email: '',
    phone_primary: '',
    phone_secondary: '',
    contact_person_name: '',
    contact_person_phone: '',
    contact_person_relation: '',
    same_as_contact_person: false,
    electric_consumer_no: '',
    name_on_electric_bill: '',
    phone_on_electric_bill: '',
    geo_lat: '',
    geo_lng: '',
    age: '',
    aadhaar_no: '',
    pan_no: '',
    bank_account_no: '',
    payment_mode: 'cash',
    land_owned_by_consumer: true,
    occupation: 'self_employed',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Bank Loan form state
  const [loanForm, setLoanForm] = useState({
    bank_name: '',
    loan_amount: '',
    is_ghanbani_land: false,
    remarks: '',
  });
  const [savingLoan, setSavingLoan] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [activating, setActivating] = useState(false);

  // Transfer form state
  const [agents, setAgents] = useState([]);
  const [transferForm, setTransferForm] = useState({ to_agent_id: '', remarks: '' });
  const [transferring, setTransferring] = useState(false);

  // Authorization check for consumer activation & deactivation
  const canManageDeactivation = ['admin', 'doc_team'].includes(user?.role);

  useEffect(() => {
    fetchConsumerDetails();
  }, [id]);

  const fetchConsumerDetails = async () => {
    try {
      setLoading(true);
      setError('');

      const consRes = await consumerService.getById(id);
      const consData = consRes.data?.data || consRes.data;
      setConsumer(consData);

      if (consData) {
        setEditForm({
          full_name: consData.full_name || '',
          address: consData.address || '',
          area_block_id: consData.area_block_id || 1,
          email: consData.email || '',
          phone_primary: consData.phone_primary || '',
          phone_secondary: consData.phone_secondary || '',
          contact_person_name: consData.contact_person_name || '',
          contact_person_phone: consData.contact_person_phone || '',
          contact_person_relation: consData.contact_person_relation || '',
          same_as_contact_person: consData.same_as_contact_person || false,
          electric_consumer_no: consData.electric_consumer_no || '',
          name_on_electric_bill: consData.name_on_electric_bill || '',
          phone_on_electric_bill: consData.phone_on_electric_bill || '',
          geo_lat: consData.geo_lat || '',
          geo_lng: consData.geo_lng || '',
          age: consData.age || 35,
          aadhaar_no: consData.aadhaar_no || '',
          pan_no: consData.pan_no || '',
          bank_account_no: consData.bank_account_no || '',
          payment_mode: consData.payment_mode || 'cash',
          land_owned_by_consumer: consData.land_owned_by_consumer ?? true,
          occupation: consData.occupation || 'self_employed',
        });
      }

      // Fetch Linked Project
      try {
        const projRes = await projectService.getAll();
        const projList = Array.isArray(projRes.data?.data) ? projRes.data.data : (Array.isArray(projRes.data) ? projRes.data : []);
        const found = projList.find((p) => String(p.consumer_id) === String(id));
        setLinkedProject(found || null);
      } catch (e) {
        setLinkedProject(null);
      }

      // Fetch Bank Loan
      try {
        const loanRes = await bankLoanService.getByConsumer(id);
        const loanData = loanRes.data?.data || loanRes.data;
        setBankLoan(loanData);
        if (loanData) {
          setLoanForm({
            bank_name: loanData.bank_name || '',
            loan_amount: loanData.loan_amount || '',
            is_ghanbani_land: loanData.is_ghanbani_land || false,
            remarks: loanData.remarks || '',
          });
        }
      } catch (e) {
        setBankLoan(null);
      }

      // Fetch Documents
      try {
        const docRes = await documentService.getByConsumer(id);
        setDocuments(docRes.data?.data || docRes.data || []);
      } catch (e) {
        setDocuments([]);
      }
    } catch (err) {
      console.error('Error fetching consumer details:', err);
      setError(err.response?.data?.error || 'Failed to load consumer details');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEditConsumer = async (e) => {
    e.preventDefault();
    try {
      setSavingEdit(true);
      const payload = {
        ...editForm,
        age: parseInt(editForm.age, 10),
        geo_lat: editForm.geo_lat ? parseFloat(editForm.geo_lat) : null,
        geo_lng: editForm.geo_lng ? parseFloat(editForm.geo_lng) : null,
      };
      await consumerService.update(id, payload);
      setShowEditModal(false);
      await fetchConsumerDetails();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update consumer details');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveBankLoan = async (e) => {
    e.preventDefault();
    try {
      setSavingLoan(true);
      await bankLoanService.createOrUpdate({
        consumer_id: id,
        ...loanForm,
      });
      setShowLoanModal(false);
      await fetchConsumerDetails();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save bank loan information');
    } finally {
      setSavingLoan(false);
    }
  };

  const handleDeactivateConsumer = async () => {
    if (!canManageDeactivation) {
      alert('Unauthorized: Only Admin and Document Team roles can deactivate consumer profiles.');
      return;
    }
    try {
      setDeactivating(true);
      await consumerService.deactivate(id);
      setShowDeactivateModal(false);
      await fetchConsumerDetails();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to deactivate consumer');
    } finally {
      setDeactivating(false);
    }
  };

  const handleActivateConsumer = async () => {
    if (!canManageDeactivation) {
      alert('Unauthorized: Only Admin and Document Team roles can activate consumer profiles.');
      return;
    }
    try {
      setActivating(true);
      await consumerService.activate(id);
      await fetchConsumerDetails();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to activate consumer profile');
    } finally {
      setActivating(false);
    }
  };

  const handleOpenTransferModal = async () => {
    try {
      setShowTransferModal(true);
      const res = await userService.getAll();
      const userList = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      // Exclude logged in user, current consumer owner, and inactive users
      const loggedUserId = user?.id || user?.userId;
      setAgents(
        userList.filter(
          (u) =>
            String(u.id) !== String(loggedUserId) &&
            String(u.id) !== String(consumer.created_by) &&
            u.is_active !== false
        )
      );
    } catch (err) {
      showError('Failed to load users for transfer.');
      setShowTransferModal(false);
    }
  };

  const handleInitiateTransfer = async (e) => {
    e.preventDefault();
    if (!transferForm.to_agent_id) return;
    try {
      setTransferring(true);
      await transferService.initiate({
        consumer_id: id,
        to_agent_id: transferForm.to_agent_id,
        remarks: transferForm.remarks
      });
      showSuccess('Transfer request sent successfully! Awaiting acceptance.');
      setShowTransferModal(false);
      setTransferForm({ to_agent_id: '', remarks: '' });
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to initiate transfer');
    } finally {
      setTransferring(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error || !consumer) {
    return (
      <div className="bg-rose-50 text-rose-800 p-6 rounded-2xl border border-rose-200 text-center space-y-4">
        <p className="font-semibold">{error || 'Consumer not found'}</p>
        <button onClick={() => navigate('/consumers')} className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-full">
          ← Back to Consumers
        </button>
      </div>
    );
  }

  const age = consumer.age || 0;
  const isSurpassedMAC = age > 64;
  const isDeactivated = consumer.is_active === false;

  return (
    <div className="space-y-6 pb-12">
      {/* Deactivated Consumer Status Alert Banner */}
      {isDeactivated && (
        <div className="p-6 bg-amber-50 rounded-[28px] border border-amber-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-[14px] bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xl shrink-0">
              <svg className="w-5 h-5 text-amber-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-amber-950">Consumer Profile is Currently Deactivated</h3>
              <p className="text-xs text-amber-900 mt-0.5">
                This consumer account is deactivated and hidden from regular views. All linked solar projects, DISCOM meter data, and bank loans remain 100% saved in the database.
              </p>
            </div>
          </div>

          {canManageDeactivation && (
            <button
              onClick={handleActivateConsumer}
              disabled={activating}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-full shadow-2xs transition shrink-0 flex items-center space-x-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{activating ? 'Activating...' : 'Activate Consumer Profile'}</span>
            </button>
          )}
        </div>
      )}

      {/* Profile Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-6 sm:p-8 rounded-[28px] shadow-sm border border-slate-200/80">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-extrabold text-slate-900">{consumer.full_name}</h1>
            <span className={`px-3 py-1 text-xs font-bold rounded-full ${consumer.payment_mode === 'cash' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : consumer.payment_mode === 'shriram_finance' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
              Payment: {consumer.payment_mode === 'bank_loan' ? 'PSU Bank Loan' : consumer.payment_mode === 'shriram_finance' ? 'Shriram Finance' : 'Cash'}
            </span>
            {isDeactivated && (
              <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-amber-100 text-amber-950 border border-amber-300">
                Deactivated
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Electric Consumer No: <span className="font-mono font-bold text-slate-900">{consumer.electric_consumer_no}</span> | Primary Phone: <span className="font-bold text-slate-900">{consumer.phone_primary}</span>
            {consumer.creator_first_name && (
              <> | Belongs To:{' '}
                <button
                  onClick={() => navigate(`/users?search=${encodeURIComponent(consumer.creator_first_name)}`)}
                  className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition"
                >
                  {consumer.creator_first_name} {consumer.creator_last_name} [{(consumer.creator_role || 'Agent').replace(/_/g, ' ').toUpperCase()}]
                </button>
              </>
            )}
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-2">
          <WhatsAppShareButton
            consumerName={consumer.full_name}
            phone={consumer.phone_primary}
            projectCode={linkedProject ? `PROJ-${linkedProject.id}` : 'SOLARISE'}
            statusName={linkedProject?.current_status || 'Registered'}
            capacityKw={linkedProject?.capacity_kw || 3}
          />
          <button
            onClick={() => setShowEditModal(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-full transition border border-slate-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Edit Profile</span>
          </button>

          {/* Transfer Action (Strictly visible ONLY to the owner user) */}
          {String(user?.id || user?.userId) === String(consumer.created_by) && (
            <button
              onClick={handleOpenTransferModal}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full transition border border-indigo-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span>Transfer</span>
            </button>
          )}

          {/* Deactivate / Activate Actions restricted to admin & doc_team */}
          {canManageDeactivation && (
            isDeactivated ? (
              <button
                onClick={handleActivateConsumer}
                disabled={activating}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-full transition shadow-2xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>{activating ? 'Activating...' : 'Activate Consumer'}</span>
              </button>
            ) : (
              <button
                onClick={() => setShowDeactivateModal(true)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-full transition border border-amber-300"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <span>Deactivate</span>
              </button>
            )
          )}

          <button
            onClick={() => navigate('/consumers')}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-full transition"
          >
            ← Back to Directory
          </button>
        </div>
      </div>

      {/* Linked Solar Project Banner */}
      <div className="bg-white p-6 rounded-[28px] shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-[14px] bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center font-bold text-lg shadow-2xs">
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Linked Solar Installation Project</h3>
            {linkedProject ? (
              <p className="text-xs text-slate-500 mt-0.5">
                Registration No: <span className="font-mono font-bold text-slate-800">{linkedProject.registration_no || `PROJ-${linkedProject.id}`}</span> | Capacity: <span className="font-bold text-emerald-600">{linkedProject.capacity_kw} kW</span> | Status: <span className="font-bold text-indigo-600 capitalize">{(linkedProject.current_status || '').replace(/_/g, ' ')}</span>
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-0.5">No active solar project registered under this consumer yet.</p>
            )}
          </div>
        </div>

        {linkedProject ? (
          <button
            onClick={() => navigate(`/projects/${linkedProject.id}`)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-full shadow-2xs transition"
          >
            View Project Details →
          </button>
        ) : (
          <button
            onClick={() => navigate('/projects/new')}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-full shadow-2xs transition"
          >
            + Register Solar Project
          </button>
        )}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal & Contact Person Details Card */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-[28px] shadow-sm border border-slate-200/80 space-y-6">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Consumer Personal & Contact Credentials</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-bold block">Full Name</span>
              <span className="text-slate-900 font-extrabold text-sm">{consumer.full_name}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">Assigned / Belongs To User</span>
              {consumer.creator_first_name ? (
                <button
                  onClick={() => navigate(`/users?search=${encodeURIComponent(consumer.creator_first_name)}`)}
                  className="text-indigo-600 hover:text-indigo-800 hover:underline font-extrabold flex items-center space-x-1 mt-0.5"
                >
                  <span>{consumer.creator_first_name} {consumer.creator_last_name} [{(consumer.creator_role || 'Agent').replace(/_/g, ' ').toUpperCase()}]</span>
                  <svg className="w-3.5 h-3.5 inline text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              ) : (
                <span className="text-slate-500 font-semibold">Unassigned</span>
              )}
            </div>
            <div>
              <span className="text-slate-400 font-bold block">Primary Phone</span>
              <span className="text-slate-900 font-semibold">{consumer.phone_primary}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">Secondary Phone</span>
              <span className="text-slate-900 font-semibold">{consumer.phone_secondary || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">Email Address</span>
              <span className="text-slate-900 font-semibold">{consumer.email || 'N/A'}</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-400 font-bold block">Full Installation Address</span>
              <span className="text-slate-900 font-medium">{consumer.address}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">Aadhaar Card No.</span>
              <span className="font-mono text-slate-900 font-bold">{consumer.aadhaar_no || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">PAN Card No.</span>
              <span className="font-mono text-slate-900 font-bold uppercase">{consumer.pan_no || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">Electric Bill Name</span>
              <span className="text-slate-900 font-semibold">{consumer.name_on_electric_bill}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">Occupation</span>
              <span className="capitalize text-slate-900 font-semibold">{(consumer.occupation || 'N/A').replace(/_/g, ' ')}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">Contact Person Name</span>
              <span className="text-slate-900 font-semibold">{consumer.contact_person_name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">Contact Person Phone & Relation</span>
              <span className="text-slate-900 font-semibold">{consumer.contact_person_phone ? `${consumer.contact_person_phone} (${consumer.contact_person_relation || 'Relation'})` : 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">GPS Coordinates (Lat / Lng)</span>
              <span className="font-mono text-slate-900 font-bold">
                {consumer.geo_lat && consumer.geo_lng ? `📍 ${consumer.geo_lat}, ${consumer.geo_lng}` : 'Not geotagged'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block">Property Ownership</span>
              <span className="text-slate-900 font-semibold">{consumer.land_owned_by_consumer ? 'Directly Owned Roof/Land' : 'Rented / Lease'}</span>
            </div>
          </div>
        </div>

        {/* Sidebar Cards: MAC Age & Bank Loan */}
        <div className="space-y-6">
          {/* MAC Rule Status */}
          <div className={`p-6 rounded-[28px] border ${isSurpassedMAC ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <h3 className={`text-sm font-extrabold flex items-center space-x-2 ${isSurpassedMAC ? 'text-rose-900' : 'text-emerald-900'}`}>
              <span>MAC Age Rule Evaluation</span>
            </h3>
            <div className="mt-2 text-xs space-y-1.5">
              <p className={isSurpassedMAC ? 'text-rose-800 font-bold' : 'text-emerald-800 font-bold'}>
                Consumer Age: <span>{age} years</span>
              </p>
              {isSurpassedMAC ? (
                <p className="text-rose-700 font-semibold">
                  ⚠️ Age &gt; 64 years: Surpassed MAC threshold! Co-applicant or Legal Heir NOC required for DISCOM clearance.
                </p>
              ) : (
                <p className="text-emerald-700 font-medium">
                  ✓ Standard MAC age rule passed (&le; 64 years).
                </p>
              )}
            </div>
          </div>

          {/* Bank Loan Details Card */}
          <div className="bg-white p-6 rounded-[28px] shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900">Bank Loan Information</h3>
              <button
                onClick={() => setShowLoanModal(true)}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
              >
                {bankLoan ? 'Edit Loan' : '+ Add Loan'}
              </button>
            </div>

            {bankLoan ? (
              <div className="text-xs space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Bank Name:</span>
                  <span className="font-extrabold text-slate-900">{bankLoan.bank_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Sanctioned Loan:</span>
                  <span className="font-extrabold text-emerald-700 font-mono text-sm">₹{parseFloat(bankLoan.loan_amount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Ghanbani Property:</span>
                  <span className="font-bold text-slate-800">{bankLoan.is_ghanbani_land ? 'Yes' : 'No'}</span>
                </div>
                {bankLoan.remarks && (
                  <p className="text-slate-500 pt-2 border-t border-slate-100 italic">{bankLoan.remarks}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No bank loan details recorded.</p>
            )}
          </div>
        </div>
      </div>

      {/* Uploaded Documents Grid */}
      <div className="bg-white p-6 sm:p-8 rounded-[28px] shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Uploaded Verification Documents ({documents.length})</span>
          </h2>
          <button
            onClick={() => navigate('/documents/upload', { state: { consumerId: consumer.id } })}
            className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold rounded-xl transition"
          >
            + Upload Document
          </button>
        </div>

        {documents.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No uploaded documents recorded for this consumer yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => navigate(`/documents/${doc.id}`)}
                className="p-4 bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition rounded-[20px] border border-slate-200/80 text-xs space-y-2 group"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 capitalize font-mono text-[11px] group-hover:text-emerald-700 transition">
                    {(doc.doc_type || '').replace(/_/g, ' ')}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold capitalize ${doc.status === 'verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                    {doc.status}
                  </span>
                </div>
                <p className="text-slate-500 font-mono text-[10px] truncate">{doc.file_name || doc.file_url || 'Document File'}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>v{doc.version || 1}</span>
                  <span>{new Date(doc.uploaded_at || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Consumer Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-slate-900">Edit Consumer Details</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveEditConsumer} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Primary Phone</label>
                  <input
                    type="text"
                    value={editForm.phone_primary}
                    onChange={(e) => setEditForm({ ...editForm, phone_primary: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Electric Consumer No.</label>
                  <input
                    type="text"
                    value={editForm.electric_consumer_no}
                    onChange={(e) => setEditForm({ ...editForm, electric_consumer_no: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Name on Electric Bill</label>
                  <input
                    type="text"
                    value={editForm.name_on_electric_bill}
                    onChange={(e) => setEditForm({ ...editForm, name_on_electric_bill: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Age</label>
                  <input
                    type="number"
                    value={editForm.age}
                    onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={editForm.payment_mode}
                    onChange={(e) => setEditForm({ ...editForm, payment_mode: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_loan">PSU Bank Loan</option>
                    <option value="shriram_finance">Shriram Finance</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Address</label>
                  <textarea
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    rows={2}
                    required
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-full"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-6 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-full hover:bg-emerald-700 disabled:opacity-50"
                >
                  {savingEdit ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Bank Loan Modal */}
      {showLoanModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">Bank Loan Information</h3>
            <form onSubmit={handleSaveBankLoan} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={loanForm.bank_name}
                  onChange={(e) => setLoanForm({ ...loanForm, bank_name: e.target.value })}
                  placeholder="e.g. State Bank of India"
                  required
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Loan Amount (₹)</label>
                <input
                  type="number"
                  value={loanForm.loan_amount}
                  onChange={(e) => setLoanForm({ ...loanForm, loan_amount: e.target.value })}
                  placeholder="e.g. 75000"
                  required
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200"
                />
              </div>

              <label className="flex items-center space-x-2 font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={loanForm.is_ghanbani_land}
                  onChange={(e) => setLoanForm({ ...loanForm, is_ghanbani_land: e.target.checked })}
                />
                <span>Is Ghanbani Land property?</span>
              </label>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLoanModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-full"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLoan}
                  className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-full hover:bg-emerald-700 disabled:opacity-50"
                >
                  {savingLoan ? 'Saving...' : 'Save Loan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Modal */}
      {showDeactivateModal && canManageDeactivation && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="h-12 w-12 rounded-[20px] bg-amber-100 text-amber-800 flex items-center justify-center mx-auto text-xl font-bold">
              🔒
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Deactivate Consumer Profile?</h3>
            <p className="text-xs text-slate-500">
              Deactivating <span className="font-bold text-slate-900">{consumer.full_name}</span> will hide this profile from regular users. All linked solar projects, DISCOM meter details, and bank loans remain <span className="font-bold text-slate-900">100% saved in PostgreSQL</span>. Authorized admins can activate them anytime.
            </p>
            <div className="flex justify-center space-x-3 pt-2">
              <button
                onClick={() => setShowDeactivateModal(false)}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-full"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivateConsumer}
                disabled={deactivating}
                className="px-5 py-2.5 bg-amber-700 text-white text-xs font-bold rounded-full hover:bg-amber-800 disabled:opacity-50"
              >
                {deactivating ? 'Deactivating...' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Consumer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span>Transfer Consumer Ownership</span>
            </h3>
            
            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 text-xs text-indigo-800 mb-2">
              Transferring <span className="font-bold">{consumer.full_name}</span> to another agent requires their acceptance.
            </div>

            <form onSubmit={handleInitiateTransfer} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Destination User *</label>
                <select
                  value={transferForm.to_agent_id}
                  onChange={(e) => setTransferForm({ ...transferForm, to_agent_id: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white"
                >
                  <option value="">-- Choose User / Role --</option>
                  {agents.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} [{ (u.role || '').replace(/_/g, ' ').toUpperCase() }] ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Transfer Remarks (Optional)</label>
                <textarea
                  value={transferForm.remarks}
                  onChange={(e) => setTransferForm({ ...transferForm, remarks: e.target.value })}
                  placeholder="Reason for transfer or notes for the receiving agent..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-full"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferring || !transferForm.to_agent_id}
                  className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 disabled:opacity-50"
                >
                  {transferring ? 'Sending Request...' : 'Initiate Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsumerDetailsPage;
