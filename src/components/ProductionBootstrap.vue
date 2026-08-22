<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';
import { loadAuthConfig } from '../config/authConfig';
import { messages } from '../i18n/messages';
import { meetsAccountPasswordPolicy } from '../services/accountPassword';
import { AuthClient, type AuthActionResult } from '../services/authClient';
import {
  createHousehold,
  fetchCurrentMembership,
  type CurrentMembership,
} from '../services/householdClient';
import { fetchFamilyMembers, type FamilyMember } from '../services/familyClient';
import {
  fetchMyProfile,
  ProfileColor,
  ProfileColorHex,
  saveMyProfile,
  type Profile,
  type ProfileColorId,
} from '../services/profileClient';

type Screen =
  | 'restoring'
  | 'signin'
  | 'register'
  | 'confirm'
  | 'forgot'
  | 'reset'
  | 'membership-loading'
  | 'household'
  | 'profile-loading'
  | 'profile-load-error'
  | 'profile-setup'
  | 'family-loading'
  | 'family-load-error'
  | 'family-management'
  | 'profile-edit';

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
const profileCopy = messages.profileSetup;
const familyCopy = messages.familyManagement;
const profileColors = Object.values(ProfileColor).map((color) => ({
  id: color,
  hex: ProfileColorHex[color],
  label: color.charAt(0) + color.slice(1).toLowerCase(),
}));

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
const displayName = ref('');
const profileColor = ref<ProfileColorId | ''>('');
const profile = ref<Profile | null>(null);
const familyMembers = ref<FamilyMember[]>([]);
const fieldError = ref<Record<string, string>>({});
const firstField = ref<{ focus(): void } | null>(null);
const registrationPasswordField = ref<{ focus(): void } | null>(null);
const resetPasswordField = ref<{ focus(): void } | null>(null);
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
  if (!(await validatePassword(password.value, registrationPasswordField))) return;
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
  if (!(await validatePassword(newPassword.value, resetPasswordField))) return;
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
  if (!membership.value) {
    screen.value = 'household';
    return;
  }
  await resolveProfile(idToken);
}

async function resolveProfile(idToken: string): Promise<void> {
  screen.value = 'profile-loading';
  const result = await fetchMyProfile(idToken);
  if (result.kind === 'error') {
    if (!result.recoverable) {
      signOut(result.message);
      return;
    }
    status.value = profileCopy.loadFailed;
    statusIsError.value = true;
    screen.value = 'profile-load-error';
    return;
  }
  profile.value = result.data.profile;
  if (!profile.value) {
    screen.value = 'profile-setup';
    return;
  }
  await loadFamilyManagement(idToken);
}

async function loadFamilyManagement(idToken: string): Promise<void> {
  screen.value = 'family-loading';
  const result = await fetchFamilyMembers(idToken);
  if (result.kind === 'error') {
    if (!result.recoverable) {
      signOut(result.message);
      return;
    }
    status.value = familyCopy.loadFailed;
    statusIsError.value = true;
    screen.value = 'family-load-error';
    return;
  }
  familyMembers.value = result.data.members;
  screen.value = 'family-management';
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
    status.value = copy.created;
    statusIsError.value = false;
    await resolveProfile(token);
  });
}

async function submitProfile(): Promise<void> {
  fieldError.value = {};
  const trimmedDisplayName = displayName.value.trim();
  if (!trimmedDisplayName) fieldError.value.displayName = profileCopy.displayNameRequired;
  if (!profileColor.value) fieldError.value.color = profileCopy.colorRequired;
  if (Object.keys(fieldError.value).length) {
    status.value = messages.profileApi.invalidDisplayName;
    statusIsError.value = true;
    await focusFirstField();
    return;
  }
  await run(async () => {
    const token = client().getIdToken();
    if (!token) return signOut(copy.sessionEnded);
    const result = await saveMyProfile(token, {
      displayName: trimmedDisplayName,
      color: profileColor.value as ProfileColorId,
      version: profile.value?.version ?? 0,
    });
    if (result.kind === 'error') {
      for (const error of result.fieldErrors ?? []) fieldError.value[error.field] = error.message;
      status.value = result.message;
      statusIsError.value = true;
      if (!result.recoverable) signOut(result.message);
      return;
    }
    profile.value = result.data.profile;
    status.value = screen.value === 'profile-edit' ? familyCopy.profileSaved : profileCopy.saved;
    statusIsError.value = false;
    await loadFamilyManagement(token);
  });
}

async function retryProfile(): Promise<void> {
  const token = client().getIdToken();
  if (!token) return signOut(copy.sessionEnded);
  await resolveProfile(token);
}

function beginProfileEdit(): void {
  if (!profile.value) return;
  displayName.value = profile.value.displayName;
  profileColor.value = profile.value.color;
  fieldError.value = {};
  screen.value = 'profile-edit';
}

