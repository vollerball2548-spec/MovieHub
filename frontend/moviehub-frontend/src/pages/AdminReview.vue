<template>
  <main class="page-shell min-h-screen p-6 text-white">
    <section class="mx-auto max-w-5xl">
      <p class="text-sm font-bold uppercase tracking-widest text-orange">MovieHub · Admin</p>
      <h1 class="mt-2 text-3xl font-black">ตรวจสอบรายการและวิดีโอ</h1>
      <p v-if="error" class="mt-4 rounded-xl bg-rose-500/10 p-4 text-rose-200">{{ error }}</p>
      <div class="mt-8 grid gap-8 lg:grid-cols-2">
        <section class="surface rounded-2xl p-5">
          <h2 class="text-xl font-bold">สลิปรออนุมัติ</h2>
          <div v-if="!payments.length" class="mt-4 text-sm text-slate-400">ไม่มีรายการรอตรวจ</div>
          <article v-for="item in payments" :key="item.id" class="mt-5 rounded-xl border border-white/10 p-4">
            <p class="font-semibold">{{ item.movie.title }} · {{ item.amount }} {{ item.currency }}</p>
            <p class="mt-1 text-xs text-slate-400">ผู้ใช้ {{ item.user.username }} · {{ item.user.email }} · {{ new Date(item.createdAt).toLocaleString('th-TH') }}</p>
            <img v-if="proofs[item.id]" :src="proofs[item.id]" alt="หลักฐานโอนเงิน" class="my-3 max-h-80 rounded-lg bg-white object-contain" />
            <button v-else class="mt-3 text-sm text-orange underline" @click="loadProof(item)">เปิดดูสลิป</button>
            <input v-model="notes[item.id]" class="mt-3 w-full rounded-lg bg-white/10 p-2 text-sm" placeholder="หมายเหตุ (ถ้าปฏิเสธ)" />
            <div class="mt-3 flex gap-2"><button class="rounded-lg bg-emerald-700 px-4 py-2" @click="review(item,'approve')">อนุมัติ</button><button class="rounded-lg bg-rose-800 px-4 py-2" @click="review(item,'reject')">ปฏิเสธ</button></div>
          </article>
        </section>
        <section class="surface rounded-2xl p-5">
          <h2 class="text-xl font-bold">ส่งวิดีโอเข้าตรวจ</h2>
          <p class="mt-2 text-sm text-slate-400">รับเฉพาะ MP4 ไม่เกิน 2 GB และต้องมีสิทธิ์เผยแพร่ ห้ามอัปโหลดภาพยนตร์ที่ไม่มีสิทธิ์</p>
          <select v-model="movieId" class="mt-4 w-full rounded-lg bg-slate-800 p-3"><option value="">เลือกภาพยนตร์</option><option v-for="m in movies" :key="m.id" :value="m.id">{{ m.title }}</option></select>
          <label class="mt-4 flex items-start gap-2 text-sm"><input v-model="rightsConfirmed" type="checkbox" class="mt-1" />ฉันยืนยันว่า MovieHub มีสิทธิ์เผยแพร่และให้เช่ารับชมวิดีโอนี้</label>
          <input class="mt-4 block w-full text-sm" type="file" accept="video/mp4,.mp4" @change="videoFile=$event.target.files?.[0] || null" />
          <button class="primary-button mt-4 w-full" :disabled="busy || !movieId || !videoFile || !rightsConfirmed" @click="uploadVideo">{{ busy ? 'กำลังอัปโหลด…' : 'อัปโหลดเพื่อรอตรวจ' }}</button>
          <h3 class="mt-8 font-bold">วิดีโอรออนุมัติ</h3>
          <p v-if="!videos.length" class="mt-3 text-sm text-slate-400">ไม่มีวิดีโอรอตรวจ</p>
          <article v-for="item in videos" :key="item.id" class="mt-3 rounded-xl border border-white/10 p-4">
            <p>{{ item.movie.title }} · {{ (Number(item.sizeBytes)/1024/1024).toFixed(1) }} MB</p>
            <p class="mt-1 text-xs text-slate-400">ตรวจสิทธิ์เผยแพร่และทดลองเล่นให้ครบก่อนอนุมัติ</p>
            <video v-if="previewUrls[item.movieId]" :src="previewUrls[item.movieId]" controls controlsList="nodownload" class="mt-3 w-full rounded-xl" />
            <button v-else class="mt-3 text-sm text-orange underline" @click="previewVideo(item)">ทดลองเล่นเพื่อตรวจ</button>
            <div class="mt-3 flex gap-2"><button class="rounded-lg bg-emerald-700 px-4 py-2" @click="reviewVideo(item,'approve')">อนุมัติ</button><button class="rounded-lg bg-rose-800 px-4 py-2" @click="reviewVideo(item,'reject')">ปฏิเสธ</button></div>
          </article>
        </section>
      </div>
      <section class="surface mt-8 rounded-2xl p-5">
        <h2 class="text-xl font-bold">สลิปจองตั๋วรออนุมัติ</h2>
        <p class="mt-2 text-sm text-slate-400">เฉพาะการชำระผ่าน PromptPay แบบแนบสลิป การอนุมัติจะออกตั๋วให้อัตโนมัติ</p>
        <div v-if="!paymentProofs.length" class="mt-4 text-sm text-slate-400">ไม่มีรายการรอตรวจ</div>
        <article v-for="item in paymentProofs" :key="item.paymentId" class="mt-5 rounded-xl border border-white/10 p-4">
          <p class="font-semibold">{{ item.booking.movieTitle }} · {{ item.amount }} {{ item.currency }}</p>
          <p class="mt-1 text-xs text-slate-400">
            ผู้ใช้ {{ item.booking.user.username }} · {{ item.booking.user.email }}
            · ที่นั่ง {{ item.booking.seats.join(', ') }}
            · {{ item.booking.cinema || '-' }}
            <span v-if="item.booking.startsAt"> · {{ new Date(item.booking.startsAt).toLocaleString('th-TH') }}</span>
          </p>
          <p v-if="isExpired(item)" class="mt-2 rounded-lg bg-amber-400/10 p-2 text-xs text-amber-200">การจองหมดอายุแล้ว · อนุมัติไม่ได้ กรุณาปฏิเสธสลิปและให้ลูกค้าจองใหม่</p>
          <img v-if="paymentProofImages[item.paymentId]" :src="paymentProofImages[item.paymentId]" alt="สลิปจองตั๋ว" class="my-3 max-h-80 rounded-lg bg-white object-contain" />
          <button v-else class="mt-3 text-sm text-orange underline" @click="loadPaymentProof(item)">เปิดดูสลิป</button>
          <input v-model="paymentNotes[item.paymentId]" class="mt-3 w-full rounded-lg bg-white/10 p-2 text-sm" placeholder="หมายเหตุ (ถ้าปฏิเสธ)" />
          <div class="mt-3 flex gap-2">
            <button class="rounded-lg bg-emerald-700 px-4 py-2" :disabled="isExpired(item)" @click="reviewPayment(item,'approve')">อนุมัติ</button>
            <button class="rounded-lg bg-rose-800 px-4 py-2" @click="reviewPayment(item,'reject')">ปฏิเสธ</button>
          </div>
        </article>
      </section>
    </section>
  </main>
