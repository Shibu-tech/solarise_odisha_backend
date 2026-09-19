import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const roleColorMap = {
  admin: 'bg-rose-50 text-rose-700 border-rose-200',
  agent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  site_manager: 'bg-blue-50 text-blue-700 border-blue-200',
  doc_team: 'bg-purple-50 text-purple-700 border-purple-200',
  accounts: 'bg-amber-50 text-amber-700 border-amber-200',
};

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [correctionCount, setCorrectionCount] = useState(0);
  const [verificationCount, setVerificationCount] = useState(0);

  const role = user?.role || 'agent';
  const firstName = user?.first_name || user?.firstName || 'User';
  const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.firstName || 'Authorized User';
  const firstLetter = (firstName || 'U').charAt(0).toUpperCase();

  useEffect(() => {
    let isMounted = true;

    const fetchCounts = async () => {
      try {
        if (role === 'agent' || role === 'admin') {
          const res = await api.get('/actions/my-open-actions').catch(() => null);
          if (res?.data?.data && isMounted) {
            const corrections = res.data.data.filter(a =>
              ['open', 'doc_uploaded'].includes(a.status) &&
              ['electric_bill_name_correction', 'bank_passbook_name_correction', 'bank_passbook_update', 'ownership_transfer', 'commercial_to_domestic', 'other'].includes(a.action_type)
            );
            setCorrectionCount(corrections.length);
          }
        }
        if (role === 'doc_team' || role === 'admin') {
          const res = await api.get('/documents/verification-queue').catch(() => null);
          if (res?.data?.data && isMounted) {
            setVerificationCount(res.data.data.length);
          }
        }
      } catch { /* silent error */ }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [role, user?.id]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getMenuItems = () => {
    const allItems = [
      {
        name: 'Dashboard',
        path: '/',
        roles: ['admin', 'agent', 'site_manager', 'doc_team', 'accounts'],
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
      },
      {
        name: 'Projects',
        path: '/projects',
        roles: ['admin', 'agent', 'site_manager', 'doc_team', 'accounts'],
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        ),
      },
      {
        name: 'Consumers',
        path: '/consumers',
        roles: ['admin', 'agent', 'doc_team'],
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
      },
      {
        name: 'Pending Corrections',
        path: '/pending-corrections',
        roles: ['agent', 'admin'],
        badge: correctionCount,
        badgeColor: 'bg-amber-500',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
      },
      {
        name: 'Verification Queue',
        path: '/verification-queue',
        roles: ['admin', 'doc_team'],
        badge: verificationCount,
        badgeColor: 'bg-blue-600',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        ),
      },
      {
        name: 'Documents Desk',
        path: '/documents',
        roles: ['admin', 'doc_team', 'site_manager'],
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
      {
        name: 'Payments & Subsidies',
        path: '/payments',
        roles: ['admin', 'accounts'],
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        ),
      },
      {
        name: 'Area Blocks',
        path: '/area-blocks',
        roles: ['admin', 'agent', 'site_manager', 'doc_team', 'accounts'],
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
      {
        name: 'User Management',
        path: '/users',
        roles: ['admin', 'doc_team', 'site_manager', 'accounts', 'agent'],
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ),
      },
    ];

    if (role === 'admin') return allItems;
    return allItems.filter((item) => item.roles.includes(role));
  };

  const menuItems = getMenuItems();

  const renderContent = () => (
    <div className="flex flex-col justify-between h-full bg-white">
      <div className="p-5 sm:p-6 overflow-y-auto flex-1">
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 leading-tight">SOLARISE ODISHA</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">PM Surya Ghar Portal</p>
            </div>
          </div>

          {/* Close button on mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              title="Close menu"
            >
              ✕
            </button>
          )}
        </div>

        {/* Dynamic Role-Based Navigation */}
        <nav className="space-y-1.5">
          <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Navigation Menu ({role.replace(/_/g, ' ')})
          </div>
          {menuItems.map((item, index) => (
            <NavLink
              key={index}
              to={item.path}
              end
              onClick={() => onClose && onClose()}
              className={({ isActive }) => `
                flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all
                ${isActive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }
              `}
            >
              <div className="flex items-center space-x-3 truncate">
                <span className="text-base shrink-0">{item.icon}</span>
                <span className="capitalize truncate">{item.name}</span>
              </div>
              {item.badge > 0 && (
                <span className={`ml-2 px-2 py-0.5 text-[10px] font-extrabold text-white rounded-full shrink-0 ${item.badgeColor || 'bg-rose-500'}`}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User Account / Role Card with First Letter Logo & Logout Icon */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="h-9 w-9 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-extrabold text-sm shadow-2xs shrink-0 font-mono">
                {firstLetter}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-extrabold text-slate-900 truncate" title={fullName}>
                  {firstName}
                </p>
                <span className={`inline-block px-2 py-0.5 mt-0.5 text-[9px] font-extrabold rounded-full border uppercase tracking-wider ${roleColorMap[role] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  {role.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0 border border-transparent hover:border-rose-100"
              title="Logout from portal"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="w-64 border-r border-slate-200/80 hidden md:flex flex-col h-screen sticky top-0 shrink-0 z-30">
        {renderContent()}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          ></div>

          {/* Slide-in Drawer */}
          <div className="relative w-72 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col z-50 transform transition-transform duration-300">
            {renderContent()}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;