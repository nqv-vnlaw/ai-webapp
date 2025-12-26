function normalizeBoolean(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  const result = normalized === 'true';
  
  // Warn in development if value is truthy but not exactly "true"
  // Check if we're in dev mode by checking if MODE is 'development' (Vite convention)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const importMeta = import.meta as any;
  const isDev =
    importMeta.env?.MODE === 'development' || importMeta.env?.DEV === true;
  
  if (
    isDev &&
    normalized &&
    normalized !== 'true' &&
    normalized !== 'false'
  ) {
    console.warn(
      `[VNlaw Auth] Unexpected VITE_DEMO_MODE value: "${value}". Expected "true" or "false". Treating as false.`,
    );
  }
  
  return result;
}

function normalizeDomain(
  value: string | undefined,
  isDemoMode: boolean,
): string {
  // In demo mode, allow default fallback
  if (isDemoMode && !value) {
    return 'vnlaw.com.vn';
  }
  
  // In production, require explicit value
  if (!value || value.trim() === '') {
    throw new Error(
      'VITE_ALLOWED_DOMAIN is required but not set. Please set this environment variable in your .env file.',
    );
  }
  
  return value.trim().replace(/^@/, '').toLowerCase();
}

export const IS_DEMO_MODE = normalizeBoolean(import.meta.env.VITE_DEMO_MODE);
export const ALLOWED_DOMAIN = normalizeDomain(
  import.meta.env.VITE_ALLOWED_DOMAIN,
  IS_DEMO_MODE,
);

export function getKindeConfig(): {
  domain: string;
  clientId: string;
  redirectUri: string;
  logoutUri: string;
} {
  const domain = import.meta.env.VITE_KINDE_DOMAIN;
  const clientId = import.meta.env.VITE_KINDE_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_KINDE_REDIRECT_URI;
  const logoutUri = import.meta.env.VITE_KINDE_LOGOUT_URI;

  if (!domain || !clientId || !redirectUri || !logoutUri) {
    throw new Error(
      'Missing required Kinde environment variables. Please check your .env file.',
    );
  }

  return { domain, clientId, redirectUri, logoutUri };
}

