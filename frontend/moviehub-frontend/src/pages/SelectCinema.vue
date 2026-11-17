<template>
  <main class="page-shell min-h-screen p-6 text-white">
    <section class="surface mx-auto max-w-3xl rounded-3xl p-6">
      <div class="flex items-center gap-4">
        <img :src="poster" :alt="movie.title" @error="onPosterError" class="h-28 w-20 rounded-lg object-cover" />
        <div><h1 class="text-3xl font-bold text-orange">เลือกโรงภาพยนตร์</h1><p class="mt-2 text-slate-300">{{ movie.title }}</p></div>
      </div>
      <p v-if="error" class="mt-4 text-rose-300">{{ error }}</p>
      <div class="mt-6 grid gap-3 sm:grid-cols-2">
        <button v-for="cinema in cinemas" :key="cinema.id" class="rounded-xl bg-white/10 p-4 text-left hover:bg-orange" @click="router.push({path:'/select-showtime',query:{movieId:movie.id,cinemaId:cinema.id}})">
          <b>{{ cinema.name }}</b><p class="text-sm text-slate-300">{{ cinema.address }}</p>
          <p class="mt-2 text-xs text-slate-400">{{ cinema.screens?.length || 0 }} โรงฉาย</p>
        </button>
      </div>
      <p v-if="!cinemas.length && !error" class="mt-4 text-slate-400">ยังไม่มีโรงที่มีรอบฉายสำหรับหนังเรื่องนี้</p>
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
const cinemas = ref([]);
const error = ref("");
const movie = ref({});
const poster = ref("");
function onPosterError(event) {
  event.target.onerror = null;
  event.target.src = createPosterFallback(movie.value.title, movie.value.genre);
}

onMounted(async () => {
  try { movie.value = JSON.parse(decodeURIComponent(route.query.movie || "{}")); } catch { movie.value = {}; }
  if (!movie.value.id) { router.replace("/"); return; }
  poster.value = movie.value.poster_path || movie.value.poster || createPosterFallback(movie.value.title, movie.value.genre);
  try {
    const { data } = await axios.get("/cinemas", { params: { movieId: movie.value.id } });
    cinemas.value = data.data || data;
  } catch (e) {
    error.value = e.response?.data?.error?.message || "โหลดรายชื่อโรงไม่สำเร็จ";
  }
});
</script>
