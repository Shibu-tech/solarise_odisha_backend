import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { consumerService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ConsumersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [consumers, setConsumers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Search & Tab Filter States ('active' vs 'deactivated')
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'deactivated'
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [macFilter, setMacFilter] = useState('all');

  const canManageDeactivation = ['admin', 'doc_team'].includes(user?.role);

  useEffect(() => {
    fetchConsumers();
  }, []);

  const fetchConsumers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await consumerService.getAll();
      const data = res.data?.data || res.data;
      if (Array.isArray(data)) {
        setConsumers(data);
      } else {
        setConsumers([]);
      }
    } catch (err) {
      console.error('API error fetching consumers:', err);
      setError(err.response?.data?.error || 'Could not connect to backend server');
      setConsumers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateConsumer = async (e, id) => {
    e.stopPropagation();
    if (!canManageDeactivation) return;
    try {
      setActionLoadingId(id);
      await consumerService.activate(id);
      await fetchConsumers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to activate consumer');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeactivateConsumer = async (e, id) => {
    e.stopPropagation();
    if (!canManageDeactivation) return;
    if (!window.confirm('Are you sure you want to deactivate this consumer profile? It will be hidden from regular views.')) return;
    try {
      setActionLoadingId(id);
      await consumerService.deactivate(id);
      await fetchConsumers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to deactivate consumer');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Helper to check deactivation status
  const isConsumerDeactivated = (c) => c.is_active === false;

  const filteredConsumers = consumers.filter((c) => {
    const isDeactivated = isConsumerDeactivated(c);

    // If regular user (agent/site_manager), NEVER show deactivated consumers
    if (!canManageDeactivation && isDeactivated) return false;

    // Filter by Tab (Admin / Doc Team views)
    if (activeTab === 'active' && isDeactivated) return false;
    if (activeTab === 'deactivated' && !isDeactivated) return false;

    // Filter by Search Term
    const matchesSearch =
      (c.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone_primary || '').includes(searchTerm) ||
      (c.electric_consumer_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.aadhaar_no || '').includes(searchTerm);

    // Filter by Payment Mode
    const matchesPayment = paymentFilter === 'all' || c.payment_mode === paymentFilter;

    // Filter by MAC Age Threshold
    const age = c.age || 0;
    const isSurpassedMAC = age > 64;
    const matchesMAC =
      macFilter === 'all'
        ? true
        : macFilter === 'surpassed'
          ? isSurpassedMAC
          : !isSurpassedMAC;

    return matchesSearch && matchesPayment && matchesMAC;
  });

  // Calculate Stat Summaries
  const activeCount = consumers.filter((c) => !isConsumerDeactivated(c)).length;
  const deactivatedCount = consumers.filter((c) => isConsumerDeactivated(c)).length;
  const macSurpassedCount = consumers.filter((c) => (c.age || 0) > 64 && !isConsumerDeactivated(c)).length;

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Main Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Consumer Directory</h1>
          <p className="text-xs text-slate-500 mt-1">Manage consumer profiles, DISCOM connections, and active status governance</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="primary"
            onClick={() => navigate('/consumers/new')}
            className="px-5 py-2.5 text-xs font-bold rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
          >
            + Register New Consumer
          </Button>
        </div>
      </div>

      {/* Android Material Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab('active')}
          className={`p-5 rounded-[24px] border shadow-2xs cursor-pointer transition ${activeTab === 'active' ? 'bg-emerald-50/60 border-emerald-300 ring-2 ring-emerald-500/20' : 'bg-white border-slate-200/80 hover:border-slate-300'
            }`}
        >
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-mono">Active Consumers</span>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1 font-mono">{activeCount}</p>
          <span className="text-[10px] text-emerald-600 font-bold mt-0.5 block">Visible operational accounts</span>
        </div>

        {/* DEACTIVATED CONSUMERS CARD (ADMIN / DOC_TEAM ONLY) */}
        {canManageDeactivation ? (
          <div
            onClick={() => setActiveTab('deactivated')}
            className={`p-5 rounded-[24px] border shadow-2xs cursor-pointer transition relative overflow-hidden ${activeTab === 'deactivated' ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20' : 'bg-white border-slate-200/80 hover:border-slate-300'
              }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-mono">Deactivated Accounts</span>
              {deactivatedCount > 0 && (
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
              )}
            </div>
            <p className="text-2xl font-extrabold text-amber-700 mt-1 font-mono">{deactivatedCount}</p>
            <span className="text-[10px] text-amber-800 font-bold mt-0.5 block">Hidden from public • Re-activatable</span>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-[24px] border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-mono">Account Status</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">Verified</p>
            <span className="text-[10px] text-emerald-600 font-bold mt-0.5 block">Active DISCOM accounts</span>
          </div>
        )}

        <div className="bg-white p-5 rounded-[24px] border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-mono">Surpassed MAC (&gt;64y)</span>
          <p className="text-2xl font-extrabold text-rose-600 mt-1 font-mono">{macSurpassedCount}</p>
          <span className="text-[10px] text-rose-500 font-bold mt-0.5 block">Co-applicant NOC required</span>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-mono">Data Security</span>
          <p className="text-2xl font-extrabold text-indigo-700 mt-1 font-mono">Saved</p>
          <span className="text-[10px] text-indigo-600 font-bold mt-0.5 block">Projects & loans preserved</span>
        </div>
      </div>

      {/* PROMINENT NAVIGATION TABS FOR ADMIN & DOC_TEAM */}
      {canManageDeactivation && (
        <div className="flex items-center space-x-2 border-b border-slate-200/80 pb-1">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-5 py-2.5 text-xs font-extrabold rounded-full transition flex items-center space-x-2 ${activeTab === 'active'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Active Consumers ({activeCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('deactivated')}
            className={`px-5 py-2.5 text-xs font-extrabold rounded-full transition flex items-center space-x-2 ${activeTab === 'deactivated'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200/80'
              }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Deactivated Consumers ({deactivatedCount})</span>
            {deactivatedCount > 0 && (
              <span className="px-2 py-0.5 bg-amber-200 text-amber-950 text-[10px] font-bold rounded-full">
                {deactivatedCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* DEACTIVATED ACCOUNTS EXPLANATORY BANNER */}
      {activeTab === 'deactivated' && canManageDeactivation && (
        <div className="p-5 bg-amber-50/90 rounded-[24px] border border-amber-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-[16px] bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xl shrink-0">
              🔒
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-amber-950">Deactivated Consumers Archive</h3>
              <p className="text-xs text-amber-900 mt-0.5">
                These consumer accounts are deactivated and hidden from regular users. All linked solar projects, DISCOM records, and bank loans are 100% saved in PostgreSQL. Click <strong>"⚡ Activate Consumer"</strong> to make a consumer active and visible to everyone.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search & Sub-Filter Bar */}
      <div className="bg-white p-4 rounded-[24px] border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={activeTab === 'deactivated' ? "Search deactivated records..." : "Search active consumers by name, phone, or electric consumer no..."}
            className="w-full pl-9 pr-4 py-2.5 rounded-full border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Payment Mode Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3.5 py-2 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700"
          >
            <option value="all">All Payment Modes</option>
            <option value="cash">Cash Only</option>
            <option value="bank_loan">PSU Bank Loan Only</option>
            <option value="shriram_finance">Shriram Finance Only</option>
          </select>

          {/* MAC Age Filter */}
          <select
            value={macFilter}
            onChange={(e) => setMacFilter(e.target.value)}
            className="px-3.5 py-2 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700"
          >
            <option value="all">All MAC Ages</option>
            <option value="standard">Standard MAC (&le;64y)</option>
            <option value="surpassed">Surpassed MAC (&gt;64y)</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 text-amber-800 p-4 rounded-2xl border border-amber-200 text-xs flex items-center justify-between font-semibold shadow-2xs">
          <span>⚠️ {error}</span>
          <button onClick={fetchConsumers} className="underline text-amber-900 font-bold ml-4">Retry Connection</button>
        </div>
      )}

      {/* Consumer Data Table */}
      <div className="bg-white rounded-[28px] shadow-sm border border-slate-200/80 overflow-hidden">
        {filteredConsumers.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="h-12 w-12 rounded-[20px] bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 text-xl font-bold">
              {activeTab === 'deactivated' ? '🔒' : '👤'}
            </div>
            <h3 className="text-base font-extrabold text-slate-900">
              {activeTab === 'deactivated' ? 'No Deactivated Consumers' : 'No Active Consumers Found'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {activeTab === 'deactivated'
                ? 'There are currently no deactivated consumer records.'
                : 'No consumer profiles match your search criteria.'}
            </p>
            {activeTab === 'active' && (
              <div className="mt-4">
                <Button variant="primary" onClick={() => navigate('/consumers/new')} className="text-xs font-bold rounded-full bg-emerald-600">
                  + Register First Consumer
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Table>
            <Table.Header>
              <Table.HeaderCell>Full Name & Phone</Table.HeaderCell>
              <Table.HeaderCell>Electric Consumer No.</Table.HeaderCell>
              <Table.HeaderCell>Assigned Owner</Table.HeaderCell>
              <Table.HeaderCell>Address</Table.HeaderCell>
              <Table.HeaderCell>MAC Rule Evaluation</Table.HeaderCell>
              <Table.HeaderCell>Payment Mode</Table.HeaderCell>
              <Table.HeaderCell>Actions</Table.HeaderCell>
            </Table.Header>
            <Table.Body>
              {filteredConsumers.map((c) => {
                const age = c.age || 0;
                const isSurpassedMAC = age > 64;
                const isDeactivated = isConsumerDeactivated(c);
                return (
                  <Table.Row
                    key={c.id}
                    onClick={() => navigate(`/consumers/${c.id}`)}
                    className={`cursor-pointer hover:bg-slate-100/70 transition-colors border-b border-slate-200/90 ${isDeactivated ? 'bg-amber-50/40 hover:bg-amber-100/60' : ''}`}
                  >
                    <Table.Cell>
                      <div className="font-extrabold text-slate-900 text-xs flex items-center space-x-2 group-hover:text-emerald-700">
                        <span className="hover:underline font-extrabold text-slate-900">{c.full_name}</span>
                        {isDeactivated && (
                          <span className="px-2 py-0.5 text-[9px] font-extrabold bg-amber-200/80 text-amber-950 rounded-full border border-amber-300 font-mono">
                            Deactivated
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">{c.phone_primary}</div>
                    </Table.Cell>

                    <Table.Cell>
                      <span className="font-mono font-extrabold text-slate-900 text-xs">{c.electric_consumer_no || 'N/A'}</span>
                    </Table.Cell>

                    <Table.Cell>
                      {c.creator_first_name ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/users?search=${encodeURIComponent(c.creator_first_name)}`);
                          }}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center space-x-1"
                        >
                          <span>{c.creator_first_name} {c.creator_last_name}</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Unassigned</span>
                      )}
                    </Table.Cell>

                    <Table.Cell>
                      <p className="text-xs text-slate-600 truncate max-w-xs">{c.address}</p>
                    </Table.Cell>

                    <Table.Cell>
                      <div className="flex items-center space-x-1.5">
                        <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${isSurpassedMAC
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                          {age} yrs • {isSurpassedMAC ? 'Surpassed MAC' : 'Standard'}
                        </span>
                      </div>
                    </Table.Cell>

                    <Table.Cell>
                      <span className={`px-2.5 py-0.5 text-[10px] rounded-full font-extrabold border ${c.payment_mode === 'cash'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : c.payment_mode === 'shriram_finance'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                        {c.payment_mode === 'bank_loan' ? 'PSU Bank Loan' : c.payment_mode === 'shriram_finance' ? 'Shriram Finance' : 'Cash'}
                      </span>
                    </Table.Cell>

                    <Table.Cell>
                      <div className="flex items-center space-x-2">
                        {/* ACTIVATE / DEACTIVATE BUTTONS FOR ADMIN / DOC_TEAM */}
                        {canManageDeactivation && (
                          isDeactivated ? (
                            <button
                              onClick={(e) => handleActivateConsumer(e, c.id)}
                              disabled={actionLoadingId === c.id}
                              className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-full shadow-2xs transition flex items-center space-x-1"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              <span>{actionLoadingId === c.id ? 'Activating...' : 'Activate'}</span>
                            </button>
                          ) : (
                            <button
                              onClick={(e) => handleDeactivateConsumer(e, c.id)}
                              disabled={actionLoadingId === c.id}
                              className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-full border border-amber-300 transition flex items-center space-x-1"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                              <span>{actionLoadingId === c.id ? 'Deactivating...' : 'Deactivate'}</span>
                            </button>
                          )
                        )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>
        )}
      </div>
    </div>
  );
};

export default ConsumersPage;