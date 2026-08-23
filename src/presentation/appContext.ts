import { ref } from 'vue';
import type { CurrentMembership } from '../services/householdClient';

export const activeMembershipRole = ref<CurrentMembership['role'] | null>(null);

export function applyMembershipContext(membership: CurrentMembership | null): void {
  activeMembershipRole.value = membership?.role ?? null;
}
