<template>
  <main class="page-shell min-h-screen p-6 text-white">
    <section class="surface mx-auto max-w-3xl rounded-3xl p-6 sm:p-8">
      <p class="text-sm font-bold uppercase tracking-widest text-orange">MovieHub · เช่าดูรายเรื่อง</p>
      <h1 class="mt-2 text-3xl font-black">{{ movie?.title || "ภาพยนตร์" }}</h1>
      <p class="mt-3 text-slate-300">ชำระครั้งเดียว 50 บาทต่อเรื่อง เมื่อแอดมินตรวจสอบสลิปและอนุมัติแล้วจึงเริ่มรับชมได้</p>
      <p v-if="error" class="mt-5 rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-rose-200">{{ error }}</p>
      <div v-if="loading" class="py-10 text-center text-slate-400">กำลังโหลดข้อมูล…</div>
      <template v-else-if="movie">
        <div class="mt-6 grid gap-6 sm:grid-cols-[220px_1fr]">
          <img :src="movie.poster || createPosterFallback(movie.title, movie.genre)" :alt="movie.title" class="aspect-[2/3] w-full rounded-2xl object-cover" @error="$event.target.src=createPosterFallback(movie.title, movie.genre)" />
          <div class="space-y-4">
            <p class="whitespace-pre-line text-sm leading-7 text-slate-300">{{ movie.description }}</p>
            <div v-if="purchase?.status === 'APPROVED'" class="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
              <p class="font-bold text-emerald-200">อนุมัติแล้ว · ดูเรื่องนี้ได้</p>
              <video v-if="streamUrl" :src="streamUrl" controls controlsList="nodownload" class="mt-4 w-full rounded-xl" />
              <button v-else class="primary-button mt-4" @click="startPlayback">เปิดเครื่องเล่น</button>
            </div>
            <div v-else-if="purchase?.status === 'UNDER_REVIEW'" class="rounded-xl border border-amber-300/30 bg-amber-400/10 p-4 text-amber-100">รับสลิปแล้ว กำลังรอแอดมินตรวจสอบ</div>
            <div v-else-if="purchase?.status === 'AWAITING_PAYMENT' || purchase?.status === 'REJECTED'" class="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p class="font-bold">สแกน PromptPay เพื่อชำระ {{ qr ? qr.amount : purchase?.amount }} บาท</p>
              <div v-if="qr?.image" class="mx-auto my-4 w-full max-w-xs">
                <img :src="qr.image" alt="PromptPay QR พร้อมยอดชำระ" class="w-full rounded-xl bg-white p-2" />
                <div class="mt-3 space-y-1 text-center text-xs text-slate-300">
                  <p>พร้อมเพย์ {{ qr.promptPayId }}</p>
                  <p>ยอดชำระ <b>{{ qr.amount }} {{ qr.currency }}</b></p>
                  <p>รหัสอ้างอิง {{ qr.reference }}</p>
                </div>
              </div>
              <p v-else class="my-4 text-center text-sm text-slate-400">{{ qrError || "กำลังสร้าง QR พร้อมยอดชำระ…" }}</p>
              <label class="block text-sm text-slate-300">อัปโหลดสลิปการโอน (PNG/JPEG ไม่เกิน 5 MB)
                <input class="mt-2 block w-full text-sm" type="file" accept="image/png,image/jpeg" @change="file=$event.target.files?.[0] || null" />
              </label>
              <button class="primary-button mt-4 w-full" :disabled="busy || !file" @click="sendProof">{{ busy ? "กำลังส่ง…" : "ส่งสลิปให้แอดมินตรวจ" }}</button>
              <p class="mt-3 text-xs text-slate-400">ตรวจชื่อผู้รับและยอด {{ qr ? `${qr.amount} ${qr.currency}` : "ที่ต้องชำระ" }} ก่อนยืนยันโอน เว็บจะไม่ขอรหัสผ่านหรือ OTP จากแอปธนาคาร</p>
            </div>
            <div v-else class="rounded-xl border border-white/10 bg-white/5 p-4">
              <p class="font-semibold">ยังไม่เปิดให้ซื้อเรื่องนี้</p>
              <p class="mt-1 text-sm text-slate-400">แอดมินต้องเพิ่มวิดีโอที่มีสิทธิ์เผยแพร่และตรวจอนุมัติก่อน ระบบจะไม่รับเงินสำหรับเรื่องที่ยังไม่มีไฟล์พร้อมดู</p>
              <button class="primary-button mt-4" :disabled="busy" @click="beginPurchase">{{ busy ? "กำลังตรวจสอบ…" : "ตรวจสอบและเริ่มซื้อ · 50 บาท" }}</button>
            </div>
          </div>
        </div>
      </template>
    </section>
  </main>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import axios from "axios";
