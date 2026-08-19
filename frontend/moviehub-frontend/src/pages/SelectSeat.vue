<template>
  <div class="min-h-screen bg-dark text-white p-6">
    <div class="max-w-4xl mx-auto bg-zinc-900 p-6 rounded-2xl shadow-lg">
      <!-- ข้อมูลหนัง -->
      <h1 class="text-3xl font-bold text-orange mb-2">{{ movie }}</h1>
      <p class="text-gray-400 mb-6">
        โรง: {{ cinema }} | วัน: {{ date }} | เวลา: {{ time }}
      </p>

      <!-- หน้าจอ -->
      <div class="text-center text-gray-400 mb-2">📽️ หน้าจอภาพยนตร์</div>
      <div class="h-2 bg-orange mb-6 rounded-full"></div>

      <!-- แผนผังที่นั่ง -->
      <div class="grid grid-cols-8 gap-3 justify-center mb-6">
        <button
          v-for="seat in seats"
          :key="seat.id"
          @click="toggleSeat(seat)"
          :disabled="seat.booked"
          :class="[
            'py-2 rounded-md font-semibold transition',
            seat.booked
              ? 'bg-gray-700 cursor-not-allowed text-gray-400'
              : selectedSeats.includes(seat.id)
              ? 'bg-orange text-white'
              : 'bg-gray-800 hover:bg-gray-700'
          ]"
        >
          {{ seat.label }}
        </button>
      </div>

      <!-- แสดงผลรวม -->
      <div class="text-center mt-4">
        <p class="text-lg">ที่นั่งที่เลือก: 
          <span class="text-orange font-bold">
            {{ selectedSeats.join(", ") || "ยังไม่ได้เลือก" }}
          </span>
        </p>
        <p class="text-gray-300 mt-2">ราคารวม: {{ totalPrice }} บาท</p>
      </div>

      <!-- ปุ่มถัดไป -->
      <div class="text-center mt-8">
        <button
          @click="goToPayment"
          :disabled="selectedSeats.length === 0"
          class="bg-orange text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange/90 disabled:bg-gray-700 disabled:text-gray-400 transition"
        >
          ไปหน้าชำระเงิน 💳
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";  // ✅ เพิ่ม computed
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const movie = ref("");
const cinema = ref("");
const date = ref("");
const time = ref("");
const seats = ref([]);
const selectedSeats = ref([]);

const seatPrice = 160;

// ✅ โหลดข้อมูลจากหน้า showtime
onMounted(() => {
  movie.value = route.query.movie || "ไม่ระบุ";
  cinema.value = route.query.cinema || "ไม่ระบุ";
  date.value = route.query.date || "ไม่ระบุ";
  time.value = route.query.time || "ไม่ระบุ";

  // ✅ จำลองที่นั่ง 8x5 (40 ที่)
  let id = 1;
  const rows = ["A", "B", "C", "D", "E"];
  for (let row of rows) {
    for (let i = 1; i <= 8; i++) {
      seats.value.push({
        id: `${row}${i}`,
        label: `${row}${i}`,
        booked: Math.random() < 0.15, // สุ่มที่นั่งที่ถูกจองแล้ว
      });
    }
  }
});

// ✅ กดเลือก/ยกเลิกที่นั่ง
const toggleSeat = (seat) => {
  if (seat.booked) return;
  const index = selectedSeats.value.indexOf(seat.id);
  if (index > -1) {
    selectedSeats.value.splice(index, 1);
  } else {
    selectedSeats.value.push(seat.id);
  }
};

// ✅ คำนวณราคารวม
const totalPrice = computed(() => selectedSeats.value.length * seatPrice);

// ✅ ไปหน้าชำระเงิน
const goToPayment = () => {
  router.push({
    path: "/payment",
    query: {
      movie: movie.value,
      cinema: cinema.value,
      date: date.value,
      time: time.value,
      seats: selectedSeats.value.join(","),
      total: totalPrice.value,
    },
  });
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
