<template>
  <main class="page-shell min-h-screen p-6 text-white">
    <section class="mx-auto max-w-6xl">
      <p class="text-sm font-bold uppercase tracking-widest text-orange">MovieHub · Admin</p>
      <h1 class="mt-2 text-3xl font-black">จัดการหนัง โรงหนัง และรอบฉาย</h1>
      <p class="mt-2 text-sm text-slate-400">หน้านี้ต้องใช้บัญชี ADMIN เท่านั้น การตรวจสอบสิทธิ์ทำที่ฝั่งเซิร์ฟเวอร์</p>
      <p v-if="error" class="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-rose-200">{{ error }}</p>
      <p v-if="notice" class="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-emerald-200">{{ notice }}</p>

      <div class="mt-8 grid gap-8 lg:grid-cols-2">
        <section class="surface rounded-2xl p-5">
          <h2 class="text-xl font-bold">เพิ่มภาพยนตร์</h2>
          <form class="mt-4 space-y-3" @submit.prevent="createMovie">
            <input v-model="movieForm.title" required placeholder="ชื่อหนัง" class="w-full rounded-lg bg-white/10 p-3" />
            <div class="grid grid-cols-2 gap-3">
              <input v-model="movieForm.genre" placeholder="แนว เช่น Action" class="rounded-lg bg-white/10 p-3" />
              <input v-model.number="movieForm.year" type="number" min="1888" max="2200" placeholder="ปีที่ฉาย" class="rounded-lg bg-white/10 p-3" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <input v-model.number="movieForm.duration" type="number" min="1" placeholder="ความยาว (นาที)" class="rounded-lg bg-white/10 p-3" />
              <input v-model="movieForm.poster" placeholder="Poster URL" class="rounded-lg bg-white/10 p-3" />
            </div>
            <textarea v-model="movieForm.description" rows="3" placeholder="เรื่องย่อ" class="w-full rounded-lg bg-white/10 p-3"></textarea>
            <button class="primary-button w-full" :disabled="busy">{{ busy ? "กำลังบันทึก…" : "เพิ่มภาพยนตร์" }}</button>
          </form>
          <p class="mt-4 text-sm text-slate-400">มี {{ movies.length }} เรื่องในระบบ</p>
        </section>

        <section class="surface rounded-2xl p-5">
          <h2 class="text-xl font-bold">เพิ่มโรงภาพยนตร์</h2>
          <form class="mt-4 space-y-3" @submit.prevent="createCinema">
            <input v-model="cinemaForm.name" required placeholder="ชื่อโรงภาพยนตร์" class="w-full rounded-lg bg-white/10 p-3" />
            <input v-model="cinemaForm.address" placeholder="ที่อยู่" class="w-full rounded-lg bg-white/10 p-3" />
            <button class="primary-button w-full" :disabled="busy">{{ busy ? "กำลังบันทึก…" : "เพิ่มโรงภาพยนตร์" }}</button>
          </form>
          <div class="mt-5 space-y-3">
            <article v-for="cinema in cinemas" :key="cinema.id" class="rounded-xl border border-white/10 p-3">
              <p class="font-semibold">{{ cinema.name }}</p>
              <p class="text-xs text-slate-400">{{ cinema.address || '-' }} · {{ cinema.screens?.length || 0 }} โรงฉาย</p>
              <p class="mt-1 text-xs text-slate-400">โรง: {{ (cinema.screens || []).map((screen) => screen.name).join(', ') || '-' }}</p>
            </article>
          </div>
        </section>

        <section class="surface rounded-2xl p-5">
          <h2 class="text-xl font-bold">เพิ่มโรงฉาย (Screen)</h2>
          <form class="mt-4 space-y-3" @submit.prevent="createScreen">
            <select v-model="screenForm.cinemaId" required class="w-full rounded-lg bg-slate-800 p-3">
              <option value="">เลือกโรงภาพยนตร์</option>
              <option v-for="cinema in cinemas" :key="cinema.id" :value="cinema.id">{{ cinema.name }}</option>
            </select>
            <input v-model="screenForm.name" required placeholder="ชื่อโรงฉาย เช่น Screen 1" class="w-full rounded-lg bg-white/10 p-3" />
            <input v-model="screenForm.format" placeholder="รูปแบบ เช่น 2D / IMAX" class="w-full rounded-lg bg-white/10 p-3" />
            <div class="grid grid-cols-2 gap-3">
              <input v-model.number="screenForm.rowCount" type="number" min="1" max="30" placeholder="จำนวนแถว" class="rounded-lg bg-white/10 p-3" />
              <input v-model.number="screenForm.seatsPerRow" type="number" min="1" max="30" placeholder="ที่นั่งต่อแถว" class="rounded-lg bg-white/10 p-3" />
            </div>
            <button class="primary-button w-full" :disabled="busy">{{ busy ? "กำลังบันทึก…" : "เพิ่มโรงฉาย + ที่นั่ง" }}</button>
          </form>
          <p class="mt-3 text-xs text-slate-400">ระบบจะสร้างที่นั่ง A1, A2, … ตามจำนวนแถวและที่นั่งต่อแถว</p>
        </section>

        <section class="surface rounded-2xl p-5">
          <h2 class="text-xl font-bold">เพิ่มรอบฉาย</h2>
          <form class="mt-4 space-y-3" @submit.prevent="createShowtime">
            <select v-model="showtimeForm.movieId" required class="w-full rounded-lg bg-slate-800 p-3">
              <option value="">เลือกภาพยนตร์</option>
              <option v-for="movie in movies" :key="movie.id" :value="movie.id">{{ movie.title }}</option>
            </select>
            <select v-model="showtimeForm.screenId" required class="w-full rounded-lg bg-slate-800 p-3">
              <option value="">เลือกโรงฉาย</option>
              <option v-for="screen in screens" :key="screen.id" :value="screen.id">{{ screen.cinemaName }} · {{ screen.name }}</option>
            </select>
            <label class="block text-sm text-slate-300">เริ่ม
              <input v-model="showtimeForm.startsAt" type="datetime-local" required class="mt-1 w-full rounded-lg bg-white/10 p-3" />
            </label>
            <label class="block text-sm text-slate-300">จบ
              <input v-model="showtimeForm.endsAt" type="datetime-local" required class="mt-1 w-full rounded-lg bg-white/10 p-3" />
            </label>
            <input v-model.number="showtimeForm.basePrice" type="number" min="0" step="0.01" placeholder="ราคาต่อที่นั่ง" class="w-full rounded-lg bg-white/10 p-3" />
            <button class="primary-button w-full" :disabled="busy">{{ busy ? "กำลังบันทึก…" : "เพิ่มรอบฉาย" }}</button>
          </form>
        </section>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import axios from "axios";