async function retryFamilyManagement(): Promise<void> {
  const token = client().getIdToken();
  if (!token) return signOut(copy.sessionEnded);
  await loadFamilyManagement(token);
}

function cancelProfileEdit(): void {
  fieldError.value = {};
  screen.value = 'family-management';
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
  displayName.value = '';
  profileColor.value = '';
  profile.value = null;
  familyMembers.value = [];
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

async function validatePassword(
  candidate: string,
  passwordField: { value: { focus(): void } | null },
): Promise<boolean> {
  if (meetsAccountPasswordPolicy(candidate)) return true;
  fieldError.value.password = copy.passwordPolicyError;
  status.value = copy.passwordPolicyError;
  statusIsError.value = true;
  await nextTick();
  passwordField.value?.focus();
  return false;
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

    <div
      v-if="
        screen === 'restoring' || screen === 'membership-loading' || screen === 'profile-loading'
      "
      aria-busy="true"
    >
      <h2 class="text-xl font-semibold text-leaf-900">{{ copy.restoreHeading }}</h2>
      <p class="mt-2 text-stone-600">{{ copy.restoring }}</p>
    </div>

    <form v-else-if="screen === 'signin'" class="space-y-4" @submit.prevent="signIn">
      <h2 class="text-xl font-semibold text-leaf-900">{{ copy.signIn }}</h2>
      <label class="block"
        >{{ copy.username
        }}<input v-model="username" required autocomplete="username" class="field" :disabled="busy"
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
        >{{ copy.recoveryEmail
        }}<input v-model="email" required type="email" autocomplete="email" class="field"
      /></label>
      <label class="block"
        >{{ copy.password
        }}<input
          ref="registrationPasswordField"
          v-model="password"
          required
          type="password"
          autocomplete="new-password"
          class="field"
          :aria-invalid="!!fieldError.password"
          aria-describedby="registration-password-policy registration-password-error"
        /><span id="registration-password-policy" class="mt-1 block text-sm text-stone-600">{{
          copy.passwordPolicy
        }}</span
        ><span id="registration-password-error" class="error">{{
          fieldError.password
        }}</span></label
      >
      <label class="block"
        >{{ copy.entryCode
        }}<input
          v-model="gatePassword"
          required
          type="password"
          autocomplete="off"
          class="field"
          :aria-invalid="!!fieldError.registrationGatePassword"
          aria-describedby="entry-code-help entry-code-error"
        /><span id="entry-code-help" class="mt-1 block text-sm text-stone-600">{{
          copy.entryCodeHelp
        }}</span
        ><span id="entry-code-error" class="error">{{
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
        >{{ copy.recoveryCode
        }}<input
          v-model="code"
          required
          autocomplete="one-time-code"
          class="field"
          :aria-invalid="!!fieldError.code"
      /></label>
      <label class="block"
        >{{ copy.newPassword
        }}<input
          ref="resetPasswordField"
          v-model="newPassword"
          required
          type="password"
          autocomplete="new-password"
          class="field"
          :aria-invalid="!!fieldError.password"
          aria-describedby="reset-password-policy reset-password-error"
        /><span id="reset-password-policy" class="mt-1 block text-sm text-stone-600">{{
          copy.passwordPolicy
        }}</span
        ><span id="reset-password-error" class="error">{{ fieldError.password }}</span></label
      >
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

    <div v-else-if="screen === 'profile-load-error'" class="space-y-4">
      <h2 class="text-xl font-semibold text-leaf-900">{{ profileCopy.heading }}</h2>
      <p class="text-stone-700">{{ profileCopy.loadFailed }}</p>
      <button type="button" class="primary" @click="retryProfile">{{ profileCopy.retry }}</button>
      <button type="button" class="link" @click="signOut()">{{ copy.signOut }}</button>
    </div>

    <form
      v-else-if="screen === 'profile-setup' || screen === 'profile-edit'"
      class="space-y-5"
      @submit.prevent="submitProfile"
    >
      <h2 class="text-xl font-semibold text-leaf-900">
        {{ screen === 'profile-edit' ? familyCopy.editProfile : profileCopy.heading }}
      </h2>
      <p class="text-sm text-stone-600">{{ profileCopy.help }}</p>
      <label class="block"
        >{{ profileCopy.displayName
        }}<input
          ref="firstField"
          v-model="displayName"
          required
          maxlength="60"
          autocomplete="nickname"
          class="field"
          :disabled="busy"
          :aria-invalid="!!fieldError.displayName"
          aria-describedby="profile-display-name-error"
        /><span id="profile-display-name-error" class="error">{{
          fieldError.displayName
        }}</span></label
      >
      <fieldset :aria-describedby="fieldError.color ? 'profile-color-error' : undefined">
        <legend class="font-medium text-stone-950">{{ profileCopy.color }}</legend>
        <div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label
            v-for="color in profileColors"
            :key="color.id"
            class="profile-color-option"
            :class="{ 'profile-color-option--selected': profileColor === color.id }"
          >
            <input
              v-model="profileColor"
              type="radio"
              name="profile-color"
              :value="color.id"
              :disabled="busy"
            />
            <span
              class="profile-color-swatch"
              :style="{ backgroundColor: color.hex }"
              aria-hidden="true"
            />
            <span>{{ color.label }}</span>
          </label>
        </div>
        <span id="profile-color-error" class="error">{{ fieldError.color }}</span>
      </fieldset>
      <button class="primary" type="submit" :disabled="busy">
        {{
          busy
            ? profileCopy.saving
            : screen === 'profile-edit'
              ? familyCopy.saveProfile
              : profileCopy.save
        }}
      </button>
      <button
        type="button"
        class="link"
        :disabled="busy"
        @click="screen === 'profile-edit' ? cancelProfileEdit() : signOut()"
      >
        {{ screen === 'profile-edit' ? familyCopy.cancel : copy.signOut }}
      </button>
    </form>

    <div v-else-if="screen === 'family-loading'" aria-busy="true">
      <h2 class="text-xl font-semibold text-leaf-900">{{ familyCopy.heading }}</h2>
      <p class="mt-2 text-stone-600">{{ familyCopy.loading }}</p>
    </div>

    <div v-else-if="screen === 'family-load-error'" class="space-y-4">
      <h2 class="text-xl font-semibold text-leaf-900">{{ familyCopy.heading }}</h2>
      <p class="text-stone-700">{{ familyCopy.loadFailed }}</p>
      <button type="button" class="primary" @click="retryFamilyManagement">
        {{ familyCopy.retry }}
      </button>
      <button type="button" class="link" @click="signOut()">{{ copy.signOut }}</button>
    </div>

    <div v-else-if="screen === 'family-management' && membership" class="space-y-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-sm font-medium uppercase tracking-wide text-leaf-900">{{ copy.ready }}</p>
          <h2 class="text-2xl font-semibold text-leaf-900">{{ familyCopy.heading }}</h2>
          <p class="mt-1 text-sm text-stone-600">{{ membership.household.name }}</p>
        </div>
        <button type="button" class="secondary" @click="beginProfileEdit">
          {{ familyCopy.editProfile }}
        </button>
      </div>
      <p v-if="familyMembers.length === 0" class="text-stone-700">{{ familyCopy.empty }}</p>
      <ul v-else class="grid gap-3 sm:grid-cols-2">
        <li v-for="member in familyMembers" :key="member.memberId" class="member-card">
          <span
            class="profile-color-swatch"
            :style="{ backgroundColor: ProfileColorHex[member.color] }"
            aria-hidden="true"
          />
          <div class="min-w-0 flex-1">
            <p class="font-medium text-stone-950">{{ member.displayName }}</p>
            <dl class="mt-2 grid gap-1 text-sm text-stone-700">
              <div>
                <dt class="sr-only">{{ familyCopy.username }}</dt>
                <dd>@{{ member.username }}</dd>
              </div>
              <div>
                <dt class="inline font-medium">{{ familyCopy.role }}:</dt>
                <dd class="inline">
                  {{ member.role === 'parent' ? familyCopy.parent : familyCopy.child }}
                </dd>
              </div>
              <div>
                <dt class="inline font-medium">{{ familyCopy.status }}:</dt>
                <dd class="inline">
                  {{ member.activationState === 'ACTIVE' ? familyCopy.active : familyCopy.pending }}
                </dd>
              </div>
            </dl>
            <p v-if="member.allowedActions.length" class="mt-2 text-sm text-stone-600">
              {{ familyCopy.pendingActions }}
            </p>
          </div>
        </li>
      </ul>
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
.secondary {
  @apply min-h-11 rounded-lg border border-leaf-900 px-4 py-2 font-medium text-leaf-900;
  @apply focus:outline-none focus:ring-2 focus:ring-leaf-600/30;
}
.link {
  @apply min-h-11 rounded px-1 text-leaf-900 underline underline-offset-4;
  @apply disabled:opacity-60;
}
.error {
  @apply mt-1 block min-h-5 text-sm text-red-800;
}
.profile-color-option {
  @apply flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-stone-300 px-3 py-2;
  @apply text-sm text-stone-950 focus-within:border-leaf-600 focus-within:ring-2 focus-within:ring-leaf-600/30;
}
.profile-color-option--selected {
  @apply border-leaf-900 bg-leaf-50;
}
.profile-color-swatch {
  @apply h-4 w-4 rounded-full ring-1 ring-black/20;
}
.member-card {
  @apply flex min-w-0 gap-3 rounded-lg border border-stone-200 p-4;
}
</style>
