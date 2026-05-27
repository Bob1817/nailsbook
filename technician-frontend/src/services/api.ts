import axios from 'axios';
import { rewriteUrlsInData } from '../utils/imageUrl';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/technician',
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('technician_token');
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
      localStorage.removeItem('technician_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
