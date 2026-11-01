import React from 'react';
import { useNavigate } from 'react-router-dom';

const actions = [
  {
    id: 1,
    title: 'Register Consumer',
    description: 'Add new consumer with details',
    icon: 'user-plus',
    iconBg: 'bg-blue-50 text-blue-600 border-blue-200/80',
    path: '/consumers/new',
  },
  {
    id: 2,
    title: 'Add project',
    description: 'Register consumer & project pipeline',
    icon: 'plus',
    iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/80',
    path: '/projects/new',
  },
  {
    id: 3,
    title: 'Document Desk',
    description: 'Upload & verify geotagged photos',
    icon: 'upload',
    iconBg: 'bg-purple-50 text-purple-600 border-purple-200/80',
    path: '/documents',
  },
  {
    id: 4,
    title: 'Record Payment',
    description: 'Process DISCOM & loan payments',
    icon: 'credit-card',
    iconBg: 'bg-amber-50 text-amber-600 border-amber-200/80',
    path: '/payments',
  },
];

const QuickActions = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-white p-6 rounded-[28px] border border-slate-200/80 shadow-sm h-full flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center font-bold text-sm shadow-2xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Quick Action Hub</h3>
          </div>
          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            Shortcuts
          </span>
        </div>

        {/* Action Grid Items */}
        <div className="space-y-3">
          {actions.map((action) => (
            <div
              key={action.id}
              onClick={() => navigate(action.path)}
              className="p-3.5 bg-slate-50/80 hover:bg-emerald-50/60 transition-all duration-200 rounded-[20px] border border-slate-200/60 hover:border-emerald-300 flex items-center justify-between cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center space-x-3.5">
                <div className={`h-10 w-10 rounded-[14px] ${action.iconBg} border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs`}>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d={action.icon === 'plus' ? 'M12 4v16m8-8H4' :
                        action.icon === 'user-plus' ? 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' :
                          action.icon === 'upload' ? 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' :
                            'M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'} />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition">
                    {action.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">{action.description}</p>
                </div>
              </div>

              <div className="h-7 w-7 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 group-hover:border-emerald-300 transition text-xs font-bold shadow-2xs">
                →
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 mt-4 text-center">
        <span className="text-[10px] text-slate-400 font-mono font-medium">
          Solarise Operations Platform • Android Material 3
        </span>
      </div>
    </div>
  );
};

export default QuickActions;