<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';
import { loadAuthConfig } from '../config/authConfig';
import { messages } from '../i18n/messages';
import { AuthClient, type AuthActionResult } from '../services/authClient';
import {
  createHousehold,
  fetchCurrentMembership,
  type CurrentMembership,
} from '../services/householdClient';

type Screen =
  | 'restoring'
  | 'signin'
  | 'register'
  | 'confirm'
  | 'forgot'
  | 'reset'
  | 'membership-loading'
  | 'household'
  | 'onboarding';

const supportedTimezones = [
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
];
const copy = messages.bootstrap;

const screen = ref<Screen>('restoring');
const busy = ref(false);
const status = ref('');
const statusIsError = ref(false);
const username = ref('');
const password = ref('');
const email = ref('');
const gatePassword = ref('');
const code = ref('');
const newPassword = ref('');
const householdName = ref('');
const timezone = ref(browserTimezone());
const membership = ref<CurrentMembership | null>(null);
const fieldError = ref<Record<string, string>>({});
const firstField = ref<{ focus(): void } | null>(null);
let idempotencyKey = globalThis.crypto.randomUUID();
let authClient: AuthClient | null = null;

watch([householdName, timezone], () => {
  idempotencyKey = globalThis.crypto.randomUUID();
});

onMounted(async () => {
  try {
    authClient = new AuthClient(loadAuthConfig());
    const session = await authClient.restoreSession();
    if (session) await resolveMembership(session.idToken);
    else screen.value = 'signin';
  } catch {
    status.value = messages.generic.unexpectedError;
    statusIsError.value = true;
    screen.value = 'signin';
  }
});

async function signIn(): Promise<void> {
  await run(async () => {
    const result = await client().signIn(username.value, password.value);
    if (result.kind === 'error') return showError(result);
    password.value = '';
    await resolveMembership(result.session.idToken);
  });
}

async function register(): Promise<void> {
  await run(async () => {
    const result = await client().registerFirstParent(
      username.value,
      password.value,
      email.value,
      gatePassword.value,
    );
    if (result.kind === 'error') return showError(result);
    password.value = '';
    gatePassword.value = '';
    code.value = '';
    status.value = copy.checkEmail;
    statusIsError.value = false;
    screen.value = 'confirm';
  });
}

async function confirm(): Promise<void> {
  await run(async () => {
    const result = await client().confirmRegistration(username.value, code.value);
    if (result.kind === 'error') return showError(result);
    code.value = '';
    status.value = copy.emailVerified;
    statusIsError.value = false;
    screen.value = 'signin';
  });
}

async function resend(): Promise<void> {
  await run(async () => {
    const result = await client().resendConfirmationCode(username.value);
    if (result.kind === 'error') return showError(result);
    status.value = copy.codeResent;
    statusIsError.value = false;
  });
}

async function startRecovery(): Promise<void> {
  await run(async () => {
    const result = await client().forgotPassword(username.value);
    if (result.kind === 'error') return showError(result);
    status.value = copy.recoverySent;
    statusIsError.value = false;
    screen.value = 'reset';
  });
}

async function finishRecovery(): Promise<void> {
  await run(async () => {
    const result = await client().confirmForgotPassword(
      username.value,
      code.value,
      newPassword.value,
    );
    if (result.kind === 'error') return showError(result);
    code.value = '';
    newPassword.value = '';
    status.value = copy.passwordReset;
    statusIsError.value = false;
    screen.value = 'signin';
  });
}

async function resolveMembership(idToken: string): Promise<void> {
  screen.value = 'membership-loading';
  const result = await fetchCurrentMembership(idToken);
  if (result.kind === 'error') {
    if (!result.recoverable) signOut(result.message);
    else {
      status.value = result.message;
      statusIsError.value = true;
      screen.value = 'signin';
    }
    return;
  }
  membership.value = result.data.membership;
  screen.value = membership.value ? 'onboarding' : 'household';
}

async function submitHousehold(): Promise<void> {
  fieldError.value = {};
  if (!householdName.value.trim()) {
    fieldError.value.name = copy.nameRequired;
    await focusFirstField();
    return;
  }
  if (!timezone.value) {
    fieldError.value.timezone = copy.timezoneRequired;
    return;
  }
  await run(async () => {
    const token = client().getIdToken();
    if (!token) return signOut(copy.sessionEnded);
    const result = await createHousehold(token, {
      name: householdName.value,
      timezone: timezone.value,
      idempotencyKey,
    });
    if (result.kind === 'error') {
      for (const error of result.fieldErrors ?? []) fieldError.value[error.field] = error.message;
      status.value = result.message;
      statusIsError.value = true;
      if (result.fieldErrors?.length) await focusFirstField();
      if (!result.recoverable) signOut(result.message);
      return;
    }
    membership.value = result.data.membership;
    screen.value = 'onboarding';
    status.value = copy.created;
    statusIsError.value = false;
  });
}

