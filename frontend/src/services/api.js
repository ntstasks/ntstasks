import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to inject Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nts_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to catch 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired/invalid
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('nts_token');
        localStorage.removeItem('nts_user');
        window.location.href = '/login?expired=1';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  resetPassword: (data) => api.post('/auth/reset-password', data)
};

export const taskApi = {
  getTasks: (params) => api.get('/tasks', { params }),
  getTaskById: (id) => api.get(`/tasks/${id}`),
  createTask: (data) => api.post('/tasks', data),
  updateTask: (id, data) => api.put(`/tasks/${id}`, data),
  updateStatus: (id, status) => api.patch(`/tasks/${id}/status`, { status }),
  reviewTask: (id, data) => api.post(`/tasks/${id}/review`, data),
  deleteTask: (id) => api.delete(`/tasks/${id}`),
  addComment: (id, comment) => api.post(`/tasks/${id}/comments`, { comment }),
  uploadAttachment: (id, formData) =>
    api.post(`/tasks/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  deleteAttachment: (attachmentId) => api.delete(`/tasks/attachments/${attachmentId}`),
  getCarryForwardCandidates: (params) => api.get('/tasks/carry-forward/candidates', { params }),
  carryForwardTasks: (data) => api.post('/tasks/carry-forward', data),
  carryForwardSingleTask: (id, data) => api.post(`/tasks/${id}/carry-forward`, data)
};

export const employeeApi = {
  getEmployees: (params) => api.get('/employees', { params }),
  getEmployeeById: (id) => api.get(`/employees/${id}`),
  createEmployee: (data) => api.post('/employees', data),
  updateEmployee: (id, data) => api.put(`/employees/${id}`, data),
  toggleStatus: (id) => api.patch(`/employees/${id}/toggle-status`),
  deleteEmployee: (id) => api.delete(`/employees/${id}`)
};

export const departmentApi = {
  getDepartments: () => api.get('/departments'),
  createDepartment: (data) => api.post('/departments', data),
  updateDepartment: (id, data) => api.put(`/departments/${id}`, data),
  deleteDepartment: (id) => api.delete(`/departments/${id}`)
};

export const categoryApi = {
  getCategories: () => api.get('/categories'),
  createCategory: (data) => api.post('/categories', data)
};

export const analyticsApi = {
  getAdminDashboard: (params) => api.get('/analytics/admin-dashboard', { params }),
  getEmployeeDashboard: () => api.get('/analytics/employee-dashboard'),
  getEmployeePerformance: (employeeId, params) => api.get(`/analytics/employee-performance/${employeeId}`, { params })
};

export const notificationApi = {
  getNotifications: () => api.get('/notifications'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  deleteNotification: (id) => api.delete(`/notifications/${id}`)
};

export const activityLogApi = {
  getActivityLogs: (params) => api.get('/activity-logs', { params })
};

export const reportApi = {
  exportExcel: (params) =>
    api.get('/reports/excel', {
      params,
      responseType: 'blob'
    }),
  exportPdf: (params) =>
    api.get('/reports/pdf', {
      params,
      responseType: 'blob'
    })
};

export default api;