</template>
<script setup>
import { onMounted, ref } from 'vue';
import axios from 'axios';
const payments=ref([]),videos=ref([]),movies=ref([]),proofs=ref({}),previewUrls=ref({}),notes=ref({}),movieId=ref(''),videoFile=ref(null),rightsConfirmed=ref(false),busy=ref(false),error=ref('');
const paymentProofs=ref([]),paymentProofImages=ref({}),paymentNotes=ref({});
async function load(){try{const [p,v,m,q]=await Promise.all([axios.get('/movie-purchases/admin/review-queue'),axios.get('/movies/admin/video-review-queue'),axios.get('/movies?page=1&pageSize=100'),axios.get('/payments/admin/promptpay/review-queue')]);payments.value=p.data.data;videos.value=v.data.data;const rows=Array.isArray(m.data)?m.data:(m.data.data||[]);movies.value=rows.map(x=>({...x,id:x.id||x._id}));paymentProofs.value=q.data.data;}catch(e){error.value=e.response?.data?.error?.message||'โหลดข้อมูลแอดมินไม่สำเร็จ (หน้านี้ต้องใช้บัญชี ADMIN)';}}
async function loadPaymentProof(item){try{const {data}=await axios.get(`/payments/admin/promptpay/${item.paymentId}/proof`,{responseType:'blob'});paymentProofImages.value[item.paymentId]=URL.createObjectURL(data);}catch(e){error.value=e.response?.data?.error?.message||'เปิดสลิปไม่สำเร็จ';}}
function isExpired(item){const expiresAt=item?.booking?.expiresAt;return Boolean(expiresAt && new Date(expiresAt) <= new Date());}
async function reviewPayment(item,decision){try{await axios.post(`/payments/admin/promptpay/${item.paymentId}/review`,{decision,note:paymentNotes.value[item.paymentId]});await load();}catch(e){error.value=e.response?.data?.error?.message||'บันทึกผลตรวจสลิปไม่สำเร็จ';}}
async function loadProof(item){try{const {data}=await axios.get(`/movie-purchases/admin/${item.id}/proof`,{responseType:'blob'});proofs.value[item.id]=URL.createObjectURL(data);}catch(e){error.value=e.response?.data?.error?.message||'เปิดสลิปไม่สำเร็จ';}}
async function review(item,decision){try{await axios.post(`/movie-purchases/admin/${item.id}/review`,{decision,note:notes.value[item.id]});await load();}catch(e){error.value=e.response?.data?.error?.message||'บันทึกผลตรวจไม่สำเร็จ';}}
async function uploadVideo(){busy.value=true;error.value='';try{await axios.put(`/movies/admin/${movieId.value}/video`,videoFile.value,{headers:{'Content-Type':'video/mp4','X-Movie-Rights-Confirmed':'true'},timeout:0});videoFile.value=null;rightsConfirmed.value=false;await load();}catch(e){error.value=e.response?.data?.error?.message||'อัปโหลดไม่สำเร็จ';}finally{busy.value=false;}}
async function reviewVideo(item,decision){try{await axios.post(`/movies/admin/${item.movieId}/video-review`,{decision});await load();}catch(e){error.value=e.response?.data?.error?.message||'บันทึกผลตรวจวิดีโอไม่สำเร็จ';}}
async function previewVideo(item){try{const {data}=await axios.post(`/movies/admin/${item.movieId}/video-review-token`);previewUrls.value[item.movieId]=`${axios.defaults.baseURL}${data.data.streamUrl}`;}catch(e){error.value=e.response?.data?.error?.message||'เปิดวิดีโอเพื่อตรวจไม่สำเร็จ';}}
onMounted(load);
</script>
