<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-dark text-white">
    <!-- ✅ โลโก้ MovieHub -->
    <img :src="logo" alt="MovieHub Logo" class="h-16 mb-6" />

    <div class="bg-gray-900 p-8 rounded-lg shadow-md w-96">
      <h1 class="text-2xl font-bold text-orange text-center mb-6">สมัครสมาชิก MovieHub</h1>

      <form @submit.prevent="register">
        <div class="mb-4">
          <label class="block text-sm mb-1">ชื่อผู้ใช้</label>
          <input
            v-model="username"
            type="text"
            class="w-full p-2 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange"
          />
        </div>

        <div class="mb-4">
          <label class="block text-sm mb-1">อีเมล</label>
          <input
            v-model="email"
            type="email"
            class="w-full p-2 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange"
          />
        </div>

        <div class="mb-6">
          <label class="block text-sm mb-1">รหัสผ่าน</label>
          <input
            v-model="password"
            type="password"
            minlength="8"
            maxlength="128"
            autocomplete="new-password"
            class="w-full p-2 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange"
          />
        </div>

        <button :disabled="loading" class="bg-orange w-full py-2 rounded-lg font-semibold hover:bg-orange/90 disabled:opacity-60 transition">
          {{ loading ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก" }}
        </button>
      </form>

      <p v-if="message" class="text-green-500 text-sm text-center mt-3">{{ message }}</p>
      <p v-if="error" class="text-red-500 text-sm text-center mt-3">{{ error }}</p>

      <p class="text-gray-400 text-sm text-center mt-4">
        มีบัญชีอยู่แล้ว?
        <router-link to="/login" class="text-orange hover:underline">เข้าสู่ระบบ</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";
import logo from "../assets/logo.png"; // ✅ เพิ่มโลโก้

const router = useRouter();
const username = ref("");
const email = ref("");
const password = ref("");
const message = ref("");
const error = ref("");
const loading = ref(false);

const register = async () => {
  error.value = "";
  message.value = "";
  loading.value = true;
  try {
    const res = await axios.post("/auth/register", {
      username: username.value.trim(),
      email: email.value.trim().toLowerCase(),
      password: password.value,
    });
    message.value = res.data.message;
    setTimeout(() => router.push("/login"), 1000);
  } catch (err) {
    error.value = err.response?.data?.error?.message || err.response?.data?.error || "ไม่สามารถสมัครได้";
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
