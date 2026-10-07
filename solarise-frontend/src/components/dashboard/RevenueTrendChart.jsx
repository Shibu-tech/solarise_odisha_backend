import React, { useState, useEffect } from 'react';
import { paymentService } from '../../services/api';

const RevenueTrendChart = () => {
  const [metrics, setMetrics] = useState({
    totalPaid: 0,
    totalPending: 0,
    paidCount: 0,
    pendingCount: 0,
    monthlyBreakdown: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentMetrics();
  }, []);

  const fetchPaymentMetrics = async () => {
    try {
      setLoading(true);
      const res = await paymentService.getAll();
      const payments = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];

      let totalPaid = 0;
      let totalPending = 0;
      let paidCount = 0;
      let pendingCount = 0;

      const monthMap = {};

      payments.forEach((p) => {
        const amt = parseFloat(p.amount) || 0;
        if (p.status === 'paid') {
          totalPaid += amt;
          paidCount += 1;

          const dateStr = p.paid_at || p.created_at;
          if (dateStr) {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              const monthKey = date.toLocaleString('en-US', { month: 'short' });
              monthMap[monthKey] = (monthMap[monthKey] || 0) + amt;
            }
          }
        } else {
          totalPending += amt;
          pendingCount += 1;
        }
      });

      const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonthIndex = new Date().getMonth();
      const startMonthIndex = Math.max(0, currentMonthIndex - 7);
      const displayMonths = allMonths.slice(startMonthIndex, currentMonthIndex + 1);

      const monthlyBreakdown = displayMonths.map((m) => ({
        month: m,
        amount: monthMap[m] || 0,
      }));

      setMetrics({
        totalPaid,
        totalPending,
        paidCount,
        pendingCount,
        monthlyBreakdown,
      });
    } catch (err) {
      console.error('Error fetching real revenue metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const points = metrics.monthlyBreakdown;
  const maxVal = Math.max(...points.map((p) => p.amount), 1000);
  const chartHeight = 110;
  const chartWidth = 320;

  const getX = (index) => (points.length > 1 ? (index / (points.length - 1)) * chartWidth : chartWidth / 2);
  const getY = (amount) => chartHeight - (amount / maxVal) * (chartHeight - 20) - 10;

  const pathD = points.reduce((acc, point, i) => {
    const x = getX(i);
    const y = getY(point.amount);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const areaD = points.length > 0
    ? `${pathD} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`
    : '';

  return (
    <div className="bg-white p-6 sm:p-8 rounded-[28px] border border-slate-200/80 shadow-sm h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-200/60 flex items-center justify-center font-bold text-sm shadow-2xs">
              <svg className="w-4 h-4 text-cyan-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Revenue & Collections</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">Live financial clearances & consumer payment ledgers</p>
        </div>

        <span className="text-xs font-mono font-bold px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full shadow-2xs">
          ₹{metrics.totalPaid.toLocaleString('en-IN')} Paid
        </span>
      </div>

      {/* Analytics Summary Badges */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-3.5 bg-slate-50 rounded-[20px] border border-slate-200/60">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Collected Revenue</span>
          <p className="text-lg font-extrabold text-emerald-700 mt-0.5 font-mono">
            ₹{metrics.totalPaid.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-500 font-medium">
            {metrics.paidCount} cleared payment records
          </span>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-[20px] border border-slate-200/60">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pending Collections</span>
          <p className="text-lg font-extrabold text-amber-700 mt-0.5 font-mono">
            ₹{metrics.totalPending.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-500 font-medium">
            {metrics.pendingCount} pending approvals
          </span>
        </div>
      </div>

      {/* SVG Smooth Area Wave Curve Chart in Light Theme */}
      <div className="pt-1">
        {loading ? (
          <div className="h-28 flex items-center justify-center">
            <p className="text-xs text-slate-400 font-mono">Calculating revenue trend lines...</p>
          </div>
        ) : (
          <div className="w-full overflow-hidden">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-28 overflow-visible">
              <defs>
                <linearGradient id="areaGradientLight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="lineGradientLight" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0284c7" />
                  <stop offset="50%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
              </defs>

              {/* Area Fill */}
              {points.length > 0 && (
                <path d={areaD} fill="url(#areaGradientLight)" />
              )}

              {/* Line Path */}
              {points.length > 0 && (
                <path d={pathD} fill="none" stroke="url(#lineGradientLight)" strokeWidth="3" strokeLinecap="round" />
              )}

              {/* Data Node Dots */}
              {points.map((p, i) => (
                <circle
                  key={i}
                  cx={getX(i)}
                  cy={getY(p.amount)}
                  r="4.5"
                  className="fill-white stroke-emerald-600 stroke-2 hover:r-6 transition-all cursor-pointer shadow-xs"
                >
                  <title>{`${p.month}: ₹${p.amount.toLocaleString('en-IN')}`}</title>
                </circle>
              ))}
            </svg>
          </div>
        )}

        {/* X-Axis Months */}
        <div className="flex justify-between items-center pt-2 text-[10px] font-mono text-slate-400 border-t border-slate-100">
          {points.map((p, i) => (
            <span key={i}>{p.month}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RevenueTrendChart;
