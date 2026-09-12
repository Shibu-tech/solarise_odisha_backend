import React from 'react';

/**
 * CorrectionsBadge
 * 
 * Displays a badge showing the count of pending document correction actions.
 * Used in navigation/sidebar to alert users about pending corrections.
 */
export const CorrectionsBadge = ({ count = 0, onClick, className = '' }) => {
  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className={`
        relative inline-flex items-center justify-center
        px-3 py-1.5 rounded-full
        bg-amber-500 hover:bg-amber-600
        text-white text-sm font-bold
        shadow-md hover:shadow-lg
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1
        ${className}
      `}
      title="Pending document corrections"
    >
      <span className="flex items-center gap-1">
        <span className="text-lg">⚠️</span>
        <span>{count}</span>
      </span>
      <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
    </button>
  );
};

/**
 * VerificationQueueBadge
 * 
 * Displays a badge for documents awaiting verification by the Document Team.
 */
export const VerificationQueueBadge = ({ count = 0, onClick, className = '' }) => {
  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className={`
        relative inline-flex items-center justify-center
        px-3 py-1.5 rounded-full
        bg-blue-500 hover:bg-blue-600
        text-white text-sm font-bold
        shadow-md hover:shadow-lg
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1
        ${className}
      `}
      title="Documents awaiting verification"
    >
      <span className="flex items-center gap-1">
        <span className="text-lg">📋</span>
        <span>{count}</span>
      </span>
      <span className="absolute top-0 right-0 h-2 w-2 bg-orange-500 rounded-full animate-pulse"></span>
    </button>
  );
};

/**
 * DocumentStatusBadge
 * 
 * Displays status badge for individual document in lists.
 */
export const DocumentStatusBadge = ({ status, size = 'md' }) => {
  const statusConfigs = {
    'uploaded': {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      label: '📤 Uploaded',
      icon: '📤'
    },
    'verified': {
      bg: 'bg-emerald-100',
      text: 'text-emerald-800',
      label: '✓ Verified',
      icon: '✓'
    },
    'rejected': {
      bg: 'bg-red-100',
      text: 'text-red-800',
      label: '✗ Rejected',
      icon: '✗'
    },
    'action_required': {
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      label: '⚠️ Action Required',
      icon: '⚠️'
    }
  };

  const config = statusConfigs[status] || {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    label: status,
    icon: '○'
  };

  const sizeClasses = {
    'sm': 'text-xs px-2 py-0.5',
    'md': 'text-sm px-2.5 py-1',
    'lg': 'text-base px-3 py-1.5'
  };

  return (
    <span className={`
      inline-flex items-center gap-1 rounded-full font-semibold
      ${config.bg} ${config.text}
      ${sizeClasses[size] || sizeClasses['md']}
    `}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
};

export default CorrectionsBadge;
