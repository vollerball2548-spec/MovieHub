<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-dark text-white">
    <!-- ✅ โลโก้ด้านบน -->
    <img :src="logo" alt="MovieHub Logo" class="h-16 mb-6" />

    <div class="bg-gray-900 p-8 rounded-lg shadow-md w-96">
      <h1 class="text-2xl font-bold text-orange text-center mb-6">เข้าสู่ระบบ MovieHub</h1>

      <form @submit.prevent="login">
        <div class="mb-4">
          <label class="block text-sm mb-1">ชื่อผู้ใช้</label>
          <input
            v-model="username"
            type="text"
            class="w-full p-2 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange"
          />
        </div>

        <div class="mb-6">
          <label class="block text-sm mb-1">รหัสผ่าน</label>
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            class="w-full p-2 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange"
          />
        </div>

        <button :disabled="loading" class="bg-orange w-full py-2 rounded-lg font-semibold hover:bg-orange/90 disabled:opacity-60 transition">
          {{ loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ" }}
        </button>
      </form>

      <p v-if="error" class="text-red-500 text-sm text-center mt-3">{{ error }}</p>

      <p class="text-gray-400 text-sm text-center mt-4">
        ยังไม่มีบัญชี?
        <router-link to="/register" class="text-orange hover:underline">สมัครสมาชิก</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import axios from "axios";
import { useRoute, useRouter } from "vue-router";
import logo from "../assets/logo.png"; // ✅ เพิ่มโลโก้
import { setAccessToken } from "../utils/auth";

const router = useRouter();
const route = useRoute();
const username = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

const login = async () => {
  error.value = "";
  loading.value = true;
  try {
    const res = await axios.post("/auth/login", {
      username: username.value.trim(),
      password: password.value,
    });

    setAccessToken(res.data.token);
    localStorage.setItem("username", res.data.username);
    localStorage.setItem("email", res.data.email || "");

    router.push(route.query.redirect || "/");
  } catch (err) {
    error.value = err.response?.data?.error?.message || err.response?.data?.error || "เกิดข้อผิดพลาด";
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.bg-dark {
  background-color: #121212;
}
.text-orange {
  color: #ff6600;
}
.bg-orange {
  background-color: #ff6600;
}
</style>
