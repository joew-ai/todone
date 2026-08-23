import type { ProfileColorId } from '../services/profileClient';

/** Applies only reviewed profile-tone variables; it never changes semantic state colors. */
export function applyProfileTone(color: ProfileColorId): void {
  globalThis.document?.documentElement.setAttribute('data-profile-color', color);
}

/** Removes private profile presentation state on sign-out or session loss. */
export function clearProfileTone(): void {
  globalThis.document?.documentElement.removeAttribute('data-profile-color');
}
