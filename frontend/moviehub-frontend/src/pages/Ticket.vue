<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-dark text-white p-6">
    <div class="bg-zinc-900 p-6 rounded-xl shadow-lg text-center max-w-md w-full">
      <h1 class="text-3xl font-bold text-orange mb-4">🎟️ Movie Ticket</h1>
      <img :src="qr" alt="QR" class="w-40 mx-auto mb-4" />
      <p>🎬 หนัง: {{ movie }}</p>
      <p>🏢 โรง: {{ cinema }}</p>
      <p>📅 วัน: {{ date }}</p>
      <p>🕒 เวลา: {{ time }}</p>
      <p>💺 ที่นั่ง: {{ seats }}</p>
      <p class="text-gray-400 mt-4">ขอบคุณที่ใช้บริการ MovieHub ❤️</p>
    </div>
  </div>
</template>

<script setup>
import { useRoute } from "vue-router";

const route = useRoute();

const movie = route.query.movie || "ไม่ระบุ";
const cinema = route.query.cinema || "ไม่ระบุ";
const date = route.query.date || "ไม่ระบุ";
const time = route.query.time || "ไม่ระบุ";
const seats = route.query.seats || "-";
const qr = route.query.qr || "";
</script>

<style scoped>
.bg-dark {
  background-color: #121212;
}
.text-orange {
  color: #ff6600;
}
</style>
