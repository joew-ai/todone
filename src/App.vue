<script setup lang="ts">
import { ListTodo, Trees, UserRound, UsersRound } from '@lucide/vue';
import { computed } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import { activeMembershipRole } from './presentation/appContext';
import { AppRouteName } from './router/routes';

const hasApplicationNavigation = computed(() => activeMembershipRole.value !== null);
</script>

<template>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <header class="border-b border-action-deep/15 bg-action-deep text-profile-on">
    <div
      class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8"
    >
      <h1 class="flex items-center gap-2 text-xl font-semibold tracking-tight">
        <Trees :size="22" stroke-width="1.75" aria-hidden="true" />
        Todone
      </h1>
      <nav
        v-if="hasApplicationNavigation"
        class="flex items-center gap-1 text-sm"
        aria-label="Application"
      >
        <RouterLink
          v-if="activeMembershipRole === 'child'"
          :to="{ name: AppRouteName.todos }"
          class="flex min-h-11 items-center gap-2 rounded-control px-3 font-medium hover:bg-profile-on/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <ListTodo :size="18" aria-hidden="true" />
          My Todos
        </RouterLink>
        <RouterLink
          v-if="activeMembershipRole === 'parent'"
          :to="{ name: AppRouteName.family }"
          class="flex min-h-11 items-center gap-2 rounded-control px-3 font-medium hover:bg-profile-on/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <UsersRound :size="18" aria-hidden="true" />
          Family
        </RouterLink>
        <RouterLink
          :to="{ name: AppRouteName.profile }"
          class="flex min-h-11 items-center gap-2 rounded-control px-3 font-medium hover:bg-profile-on/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <UserRound :size="18" aria-hidden="true" />
          My profile
        </RouterLink>
      </nav>
    </div>
  </header>

  <main id="main-content" class="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
    <RouterView />
  </main>
</template>