function signOut(message = copy.signedOut): void {
  // This app has no remote sign-out endpoint. Local private state must clear
  // even if Cognito's local SDK cleanup unexpectedly throws.
  try {
    authClient?.signOut();
  } finally {
    clearPrivateState(message);
  }
}

function clearPrivateState(message: string): void {
  membership.value = null;
  password.value = '';
  gatePassword.value = '';
  code.value = '';
  newPassword.value = '';
  householdName.value = '';
  username.value = '';
  email.value = '';
  fieldError.value = {};
  status.value = message;
  statusIsError.value = false;
  screen.value = 'signin';
}

function chooseScreen(next: Screen): void {
  fieldError.value = {};
  status.value = '';
  statusIsError.value = false;
  password.value = '';
  gatePassword.value = '';
  code.value = '';
  newPassword.value = '';
  screen.value = next;
}

async function run(action: () => Promise<void>): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  fieldError.value = {};
  status.value = '';
  statusIsError.value = false;
  try {
    await action();
  } catch {
    status.value = messages.generic.unexpectedError;
    statusIsError.value = true;
  } finally {
    busy.value = false;
  }
}

function showError(result: Extract<AuthActionResult, { kind: 'error' }>): void {
  status.value = result.message;
  statusIsError.value = true;
  if (result.field) fieldError.value[result.field] = result.message;
}

function client(): AuthClient {
  if (!authClient) authClient = new AuthClient(loadAuthConfig());
  return authClient;
}

function browserTimezone(): string {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return detected?.includes('/') ? detected : '';
  } catch {
    return '';
  }
}

async function focusFirstField(): Promise<void> {
  await nextTick();
  firstField.value?.focus();
}
</script>

