import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import axios from "axios";
import "./index.css";
import { createPinia } from "pinia";

// ✅ ตั้งค่า base URL สำหรับ backend (Express)
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
axios.defaults.headers.common["Content-Type"] = "application/json";

// ✅ แนบ token ถ้ามี
const token = localStorage.getItem("token");
if (token) {
  axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

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
