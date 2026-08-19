<template>
  <div class="p-6 text-center">
    <h2 class="text-orange text-2xl font-bold mb-4">เลือกที่นั่ง</h2>
    <div class="grid grid-cols-8 gap-3 justify-center">
      <button
        v-for="seat in seats"
        :key="seat.id"
        :class="[
          'w-10 h-10 rounded-md font-bold',
          seat.selected ? 'bg-orange text-white' : 'bg-gray-700 hover:bg-orange-500',
        ]"
        @click="toggleSeat(seat)"
      >
        {{ seat.label }}
      </button>
    </div>
    <button
      @click="confirm"
      class="mt-6 bg-orange px-6 py-3 rounded-lg font-semibold hover:bg-orange-600"
    >
      ยืนยันที่นั่ง
    </button>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const seats = ref(
  Array.from({ length: 32 }, (_, i) => ({
    id: i + 1,
    label: String.fromCharCode(65 + Math.floor(i / 8)) + ((i % 8) + 1),
    selected: false,
  }))
);

const toggleSeat = (seat) => {
  seat.selected = !seat.selected;
};

const confirm = () => {
  const selected = seats.value.filter((s) => s.selected).map((s) => s.label);
  router.push({
    path: "/payment",
    query: { seats: selected.join(",") },
  });
};
</script>
