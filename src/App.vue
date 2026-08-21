<script setup lang="ts">
import ProductionBootstrap from './components/ProductionBootstrap.vue';
</script>

<template>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <header class="border-b border-leaf-900/10 bg-leaf-50">
    <div class="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
      <h1 class="text-xl font-semibold text-leaf-900">Todone</h1>
    </div>
  </header>

  <main id="main-content" class="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
    <ProductionBootstrap />
  </main>
</template>
