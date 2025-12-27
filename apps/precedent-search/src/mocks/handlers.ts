/**
 * MSW Mock Handlers
 *
 * Mock Service Worker handlers for all API endpoints.
 * Used when VITE_DEMO_MODE=true to enable frontend development without backend.
 *
 * Reference: SRS §10.2.1
 */

import { http, HttpResponse, delay } from 'msw';
import type {
  SearchRequest,
  SearchResponse,
  ChatRequest,
  ChatResponse,
  FeedbackRequest,
  FeedbackResponse,
} from '@vnlaw/api-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.vnlaw.app';

/**
 * Generate a random UUID v4 for requestId
 */
function generateRequestId(): string {
  return `${crypto.randomUUID()}`;
}

/**
 * Simulate network latency (200-800ms random delay)
 * Per SRS §10.2.1: Helps catch loading state bugs
 */
async function simulateLatency(): Promise<void> {
  const delayMs = Math.floor(Math.random() * 600) + 200; // 200-800ms
  await delay(delayMs);
}

/**
 * Search Success Response (2-5 results with metadata)
 */
const searchSuccessResponse: SearchResponse = {
  requestId: generateRequestId(),
  query: '',
  scope: 'precedent',
  status: 'success',
  answer:
    'This clause limits the Seller\'s liability where the Purchaser can recover the same losses through insurance, preventing double recovery and shifting first recourse to insurance.',
  results: [
    {
      title: '2025 1 10 Email response to Molex\'s question on LSA_1.3.pdf',
      snippet: 'Analysis of limitation of liability clauses and insurance recovery provisions, including how claims may be limited when losses are covered by insurance.',
      url: 'https://drive.google.com/file/d/1-LqYtDNxv8lWFroH2ztHWW_V3T1CdfoK/view',
      source: 'precedent',
      metadata: {
        documentType: 'internal',
        date: '2025-01-10',
        confidentiality: 'internal',
        language: 'en',
      },
    },
    {
      title: 'RE: LSA Review',
      snippet: 'Email thread discussing LSA terms, including indemnities, limitations, and insurance recovery mechanisms in a transaction context.',
      url: 'https://drive.google.com/file/d/18226961902971622463/view',
      source: 'precedent',
      metadata: {
        documentType: 'email',
        confidentiality: 'internal',
        language: 'en',
      },
    },
    {
      title: 'Share Purchase Agreement - Liability Provisions',
      snippet: 'Comprehensive review of liability limitations, insurance recovery clauses, and indemnification mechanisms in SPAs.',
      url: 'https://drive.google.com/file/d/example3/view',
      source: 'precedent',
      metadata: {
        documentType: 'internal',
        date: '2024-12-15',
        confidentiality: 'internal',
        language: 'en',
      },
    },
  ],
  nextCursor: 'eyJwYWdlIjogMiwgInNlYXJjaF9rZXkiOiAiZXhhbXBsZSJ9',
  datastoreStatus: {
    precedent: {
      status: 'success',
      resultCount: 69,
      error: null,
    },
    infobank: {
      status: 'success',
      resultCount: 0,
      error: null,
    },
    workspace: {
      status: 'success',
      resultCount: 0,
      error: null,
    },
  },
  warnings: [],
  auth: {
    needsGoogleConnect: false,
    connectUrl: null,
  },
};

/**
 * Search Empty Response
 */
const searchEmptyResponse: SearchResponse = {
  requestId: generateRequestId(),
  query: '',
  scope: 'precedent',
  status: 'success',
  answer: null,
  results: [],
  nextCursor: null,
  datastoreStatus: {
    precedent: {
      status: 'success',
      resultCount: 0,
      error: null,
    },
    infobank: {
      status: 'success',
      resultCount: 0,
      error: null,
    },
    workspace: {
      status: 'success',
      resultCount: 0,
      error: null,
    },
  },
  warnings: [],
  auth: {
    needsGoogleConnect: false,
    connectUrl: null,
  },
};

/**
 * Search Partial Failure Response
 */
const searchPartialResponse: SearchResponse = {
  requestId: generateRequestId(),
  query: '',
  scope: 'both',
  status: 'partial',
  answer: 'Force majeure clauses in Vietnamese contracts typically require the affected party to demonstrate that the event was unforeseeable, unavoidable, and beyond their control.',
  results: [
    {
      title: 'Force Majeure Analysis - COVID-19 Impact on Commercial Contracts',
      snippet: 'Comprehensive analysis of force majeure provisions in the context of pandemic-related contract disruptions under Vietnamese law.',
      url: 'https://drive.google.com/file/d/1234567890/view',
      source: 'precedent',
      metadata: {
        documentType: 'internal',
        date: '2020-05-15',
        confidentiality: 'internal',
        language: 'en',
      },
    },
  ],
  nextCursor: null,
  datastoreStatus: {
    precedent: {
      status: 'success',
      resultCount: 15,
      error: null,
    },
    infobank: {
      status: 'error',
      resultCount: 0,
      error: 'DATASTORE_TIMEOUT: Infobank datastore did not respond within 30 seconds',
    },
    workspace: {
      status: 'success',
      resultCount: 0,
      error: null,
    },
  },
  warnings: [
    'Infobank datastore was unavailable. Results shown are from precedent datastore only.',
  ],
  auth: {
    needsGoogleConnect: false,
    connectUrl: null,
  },
};

