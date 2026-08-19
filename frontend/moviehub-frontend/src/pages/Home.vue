<template>
  <div class="p-6">
    <h1 class="text-3xl font-bold text-orange mb-6">🎥 ภาพยนตร์ที่กำลังฉาย</h1>

    <div class="flex flex-wrap gap-6 justify-center">
      <MovieCard
        v-for="movie in movies"
        :key="movie._id"
        :id="movie._id"
        :title="movie.title"
        :poster="movie.poster"
        :duration="movie.duration"
      />
    </div>
  </div>
</template>

<script setup>
import axios from "axios";
import { ref, onMounted } from "vue";
import MovieCard from "../components/MovieCard.vue";

const movies = ref([]);

onMounted(async () => {
  const res = await axios.get("/movies");
  movies.value = res.data;
});
</script>
