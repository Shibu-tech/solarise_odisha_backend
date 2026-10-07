import React, { useState, useEffect } from 'react';
import { projectService } from '../../services/api';

const STAGE_CATEGORIES = [
  {
    id: 'registration',
    label: 'Registration & Docs',
    statuses: ['new_registration', 'doc_verification', 'feasibility_approved'],
    color: 'from-blue-500 to-indigo-500',
    bgColor: 'bg-blue-50 text-blue-700',
  },
  {
    id: 'materials',
    label: 'Line-Up & Delivery',
    statuses: ['line_up_given', 'materials_delivered'],
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-50 text-amber-700',
  },
  {
    id: 'installation',
    label: 'Installation Progress',
    statuses: ['installation_in_progress', 'installation_done', 'installation_uploaded_pmsgy'],
    color: 'from-purple-500 to-violet-500',
    bgColor: 'bg-purple-50 text-purple-700',
  },
  {
    id: 'net_metering',
    label: 'Net Metering & Desk',
    statuses: ['net_metering_applied', 'net_metering_rts_pending', 'inspection_report_submitted', 'service_released', 'meter_installed'],
    color: 'from-cyan-500 to-teal-500',
    bgColor: 'bg-cyan-50 text-cyan-700',
  },
  {
    id: 'commissioned',
    label: 'Commissioned & CFA',
    statuses: ['project_commissioned', 'subsidy_disbursed_cfa', 'subsidy_disbursed_sfa', 'project_handed_over'],
    color: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-50 text-emerald-700',
  },
];

const PipelineChart = () => {
  const [stageCounts, setStageCounts] = useState({
    registration: 0,
    materials: 0,
    installation: 0,
    net_metering: 0,
    commissioned: 0,
  });
  const [totalProjects, setTotalProjects] = useState(0);
  const [hoveredStage, setHoveredStage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPipelineData();
  }, []);

  const fetchPipelineData = async () => {
    try {
      setLoading(true);
      const res = await projectService.getAll();
      const projects = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      setTotalProjects(projects.length);

      const counts = {
        registration: 0,
        materials: 0,
        installation: 0,
        net_metering: 0,
        commissioned: 0,
      };

      projects.forEach((proj) => {
        const st = proj.current_status || 'new_registration';
        STAGE_CATEGORIES.forEach((cat) => {
          if (cat.statuses.includes(st)) {
            counts[cat.id] = (counts[cat.id] || 0) + 1;
          }
        });
      });

      setStageCounts(counts);
    } catch (err) {
      console.error('Error fetching pipeline chart data:', err);
    } finally {
      setLoading(false);
    }
  };

  const maxCount = Math.max(...Object.values(stageCounts), 1);

  return (
    <div className="bg-white p-6 sm:p-8 rounded-[28px] border border-slate-200/80 shadow-sm h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 mb-6 gap-2">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center font-bold text-sm shadow-2xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Project Pipeline Lifecycle</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">Live distribution of active projects across 5 installation stages</p>
        </div>

        <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200 text-xs font-bold shadow-2xs">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{totalProjects} Active Projects</span>
        </div>
      </div>

      {/* SVG & Bar Chart Grid */}
      {loading ? (
        <div className="h-56 flex items-center justify-center">
          <p className="text-xs text-slate-400 animate-pulse font-medium">Loading pipeline metrics...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-3 items-end h-52 pt-6 border-b border-slate-100 px-1">
            {STAGE_CATEGORIES.map((cat) => {
              const count = stageCounts[cat.id] || 0;
              const heightPercent = Math.max(Math.round((count / maxCount) * 100), 12);
              const percentageOfTotal = totalProjects > 0 ? Math.round((count / totalProjects) * 100) : 0;
              const isHovered = hoveredStage === cat.id;

              return (
                <div
                  key={cat.id}
                  onMouseEnter={() => setHoveredStage(cat.id)}
                  onMouseLeave={() => setHoveredStage(null)}
                  className="flex flex-col items-center h-full justify-end group cursor-pointer"
                >
                  {/* Tooltip on Top */}
                  <div className={`mb-2 text-center transition-all duration-200 ${isHovered ? 'scale-110 -translate-y-1' : ''}`}>
                    <span className="block font-extrabold text-sm text-slate-900">
                      {count}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {percentageOfTotal}%
                    </span>
                  </div>

                  {/* Android Material Gradient Bar */}
                  <div className="w-full max-w-[44px] bg-slate-100/80 rounded-t-2xl overflow-hidden p-1 border border-slate-200/50 relative flex items-end h-full shadow-inner">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-xl bg-gradient-to-t ${cat.color} transition-all duration-500 relative shadow-sm group-hover:brightness-110`}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Labels Row */}
          <div className="grid grid-cols-5 gap-2 text-center pt-2">
            {STAGE_CATEGORIES.map((cat) => (
              <div key={cat.id} className="px-0.5">
                <span className="block text-[11px] font-bold text-slate-800 truncate">
                  {cat.label}
                </span>
                <span className="text-[10px] text-slate-400 font-medium block">
                  {stageCounts[cat.id] || 0} Records
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineChart;