/**
 * Chat Success Response
 */
const chatSuccessResponse: ChatResponse = {
  requestId: generateRequestId(),
  conversationId: 'conv_a12e5f1fd68547a3',
  messageId: 'msg_b23f6g2ge79658b4',
  answer:
    'The provided clause states that the Seller is not liable for any Claim if the Losses related to that Claim can be recovered by the Purchaser under any of the Purchaser\'s or a Group Company\'s insurance policies. This is a common contractual provision designed to allocate risk and prevent double recovery of losses.',
  citations: [
    {
      title: '2025 1 10 Email response to Molex\'s question on LSA_1.3.pdf',
      url: 'https://drive.google.com/file/d/1-LqYtDNxv8lWFroH2ztHWW_V3T1CdfoK/view',
      snippet:
        'Analysis of Limitation of Liability clauses in Share Purchase Agreements, addressing insurance recovery provisions.',
      source: 'precedent',
    },
    {
      title: 'RE: LSA Review',
      url: 'https://drive.google.com/file/d/18226961902971622463/view',
      snippet:
        'Email thread discussing LSA terms, including liability limitations and insurance recovery mechanisms.',
      source: 'precedent',
    },
    {
      title: 'RE: LSA Review',
      url: 'https://drive.google.com/file/d/9246583802810001738/view',
      snippet:
        'Discussion of warranty claims, indemnification provisions, and their relationship with insurance policies.',
      source: 'precedent',
    },
  ],
  auth: {
    needsGoogleConnect: false,
    connectUrl: null,
  },
  contextLimitWarning: false,
};

/**
 * Mock User Profile
 */
const mockUserProfile = {
  requestId: generateRequestId(),
  email: 'demo@vnlaw.com.vn',
  name: 'Demo User',
  picture: null,
  workspace: {
    connected: false,
    connectedEmail: null,
    scopes: [],
    connectUrl: `${API_BASE_URL}/v1/oauth/google/connect?redirect=/workspace`,
  },
};

/**
 * Mock Feature Flags (MVP defaults)
 */
const mockFeatureFlags = {
  requestId: generateRequestId(),
  flags: {
    WORKSPACE_SEARCH_ENABLED: false,
    CHAT_HISTORY_ENABLED: false,
    STREAMING_ENABLED: false,
    FEEDBACK_ENABLED: true,
    EXPORT_ENABLED: true,
    INFOBANK_SEARCH_ENABLED: false,
  },
};

/**
 * MSW Handlers
 */
