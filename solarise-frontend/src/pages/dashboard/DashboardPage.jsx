import React from 'react';
import StatsGrid from '../../components/dashboard/StatsGrid';
import PipelineChart from '../../components/dashboard/PipelineChart';
import RevenueTrendChart from '../../components/dashboard/RevenueTrendChart';
import RecentActivity from '../../components/dashboard/RecentActivity';
import QuickActions from '../../components/dashboard/QuickActions';
import IncomingTransfers from '../../components/dashboard/IncomingTransfers';
import CorrectionAlertBanner from '../../components/dashboard/CorrectionAlertBanner';

const DashboardPage = () => {
  return (
    <div className="space-y-6 bg-slate-50/70 p-4 sm:p-8 rounded-[32px] min-h-screen text-slate-900 font-sans border border-slate-200/80 shadow-sm relative overflow-hidden">
      {/* Subtle Android Material Mesh Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40"></div>

      {/* Android Material You Top Header */}
      <header className="relative z-10 bg-white/90 backdrop-blur-md p-6 sm:p-8 rounded-[28px] border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            {/* Android Squircle Logo Icon */}
            <div className="h-12 w-12 rounded-[20px] bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-0.5 shadow-md shadow-emerald-500/10">
              <div className="h-full w-full bg-white rounded-[18px] flex items-center justify-center text-emerald-600 shadow-inner">
                <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Solarise <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600">Dashboard</span>
              </h1>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                PM-SURYA GHAR: MUFT BIJLI YOJANA • ODISHA STATE OPERATIONS
              </p>
            </div>
          </div>
        </div>

        {/* Android Material Pill Badge */}
        <div className="flex items-center space-x-3 bg-slate-100/80 p-2 px-4 rounded-full border border-slate-200/80">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
            </span>
            <span className="text-xs font-bold text-slate-700 tracking-wide">SYSTEM ONLINE</span>
          </div>
          <span className="text-slate-300">|</span>
          <span className="text-xs font-mono font-bold text-emerald-700">
            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </header>

      {/* Workflow Alerts: Document Corrections & Verification Queue */}
      <section className="relative z-10">
        <CorrectionAlertBanner />
      </section>

      {/* 0. Incoming Transfers Alert */}
      <section className="relative z-10">
        <IncomingTransfers />
      </section>

      {/* 1. Top Section: Android Material 3 Stats Grid */}
      <section className="relative z-10">
        <StatsGrid />
      </section>

      {/* 2. Interactive Charts Section (Visual Graphs in Light Mode) */}
      <section className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PipelineChart />
        <RevenueTrendChart />
      </section>

      {/* 3. Bottom Bento Grid: Activity Feed & Quick Action Hub */}
      <section className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
        <div className="lg:col-span-1">
          <QuickActions />
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;