<template>
  <section
    class="mx-auto max-w-xl rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8"
  >
    <div class="min-h-6" role="status" aria-live="polite">
      <p v-if="status" class="text-sm" :class="statusIsError ? 'text-red-800' : 'text-leaf-900'">
        {{ status }}
      </p>
    </div>

    <div v-if="screen === 'restoring' || screen === 'membership-loading'" aria-busy="true">
      <h2 class="text-xl font-semibold text-leaf-900">{{ copy.restoreHeading }}</h2>
      <p class="mt-2 text-stone-600">{{ copy.restoring }}</p>
    </div>

    <form v-else-if="screen === 'signin'" class="space-y-4" @submit.prevent="signIn">
      <h2 class="text-xl font-semibold text-leaf-900">{{ copy.signIn }}</h2>
      <label class="block"
        >Username<input
          v-model="username"
          required
          autocomplete="username"
          class="field"
          :disabled="busy"
      /></label>
      <label class="block"
        >Password<input
          v-model="password"
          required
          type="password"
          autocomplete="current-password"
          class="field"
          :disabled="busy"
      /></label>
      <button class="primary" type="submit" :disabled="busy">
        {{ busy ? copy.signingIn : copy.signIn }}
      </button>
      <div class="flex flex-wrap gap-3 text-sm">
        <button type="button" class="link" @click="chooseScreen('register')">
          {{ copy.createFirstParent }}
        </button>
        <button type="button" class="link" @click="chooseScreen('forgot')">
          {{ copy.forgotPassword }}
        </button>
      </div>
    </form>

    <form v-else-if="screen === 'register'" class="space-y-4" @submit.prevent="register">
      <h2 class="text-xl font-semibold text-leaf-900">{{ copy.createParent }}</h2>
      <label class="block"
        >Username<input
          v-model="username"
          required
          autocomplete="username"
          class="field"
          :aria-invalid="!!fieldError.username"
        /><span v-if="fieldError.username" class="error">{{ fieldError.username }}</span></label
      >
      <label class="block"
        >Recovery email<input
          v-model="email"
          required
          type="email"
          autocomplete="email"
          class="field"
      /></label>
      <label class="block"
        >Password<input
          v-model="password"
          required
          type="password"
          autocomplete="new-password"
          class="field"
      /></label>
      <label class="block"
        >Registration password<input
          v-model="gatePassword"
          required
          type="password"
          autocomplete="off"
          class="field"
          :aria-invalid="!!fieldError.registrationGatePassword"
        /><span v-if="fieldError.registrationGatePassword" class="error">{{
          fieldError.registrationGatePassword
        }}</span></label
      >
      <button class="primary" type="submit" :disabled="busy">
        {{ busy ? copy.creatingAccount : copy.createAccount }}
      </button>
      <button type="button" class="link" @click="chooseScreen('signin')">
        {{ copy.backToSignIn }}
      </button>
    </form>

    <form v-else-if="screen === 'confirm'" class="space-y-4" @submit.prevent="confirm">
      <h2 class="text-xl font-semibold text-leaf-900">{{ copy.verifyEmail }}</h2>
      <p class="text-sm text-stone-600">{{ copy.verificationHelp }}</p>
      <label class="block"
        >Verification code<input
          v-model="code"
          required
          inputmode="numeric"
          autocomplete="one-time-code"
          class="field"
          :aria-invalid="!!fieldError.code"
        /><span v-if="fieldError.code" class="error">{{ fieldError.code }}</span></label
      >
      <button class="primary" type="submit" :disabled="busy">{{ copy.verifyEmailAction }}</button>
      <button type="button" class="link" :disabled="busy" @click="resend">
        {{ copy.resendCode }}
      </button>
    </form>

    <form v-else-if="screen === 'forgot'" class="space-y-4" @submit.prevent="startRecovery">
      <h2 class="text-xl font-semibold text-leaf-900">{{ copy.resetPassword }}</h2>
      <label class="block"
        >Username<input v-model="username" required autocomplete="username" class="field"
      /></label>
      <button class="primary" type="submit" :disabled="busy">{{ copy.sendRecoveryCode }}</button>
      <button type="button" class="link" @click="chooseScreen('signin')">
        {{ copy.backToSignIn }}
      </button>
    </form>

    <form v-else-if="screen === 'reset'" class="space-y-4" @submit.prevent="finishRecovery">
      <h2 class="text-xl font-semibold text-leaf-900">{{ copy.choosePassword }}</h2>
      <label class="block"
        >Recovery code<input
          v-model="code"
          required
          autocomplete="one-time-code"
          class="field"
          :aria-invalid="!!fieldError.code"
      /></label>
      <label class="block"
        >New password<input
          v-model="newPassword"
          required
          type="password"
          autocomplete="new-password"
          class="field"
          :aria-invalid="!!fieldError.password"
      /></label>
      <button class="primary" type="submit" :disabled="busy">{{ copy.resetPasswordAction }}</button>
    </form>

    <form v-else-if="screen === 'household'" class="space-y-4" @submit.prevent="submitHousehold">
      <h2 class="text-xl font-semibold text-leaf-900">{{ copy.createHousehold }}</h2>
      <p class="text-sm text-stone-600">{{ copy.householdHelp }}</p>
      <label class="block"
        >Household name<input
          ref="firstField"
          v-model="householdName"
          required
          maxlength="80"
          class="field"
          :aria-invalid="!!fieldError.name"
          aria-describedby="household-name-error"
        /><span id="household-name-error" class="error">{{ fieldError.name }}</span></label
      >
      <label class="block"
        >Household timezone<select
          v-model="timezone"
          required
          class="field"
          :aria-invalid="!!fieldError.timezone"
        >
          <option value="" disabled>{{ copy.selectTimezone }}</option>
          <option v-if="timezone && !supportedTimezones.includes(timezone)" :value="timezone">
            {{ timezone }}
          </option>
          <option v-for="zone in supportedTimezones" :key="zone" :value="zone">
            {{ zone }}
          </option></select
        ><span class="error">{{ fieldError.timezone }}</span></label
      >
      <button class="primary" type="submit" :disabled="busy">
        {{ busy ? copy.creatingHousehold : copy.createHouseholdAction }}
      </button>
      <button type="button" class="link" @click="signOut()">{{ copy.signOut }}</button>
    </form>

    <div v-else-if="screen === 'onboarding' && membership" class="space-y-4">
      <p class="text-sm font-medium uppercase tracking-wide text-leaf-900">{{ copy.ready }}</p>
      <h2 class="text-2xl font-semibold text-leaf-900">{{ membership.household.name }}</h2>
      <p class="text-stone-700">
        {{ copy.onboardingHelp }}
      </p>
      <button type="button" class="primary" disabled aria-describedby="members-coming-soon">
        {{ copy.addFamilyMembers }}
      </button>
      <p id="members-coming-soon" class="text-sm text-stone-500">
        {{ copy.membersComingSoon }}
      </p>
      <button type="button" class="link" @click="signOut()">{{ copy.signOut }}</button>
    </div>
  </section>
</template>

<style scoped>
.field {
  @apply mt-1 block min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2;
  @apply text-stone-950 focus:border-leaf-600 focus:outline-none;
  @apply focus:ring-2 focus:ring-leaf-600/30;
}
.primary {
  @apply min-h-11 rounded-lg bg-leaf-900 px-5 py-2 font-medium text-white;
  @apply disabled:cursor-not-allowed disabled:opacity-60;
}
.link {
  @apply min-h-11 rounded px-1 text-leaf-900 underline underline-offset-4;
  @apply disabled:opacity-60;
}
.error {
  @apply mt-1 block min-h-5 text-sm text-red-800;
}
</style>
