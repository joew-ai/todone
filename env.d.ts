/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Cognito user pool ID output by terraform/outputs.tf (cognito_user_pool_id). */
  readonly VITE_COGNITO_USER_POOL_ID: string;
  /** Todone PWA app-client ID output by terraform/outputs.tf (pwa_client_id). */
  readonly VITE_COGNITO_CLIENT_ID: string;
  /** AWS region hosting the Cognito user pool. */
  readonly VITE_COGNITO_REGION: string;
  /**
   * LOCAL DEVELOPMENT ONLY. Set by scripts/setup-local-cognito.ts to point
   * the auth client at cognito-local instead of real Cognito. Never set
   * this against a deployed pool.
   */
  readonly VITE_COGNITO_LOCAL_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}
