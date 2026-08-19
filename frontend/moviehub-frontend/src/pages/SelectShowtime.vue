<template>
  <div class="min-h-screen bg-dark text-white p-6">
    <!-- กล่องแสดงข้อมูลหนัง -->
    <div
      class="flex flex-col md:flex-row items-center md:items-start gap-6 max-w-4xl mx-auto bg-zinc-900 p-6 rounded-2xl shadow-lg"
    >
      <img
        :src="posterUrl"
        alt="Poster"
        class="w-64 rounded-lg shadow-lg"
      />

      <div class="flex-1">
        <h1 class="text-3xl font-bold text-orange mb-2">{{ movie.title }}</h1>
        <p class="text-gray-400 mb-2 italic">โรงภาพยนตร์: {{ cinema }}</p>
        <p class="text-gray-400 mb-4">{{ movie.overview || "ไม่มีข้อมูลเรื่องย่อ" }}</p>

        <!-- เลือกวัน -->
        <h2 class="text-xl font-semibold text-orange mb-2">📅 เลือกวันฉาย</h2>
        <div class="flex flex-wrap gap-3 mb-4">
          <button
            v-for="(day, i) in days"
            :key="i"
            @click="selectedDay = day"
            :class="[
              'px-4 py-2 rounded-lg transition font-medium',
              selectedDay === day
                ? 'bg-orange text-white'
                : 'bg-gray-800 hover:bg-gray-700'
            ]"
          >
            {{ formatDay(day) }}
          </button>
        </div>

        <!-- เลือกเวลา -->
        <h2 class="text-xl font-semibold text-orange mb-2">🕒 เลือกรอบฉาย</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <button
            v-for="time in showtimes"
            :key="time"
            @click="selectShowtime(time)"
            class="bg-gray-800 hover:bg-orange hover:text-white py-2 rounded-lg transition font-medium"
          >
            {{ time }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const movie = ref({});
const posterUrl = ref("");
const cinema = ref(""); // ✅ เพิ่มชื่อโรงหนัง
const days = ref([]);
const selectedDay = ref("");
const showtimes = ref(["11:30", "14:00", "17:00", "20:30"]);

onMounted(() => {
  // ✅ ดึงข้อมูลจาก query
  const movieData = route.query.movie
    ? JSON.parse(decodeURIComponent(route.query.movie))
    : null;
  if (!movieData) {
    router.push("/"); // ถ้าไม่มีข้อมูลให้กลับหน้าแรก
    return;
  }

  movie.value = movieData;
  cinema.value = route.query.cinema || "ไม่ระบุโรงภาพยนตร์";

  posterUrl.value = movie.value.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.value.poster_path}`
    : "https://via.placeholder.com/300x450?text=No+Poster";

  // ✅ สร้างวันที่ให้เลือก (วันนี้, พรุ่งนี้, มะรืน)
  const today = new Date();
  for (let i = 0; i < 3; i++) {
    const nextDay = new Date(today);
    nextDay.setDate(today.getDate() + i);
    days.value.push(nextDay);
  }
  selectedDay.value = days.value[0];
});

const formatDay = (date) => {
  return date.toLocaleDateString("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

// ✅ เมื่อเลือกเวลา → ไปหน้าเลือกที่นั่ง
const selectShowtime = (time) => {
  router.push({
    path: "/select-seat",
    query: {
      movie: movie.value.title,
      cinema: cinema.value,
      time,
      date: formatDay(selectedDay.value),
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
