<template>
  <div class="page-shell min-h-screen text-white">
    <section class="surface rounded-3xl p-6 sm:p-10">
      <p class="text-sm font-bold uppercase tracking-[0.25em] text-orange">MY MOVIEHUB</p>
      <div class="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-black sm:text-4xl">โปรไฟล์ของฉัน</h1>
          <p class="mt-2 text-slate-400">ข้อมูลบัญชีและรายการซื้อบัตรทั้งหมดของคุณ</p>
        </div>
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange text-2xl font-black">{{ initials }}</div>
      </div>
      <div class="mt-8 grid gap-4 sm:grid-cols-2">
        <div class="rounded-2xl border border-white/10 bg-black/20 p-4"><p class="text-xs text-slate-500">ชื่อผู้ใช้</p><p class="mt-1 font-semibold">{{ username }}</p></div>
        <div class="rounded-2xl border border-white/10 bg-black/20 p-4"><p class="text-xs text-slate-500">อีเมล</p><p class="mt-1 font-semibold break-all">{{ email || "ยังไม่ได้ระบุ" }}</p></div>
      </div>
    </section>

    <section class="mt-8">
      <div class="mb-4 flex items-end justify-between"><div><p class="text-sm text-slate-400">PURCHASES</p><h2 class="mt-1 text-2xl font-bold">บิลและการซื้อบัตร</h2></div><span class="text-sm text-slate-500">{{ bookings.length }} รายการ</span></div>
      <div v-if="loading" class="text-center text-slate-400">กำลังโหลดรายการซื้อ...</div>
      <div v-else-if="bookings.length === 0" class="surface rounded-2xl p-8 text-center text-slate-400">ยังไม่มีรายการซื้อบัตร</div>
      <div v-else class="grid gap-5 lg:grid-cols-2">
        <article v-for="booking in bookings" :key="booking._id" class="surface rounded-2xl p-5">
          <div class="flex gap-4">
            <img :src="booking.qrCode" alt="QR บัตรชมภาพยนตร์" class="h-20 w-20 rounded-lg bg-white p-1" />
            <div class="min-w-0"><p class="text-xs text-orange">MOVIE TICKET</p><h3 class="truncate text-lg font-bold">{{ booking.movieTitle }}</h3><p class="text-sm text-slate-400">ซื้อเมื่อ {{ formatDate(booking.createdAt) }}</p></div>
          </div>
          <div class="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div><p class="text-xs text-slate-500">โรงภาพยนตร์</p><p class="mt-1 font-semibold">{{ booking.cinema || "ไม่ระบุ" }}</p></div>
            <div><p class="text-xs text-slate-500">รอบฉาย</p><p class="mt-1 font-semibold">{{ booking.date }} · {{ booking.time }}</p></div>
            <div><p class="text-xs text-slate-500">ที่นั่ง</p><p class="mt-1 font-semibold">{{ booking.seats?.join(", ") }}</p></div>
            <div><p class="text-xs text-slate-500">ยอดชำระ</p><p class="mt-1 font-bold text-orange">{{ booking.totalPrice }} บาท</p></div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import axios from "axios";

const username = ref(localStorage.getItem("username") || "ผู้ใช้");
const email = ref(localStorage.getItem("email") || "");
const bookings = ref([]);
const loading = ref(true);
const initials = computed(() => username.value.slice(0, 1).toUpperCase());

const formatDate = (value) => new Date(value).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });

onMounted(async () => {
  try {
    const { data } = await axios.get("/bookings");
    bookings.value = data;
  } finally {
    loading.value = false;
  }
});
</script>
