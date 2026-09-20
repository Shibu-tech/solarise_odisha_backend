 import axios from 'axios';

  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  });

  // Request interceptor to add auth token (if available)
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Helper to normalize endpoints and prevent double /api prefix
  const normalizeEndpoint = (endpoint) => {
    // Remove leading slash if present
    let normalized = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

    // If baseURL already ends with /api, we don't need another /api in the endpoint
    const baseURL = api.defaults.baseURL || '';
    if (baseURL.endsWith('/api')) {
      return normalized;
    }

    // Otherwise, ensure the endpoint starts with / for proper URL construction
    return `/${normalized}`;
  };

  // Response interceptor to handle errors globally with custom toasts
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error.response?.status;
      if (status === 401) {
        localStorage.removeItem('token');
      }

      const errorMessage = error.response?.data?.error ||
                          error.response?.data?.message ||
                          error.message ||
                          'An unknown error occurred';

      const title = status ? `Backend Error ${status}` : 'Connection Refused';

      if (!error.config?.suppressToast && typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(
          new CustomEvent('app:toast', {
            detail: {
              type: 'error',
              title,
              message: errorMessage,
              duration: 5000,
            },
          })
        );
      }

      return Promise.reject(error);
    }
  );

  // Auth Service
  export const authService = {
    login: (credentials) => api.post('/auth/login', credentials),
    getMe: () => api.get('/auth/me'),
  };

  // Users Service
  export const userService = {
    getAll: () => api.get('/users'),
    getById: (id) => api.get(`/users/${id}`),
    getByRole: (role) => api.get(`/users/role/${role}`),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
  };

  // Area Blocks Service
  export const areaBlockService = {
    getAll: () => api.get('/areaBlocks'),
    getById: (id) => api.get(`/areaBlocks/${id}`),
    create: (data) => api.post('/areaBlocks', data),
    update: (id, data) => api.put(`/areaBlocks/${id}`, data),
    delete: (id) => api.delete(`/areaBlocks/${id}`),
  };

  // Consumer Service
  export const consumerService = {
    getAll: () => api.get('/consumers'),
    getById: (id) => api.get(`/consumers/${id}`),
    create: (data) => api.post('/consumers', data),
    update: (id, data) => api.put(`/consumers/${id}`, data),
    deactivate: (id) => api.patch(`/consumers/${id}/deactivate`),
    activate: (id) => api.patch(`/consumers/${id}/activate`),
    delete: (id) => api.delete(`/consumers/${id}`),
    restore: (id) => api.patch(`/consumers/${id}/restore`),
  };

  // Projects Service
  export const projectService = {
    getAll: () => api.get('/projects'),
    getById: (id) => api.get(`/projects/${id}`),
    create: (data) => api.post('/projects', data),
    updateStatus: (id, data) => api.patch(`/projects/${id}/status`, data),
  };

  // Documents Service
  export const documentService = {
    getAll: () => api.get('/documents'),
    getById: (id) => api.get(`/documents/${id}`),
    getByConsumer: (consumerId) => api.get(`/documents/consumer/${consumerId}`),
    getStatusSummary: () => api.get('/documents/status-summary'),
    getVerificationQueue: () => api.get('/documents/verification-queue'),
    checkS3Health: () => api.get('/documents/s3-health'),
    create: (data, config) => api.post('/documents', data, config),
    upload: (data, config) => api.post('/documents/upload', data, config),
    verify: (id, data) => api.patch(`/documents/${id}/verify`, data),
    reject: (id, data) => api.patch(`/documents/${id}/reject`, data),
    reupload: (id, data, config) => api.post(`/documents/${id}/reupload`, data, config),
    getDownloadUrl: (id) => api.get(`/documents/${id}/download-url`),
    flag: (id, data) => api.post(`/documents/${id}/flag`, data),
  };

  // Bank Loans Service
  export const bankLoanService = {
    getByConsumer: (consumerId) => api.get(`/bank-loans/consumer/${consumerId}`, { suppressToast: true }),
    createOrUpdate: (data) => api.post('/bank-loans', data),
  };

  // Installation Progress Service
  export const installationService = {
    getByProject: (projectId) => api.get(`/installation/project/${projectId}`),
    initChecklist: (projectId) => api.post(`/installation/project/${projectId}/init`),
    completeItem: (id, data) => api.patch(`/installation/${id}/complete`, data),
    saveBatch: (projectId, data) => api.post(`/installation/project/${projectId}/batch`, data),
    getProgress: (projectId) => api.get(`/installation/project/${projectId}/progress`),
  };

  // Actions Service
  export const actionService = {
    getAll: () => api.get('/actions'),
    getMyOpenActions: () => api.get('/actions/my-open-actions'),
    getByProject: (projectId) => api.get(`/actions/project/${projectId}`),
    create: (data) => api.post('/actions', data),
    updateStatus: (id, data) => api.patch(`/actions/${id}/status`, data),
    getOverdue: () => api.get('/actions/overdue'),
  };

  // Payments Service
  export const paymentService = {
    getAll: () => api.get('/payments'),
    getById: (id) => api.get(`/payments/${id}`),
    getByProject: (projectId) => api.get(`/payments/project/${projectId}`),
    getPending: () => api.get('/payments/pending'),
    getSummary: () => api.get('/payments/summary'),
    create: (data) => api.post('/payments', data),
    updateStatus: (id, data) => api.patch(`/payments/${id}/status`, data),
  };

  // Notifications Service
  export const notificationService = {
    getAll: () => api.get('/notifications'),
    getUserNotifications: (userId) => api.get(`/notifications/user/${userId}`),
    create: (data) => api.post('/notifications', data),
    markRead: (id) => api.patch(`/notifications/${id}/read`),
    delete: (id) => api.delete(`/notifications/${id}`),
  };

  // Consumer Transfers Service
  export const transferService = {
    initiate: (data) => api.post('/transfers', data),
    getPending: () => api.get('/transfers/pending'),
    accept: (id, data) => api.post(`/transfers/${id}/accept`, data),
    reject: (id, data) => api.post(`/transfers/${id}/reject`, data),
  };

  export default api;