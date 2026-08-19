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
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem("token");

  if (to.meta.requiresAuth && !token) {
    // ถ้ายังไม่ได้ล็อกอิน แต่พยายามเข้าเพจที่ต้องใช้ token
    next({ path: "/login", query: { redirect: to.fullPath } });
  } else if ((to.path === "/login" || to.path === "/register") && token) {
    // ถ้ามี token แล้ว แต่พยายามเข้าหน้า login/register ให้กลับหน้าแรก
    next("/");
  } else {
    next();
  }
});

export default router;
