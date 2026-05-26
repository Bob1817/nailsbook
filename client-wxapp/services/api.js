const api = require('../utils/request');

function getBaseUrl(role = 'client') {
  return role === 'technician' ? '/api/technician' : '/api/client';
}

const auth = {
  checkPhone: (phone, role = 'client') => {
    return api.post(`${getBaseUrl(role)}/auth/check-phone`, { phone });
  },

  registerClient: (phone, password, inviteCode) => {
    return api.post(`${getBaseUrl('client')}/auth/register-by-invite`, {
      phone, password, inviteCode
    });
  },

  registerTechnician: (inviteKey, name, phone, password) => {
    return api.post(`${getBaseUrl('technician')}/auth/register`, {
      inviteKey, name, phone, password
    });
  },

  login: (phone, password, role = 'client') => {
    return api.post(`${getBaseUrl(role)}/auth/login`, { phone, password });
  },

  getUserInfo: (role = 'client') => {
    return api.get(`${getBaseUrl(role)}/auth/me`);
  }
};

const client = {
  home: () => api.get('/home'),

  works: {
    list: (params) => api.get('/works', params),
    detail: (id) => api.get(`/works/${id}`),
    like: (id) => api.post(`/works/${id}/like`),
    unlike: (id) => api.delete(`/works/${id}/like`),
    favorite: (id) => api.post(`/works/${id}/favorite`),
    unfavorite: (id) => api.delete(`/works/${id}/favorite`),
    comments: (id, params) => api.get(`/works/${id}/comments`, params),
    addComment: (id, data) => api.post(`/works/${id}/comments`, data)
  },

  orders: {
    list: (params) => api.get('/orders', params),
    detail: (id) => api.get(`/orders/${id}`),
    create: (data) => api.post('/orders', data),
    cancel: (id, reason) => api.post(`/orders/${id}/cancel`, { reason }),
    acceptQuote: (id) => api.post(`/orders/${id}/agree`),
    rejectQuote: (id, reason) => api.post(`/orders/${id}/reject-quote`, { reason }),
    cancel: (id) => api.patch(`/orders/${id}/status`, { status: 'cancelled' }),
    review: (id, data) => api.post(`/orders/${id}/review`, data)
  },

  addresses: {
    list: () => api.get('/addresses'),
    detail: (id) => api.get(`/addresses/${id}`),
    create: (data) => api.post('/addresses', data),
    update: (id, data) => api.patch(`/addresses/${id}`, data),
    delete: (id) => api.del(`/addresses/${id}`),
    setDefault: (id) => api.patch(`/addresses/${id}/set-default`, {})
  },

  designs: {
    list: (params) => api.get('/designs', params),
    detail: (id) => api.get(`/designs/${id}`),
    create: (data) => api.post('/designs', data),
    update: (id, data) => api.patch(`/designs/${id}`, data),
    acceptQuote: (id) => api.post(`/designs/${id}/accept-quote`),
    rejectQuote: (id, reason) => api.post(`/designs/${id}/reject-quote`, { reason }),
    createOrder: (id, data) => api.post(`/designs/${id}/create-order`, data)
  },

  customService: {
    create: (data) => api.post('/custom-service-requests', data),
    list: (params) => api.get('/custom-service-requests', params),
    detail: (id) => api.get(`/custom-service-requests/${id}`)
  }
};

const technician = {
  auth: {
    requestCode: (phone) => auth.requestCode(phone, 'technician'),
    verifyCode: (phone, code) => auth.verifyCode(phone, code, 'technician'),
    login: (phone, code) => auth.login(phone, code, 'technician'),
    getUserInfo: () => auth.getUserInfo('technician'),
    updateProfile: (data) => api.patch('/auth/profile', data),
    updateStatus: (status) => api.patch('/auth/status', { status })
  },

  dashboard: () => api.get('/dashboard'),

  orders: {
    list: (params) => api.get('/orders', params),
    detail: (id) => api.get(`/orders/${id}`),
    review: (id, data) => api.patch(`/orders/${id}/review`, data),
    confirm: (id) => api.patch(`/orders/${id}/confirm`, {}),
    complete: (id) => api.patch(`/orders/${id}/complete`, {}),
    cancel: (id) => api.patch(`/orders/${id}/cancel`, {})
  },

  customers: {
    list: (params) => api.get('/customers', params),
    detail: (id) => api.get(`/customers/${id}`),
    updateTags: (id, tags) => api.patch(`/customers/${id}/tags`, { tags })
  },

  works: {
    list: (params) => api.get('/works', params),
    detail: (id) => api.get(`/works/${id}`),
    create: (data) => api.post('/works', data),
    update: (id, data) => api.patch(`/works/${id}`, data),
    delete: (id) => api.del(`/works/${id}`),
    toggleVisible: (id) => api.post(`/works/${id}/toggle-visible`),
    togglePinned: (id) => api.post(`/works/${id}/toggle-pinned`),
    toggleFeatured: (id) => api.post(`/works/${id}/toggle-featured`)
  },

  services: {
    list: () => api.get('/services'),
    create: (data) => api.post('/services', data),
    update: (id, data) => api.patch(`/services/${id}`, data),
    delete: (id) => api.delete(`/services/${id}`),
    toggle: (id) => api.post(`/services/${id}/toggle`)
  },

  schedule: () => api.get('/schedule')
};

const chat = {
  conversations: (role = 'client') => api.get(`${getBaseUrl(role)}/conversations`),

  messages: (params, role = 'client') => api.get(`${getBaseUrl(role)}/messages`, params),

  sendMessage: (data, role = 'client') => api.post(`${getBaseUrl(role)}/messages`, data),

  markRead: (conversationId, role = 'client') => api.post(`${getBaseUrl(role)}/messages/read`, { conversationId })
};

const upload = {
  image: (filePath, role = 'client') => {
    return new Promise((resolve, reject) => {
      const token = getApp().globalData.token;
      const baseUrl = getApp().globalData.apiBaseUrl || 'http://localhost:3000';
      const uploadUrl = `${baseUrl}${getBaseUrl(role)}/uploads`;

      wx.uploadFile({
        url: uploadUrl,
        filePath,
        name: 'file',
        header: {
          'Authorization': `Bearer ${token}`
        },
        success: (res) => {
          const data = JSON.parse(res.data);
          if (data.url) {
            resolve(data);
          } else {
            reject(data);
          }
        },
        fail: reject
      });
    });
  }
};

module.exports = {
  auth,
  client,
  technician,
  chat,
  upload
};
