import axios from 'axios';
import { rewriteUrlsInData } from '../utils/imageUrl';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/client',
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('client_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    if (response.data) {
      response.data = rewriteUrlsInData(response.data);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('client_token');
      localStorage.removeItem('client_user');
      localStorage.removeItem('client_technician');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    if (!error.response) {
      console.error('网络错误，请检查网络连接');
    }
    return Promise.reject(error);
  }
);

export default api;
