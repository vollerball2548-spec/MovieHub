<template>
  <div class="min-h-screen bg-dark text-white flex flex-col">
    <Navbar />
    <main class="flex-grow pt-2">
      <router-view />
    </main>
    <footer class="border-t border-white/10 py-8 text-center text-sm text-slate-500">
      © 2026 MovieHub · จองง่าย ดูสนุก ทุกที่นั่ง · <router-link to="/about" class="transition hover:text-orange">Credits</router-link>
    </footer>
  </div>
</template>

<script setup>
import Navbar from "./components/Navbar.vue";
</script>
