const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export function getAuthToken() {
  return localStorage.getItem('pocketpilot_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('pocketpilot_token', token);
  } else {
    localStorage.removeItem('pocketpilot_token');
  }
}

export async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { ...options.headers };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If not sending FormData, default to application/json
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      // Session expired or unauthenticated
      setAuthToken(null);
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please log in again.');
    }

    if (res.status === 204) {
      return null;
    }

    const data = await res.json();
    if (!res.ok) {
      const errorMsg = data?.detail || data?.message || `Request failed with status ${res.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    throw err;
  }
}

// API methods
export const api = {
  // Auth
  login: (email, password) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (email, password, full_name) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name }),
    }),
  getMe: () => apiRequest('/auth/me'),

  // Health
  checkHealth: () => apiRequest('/health'),

  // Dashboard & Analytics
  getDashboard: (month, year) => {
    const q = new URLSearchParams();
    if (month) q.append('month', month);
    if (year) q.append('year', year);
    return apiRequest(`/analytics/dashboard?${q.toString()}`);
  },
  getAnomalies: (limit = 20) => apiRequest(`/analytics/anomalies?limit=${limit}`),

  // Transactions
  getTransactions: ({ page = 1, limit = 20, search = '', category = '', startDate = '', endDate = '' } = {}) => {
    const q = new URLSearchParams({ page, limit });
    if (search) q.append('search', search);
    if (category && category !== 'All') q.append('category', category);
    if (startDate) q.append('start_date', startDate);
    if (endDate) q.append('end_date', endDate);
    return apiRequest(`/transactions?${q.toString()}`);
  },
  getTransaction: (id) => apiRequest(`/transactions/${id}`),
  createTransaction: (data) =>
    apiRequest('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTransaction: (id, data) =>
    apiRequest(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteTransaction: (id) =>
    apiRequest(`/transactions/${id}`, {
      method: 'DELETE',
    }),

  // Budgets
  getBudgets: (month, year) => {
    const q = new URLSearchParams();
    if (month) q.append('month', month);
    if (year) q.append('year', year);
    return apiRequest(`/budgets?${q.toString()}`);
  },
  getBudgetOverview: (month, year) => {
    const q = new URLSearchParams();
    if (month) q.append('month', month);
    if (year) q.append('year', year);
    return apiRequest(`/budgets/overview?${q.toString()}`);
  },
  createBudget: (data) =>
    apiRequest('/budgets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateBudget: (id, data) =>
    apiRequest(`/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteBudget: (id) =>
    apiRequest(`/budgets/${id}`, {
      method: 'DELETE',
    }),

  // Subscriptions
  getSubscriptionIntelligence: () => apiRequest('/subscriptions/intelligence'),
  getSubscriptions: () => apiRequest('/subscriptions'),
  saveSubscription: (data) =>
    apiRequest('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSubscriptionStatus: (id, status) =>
    apiRequest(`/subscriptions/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  deleteSubscription: (id) =>
    apiRequest(`/subscriptions/${id}`, {
      method: 'DELETE',
    }),

  // CSV
  previewCsv: (formData) =>
    apiRequest('/csv/preview', {
      method: 'POST',
      body: formData,
    }),
  uploadCsv: (formData) =>
    apiRequest('/csv/upload', {
      method: 'POST',
      body: formData,
    }),
};
