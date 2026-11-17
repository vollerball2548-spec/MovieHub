<script setup>
import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import axios from "axios";
import { clearAuth, isLoggedIn as hasSession, isAdmin as hasAdminRole } from "../utils/auth";
import logo from "../assets/logo.png"; // ✅ ใช้ relative path แบบนี้แทน "@/assets/..."

const router = useRouter();
const route = useRoute();
const isLoggedIn = ref(false);
const isAdmin = ref(false);
const username = ref("");

const refreshUser = () => {
  const user = localStorage.getItem("username");
  isLoggedIn.value = hasSession();
  isAdmin.value = hasAdminRole();
  username.value = user || "ผู้ใช้";
};

refreshUser();
watch(() => route.fullPath, refreshUser);

const logout = async () => {
  try {
    await axios.post("/auth/logout");
  } catch {
    // Local logout still clears the current browser session when the API is unavailable.
  }
  clearAuth();
  isLoggedIn.value = false;
  router.push("/login");
};
</script>

<template>
  <nav class="sticky top-0 z-20 border-b border-white/10 bg-[#0d1117]/90 px-4 py-3 backdrop-blur sm:px-6">
    <div class="mx-auto flex max-w-7xl items-center justify-between gap-4">
      <router-link to="/" class="flex shrink-0 items-center gap-3">
        <img :src="logo" alt="MovieHub Logo" class="h-9 w-auto sm:h-11" />
        <span class="hidden text-xs font-semibold uppercase tracking-[0.25em] text-orange sm:block">Movie rental</span>
      </router-link>

      <div class="flex items-center gap-3 text-sm text-slate-300 sm:gap-6">
        <router-link to="/" class="hidden transition hover:text-orange sm:block">เลือกหนัง</router-link>
        <router-link to="/my-movies" class="transition hover:text-orange">รายการเช่าดู</router-link>
        <router-link v-if="isAdmin" to="/admin/review" class="transition hover:text-orange">ตรวจรายการ</router-link>
        <router-link v-if="isAdmin" to="/admin/catalog" class="transition hover:text-orange">จัดการโรงหนัง</router-link>

        <template v-if="!isLoggedIn">
          <router-link to="/login" class="rounded-lg border border-orange/50 px-3 py-2 font-semibold text-orange transition hover:bg-orange hover:text-white">เข้าสู่ระบบ</router-link>
        </template>

        <template v-else>
          <span class="hidden text-slate-400 md:block">สวัสดี, {{ username }}</span>
          <router-link to="/profile" class="rounded-lg border border-white/10 px-3 py-2 transition hover:border-orange hover:text-orange">โปรไฟล์</router-link>
          <button @click="logout" class="text-orange transition hover:text-orange-300">ออกจากระบบ</button>
        </template>
      </div>
    </div>
  </nav>
</template>
