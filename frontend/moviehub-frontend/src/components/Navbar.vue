<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import logo from "../assets/logo.png"; // ✅ ใช้ relative path แบบนี้แทน "@/assets/..."

const router = useRouter();
const isLoggedIn = ref(false);
const username = ref("");

onMounted(() => {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("username");
  if (token) {
    isLoggedIn.value = true;
    username.value = user || "ผู้ใช้";
  }
});

const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  isLoggedIn.value = false;
  router.push("/login");
};
</script>

<template>
  <nav class="sticky top-0 z-20 border-b border-white/10 bg-[#0d1117]/90 px-4 py-3 backdrop-blur sm:px-6">
    <div class="mx-auto flex max-w-7xl items-center justify-between gap-4">
      <router-link to="/" class="flex shrink-0 items-center gap-3">
        <img :src="logo" alt="MovieHub Logo" class="h-9 w-auto sm:h-11" />
        <span class="hidden text-xs font-semibold uppercase tracking-[0.25em] text-orange sm:block">Cinema booking</span>
      </router-link>

      <div class="flex items-center gap-3 text-sm text-slate-300 sm:gap-6">
        <router-link to="/" class="hidden transition hover:text-orange sm:block">เลือกหนัง</router-link>
        <router-link to="/history" class="transition hover:text-orange">ประวัติการจอง</router-link>

        <template v-if="!isLoggedIn">
          <router-link to="/login" class="rounded-lg border border-orange/50 px-3 py-2 font-semibold text-orange transition hover:bg-orange hover:text-white">เข้าสู่ระบบ</router-link>
        </template>

        <template v-else>
          <span class="hidden text-slate-400 md:block">สวัสดี, {{ username }}</span>
          <button @click="logout" class="text-orange transition hover:text-orange-300">ออกจากระบบ</button>
        </template>
      </div>
    </div>
  </nav>
</template>
