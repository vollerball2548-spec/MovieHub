import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import axios from "axios";
import "./index.css";
import { createPinia } from "pinia";
import { clearAuth, getAccessToken, setAccessToken } from "./utils/auth";

// ✅ ตั้งค่า base URL สำหรับ backend (Express)
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
axios.defaults.headers.common["Content-Type"] = "application/json";
axios.defaults.withCredentials = true;

let refreshRequest;
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || !original || original._retried || original.url?.includes("/auth/refresh") || original.url?.includes("/auth/login")) {
      return Promise.reject(error);
    }
    original._retried = true;
    try {
      refreshRequest ||= axios.post("/auth/refresh");
      const { data } = await refreshRequest;
      refreshRequest = undefined;
      setAccessToken(data.token);
      original.headers.Authorization = `Bearer ${data.token}`;
      return axios(original);
    } catch (refreshError) {
      refreshRequest = undefined;
      clearAuth();
      return Promise.reject(refreshError);
    }
  }
);

axios.interceptors.request.use((request) => {
  const token = getAccessToken();
  if (token) request.headers.Authorization = `Bearer ${token}`;
  return request;
});

// ✅ สร้าง instance สำหรับ TMDB API (ดึงหนังจริงจาก TMDB)
axios.tmdb = axios.create({
  baseURL: "https://api.themoviedb.org/3",
  params: {
    api_key: import.meta.env.VITE_TMDB_API_KEY, // ดึงจาก .env
    language: "th-TH", // ชื่อหนังภาษาไทย
  },
});

// ✅ ติดตั้ง Pinia (state management)
const pinia = createPinia();

// ✅ สร้าง Vue app และ inject global axios instance
const app = createApp(App);
app.config.globalProperties.$axios = axios;
app.config.globalProperties.$tmdb = axios.tmdb;

app.use(pinia);
app.use(router);
app.mount("#app");
