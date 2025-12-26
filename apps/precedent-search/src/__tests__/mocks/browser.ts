/**
 * MSW Browser Setup
 *
 * Configures MSW for browser environment (used in demo mode).
 * This file is imported in the app when VITE_DEMO_MODE=true
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// This configures a Service Worker with the given request handlers.
export const worker = setupWorker(...handlers);

