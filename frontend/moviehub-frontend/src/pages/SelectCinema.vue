<template>
  <div class="min-h-screen bg-dark text-white p-6">
    <h1 class="text-3xl font-bold text-orange mb-6 text-center">🏢 เลือกโรงภาพยนตร์</h1>

    <div class="max-w-4xl mx-auto bg-zinc-900 p-6 rounded-2xl shadow-lg">
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
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <button
          v-for="cinema in cinemas"
          :key="cinema"
          @click="selectCinema(cinema)"
          class="bg-gray-800 hover:bg-orange hover:text-white py-3 px-4 rounded-lg transition"
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
const cinemas = ref([
  "SF World Cinema - Central World",
  "Major Cineplex - Ratchayothin",
  "Paragon Cineplex",
  "Icon Cineconic",
  "Mega Cineplex Bangna",
]);

onMounted(() => {
  const movieData = route.query.movie ? JSON.parse(decodeURIComponent(route.query.movie)) : null;
  if (!movieData) {
    router.push("/");
    return;
  }

  movie.value = movieData;
  posterUrl.value = movie.value.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.value.poster_path}`
    : "https://via.placeholder.com/300x450?text=No+Poster";
});

const selectCinema = (cinema) => {
  console.log("🏢 เลือกโรง:", cinema);
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
