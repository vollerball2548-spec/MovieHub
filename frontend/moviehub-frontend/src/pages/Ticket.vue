<template>
  <div class="page-shell min-h-screen text-white">
    <div class="surface mx-auto max-w-xl rounded-3xl p-6 sm:p-8">
      <div class="flex items-start justify-between gap-4"><div><p class="text-sm font-bold uppercase tracking-[0.25em] text-orange">MOVIEHUB BILL</p><h1 class="mt-2 text-3xl font-black">บัตรชมภาพยนตร์</h1></div><span class="rounded-full bg-green-400/15 px-3 py-1 text-xs font-bold text-green-300">ชำระเงินสำเร็จ</span></div>
      <div class="my-7 flex flex-col items-center gap-5 rounded-2xl bg-black/20 p-5 sm:flex-row"><img :src="qr" alt="QR บัตรชมภาพยนตร์" class="h-36 w-36 rounded-xl bg-white p-2" /><div class="text-center sm:text-left"><p class="text-xs text-slate-500">ภาพยนตร์</p><p class="text-xl font-bold text-orange">{{ movie }}</p><p class="mt-2 text-sm text-slate-400">หมายเลขบิล: {{ bookingId || "-" }}</p></div></div>
      <div class="grid gap-4 border-t border-white/10 pt-5 text-sm sm:grid-cols-2"><div><p class="text-xs text-slate-500">โรงภาพยนตร์</p><p class="mt-1 font-semibold">{{ cinema }}</p></div><div><p class="text-xs text-slate-500">วันฉาย</p><p class="mt-1 font-semibold">{{ date }}</p></div><div><p class="text-xs text-slate-500">รอบฉาย</p><p class="mt-1 font-semibold">{{ time }}</p></div><div><p class="text-xs text-slate-500">ที่นั่ง</p><p class="mt-1 font-semibold">{{ seats }}</p></div><div class="sm:col-span-2"><p class="text-xs text-slate-500">ยอดชำระทั้งหมด</p><p class="mt-1 text-2xl font-black text-orange">{{ total }} บาท</p></div></div>
      <p class="mt-7 text-center text-sm text-slate-400">กรุณาแสดง QR นี้ที่จุดตรวจบัตร MovieHub</p>
      <router-link to="/profile" class="primary-button mt-5 w-full">ดูบิลและประวัติการซื้อ</router-link>
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
const total = route.query.total || "0";
const bookingId = route.query.bookingId || "";
</script>

<style scoped>
.bg-dark {
  background-color: #121212;
}
.text-orange {
  color: #ff6600;
}
</style>
