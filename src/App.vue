<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { fetchHealth, type ApiResult, type HealthResponse } from './services/apiClient';

const result = ref<ApiResult<HealthResponse> | null>(null);
const loading = ref(true);

async function load(): Promise<void> {
  loading.value = true;
  result.value = null;
  result.value = await fetchHealth();
  loading.value = false;
}

onMounted(load);
</script>

<template>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <header class="border-b border-leaf-900/10 bg-leaf-50">
    <div class="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
      <h1 class="text-xl font-semibold text-leaf-900">Todone</h1>
    </div>
  </header>

  <main id="main-content" class="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
    <section aria-labelledby="status-heading" class="rounded-lg border border-gray-200 p-4 sm:p-6">
      <h2 id="status-heading" class="text-base font-medium text-gray-900">Service status</h2>

      <div class="mt-3 min-h-[2.5rem]" aria-live="polite" :aria-busy="loading">
        <p v-if="loading" data-testid="status-loading" class="text-gray-600">
          Checking service status...
        </p>

        <p
          v-else-if="result?.kind === 'success'"
          data-testid="status-success"
          class="text-leaf-900"
        >
          Service is available. Last checked
          {{ new Date(result.data.timestamp).toLocaleTimeString() }}.
        </p>

        <div v-else-if="result?.kind === 'error'" data-testid="status-error" class="space-y-2">
          <p class="text-red-800">{{ result.message }}</p>
          <button
            v-if="result.recoverable"
            type="button"
            class="rounded border border-red-800 px-3 py-2 text-sm text-red-800 hover:bg-red-50"
            @click="load"
          >
            Retry
          </button>
        </div>
      </div>
    </section>
  </main>
</template>
