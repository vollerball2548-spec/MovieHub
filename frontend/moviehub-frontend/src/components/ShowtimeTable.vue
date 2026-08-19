<template>
  <div class="bg-card p-4 rounded-xl shadow-md">
    <h2 class="text-xl font-bold text-orange mb-4">รอบฉายวันนี้</h2>
    <div v-for="(times, cinema) in showtimes" :key="cinema" class="mb-4">
      <p class="font-semibold text-white mb-2">{{ cinema }}</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="t in times"
          :key="t"
          @click="$emit('select', t)"
          class="bg-orange px-3 py-1 rounded-lg hover:bg-orange-600 transition">
          {{ t }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  showtimes: Object,
});
</script>
