import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api/v1';
const TOKEN_KEY = 'rbac_token';

export const getToken = () => sessionStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY));

export const api = axios.create({ baseURL: API_BASE, timeout: 10000 });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (!error.response) {
      return Promise.reject({
        status: 0,
        code: 'NETWORK_ERROR',
        details: [],
        message:
          error.code === 'ECONNABORTED' ? 'Máy chủ phản hồi quá lâu.' : 'Không kết nối được máy chủ (kiểm tra server, mạng hoặc CORS).',
      });
    }
    const { status, data } = error.response;
    const err = {
      status,
      code: data?.error?.code || `HTTP_${status}`,
      message: data?.error?.message || `Lỗi ${status}`,
      details: data?.error?.details || [],
    };
    if (status === 401 && !error.config.url.endsWith('/auth/tokens')) {
      setToken(null);
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(err);
  }
);
