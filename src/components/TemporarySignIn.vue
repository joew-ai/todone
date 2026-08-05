<script setup lang="ts">
/**
 * TEMPORARY. Exists only to prove the end-to-end authentication boundary
 * (Cognito sign-in -> JWT -> protected /api/v1/session call) for the
 * establish-deployable-pwa-foundation change, task 2.4.
 *
 * `bootstrap-household-membership` replaces and removes this component,
 * this test file, and this state entirely rather than maintaining two
 * sign-in flows. Do not extend this component with production behavior.
 */
import { ref } from 'vue';
import { loadAuthConfig } from '../config/authConfig';
import { AuthClient } from '../services/authClient';
import { fetchSession, type SessionInfo } from '../services/sessionClient';

type FormState =
  | { status: 'signed-out' }
  | { status: 'submitting' }
  | { status: 'error'; message: string }
  | { status: 'signed-in'; session: SessionInfo };

const username = ref('');
const password = ref('');
const state = ref<FormState>({ status: 'signed-out' });

let authClient: AuthClient | null = null;

function getAuthClient(): AuthClient {
  if (!authClient) {
    authClient = new AuthClient(loadAuthConfig());
  }
  return authClient;
}

async function submit(): Promise<void> {
  state.value = { status: 'submitting' };

  let signInResult;
  try {
    signInResult = await getAuthClient().signIn(username.value, password.value);
  } catch {
    // Covers a misconfigured/missing auth setup (e.g. no deployed pool yet)
    // the same way any other unexpected failure is shown: generic,
    // recoverable, and never exposing which configuration value is missing.
    state.value = { status: 'error', message: 'Something went wrong. Please try again.' };
    return;
  }

  if (signInResult.kind === 'error') {
    state.value = { status: 'error', message: signInResult.message };
    return;
  }

  const sessionResult = await fetchSession(signInResult.session.idToken);
  if (sessionResult.kind === 'error') {
    state.value = { status: 'error', message: sessionResult.message };
    return;
  }

  password.value = '';
  state.value = { status: 'signed-in', session: sessionResult.data };
}

function signOut(): void {
  authClient?.signOut();
  authClient = null;
  username.value = '';
  password.value = '';
  state.value = { status: 'signed-out' };
}
</script>

<template>
  <section
    aria-labelledby="signin-heading"
    class="rounded-lg border border-amber-300 bg-amber-50 p-4 sm:p-6"
  >
    <h2 id="signin-heading" class="text-base font-medium text-amber-900">
      Temporary sign-in (verification only)
    </h2>
    <p class="mt-1 text-sm text-amber-800">
      This form proves the authentication boundary and will be removed once household sign-in ships.
    </p>

    <form
      v-if="state.status !== 'signed-in'"
      novalidate
      class="mt-4 space-y-4"
      @submit.prevent="submit"
    >
      <div>
        <label for="signin-username" class="block text-sm font-medium text-gray-900"
          >Username</label
        >
        <input
          id="signin-username"
          v-model="username"
          type="text"
          autocomplete="username"
          required
          :disabled="state.status === 'submitting'"
          class="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label for="signin-password" class="block text-sm font-medium text-gray-900"
          >Password</label
        >
        <input
          id="signin-password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
          :disabled="state.status === 'submitting'"
          class="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>

      <div aria-live="assertive">
        <p v-if="state.status === 'error'" data-testid="signin-error" class="text-red-800">
          {{ state.message }}
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="submit"
          data-testid="signin-submit"
          :disabled="state.status === 'submitting'"
          class="rounded bg-leaf-900 px-4 py-2 text-white disabled:opacity-60"
        >
          {{ state.status === 'submitting' ? 'Signing in...' : 'Sign in' }}
        </button>

        <button
          v-if="state.status === 'error'"
          type="submit"
          data-testid="signin-retry"
          class="rounded border border-gray-400 px-4 py-2 text-gray-800"
        >
          Retry
        </button>
      </div>
    </form>

    <div v-else data-testid="signin-success" class="mt-4 space-y-2">
      <p class="text-leaf-900">
        Signed in as <strong>{{ state.session.username }}</strong
        >. Session expires {{ new Date(state.session.expiresAt).toLocaleTimeString() }}.
      </p>
      <button
        type="button"
        data-testid="signin-signout"
        class="rounded border border-gray-400 px-4 py-2 text-gray-800"
        @click="signOut"
      >
        Sign out
      </button>
    </div>
  </section>
</template>
