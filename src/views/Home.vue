<template>
  <div class="home-page">
    <personal-section />
  </div>
</template>

<script setup lang="ts">
import PersonalSection from '@/components/PersonalSection.vue';
</script>

<style scoped>
.home-page {
  @apply h-full;
  @apply flex flex-col;
}
</style>
