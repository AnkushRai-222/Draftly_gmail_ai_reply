import axios from 'axios'

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
const baseUrl = rawBaseUrl.replace(/\/$/, '')

const api = axios.create({
  baseURL: baseUrl ? `${baseUrl}/api` : '/api',
  timeout: 30000,
})

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('draftly_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 — redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('draftly_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ─── Auth ─────────────────────────────────────────────────────────────────
export const authAPI = {
  // Uses axios directly (not api) — auth routes are /auth/*, not /api/auth/*
  me: () => axios.get(baseUrl ? `${baseUrl}/auth/me` : '/auth/me', {
    headers: { Authorization: `Bearer ${localStorage.getItem('draftly_token')}` }
  }).then(r => r.data.data),
  logout: () => axios.post(baseUrl ? `${baseUrl}/auth/logout` : '/auth/logout', {}, {
    headers: { Authorization: `Bearer ${localStorage.getItem('draftly_token')}` }
  }),
}

// ─── Emails ───────────────────────────────────────────────────────────────
export const emailsAPI = {
  list: (params) => api.get('/emails', { params }).then(r => r.data.data),
  getOne: (id) => api.get(`/emails/${id}`).then(r => r.data.data),
  skip: (id) => api.post(`/emails/${id}/skip`).then(r => r.data),
}

// ─── Drafts ───────────────────────────────────────────────────────────────
export const draftsAPI = {
  generate: (emailId, tone) => api.post('/drafts/generate', { emailId, tone }).then(r => r.data),
  list: (params) => api.get('/drafts', { params }).then(r => r.data),
  getOne: (id) => api.get(`/drafts/${id}`).then(r => r.data.data),
  update: (id, data) => api.patch(`/drafts/${id}`, data).then(r => r.data.data),
  approve: (id) => api.post(`/drafts/${id}/approve`).then(r => r.data),
  reject: (id) => api.post(`/drafts/${id}/reject`).then(r => r.data),
  send: (id) => api.post(`/drafts/${id}/send`).then(r => r.data),
  regenerate: (id, tone) => api.post(`/drafts/${id}/regenerate`, { tone }).then(r => r.data),
  logs: (params) => api.get('/drafts/logs', { params }).then(r => r.data),
}

// ─── Preferences ──────────────────────────────────────────────────────────
export const prefsAPI = {
  get: () => api.get('/preferences').then(r => r.data.data),
  update: (data) => api.put('/preferences', data).then(r => r.data.data),
  getFilters: () => api.get('/preferences/filters').then(r => r.data.data),
  addFilter: (data) => api.post('/preferences/filters', data).then(r => r.data.data),
  deleteFilter: (id) => api.delete(`/preferences/filters/${id}`).then(r => r.data),
}

// ─── Style ────────────────────────────────────────────────────────────────
export const styleAPI = {
  get: () => api.get('/style').then(r => r.data.data),
  learn: (force) => api.post(`/style/learn?force=${force || false}`).then(r => r.data.data),
}

export default api
