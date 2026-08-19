<template>
  <div class="page-shell min-h-screen text-white">
    <section class="mb-10 grid gap-8 overflow-hidden rounded-3xl border border-orange/20 bg-gradient-to-br from-orange/20 via-white/[0.04] to-transparent p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-end">
      <div>
        <p class="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-orange">MovieHub cinema</p>
        <h1 class="max-w-2xl text-4xl font-black leading-tight sm:text-6xl">ค่ำคืนที่ดี เริ่มจากหนังเรื่องโปรด</h1>
        <p class="mt-4 max-w-xl text-base leading-7 text-slate-300">เลือกหนัง เลือกรอบ และจองที่นั่งที่ใช่ได้ในไม่กี่ขั้นตอน</p>
      </div>
      <div class="hidden text-right lg:block"><p class="text-5xl font-black text-orange">01</p><p class="text-sm text-slate-400">เลือกภาพยนตร์</p></div>
    </section>
    <div class="mb-5 flex items-end justify-between gap-4"><div><p class="text-sm text-slate-400">NOW SHOWING</p><h2 class="mt-1 text-2xl font-bold sm:text-3xl">ภาพยนตร์กำลังฉาย</h2></div><span v-if="!loading" class="text-sm text-slate-500">{{ movies.length }} เรื่อง</span></div>

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
          :src="getPoster(movie.poster_path)"
          :alt="movie.title"
          class="h-64 w-full object-cover transition duration-500 group-hover:scale-105 sm:h-80"
        />
        <div class="p-4">
          <h2 class="truncate text-sm font-bold sm:text-base">{{ movie.title }}</h2>
          <p class="mt-2 text-xs text-slate-400"><span class="text-orange">●</span> {{ movie.genre || "Now showing" }} <span v-if="movie.year">· {{ movie.year }}</span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";

const router = useRouter();

const fallbackMovies = [
  { id: "fallback-1", title: "The Last Horizon", overview: "การเดินทางครั้งสุดท้ายที่จะเปลี่ยนทุกอย่าง", poster_path: "", genre: "Adventure", year: 2026 },
  { id: "fallback-2", title: "Midnight Signal", overview: "สัญญาณลึกลับในคืนที่ไม่มีใครหลับ", poster_path: "", genre: "Thriller", year: 2026 },
  { id: "fallback-3", title: "Ocean Between Us", overview: "เรื่องราวของคนสองคนที่กลับมาพบกัน", poster_path: "", genre: "Drama", year: 2026 },
  { id: "fallback-4", title: "Neon Runner", overview: "ภารกิจไล่ล่าท่ามกลางเมืองที่ไม่เคยหลับ", poster_path: "", genre: "Action", year: 2026 },
  { id: "fallback-5", title: "The Quiet Room", overview: "ความลับที่ซ่อนอยู่ในห้องปิดตาย", poster_path: "", genre: "Mystery", year: 2026 },
];
const movies = ref([]);
const loading = ref(true);
const error = ref("");

const getPoster = (path, title = "MovieHub") =>
  path?.startsWith("http")
    ? path
    : path
    ? `https://image.tmdb.org/t/p/w500${path}`
    : `https://placehold.co/500x750/17202c/f97316?text=${encodeURIComponent(title)}`;

const loadMovies = async () => {
  loading.value = true;
  error.value = "";
  try {
    const res = await axios.get("/movies");
    movies.value = (res.data || []).map((movie) => ({
      ...movie,
      id: movie._id,
      poster_path: movie.poster,
      overview: movie.description,
    }));
    if (movies.value.length === 0) movies.value = fallbackMovies;
  } catch (err) {
    movies.value = fallbackMovies;
    error.value = "แสดงรายการแนะนำชั่วคราว เนื่องจากเชื่อมต่อ TMDB ไม่ได้";
  } finally {
    loading.value = false;
  }
};

onMounted(loadMovies);

// ✅ เมื่อเลือกหนัง → ไปหน้าเลือกโรงก่อน
const selectMovie = (movie) => {
  router.push({
    path: "/movie-profile",
    query: { movie: encodeURIComponent(JSON.stringify(movie)) },
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