export const handlers = [
  // ============ Search Endpoints ============

  /**
   * POST /v1/search - Success with results
   */
  http.post(`${API_BASE_URL}/v1/search`, async ({ request }) => {
    await simulateLatency();

    const body = (await request.json()) as SearchRequest;
    const { query, scope, cursor } = body;

    // Handle pagination: if cursor exists, return empty (simulating last page)
    if (cursor) {
      const emptyResponse = {
        ...searchEmptyResponse,
        requestId: generateRequestId(),
        query,
        scope,
      };
      return HttpResponse.json(emptyResponse, { status: 200 });
    }

    // Handle empty query - return empty results
    if (!query || query.trim().length === 0) {
      const emptyResponse = {
        ...searchEmptyResponse,
        requestId: generateRequestId(),
        query: query || '',
        scope,
      };
      return HttpResponse.json(emptyResponse, { status: 200 });
    }

    // Handle partial failure scenario (query contains "partial" or "error")
    if (query.toLowerCase().includes('partial') || query.toLowerCase().includes('error')) {
      const partialResponse = {
        ...searchPartialResponse,
        requestId: generateRequestId(),
        query,
        scope,
      };
      return HttpResponse.json(partialResponse, { status: 207 }); // Partial success
    }

    // Handle workspace scope - return AUTH_GOOGLE_DISCONNECTED error
    if (scope === 'workspace') {
      return HttpResponse.json(
        {
          error: {
            code: 'AUTH_GOOGLE_DISCONNECTED',
            message: 'Connect your Google Workspace to search internal documents.',
            requestId: generateRequestId(),
            details: {
              connectUrl: `${API_BASE_URL}/v1/oauth/google/connect?redirect=/workspace`,
              requiredScopes: ['cloud_search'],
            },
            retryable: false,
            retryAfterSeconds: null,
          },
        },
        { status: 403 }
      );
    }

    // Default: success with results
    const successResponse = {
      ...searchSuccessResponse,
      requestId: generateRequestId(),
      query,
      scope,
    };
    return HttpResponse.json(successResponse, { status: 200 });
  }),

  // ============ Chat Endpoints ============

  /**
   * POST /v1/chat - Success with answer and citations
   */
  http.post(`${API_BASE_URL}/v1/chat`, async ({ request }) => {
    await simulateLatency();

    const body = (await request.json()) as ChatRequest;
    const { message } = body;

    // Handle empty message
    if (!message || message.trim().length === 0) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request. Please check your input.',
            requestId: generateRequestId(),
            details: {
              fields: {
                message: 'Message cannot be empty',
              },
            },
            retryable: false,
            retryAfterSeconds: null,
          },
        },
        { status: 400 }
      );
    }

    // Default: success with answer
    const response = {
      ...chatSuccessResponse,
      requestId: generateRequestId(),
      conversationId: body.conversationId ?? generateRequestId(),
      messageId: generateRequestId(),
    };
    return HttpResponse.json(response, { status: 200 });
  }),

  // ============ User Profile ============

  /**
   * GET /v1/me - Mock user profile
   */
  http.get(`${API_BASE_URL}/v1/me`, async () => {
    await simulateLatency();

    return HttpResponse.json(
      {
        ...mockUserProfile,
        requestId: generateRequestId(),
      },
      { status: 200 }
    );
  }),

  // ============ Feature Flags ============

  /**
   * GET /v1/flags - Mock feature flags
   */
  http.get(`${API_BASE_URL}/v1/flags`, async () => {
    await simulateLatency();

    return HttpResponse.json(
      {
        ...mockFeatureFlags,
        requestId: generateRequestId(),
      },
      { status: 200 }
    );
  }),

  // ============ Feedback Endpoints ============

  /**
   * POST /v1/feedback - Submit feedback on an answer
   */
  http.post(`${API_BASE_URL}/v1/feedback`, async ({ request }) => {
    await simulateLatency();

    const body = (await request.json()) as FeedbackRequest;
    const { messageId, conversationId, type } = body;

    // Validate required fields
    if (!messageId || !conversationId || !type) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request. Please check your input.',
            requestId: generateRequestId(),
            details: {
              fields: {
                ...(messageId ? {} : { messageId: 'Message ID is required' }),
                ...(conversationId ? {} : { conversationId: 'Conversation ID is required' }),
                ...(type ? {} : { type: 'Feedback type is required' }),
              },
            },
            retryable: false,
            retryAfterSeconds: null,
          },
        },
        { status: 400 }
      );
    }

    // Validate type value
    if (type !== 'up' && type !== 'down') {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid feedback type. Must be "up" or "down".',
            requestId: generateRequestId(),
            details: {
              fields: {
                type: 'Must be "up" or "down"',
              },
            },
            retryable: false,
            retryAfterSeconds: null,
          },
        },
        { status: 400 }
      );
    }

    // Success response
    const response: FeedbackResponse = {
      requestId: generateRequestId(),
      status: 'received',
    };
    return HttpResponse.json(response, { status: 200 });
  }),

  // ============ Error Scenarios (for testing) ============

  /**
   * Error test endpoints - Triggered by special query patterns:
   * - Query containing "429" or "rate" -> Rate limit error
   * - Query containing "500" or "server" -> Server error
   * - Query containing "504" or "timeout" -> Gateway timeout
   *
   * These are handled in the main search/chat handlers above by checking the query.
   * The handlers below provide dedicated test endpoints for more control.
   */

  /**
   * GET /test/error/429 - Simulate rate limit error
   */
  http.get(`${API_BASE_URL}/test/error/429`, async () => {
    await simulateLatency();

    return HttpResponse.json(
      {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please wait before trying again.',
          requestId: generateRequestId(),
          details: {
            retryAfterSeconds: 30,
            currentUsage: 65,
            limit: 60,
          },
          retryable: true,
          retryAfterSeconds: 30,
        },
      },
      {
        status: 429,
        headers: {
          'Retry-After': '30',
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 30),
        },
      }
    );
  }),

  /**
   * GET /test/error/500 - Simulate internal server error
   */
  http.get(`${API_BASE_URL}/test/error/500`, async () => {
    await simulateLatency();

    return HttpResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal server error occurred. Please try again later.',
          requestId: generateRequestId(),
          details: null,
          retryable: true,
          retryAfterSeconds: null,
        },
      },
      { status: 500 }
    );
  }),

  /**
   * GET /test/error/504 - Simulate gateway timeout
   */
  http.get(`${API_BASE_URL}/test/error/504`, async () => {
    // Simulate longer delay for timeout
    await delay(2000);

    return HttpResponse.json(
      {
        error: {
          code: 'GATEWAY_TIMEOUT',
          message: 'The request timed out. Please try again.',
          requestId: generateRequestId(),
          details: null,
          retryable: true,
          retryAfterSeconds: null,
        },
      },
      { status: 504 }
    );
  }),

  /**
   * GET /test/circuit-breaker - Simulate circuit breaker open state
   */
  http.get(`${API_BASE_URL}/test/circuit-breaker`, async () => {
    await simulateLatency();

    return HttpResponse.json(
      {
        error: {
          code: 'CIRCUIT_OPEN',
          message: 'Service temporarily unavailable due to repeated failures.',
          requestId: generateRequestId(),
          details: {
            circuitState: 'open',
            recoveryTimeMs: 30000,
          },
          retryable: true,
          retryAfterSeconds: 30,
        },
      },
      { status: 503 }
    );
  }),
];
