import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('eduspark_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 unauth
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('eduspark_admin_token');
      localStorage.removeItem('eduspark_admin_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Multipart upload through the backend (it pushes to S3, so no browser CORS).
// The explicit content type stops axios from JSON-encoding the FormData; the
// browser then adds the boundary. Videos can take a while — long timeout.
const uploadForm = (url, formData) =>
  api.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 10 * 60 * 1000,
  });

// ─── API Endpoints Helper ───
export const endpoints = {
  // Auth
  auth: {
    login: (credentials) => api.post('/api/admin/auth/login', credentials),
    getMe: () => api.get('/api/admin/auth/me'),
  },
  // Dashboard
  dashboard: {
    getStats: () => api.get('/api/admin/dashboard/stats'),
    getCharts: (range = '1w') => api.get(`/api/admin/dashboard/charts?range=${range}`),
    getTodayTests: () => api.get('/api/admin/dashboard/today-tests'),
  },
  // Students
  students: {
    getAll: (params) => api.get('/api/admin/dashboard/students', { params }),
    getById: (id) => api.get(`/api/admin/dashboard/students/${id}`),
    getActivity: (id) => api.get(`/api/admin/dashboard/students/${id}/activity`),
    update: (id, data) => api.patch(`/api/admin/dashboard/students/${id}`, data),
  },
  // Teachers
  teachers: {
    getAll: (params) => api.get('/api/admin/dashboard/teachers', { params }),
    getById: (id) => api.get(`/api/admin/dashboard/teachers/${id}`),
    getContent: (id) => api.get(`/api/admin/dashboard/teachers/${id}/content`),
    update: (id, data) => api.patch(`/api/admin/dashboard/teachers/${id}`, data),
  },
  // Courses
  courses: {
    getAll: (params) => api.get('/api/admin/dashboard/courses', { params }),
    getVideoUrl: (id) => api.get(`/api/admin/dashboard/courses/${id}/video-url`),
    upload: (formData) => uploadForm('/api/admin/dashboard/courses/upload', formData),
    create: (data) => api.post('/api/admin/dashboard/courses', data),
  },
  // Playlists
  playlists: {
    getAll: (params) => api.get('/api/admin/dashboard/playlists', { params }),
    getDetail: (id) => api.get(`/api/admin/dashboard/playlists/${id}/detail`),
    uploadBanner: (formData) => uploadForm('/api/admin/dashboard/playlists/upload-banner', formData),
    create: (data) => api.post('/api/admin/dashboard/playlists', data),
  },
  // Categories
  categories: {
    getAll: (params) => api.get('/api/admin/dashboard/categories', { params }),
    create: (data) => api.post('/api/admin/dashboard/categories', data),
  },
  // Tests
  tests: {
    getAll: (params) => api.get('/api/admin/dashboard/tests', { params }),
    getEnrolledUsers: (id) => api.get(`/api/admin/dashboard/tests/${id}/enrolled-users`),
    create: (data) => api.post('/api/admin/dashboard/tests', data),
  },
  // Reels
  reels: {
    getAll: (params) => api.get('/api/admin/dashboard/reels', { params }),
    getVideoUrl: (id) => api.get(`/api/admin/dashboard/reels/${id}/video-url`),
    upload: (formData) => uploadForm('/api/admin/dashboard/reels/upload', formData),
    create: (data) => api.post('/api/admin/dashboard/reels', data),
  },
  // Banners
  banners: {
    getAll: (params) => api.get('/api/admin/dashboard/home-banners', { params }),
    create: (data) => api.post('/api/admin/dashboard/home-banners', data),
    delete: (id) => api.delete(`/api/admin/dashboard/home-banners/${id}`),
  },
  // Support Chat
  support: {
    getStudents: () => api.get('/api/admin/dashboard/support-chat/students'),
    getStudentMessages: (id) => api.get(`/api/admin/dashboard/support-chat/students/${id}/messages`),
    replyStudent: (id, text) => api.post(`/api/admin/dashboard/support-chat/students/${id}/messages`, { text }),
    getTeachers: () => api.get('/api/admin/dashboard/support-chat/teachers'),
    getTeacherMessages: (id) => api.get(`/api/admin/dashboard/support-chat/teachers/${id}/messages`),
    replyTeacher: (id, text) => api.post(`/api/admin/dashboard/support-chat/teachers/${id}/messages`, { text }),
  },
};

// ─── Safe Array Helper ───
export const safeList = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  const d = res.data?.data ?? res.data ?? res;
  if (Array.isArray(d)) return d;
  if (d && typeof d === 'object') {
    if (Array.isArray(d.list)) return d.list;
    if (Array.isArray(d.courses)) return d.courses;
    if (Array.isArray(d.students)) return d.students;
    if (Array.isArray(d.teachers)) return d.teachers;
    if (Array.isArray(d.categories)) return d.categories;
    if (Array.isArray(d.playlists)) return d.playlists;
    if (Array.isArray(d.tests)) return d.tests;
    if (Array.isArray(d.reels)) return d.reels;
    if (Array.isArray(d.banners)) return d.banners;
    if (Array.isArray(d.conversations)) return d.conversations;
    if (Array.isArray(d.enrollees)) return d.enrollees;
    if (Array.isArray(d.messages)) return d.messages;
  }
  return [];
};

export default api;
