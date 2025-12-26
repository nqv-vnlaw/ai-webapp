/**
 * MSW Server Setup for Tests
 *
 * Configures MSW server for API mocking in tests.
 * Handlers are defined in handlers.ts
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// This configures a request mocking server with the given request handlers.
export const server = setupServer(...handlers);

