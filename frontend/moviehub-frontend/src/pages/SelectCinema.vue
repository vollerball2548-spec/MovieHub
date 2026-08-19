<template>
  <div class="page-shell min-h-screen text-white">
    <h1 class="text-3xl font-bold text-orange mb-6 text-center">🏢 เลือกโรงภาพยนตร์</h1>

    <div class="surface mx-auto max-w-4xl rounded-2xl p-6">
      <!-- แสดงหนัง -->
      <div class="flex flex-col md:flex-row items-center gap-6 mb-6">
        <img
          :src="posterUrl"
          alt="Poster"
          class="w-48 rounded-lg shadow-md"
        />
        <div>
          <h2 class="text-2xl font-bold">{{ movie.title }}</h2>
          <p class="text-gray-400 mt-2">{{ movie.overview || "ไม่มีข้อมูลเรื่องย่อ" }}</p>
        </div>
      </div>

      <h2 class="text-xl font-semibold text-orange mb-4">🎬 เลือกโรงฉาย</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <button
          v-for="cinema in cinemas"
          :key="cinema"
          @click="selectCinema(cinema)"
          class="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-4 text-left transition hover:border-orange hover:bg-orange hover:text-white"
        >
          {{ cinema }}
        </button>
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
const cinemas = ref([]);

onMounted(() => {
  const movieData = route.query.movie ? JSON.parse(decodeURIComponent(route.query.movie)) : null;
  if (!movieData) {
    router.push("/");
    return;
  }

  movie.value = movieData;
  const poster = movie.value.poster_path || movie.value.poster;
  posterUrl.value = poster?.startsWith("http")
    ? poster
    : poster
    ? `https://image.tmdb.org/t/p/w500${poster}`
    : `https://placehold.co/500x750/17202c/f97316?text=${encodeURIComponent(movie.value.title || "MovieHub")}`;
  cinemas.value = movie.value.showtimes?.map((item) => item.cinema) || [
    "Major Cineplex รัชโยธิน",
    "Major Cineplex ปิ่นเกล้า",
    "Major Cineplex เมกาบางนา",
    "Major Cineplex พระราม 3",
  ];
});

const selectCinema = (cinema) => {
  router.push({
    path: "/select-showtime",
    query: {
      movie: encodeURIComponent(JSON.stringify(movie.value)),
      cinema,
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
