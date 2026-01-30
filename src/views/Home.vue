<template>
  <div class="home-page">
    <PersonalSection />
  </div>
</template>

<script setup lang="ts">
import PersonalSection from '@/components/PersonalSection.vue';
</script>

<style scoped>
@reference "@/assets/styles/main.css";

.home-page {
  @apply h-full;
  @apply flex flex-col;
}
</style>
