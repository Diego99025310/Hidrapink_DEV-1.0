import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:3000",
});

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 428) {
      const redirect = error.response?.data?.redirect || "/aceite-termos";
      if (typeof window !== "undefined" && window.location?.pathname !== redirect) {
        window.location.href = redirect;
      }
    }
    return Promise.reject(error);
  },
);

