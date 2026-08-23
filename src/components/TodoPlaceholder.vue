<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';

const heading = ref<{ focus(): void } | null>(null);

onMounted(async () => {
  await nextTick();
  heading.value?.focus();
});
</script>

<template>
  <section class="surface-card mx-auto max-w-xl border-profile-mid bg-profile-light p-5 sm:p-8">
    <h2 ref="heading" tabindex="-1" class="page-heading text-xl">Todos</h2>
    <p class="body-secondary mt-2">Work in progress</p>
  </section>
</template>
