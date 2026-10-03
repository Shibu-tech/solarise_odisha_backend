import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'error', title = null, duration = 4500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);

    let defaultTitle = 'Notice';
    if (type === 'error') defaultTitle = 'Application Error';
    if (type === 'success') defaultTitle = 'Success';
    if (type === 'warning') defaultTitle = 'Warning';
    if (type === 'info') defaultTitle = 'Information';

    const newToast = {
      id,
      message: message || 'An unexpected error occurred.',
      type,
      title: title || defaultTitle,
      duration,
    };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showError = useCallback((msg, title = 'Application Error') => addToast(msg, 'error', title), [addToast]);
  const showSuccess = useCallback((msg, title = 'Success') => addToast(msg, 'success', title), [addToast]);
  const showWarning = useCallback((msg, title = 'Warning') => addToast(msg, 'warning', title), [addToast]);
  const showInfo = useCallback((msg, title = 'Information') => addToast(msg, 'info', title), [addToast]);

  // Global listener for automatic backend error toasts dispatched by Axios interceptor
  useEffect(() => {
    const handleGlobalToast = (event) => {
      if (event.detail) {
        const { message, type, title, duration } = event.detail;
        // Suppress benign auth token expiration messages from popping up
        if (
          typeof message === 'string' &&
          (message.toLowerCase().includes('invalid or expired token') ||
            message.toLowerCase().includes('authorization token missing') ||
            message.toLowerCase().includes('jwt expired'))
        ) {
          return;
        }
        addToast(message, type || 'error', title, duration);
      }
    };
    window.addEventListener('app:toast', handleGlobalToast);
    return () => window.removeEventListener('app:toast', handleGlobalToast);
  }, [addToast]);

  // Intercept native window.alert calls globally & redirect them to Toast Cards
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg) => {
      if (msg) {
        const messageStr = String(msg);
        const type = messageStr.startsWith('✓') ? 'success' : messageStr.toLowerCase().includes('failed') || messageStr.toLowerCase().includes('error') ? 'error' : 'warning';
        addToast(messageStr.replace(/^✓\s*/, ''), type, 'System Notice');
      }
    };
    return () => {
      window.alert = originalAlert;
    };
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, showError, showSuccess, showWarning, showInfo }}>
      {children}

      {/* Floating Toast Notification Container (Top Right) */}
      <div className="fixed top-4 right-4 z-9999 flex flex-col space-y-3 max-w-sm w-full pointer-events-none px-2 sm:px-0">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Individual Toast Card Component with glassmorphic design and animations
const ToastCard = ({ toast, onClose }) => {
  const { type, title, message } = toast;

  const typeStyles = {
    error: {
      bg: 'bg-white/95 border-rose-200 text-slate-900 shadow-rose-500/10 ring-1 ring-rose-500/20',
      iconBg: 'bg-rose-500 text-white',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
      barBg: 'bg-rose-500',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.778-1.34-2.694-1.34-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    success: {
      bg: 'bg-white/95 border-emerald-200 text-slate-900 shadow-emerald-500/10 ring-1 ring-emerald-500/20',
      iconBg: 'bg-emerald-500 text-white',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      barBg: 'bg-emerald-500',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    warning: {
      bg: 'bg-white/95 border-amber-200 text-slate-900 shadow-amber-500/10 ring-1 ring-amber-500/20',
      iconBg: 'bg-amber-500 text-white',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      barBg: 'bg-amber-500',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    info: {
      bg: 'bg-white/95 border-blue-200 text-slate-900 shadow-blue-500/10 ring-1 ring-blue-500/20',
      iconBg: 'bg-blue-500 text-white',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
      barBg: 'bg-blue-500',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  };

  const style = typeStyles[type] || typeStyles.error;

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border p-4 shadow-xl backdrop-blur-xl transition-all duration-300 transform translate-y-0 opacity-100 animate-slide-in ${style.bg}`}
    >
      <div className="flex items-start space-x-3">
        {/* Type Icon Badge */}
        <div className={`p-2 rounded-xl shrink-0 ${style.iconBg} shadow-sm`}>
          {style.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-slate-900 tracking-tight">{title}</h4>
            <span className={`text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full border ${style.badgeBg}`}>
              {type}
            </span>
          </div>
          <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed break-words">
            {message}
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 text-sm p-1 transition rounded-lg hover:bg-slate-100 shrink-0 focus:outline-none"
          title="Dismiss popup"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
