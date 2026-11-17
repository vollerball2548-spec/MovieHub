<template>
  <main class="page-shell min-h-screen p-6 text-white">
    <section class="mx-auto max-w-5xl">
      <h1 class="text-3xl font-black text-orange">รายการเช่าดูของฉัน</h1>
      <p v-if="error" class="mt-4 rounded-xl bg-rose-500/10 p-4 text-rose-200">{{ error }}</p>
      <p v-else-if="loading" class="mt-8 text-slate-400">กำลังโหลด…</p>
      <p v-else-if="!items.length" class="mt-8 text-slate-400">ยังไม่มีรายการซื้อ <router-link to="/" class="text-orange underline">เลือกภาพยนตร์</router-link></p>
      <div v-else class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article v-for="item in items" :key="item.id" class="surface rounded-2xl p-5">
          <h2 class="text-lg font-bold">{{ item.movie.title }}</h2>
          <p class="mt-2 text-sm text-slate-300">ยอด {{ item.amount }} {{ item.currency }} · {{ statusLabel[item.status] || item.status }}</p>
          <p v-if="item.reviewNote" class="mt-2 text-sm text-amber-200">หมายเหตุ: {{ item.reviewNote }}</p>
          <router-link :to="{path:'/movie-access',query:{movieId:item.movieId}}" class="primary-button mt-4 inline-block">เปิดรายการ</router-link>
        </article>
      </div>
    </section>
  </main>
</template>
<script setup>
import { onMounted, ref } from 'vue';
import axios from 'axios';
const items=ref([]),loading=ref(true),error=ref('');
const statusLabel={AWAITING_PAYMENT:'รอชำระเงิน',UNDER_REVIEW:'รอตรวจสลิป',APPROVED:'อนุมัติแล้ว',REJECTED:'สลิปถูกปฏิเสธ'};
onMounted(async()=>{try{const {data}=await axios.get('/movie-purchases/mine');items.value=data.data;}catch(e){error.value=e.response?.data?.error?.message||'โหลดรายการไม่สำเร็จ';}finally{loading.value=false;}});
</script>