const movies = ref([]);
const cinemas = ref([]);
const busy = ref(false);
const error = ref("");
const notice = ref("");

const movieForm = ref({ title: "", genre: "", year: null, duration: null, poster: "", description: "" });
const cinemaForm = ref({ name: "", address: "" });
const screenForm = ref({ cinemaId: "", name: "", format: "", rowCount: 10, seatsPerRow: 12 });
const showtimeForm = ref({ movieId: "", screenId: "", startsAt: "", endsAt: "", basePrice: 200 });

const screens = computed(() => cinemas.value.flatMap((cinema) =>
  (cinema.screens || []).map((screen) => ({ ...screen, cinemaName: cinema.name }))
));

function toLocalInput(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

watch([() => showtimeForm.value.movieId, () => showtimeForm.value.startsAt], () => {
  if (showtimeForm.value.endsAt) return;
  const movie = movies.value.find((item) => item.id === showtimeForm.value.movieId);
  const duration = Number(movie?.duration || 0);
  if (!duration || !showtimeForm.value.startsAt) return;
  const start = new Date(showtimeForm.value.startsAt);
  if (Number.isNaN(start.getTime())) return;
  showtimeForm.value.endsAt = toLocalInput(new Date(start.getTime() + duration * 60000));
});

async function load() {
  error.value = "";
  try {
    const [movieResponse, cinemaResponse] = await Promise.all([
      axios.get("/movies?page=1&pageSize=100"),
      axios.get("/cinemas"),
    ]);
    const movieRows = Array.isArray(movieResponse.data) ? movieResponse.data : (movieResponse.data.data || []);
    movies.value = movieRows.map((movie) => ({ ...movie, id: movie.id || movie._id }));
    cinemas.value = Array.isArray(cinemaResponse.data) ? cinemaResponse.data : (cinemaResponse.data.data || []);
  } catch (e) {
    error.value = e.response?.data?.error?.message || "โหลดข้อมูลไม่สำเร็จ (ต้องใช้บัญชี ADMIN)";
  }
}

async function run(action, successMessage) {
  busy.value = true; error.value = ""; notice.value = "";
  try {
    await action();
    notice.value = successMessage;
    await load();
    return true;
  } catch (e) {
    error.value = e.response?.data?.error?.message || "บันทึกข้อมูลไม่สำเร็จ";
    return false;
  } finally {
    busy.value = false;
  }
}

async function createMovie() {
  const form = movieForm.value;
  const payload = { title: form.title.trim() };
  if (form.genre?.trim()) payload.genre = form.genre.trim();
  if (form.year !== null && form.year !== "") payload.year = Number(form.year);
  if (form.duration !== null && form.duration !== "") payload.duration = Number(form.duration);
  if (form.poster?.trim()) payload.poster = form.poster.trim();
  if (form.description?.trim()) payload.description = form.description.trim();
  const ok = await run(() => axios.post("/movies", payload), "เพิ่มภาพยนตร์แล้ว");
  if (ok) movieForm.value = { title: "", genre: "", year: null, duration: null, poster: "", description: "" };
}

async function createCinema() {
  const form = cinemaForm.value;
  const payload = { name: form.name.trim() };
  if (form.address?.trim()) payload.address = form.address.trim();
  const ok = await run(() => axios.post("/cinemas", payload), "เพิ่มโรงภาพยนตร์แล้ว");
  if (ok) cinemaForm.value = { name: "", address: "" };
}

async function createScreen() {
  const form = screenForm.value;
  const payload = {
    name: form.name.trim(),
    rowCount: Number(form.rowCount),
    seatsPerRow: Number(form.seatsPerRow),
  };
  if (form.format?.trim()) payload.format = form.format.trim();
  const ok = await run(() => axios.post(`/cinemas/${form.cinemaId}/screens`, payload), "เพิ่มโรงฉายและที่นั่งแล้ว");
  if (ok) screenForm.value = { cinemaId: "", name: "", format: "", rowCount: 10, seatsPerRow: 12 };
}

async function createShowtime() {
  const form = showtimeForm.value;
  const payload = {
    movieId: form.movieId,
    screenId: form.screenId,
    startsAt: new Date(form.startsAt).toISOString(),
    endsAt: new Date(form.endsAt).toISOString(),
    basePrice: Number(form.basePrice),
  };
  const ok = await run(() => axios.post("/showtimes", payload), "เพิ่มรอบฉายแล้ว");
  if (ok) showtimeForm.value = { movieId: "", screenId: "", startsAt: "", endsAt: "", basePrice: 200 };
}

onMounted(load);
</script>
