import { createRouter, createWebHistory } from "vue-router";

// ✅ import ทุกหน้า
import Home from "../pages/Home.vue";
import Login from "../pages/Login.vue";
import Register from "../pages/Register.vue";
import SelectCinema from "../pages/SelectCinema.vue";
import SelectMovie from "../pages/SelectMovie.vue";
import SelectShowtime from "../pages/SelectShowtime.vue";
import SelectSeat from "../pages/SelectSeat.vue";
import Payment from "../pages/Payment.vue";
import Ticket from "../pages/Ticket.vue";
import History from "../pages/History.vue";
import Profile from "../pages/Profile.vue";
import MovieProfile from "../pages/MovieProfile.vue";
import About from "../pages/About.vue";
import MovieAccess from "../pages/MovieAccess.vue";
import AdminReview from "../pages/AdminReview.vue";
import AdminCatalog from "../pages/AdminCatalog.vue";
import MyMovies from "../pages/MyMovies.vue";
import axios from "axios";
import { clearAuth, getAccessToken, isAdmin, setAccessToken } from "../utils/auth";

const routes = [
  // ✅ หน้าแรกแสดงหนังเลย (เหมือน SF)
  {
    path: "/",
    name: "SelectMovie",
    component: SelectMovie,
    meta: { requiresAuth: false },
  },

  // ✅ หน้า Home (ถ้าจะกลับมาใช้)
  {
    path: "/home",
    name: "Home",
    component: Home,
    meta: { requiresAuth: false },
  },

  // ✅ Login / Register
  {
    path: "/login",
    name: "Login",
    component: Login,
    meta: { requiresAuth: false },
  },
  {
    path: "/register",
    name: "Register",
    component: Register,
    meta: { requiresAuth: false },
  },
  {
    path: "/profile",
    name: "Profile",
    component: Profile,
    meta: { requiresAuth: true },
  },
  {
    path: "/movie-profile",
    name: "MovieProfile",
    component: MovieProfile,
    meta: { requiresAuth: false },
  },
  {
    path: "/about",
    name: "About",
    component: About,
    meta: { requiresAuth: false },
  },
  { path: "/movie-access", name: "MovieAccess", component: MovieAccess, meta: { requiresAuth: true } },
  { path: "/admin/review", name: "AdminReview", component: AdminReview, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: "/admin/catalog", name: "AdminCatalog", component: AdminCatalog, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: "/my-movies", name: "MyMovies", component: MyMovies, meta: { requiresAuth: true } },

  // ✅ Flow การจอง
  {
    path: "/select-cinema",
    name: "SelectCinema",
    component: SelectCinema,
    meta: { requiresAuth: true },
  },
  {
    path: "/select-showtime",
    name: "SelectShowtime",
    component: SelectShowtime,
    meta: { requiresAuth: true },
  },
  {
    path: "/select-seat",
    name: "SelectSeat",
    component: SelectSeat,
    meta: { requiresAuth: true },
  },
  {
    path: "/payment",
    name: "Payment",
    component: Payment,
    meta: { requiresAuth: true },
  },
  {
    path: "/ticket",
    name: "Ticket",
    component: Ticket,
    meta: { requiresAuth: true },
  },
  {
    path: "/history",
    name: "History",
    component: History,
    meta: { requiresAuth: true },
  },

  // ✅ กัน path ที่ไม่ตรง
  {
    path: "/:pathMatch(.*)*",
    redirect: "/",
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// ✅ Middleware ตรวจ token ก่อนเข้าเพจที่ล็อกไว้
router.beforeEach(async (to) => {
  let authenticated = Boolean(getAccessToken());
  if (!authenticated) {
    try {
      const { data } = await axios.post("/auth/refresh");
      setAccessToken(data.token);
      authenticated = true;
    } catch {
      clearAuth();
    }
  }
  if (to.meta.requiresAuth && !authenticated) return { path: "/login", query: { redirect: to.fullPath } };
  if (to.meta.requiresAdmin && !isAdmin()) return "/";
  if ((to.path === "/login" || to.path === "/register") && authenticated) return "/";
  return true;
});

export default router;
