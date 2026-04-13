import axios from "axios";

const adminAxios = axios.create({
  baseURL: "",
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

adminAxios.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (!original || (status !== 401 && status !== 403) || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => adminAxios(original))
        .catch((err) => Promise.reject(err));
    }

    original._retry = true;
    isRefreshing = true;

    try {
      await axios.post(
        "/api/user/refresh-token",
        {},
        { withCredentials: true }
      );
      processQueue(null);
      return adminAxios(original);
    } catch (err) {
      processQueue(err, null);
      window.location.href = "/admin/login";
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

export default adminAxios;
