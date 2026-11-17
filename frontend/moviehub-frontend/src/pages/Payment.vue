<template>
  <main class="page-shell min-h-screen p-6 text-white">
    <section class="surface mx-auto max-w-xl rounded-3xl p-6">
      <h1 class="text-3xl font-bold text-orange">ชำระเงิน</h1>
      <p v-if="error" class="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-rose-200">{{ error }}</p>
      <p v-if="notice" class="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-emerald-200">{{ notice }}</p>

      <template v-if="booking">
        <div class="my-6 space-y-2">
          <p>{{ booking.movieTitleSnapshot }} · {{ booking.cinemaNameSnapshot }}</p>
          <p>ที่นั่ง {{ seats }}</p>
          <p>ยอดชำระ <b>{{ Number(booking.totalAmount).toFixed(2) }} {{ booking.currency }}</b></p>
          <p class="text-sm text-slate-400">หมดเวลา {{ expiresText }}</p>
        </div>

        <div class="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p class="font-bold">พร้อมเพย์ · แนบสลิป</p>
          <p class="mt-1 text-xs text-slate-400">สแกน QR ด้านล่าง โอนตามยอดที่แสดง แล้วแนบสลิปเพื่อให้แอดมินตรวจสอบ</p>

          <button v-if="!promptPay" class="primary-button mt-3 w-full" :disabled="busy" @click="startPromptPay">
            {{ busy ? "กำลังสร้าง QR…" : "สร้าง QR พร้อมยอดชำระ" }}
          </button>

          <template v-else>
            <img v-if="qrImage" :src="qrImage" alt="PromptPay QR พร้อมยอดชำระ" class="mx-auto my-4 w-full max-w-xs rounded-xl bg-white p-2" />
            <div class="space-y-1 text-center text-xs text-slate-300">
              <p>พร้อมเพย์ {{ promptPay.promptPayId }}</p>
              <p>ยอดชำระ <b>{{ promptPay.amount }} {{ promptPay.currency }}</b></p>
              <p>รหัสอ้างอิง {{ promptPay.reference }}</p>
            </div>

            <template v-if="isUnderReview">
              <p class="mt-4 rounded-xl border border-amber-300/30 bg-amber-400/10 p-3 text-sm text-amber-100">ส่งสลิปแล้ว · รอแอดมินตรวจสอบ</p>
              <button class="mt-3 w-full rounded-xl bg-white/10 p-3" :disabled="busy" @click="checkStatus">ตรวจสอบสถานะอีกครั้ง</button>
            </template>
            <template v-else-if="paymentStatus === 'FAILED'">
              <p class="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">สลิปไม่ผ่านการตรวจสอบ กรุณาสร้าง QR ใหม่หรือติดต่อแอดมิน</p>
              <button class="mt-3 w-full rounded-xl bg-white/10 p-3" :disabled="busy" @click="resetPromptPay">สร้าง QR ใหม่</button>
            </template>
            <template v-else>
              <label class="mt-4 block text-sm text-slate-300">แนบสลิป (PNG/JPEG ไม่เกิน 5 MB)
                <input class="mt-2 block w-full text-sm" type="file" accept="image/png,image/jpeg" @change="file = $event.target.files?.[0] || null" />
              </label>
              <button class="primary-button mt-3 w-full" :disabled="busy || !file" @click="sendProof">
                {{ busy ? "กำลังส่ง…" : "ส่งสลิปให้แอดมินตรวจ" }}
              </button>
            </template>
          </template>
        </div>

        <div class="mt-4 rounded-2xl border border-white/10 p-4">
          <p class="font-bold">ช่องทางอื่น</p>
          <button class="primary-button mt-3 w-full" :disabled="busy" @click="pay">{{ busy ? "กำลังเชื่อมต่อ…" : "ชำระผ่านระบบออนไลน์" }}</button>
          <button v-if="paymentId" class="mt-3 w-full rounded-xl bg-white/10 p-3" :disabled="busy" @click="confirmMock">ยืนยันการชำระเงินสำหรับโหมดทดสอบ</button>
        </div>
      </template>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import axios from "axios";
import QRCode from "qrcode";

const route = useRoute();
const router = useRouter();
const booking = ref(null);
const paymentId = ref("");
const busy = ref(false);
const error = ref("");
const notice = ref("");
const promptPay = ref(null);
const qrImage = ref("");
const paymentStatus = ref("");
const file = ref(null);
let pollTimer = null;

