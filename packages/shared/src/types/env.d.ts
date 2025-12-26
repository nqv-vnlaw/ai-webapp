/**
 * Shared Environment Variable Types
 * 
 * Consolidated ImportMetaEnv interface for all VNlaw Web Apps packages.
 * This file ensures consistent type definitions across auth, api-client, and other packages.
 * 
 * Note: This file uses module augmentation to extend the global ImportMetaEnv interface.
 * Packages that use this should have vite/client types available (via vite devDependency
 * or /// <reference types="vite/client" /> directive).
 */

declare global {
  interface ImportMetaEnv {
    // API Configuration
    readonly VITE_API_BASE_URL?: string;

    // Kinde Authentication Configuration
    readonly VITE_KINDE_DOMAIN?: string;
    readonly VITE_KINDE_CLIENT_ID?: string;
    readonly VITE_KINDE_REDIRECT_URI?: string;
    readonly VITE_KINDE_LOGOUT_URI?: string;

    // Domain Restriction
    readonly VITE_ALLOWED_DOMAIN?: string;

    // Demo Mode
    readonly VITE_DEMO_MODE?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};

