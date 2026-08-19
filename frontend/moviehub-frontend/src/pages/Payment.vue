<template>
  <div class="bg-dark text-white min-h-screen flex flex-col items-center justify-center p-6">
    <h1 class="text-3xl font-bold text-orange mb-6">💳 ชำระเงิน</h1>

    <div class="bg-zinc-900 p-6 rounded-xl w-full max-w-md shadow-lg">
      <p class="mb-2">🎬 <span class="text-orange font-semibold">หนัง:</span> {{ booking.movieTitle }}</p>
      <p class="mb-2">🏢 <span class="text-orange font-semibold">โรง:</span> {{ booking.cinema }}</p>
      <p class="mb-2">📅 <span class="text-orange font-semibold">วัน:</span> {{ booking.date }}</p>
      <p class="mb-2">🕒 <span class="text-orange font-semibold">เวลา:</span> {{ booking.time }}</p>
      <p class="mb-2">🎟️ <span class="text-orange font-semibold">ที่นั่ง:</span> {{ booking.seats }}</p>
      <p class="mb-4">💰 <span class="text-orange font-semibold">ราคารวม:</span> {{ booking.totalPrice }} บาท</p>

      <hr class="my-4 border-gray-700" />

      <h2 class="text-xl font-bold mb-2">🧾 สแกน QR เพื่อชำระเงิน</h2>
      <div class="flex justify-center mb-4">
        <img :src="qrUrl" alt="QR Code" class="w-40 h-40 border border-gray-700 rounded-lg" />
      </div>

      <button
        @click="confirmPayment"
        class="bg-orange text-white w-full py-3 rounded-lg font-semibold hover:bg-orange/90 transition"
      >
        ✅ ยืนยันการชำระเงิน
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import axios from "axios";

const route = useRoute();
const router = useRouter();
const token = localStorage.getItem("token"); // ✅ ดึง token จาก localStorage

const booking = ref({
  movieTitle: "",
  cinema: "",
  date: "",
  time: "",
  seats: "",
  totalPrice: 0,
});

const qrUrl = ref("");

// ✅ โหลดข้อมูลจาก query
onMounted(() => {
  booking.value = {
    movieTitle: route.query.movie || "ไม่ระบุ",
    cinema: route.query.cinema || "ไม่ระบุ",
    date: route.query.date || "ไม่ระบุ",
    time: route.query.time || "ไม่ระบุ",
    seats: route.query.seats?.split(",") || [],
    totalPrice: parseInt(route.query.total || 0),
  };

  // ✅ สร้าง QR Code สำหรับหน้านี้ (เฉพาะแสดง)
  qrUrl.value = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    booking.value.movieTitle
  )}`;
});

// ✅ ยืนยันการชำระเงิน
const confirmPayment = async () => {
  try {
    const res = await axios.post("/bookings", booking.value, {
      headers: {
        Authorization: `Bearer ${token}`, // ✅ แนบ token
      },
    });

    console.log("✅ บันทึกการจอง:", res.data);

    // ไปหน้า Ticket พร้อมข้อมูลจาก backend จริง
    router.push({
      path: "/ticket",
      query: {
        movie: booking.value.movieTitle,
        time: booking.value.time,
        seats: booking.value.seats.join(", "),
        qr: res.data.booking.qrCode,
      },
    });
  } catch (err) {
    console.error("❌ ชำระเงินไม่สำเร็จ:", err.response?.data || err);
    alert("เกิดข้อผิดพลาดในการบันทึกการจอง");
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
