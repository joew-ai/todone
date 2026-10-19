<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { messages } from '../i18n/messages';
import { loadAuthConfig } from '../config/authConfig';
import { AuthClient } from '../services/authClient';
import { clearLocalAuthentication } from '../services/localSignOut';
import { takeRouteBootstrapContext } from '../presentation/routeBootstrapContext';
import { AppRouteName } from '../router/routes';

const router = useRouter();
const initialContext = takeRouteBootstrapContext(AppRouteName.todos);

async function signOut(): Promise<void> {
  clearLocalAuthentication(initialContext?.authClient ?? new AuthClient(loadAuthConfig()));
  await router.replace({ name: AppRouteName.signIn });
}

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
    <div class="form-actions mt-4">
      <button type="button" class="secondary" @click="signOut">
        {{ messages.bootstrap.signOut }}
      </button>
    </div>
  </section>
</template>
