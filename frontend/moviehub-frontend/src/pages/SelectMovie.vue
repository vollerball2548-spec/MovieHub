<template>
  <div class="page-shell min-h-screen text-white">
    <section class="mb-10 grid gap-8 overflow-hidden rounded-3xl border border-orange/20 bg-gradient-to-br from-orange/20 via-white/[0.04] to-transparent p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-end">
      <div>
        <p class="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-orange">MovieHub cinema</p>
        <h1 class="max-w-2xl text-4xl font-black leading-tight sm:text-6xl">ค่ำคืนที่ดี เริ่มจากหนังเรื่องโปรด</h1>
        <p class="mt-4 max-w-xl text-base leading-7 text-slate-300">เช่าดูภาพยนตร์เรื่องละ 50 บาท ส่งสลิปให้แอดมินตรวจ แล้วรับชมผ่านเว็บไซต์</p>
      </div>
      <div class="hidden text-right lg:block"><p class="text-5xl font-black text-orange">01</p><p class="text-sm text-slate-400">เลือกภาพยนตร์</p></div>
    </section>
    <div class="mb-5 flex items-end justify-between gap-4"><div><p class="text-sm text-slate-400">WATCH ONLINE</p><h2 class="mt-1 text-2xl font-bold sm:text-3xl">เลือกเรื่องเพื่อเช่าดู</h2></div><span v-if="!loading" class="text-sm text-slate-500">{{ movies.filter(m=>m.availableForPurchase).length }} เรื่องพร้อมดู · {{ movies.length }} เรื่องในรายการ</span></div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <div v-for="n in 5" :key="n" class="h-80 animate-pulse rounded-2xl bg-white/10"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error && movies.length === 0" class="surface rounded-2xl p-8 text-center">
      <p class="text-lg font-bold">ยังโหลดรายการหนังไม่ได้</p><p class="mt-2 text-sm text-slate-400">{{ error }}</p><button class="primary-button mt-5" @click="loadMovies">ลองใหม่</button>
    </div>

    <!-- Movies -->
    <div
      v-else
      class="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5"
    >
      <div
        v-for="movie in movies"
        :key="movie.id"
        @click="selectMovie(movie)"
        class="group cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] shadow-lg transition hover:-translate-y-1 hover:border-orange/60"
      >
        <img
          :src="getPoster(movie.poster_path, movie.title, movie.genre)"
          :alt="movie.title"
          @error="onPosterError($event, movie)"
          class="h-64 w-full object-cover transition duration-500 group-hover:scale-105 sm:h-80"
        />
        <div class="p-4">
          <h2 class="truncate text-sm font-bold sm:text-base">{{ movie.title }}</h2>
          <p class="mt-2 text-xs text-slate-400"><span class="text-orange">●</span> {{ movie.genre || "Now showing" }} <span v-if="movie.year">· {{ movie.year }}</span>
          </p>
          <p class="mt-3 text-xs font-semibold" :class="movie.availableForPurchase ? 'text-emerald-300' : 'text-amber-300'">{{ movie.availableForPurchase ? 'พร้อมเช่าดู · 50 บาท' : 'กำลังเตรียมวิดีโอ' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import { createPosterFallback } from "../utils/poster.js";

const router = useRouter();

const movies = ref([]);
const loading = ref(true);
const error = ref("");

const getPoster = (path, title = "MovieHub", genre = "MOVIE") =>
  path?.startsWith("http")
    ? path
    : path
    ? `https://image.tmdb.org/t/p/w500${path}`
    : createPosterFallback(title, genre);

const onPosterError = (event, movie) => {
  event.target.onerror = null;
  event.target.src = createPosterFallback(movie.title, movie.genre);
};

const loadMovies = async () => {
  loading.value = true;
  error.value = "";
  try {
    const res = await axios.get("/movies");
    const rows = Array.isArray(res.data) ? res.data : (res.data?.data || []);
    movies.value = rows.map((movie) => ({
      ...movie,
      id: movie._id || movie.id,
      poster_path: movie.poster || movie.posterUrl,
      overview: movie.description,
    }));
    if (movies.value.length === 0) error.value = "ยังไม่มีภาพยนตร์ในระบบ กรุณาติดต่อผู้ดูแล";
  } catch (err) {
    movies.value = [];
    error.value = err.response?.data?.error?.message || "เชื่อมต่อระบบรายการหนังไม่ได้";
  } finally {
    loading.value = false;
  }
};

onMounted(loadMovies);

// ✅ เมื่อเลือกหนัง → ไปหน้าเลือกโรงก่อน
const selectMovie = (movie) => {
  router.push({
    path: "/movie-access",
    query: { movieId: movie.id },
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
</style>
