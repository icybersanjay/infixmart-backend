import axios from 'axios';

const BASE_URL =
  "" ||
  (typeof window !== 'undefined' ? window.location.origin : '');
const GUEST_OPTIONAL_PATHS = [
  '/api/user/user-details',
  '/api/cart',
  '/api/mylist',
  '/api/user/refresh-token',
];

const shouldSkipRefresh = (url = '') =>
  GUEST_OPTIONAL_PATHS.some((path) => url === path || url.startsWith(`${path}/`));

// OWASP A02/A07: withCredentials sends httpOnly cookies automatically.
// Tokens are NEVER stored in localStorage — prevents XSS token theft.
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // sends accessToken + refreshToken httpOnly cookies on every request
});

// ── Refresh-token queue pattern ────────────────────────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

// ── Response interceptor: on 401 silently refresh via cookie, then retry ──
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const original = error.config || {};

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (shouldSkipRefresh(original.url)) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => axiosInstance(original))
        .catch((err) => Promise.reject(err));
    }

    original._retry = true;
    isRefreshing = true;

    return new Promise((resolve, reject) => {
      // refreshToken cookie is sent automatically via withCredentials
      axios
        .post(`${BASE_URL}/api/user/refresh-token`, {}, { withCredentials: true })
        .then(() => {
          processQueue(null);
          resolve(axiosInstance(original));
        })
        .catch((err) => {
          processQueue(err, null);
          reject(err);
        })
        .finally(() => {
          isRefreshing = false;
        });
    });
  }
);

export default axiosInstance;
