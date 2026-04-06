const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('blugen_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('blugen_token');
    localStorage.removeItem('blugen_user');
    window.location.reload();
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'خطای سرور' }));
    throw new Error(err.detail || 'خطا');
  }

  return res.json();
}

const api = {
  // Auth
  login: (phone, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) }),
  me: () => request('/auth/me'),
  changePassword: (old_password, new_password) =>
    request('/auth/change-password', { method: 'POST', body: JSON.stringify({ old_password, new_password }) }),

  // Users
  getUsers: (role) => request(`/users${role ? `?role=${role}` : ''}`),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),

  // Exercises
  getExercises: () => request('/exercises'),
  createExercise: (data) => request('/exercises', { method: 'POST', body: JSON.stringify(data) }),

  // Programs
  getPrograms: (traineeId) => request(`/programs${traineeId ? `?trainee_id=${traineeId}` : ''}`),
  createProgram: (data) => request('/programs', { method: 'POST', body: JSON.stringify(data) }),
  deleteProgram: (id) => request(`/programs/${id}`, { method: 'DELETE' }),

  // Packages
  getPackages: (traineeId) => request(`/packages${traineeId ? `?trainee_id=${traineeId}` : ''}`),
  createPackage: (data) => request('/packages', { method: 'POST', body: JSON.stringify(data) }),

  // Logs
  logWorkout: (entries) => request('/logs', { method: 'POST', body: JSON.stringify(entries) }),
  getLogs: (programId) => request(`/logs${programId ? `?program_id=${programId}` : ''}`),
  getProgress: (exerciseId) => request(`/logs/progress/${exerciseId}`),

  // Stats
  trainerStats: () => request('/stats/trainer'),
  traineeStats: () => request('/stats/trainee'),
};

export default api;
