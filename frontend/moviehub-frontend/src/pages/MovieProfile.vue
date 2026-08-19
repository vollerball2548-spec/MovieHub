<template>
  <div class="page-shell min-h-screen text-white">
    <div v-if="movie" class="surface overflow-hidden rounded-3xl">
      <div class="grid lg:grid-cols-[280px_1fr]">
        <img :src="posterUrl" :alt="movie.title" class="h-full min-h-[380px] w-full object-cover" />
        <div class="p-6 sm:p-10">
          <p class="text-sm font-bold uppercase tracking-[0.25em] text-orange">MOVIE PROFILE</p>
          <h1 class="mt-3 text-4xl font-black sm:text-5xl">{{ movie.title }}</h1>
          <div class="mt-4 flex flex-wrap gap-2 text-sm"><span class="rounded-full bg-orange/15 px-3 py-1 text-orange">{{ movie.genre || "ภาพยนตร์" }}</span><span class="rounded-full bg-white/10 px-3 py-1 text-slate-300">{{ movie.year || "กำลังฉาย" }}</span><span class="rounded-full bg-white/10 px-3 py-1 text-slate-300">{{ movie.duration || "-" }} นาที</span></div>
          <p class="mt-7 max-w-2xl leading-8 text-slate-300">{{ movie.overview || movie.description || "รายละเอียดภาพยนตร์ยังไม่มี" }}</p>
          <button class="primary-button mt-8" @click="startBooking">เลือกโรงและรอบฉาย</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
let movie = null;
try {
  movie = route.query.movie ? JSON.parse(decodeURIComponent(route.query.movie)) : null;
} catch {
  movie = null;
}

const posterUrl = computed(() => {
  const poster = movie?.poster_path || movie?.poster;
  if (poster?.startsWith("http")) return poster;
  if (poster) return `https://image.tmdb.org/t/p/w500${poster}`;
  return `https://placehold.co/500x750/17202c/f97316?text=${encodeURIComponent(movie?.title || "MovieHub")}`;
});

const startBooking = () => router.push({ path: "/select-cinema", query: { movie: encodeURIComponent(JSON.stringify(movie)) } });
</script>
