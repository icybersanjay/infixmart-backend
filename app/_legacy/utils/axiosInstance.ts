import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';

const BASE_URL =
  "" ||
  (typeof window !== 'undefined' ? window.location.origin : '');
// Only skip refresh for the refresh-token endpoint itself to prevent infinite loops.
const shouldSkipRefresh = (url: string = ''): boolean => url === '/api/user/refresh-token';

// OWASP A02/A07: withCredentials sends httpOnly cookies automatically.
// Tokens are NEVER stored in localStorage — prevents XSS token theft.
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

interface QueueEntry {
  resolve: (value?: unknown) => void;
  reject: (error?: unknown) => void;
}

let isRefreshing = false;
let failedQueue: QueueEntry[] = [];

const processQueue = (error: unknown, token: unknown = null): void => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

interface RetryConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const original = (error.config as RetryConfig) || {};

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (shouldSkipRefresh(original.url)) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<unknown>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => axiosInstance(original))
        .catch((err) => Promise.reject(err));
    }

    original._retry = true;
    isRefreshing = true;

    return new Promise<unknown>((resolve, reject) => {
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