import QRCode from "qrcode";
import { createPosterFallback } from "../utils/poster.js";

const route = useRoute();
const movie = ref(null), purchase = ref(null), loading = ref(true), busy = ref(false), error = ref(""), file = ref(null), streamUrl = ref("");
const qr = ref(null), qrError = ref("");
async function loadQr() {
  qr.value = null; qrError.value = "";
  if (!purchase.value || !["AWAITING_PAYMENT", "REJECTED"].includes(purchase.value.status)) return;
  try {
    const { data } = await axios.get(`/movie-purchases/${purchase.value.id}/qr`);
    qr.value = { ...data.data, image: await QRCode.toDataURL(data.data.payload, { errorCorrectionLevel: "M", margin: 1, width: 320 }) };
  } catch (e) {
    qrError.value = e.response?.data?.error?.message || "สร้าง QR พร้อมยอดชำระไม่สำเร็จ";
  }
}
async function load() {
  loading.value = true; error.value = "";
  try {
    const id = route.query.movieId;
    if (!id) throw new Error("ไม่พบรหัสภาพยนตร์");
    const [movieResponse, purchasesResponse] = await Promise.all([axios.get(`/movies/${id}`), axios.get("/movie-purchases/mine")]);
    const raw = movieResponse.data?.data || movieResponse.data;
    movie.value = { ...raw, id: raw.id || raw._id, poster: raw.poster || raw.posterUrl };
    purchase.value = purchasesResponse.data.data.find((item) => item.movieId === id) || null;
    await loadQr();
  } catch (e) { error.value = e.response?.data?.error?.message || e.message || "โหลดข้อมูลไม่สำเร็จ"; }
  finally { loading.value = false; }
}
async function beginPurchase() {
  busy.value = true; error.value = "";
  try { const { data } = await axios.post("/movie-purchases", { movieId: movie.value.id }); purchase.value = data.data; await loadQr(); }
  catch (e) { error.value = e.response?.data?.error?.message || "เริ่มรายการไม่สำเร็จ"; }
  finally { busy.value = false; }
}
async function sendProof() {
  if (!purchase.value) await beginPurchase();
  if (!purchase.value || !file.value) return;
  busy.value = true; error.value = "";
  try {
    const { data } = await axios.post(`/movie-purchases/${purchase.value.id}/proof`, file.value, { headers: { "Content-Type": file.value.type } });
    purchase.value = { ...purchase.value, ...data.data }; file.value = null; qr.value = null;
  } catch (e) { error.value = e.response?.data?.error?.message || "ส่งสลิปไม่สำเร็จ"; }
  finally { busy.value = false; }
}
async function startPlayback() {
  try { const { data } = await axios.post(`/movies/${movie.value.id}/playback-token`); streamUrl.value = `${axios.defaults.baseURL}${data.data.streamUrl}`; }
  catch (e) { error.value = e.response?.data?.error?.message || "เปิดวิดีโอไม่สำเร็จ"; }
}
onMounted(load);
</script>
