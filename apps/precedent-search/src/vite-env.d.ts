/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KINDE_DOMAIN: string;
  readonly VITE_KINDE_CLIENT_ID: string;
  readonly VITE_KINDE_REDIRECT_URI: string;
  readonly VITE_KINDE_LOGOUT_URI: string;
  readonly VITE_ALLOWED_DOMAIN: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_DEMO_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

