<template>
  <main class="page-shell min-h-screen p-6 text-white">
    <section class="surface mx-auto max-w-4xl rounded-3xl p-6">
      <div class="flex items-center gap-4">
        <img :src="poster" :alt="movie.title" @error="onPosterError" class="h-24 w-16 rounded-lg object-cover" />
        <div><h1 class="text-3xl font-bold text-orange">เลือกรอบฉาย</h1><p class="mt-2">{{ movie.title }} · {{ cinema.name }}</p></div>
      </div>
      <div class="mt-7 flex flex-wrap gap-2">
        <button v-for="day in days" :key="day.value" @click="date=day.value;load()" :class="['rounded-lg px-4 py-2',date===day.value?'bg-orange text-white':'bg-white/10 hover:bg-white/20']">{{ day.label }}</button>
      </div>
      <p v-if="error" class="mt-4 text-rose-300">{{ error }}</p>
      <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button v-for="item in showtimes" :key="item.id" class="rounded-xl bg-white/10 p-4 hover:bg-orange" @click="router.push({path:'/select-seat',query:{showtimeId:item.id}})">
          {{ new Date(item.startsAt).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'}) }}
          <small class="mt-1 block">{{ Number(item.basePrice) }} บาท</small>
        </button>
      </div>
      <p v-if="!showtimes.length && !error" class="mt-4 text-slate-400">วันนี้ไม่มีรอบฉาย ลองเลือกวันอื่น</p>
    </section>
  </main>
</template>
<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import axios from "axios";
import { createPosterFallback } from "../utils/poster.js";

const route = useRoute();
const router = useRouter();
const showtimes = ref([]);
const error = ref("");
const bangkokToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const days = Array.from({ length: 7 }, (_, index) => {
  const date = new Date(`${bangkokToday}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + index);
  const value = date.toISOString().slice(0, 10);
  return { value, label: index === 0 ? "วันนี้" : new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", weekday: "short", day: "numeric", month: "short" }).format(date) };
});
const date = ref(days[0].value);
const movie = ref({ id: route.query.movieId, title: "ภาพยนตร์", genre: "MOVIE" });
const cinema = ref({ id: route.query.cinemaId, name: "โรงภาพยนตร์" });
const poster = ref(createPosterFallback(movie.value.title, movie.value.genre));

async function load() {
  try {
    error.value = "";
    const { data } = await axios.get("/showtimes", { params: { movieId: movie.value.id, cinemaId: cinema.value.id, date: date.value } });
    showtimes.value = data.data || data;
  } catch (e) {
    error.value = e.response?.data?.error?.message || "โหลดรอบฉายไม่สำเร็จ";
    showtimes.value = [];
  }
}

function onPosterError(event) {
  event.target.onerror = null;
  event.target.src = createPosterFallback(movie.value.title, movie.value.genre);
}

onMounted(async () => {
  if (!movie.value.id || !cinema.value.id) { router.replace("/"); return; }
  try {
    const [movieResponse, cinemaResponse] = await Promise.all([
      axios.get(`/movies/${movie.value.id}`), axios.get(`/cinemas/${cinema.value.id}`),
    ]);
    const movieData = movieResponse.data.data || movieResponse.data;
    movie.value = { ...movieData, id: movieData.id || movieData._id, genre: movieData.genre || "MOVIE" };
    const cinemaData = cinemaResponse.data.data || cinemaResponse.data;
    cinema.value = { ...cinemaData, id: cinemaData.id || cinemaData._id };
    poster.value = movieData.poster || movieData.posterUrl || createPosterFallback(movie.value.title, movie.value.genre);
  } catch {
    error.value = "โหลดข้อมูลภาพยนตร์หรือโรงภาพยนตร์ไม่สำเร็จ";
    return;
  }
  await load();
});
</script>
