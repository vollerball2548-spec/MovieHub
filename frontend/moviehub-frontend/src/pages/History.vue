<template>
  <div class="p-6 bg-dark min-h-screen text-white">
    <h1 class="text-3xl font-bold text-orange mb-6 text-center">🎟️ ประวัติการจอง</h1>

    <!-- กำลังโหลด -->
    <div v-if="loading" class="text-gray-400 text-center">กำลังโหลดข้อมูล...</div>

    <!-- ไม่มีข้อมูล -->
    <div v-else-if="bookings.length === 0" class="text-center text-gray-500">
      😢 ยังไม่มีประวัติการจอง
    </div>

    <!-- แสดงรายการจอง -->
    <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="(item, i) in bookings"
        :key="i"
        class="bg-zinc-900 p-5 rounded-xl shadow-lg border border-gray-800 hover:border-orange transition"
      >
        <img
          :src="item.qrCode"
          alt="QR"
          class="w-32 h-32 mx-auto mb-3 rounded-lg border border-gray-700"
        />
        <h2 class="text-lg font-semibold text-orange text-center mb-2">
          {{ item.movieTitle }}
        </h2>
        <p class="text-sm text-gray-300 text-center">🎬 ที่นั่ง: {{ item.seats.join(", ") }}</p>
        <p class="text-sm text-gray-400 text-center">🕒 เวลา: {{ item.time }}</p>
        <p class="text-sm text-gray-400 text-center">💰 ราคา: {{ item.totalPrice }} บาท</p>
        <p class="text-xs text-gray-500 text-center mt-1">
          📅 {{ formatDate(item.createdAt) }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";

const bookings = ref([]);
const loading = ref(true);
const error = ref("");

// ✅ ดึง Token จาก localStorage (แนบไปกับ header)
const token = localStorage.getItem("token");

const fetchHistory = async () => {
  try {
    const res = await axios.get("/bookings", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    bookings.value = res.data;
  } catch (err) {
    console.error("❌ โหลดข้อมูลไม่สำเร็จ:", err);
    error.value = err.response?.data?.error || "โหลดประวัติไม่สำเร็จ";
  } finally {
    loading.value = false;
  }
};

// ✅ ฟังก์ชันแปลงวันที่ให้สวยขึ้น
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

onMounted(fetchHistory);
</script>

<style scoped>
.bg-dark {
  background-color: #121212;
}
.text-orange {
  color: #ff6600;
}
</style>
