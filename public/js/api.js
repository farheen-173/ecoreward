/**
 * EcoReward - API Client Layer
 * Handles all REST endpoints with clean error handling and JSON parsing
 */

const API = {
  baseUrl: '',

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Request failed`);
      }

      return data;
    } catch (err) {
      console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err);
      throw err;
    }
  },

  // Public & Stats
  getStats() {
    return this.request('/api/stats');
  },

  getLeaderboard() {
    return this.request('/api/leaderboard');
  },

  getDustbins() {
    return this.request('/api/dustbins');
  },

  getRewards() {
    return this.request('/api/rewards');
  },

  // Student Auth & Actions
  registerStudent(payload) {
    return this.request('/api/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  loginStudent(payload) {
    return this.request('/api/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  getStudentProfile(studentId) {
    return this.request(`/api/student/${studentId}`);
  },

  submitClaim(payload) {
    return this.request('/api/claim', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  redeemReward(payload) {
    return this.request('/api/redeem', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Admin Endpoints
  adminLogin(payload) {
    return this.request('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  getAdminClaims(status = 'all') {
    return this.request(`/api/admin/claims?status=${status}`);
  },

  approveClaim(claimId) {
    return this.request(`/api/admin/claims/${claimId}/approve`, {
      method: 'POST'
    });
  },

  rejectClaim(claimId, reason) {
    return this.request(`/api/admin/claims/${claimId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  },

  bulkApproveClaims() {
    return this.request('/api/admin/claims/bulk-approve', {
      method: 'POST'
    });
  },

  getAdminStudents() {
    return this.request('/api/admin/students');
  },

  updateSettings(settings) {
    return this.request('/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  }
};