const seats = computed(() => booking.value?.seats?.map((seat) => seat.seatLabelSnapshot).join(", ") || "-");
const expiresText = computed(() => booking.value?.expiresAt ? new Date(booking.value.expiresAt).toLocaleString("th-TH") : "-");
const isUnderReview = computed(() => promptPay.value?.status === "UNDER_REVIEW" || paymentStatus.value === "UNDER_REVIEW");

async function startPromptPay() {
  busy.value = true; error.value = ""; notice.value = "";
  try {
    const { data } = await axios.post("/payments/promptpay/checkout", { bookingId: route.query.bookingId });
    promptPay.value = data.data;
    paymentStatus.value = data.data.status;
    qrImage.value = await QRCode.toDataURL(data.data.payload, { errorCorrectionLevel: "M", margin: 1, width: 320 });
    if (isUnderReview.value) startPolling();
  } catch (e) {
    error.value = e.response?.data?.error?.message || "สร้าง QR พร้อมเพย์ไม่สำเร็จ";
  } finally {
    busy.value = false;
  }
}

function resetPromptPay() {
  promptPay.value = null; qrImage.value = ""; paymentStatus.value = ""; file.value = null;
  stopPolling();
}

async function sendProof() {
  if (!promptPay.value || !file.value) return;
  busy.value = true; error.value = "";
  try {
    const { data } = await axios.post(`/payments/promptpay/${promptPay.value.paymentId}/proof`, file.value, { headers: { "Content-Type": file.value.type } });
    promptPay.value = { ...promptPay.value, ...data.data };
    paymentStatus.value = data.data.status;
    file.value = null;
    notice.value = "ส่งสลิปแล้ว รอแอดมินตรวจสอบ";
    startPolling();
  } catch (e) {
    error.value = e.response?.data?.error?.message || "ส่งสลิปไม่สำเร็จ";
  } finally {
    busy.value = false;
  }
}

async function checkStatus() {
  if (!promptPay.value) return;
  try {
    const { data } = await axios.get(`/payments/promptpay/${promptPay.value.paymentId}`);
    paymentStatus.value = data.data.status;
    if (data.data.bookingStatus === "CONFIRMED") {
      stopPolling();
      router.replace({ path: "/ticket", query: { bookingId: route.query.bookingId } });
    } else if (data.data.status === "FAILED") {
      stopPolling();
    }
  } catch {
    // Keep polling quietly; transient network errors should not surface as a failure.
  }
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(checkStatus, 5000);
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

async function pay() {
  busy.value = true; error.value = "";
  try {
    const { data } = await axios.post("/payments/checkout", { bookingId: route.query.bookingId });
    paymentId.value = data.data.paymentId;
    if (data.data.provider === "stripe" && data.data.checkoutUrl) location.assign(data.data.checkoutUrl);
    else if (data.data.provider === "stripe") error.value = "กำลังรอระบบยืนยันรายการชำระเงิน กรุณารอสักครู่แล้วเปิดหน้าตั๋วอีกครั้ง";
  } catch (e) {
    error.value = e.response?.data?.error?.message || "เริ่มชำระเงินไม่สำเร็จ";
  } finally {
    busy.value = false;
  }
}

async function confirmMock() {
  busy.value = true;
  try {
    await axios.post(`/payments/mock/${paymentId.value}/confirm`);
    router.replace({ path: "/ticket", query: { bookingId: route.query.bookingId } });
  } catch (e) {
    error.value = e.response?.data?.error?.message || "ยืนยันการชำระเงินไม่สำเร็จ";
  } finally {
    busy.value = false;
  }
}

onMounted(async () => {
  if (!route.query.bookingId) { router.replace("/"); return; }
  try {
    const { data } = await axios.get(`/bookings/${route.query.bookingId}`);
    booking.value = data.data;
    if (booking.value.status === "CONFIRMED") {
      router.replace({ path: "/ticket", query: { bookingId: route.query.bookingId } });
      return;
    }
    if (route.query.session_id) {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
          await axios.get(`/tickets/booking/${route.query.bookingId}`);
          router.replace({ path: "/ticket", query: { bookingId: route.query.bookingId } });
          return;
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
      error.value = "กำลังรอการยืนยันจากระบบชำระเงิน กรุณาเปิดหน้านี้อีกครั้งในอีกสักครู่";
    }
  } catch (e) {
    error.value = e.response?.data?.error?.message || "โหลดข้อมูลการจองไม่สำเร็จ";
  }
});

onUnmounted(stopPolling);
</script>
