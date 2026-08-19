<template>
  <div class="bg-card rounded-xl overflow-hidden shadow-md hover:shadow-lg transition p-3 w-48">
    <img :src="poster" alt="poster" class="rounded-md w-full h-64 object-cover mb-3" />
    <h3 class="text-orange text-lg font-semibold truncate">{{ title }}</h3>
    <p class="text-sm text-gray-400 truncate">{{ duration }} นาที</p>
    <router-link :to="`/select-showtime?movie=${id}`"
      class="block mt-3 bg-orange text-white text-center py-2 rounded-lg font-semibold hover:bg-orange-600 transition">
      รอบฉาย
    </router-link>
  </div>
</template>

<script setup>
defineProps({
  id: String,
  title: String,
  poster: String,
  duration: Number,
});
</script>
