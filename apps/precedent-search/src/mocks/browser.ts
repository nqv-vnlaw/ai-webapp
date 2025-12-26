/**
 * MSW Browser Worker Setup
 *
 * Configures Mock Service Worker for browser environment.
 * Only active when VITE_DEMO_MODE=true.
 *
 * Reference: SRS §10.2.1
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * Setup MSW worker with all handlers
 * This worker intercepts fetch requests when active
 */
export const worker = setupWorker(...handlers);

