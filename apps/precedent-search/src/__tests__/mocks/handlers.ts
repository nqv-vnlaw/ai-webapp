/**
 * MSW Request Handlers
 *
 * Mock API handlers for testing and demo mode.
 * These handlers simulate backend responses according to OpenAPI spec.
 */

import { http, HttpResponse, delay } from 'msw';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.vnlaw.app';

/**
 * Helper to add random latency (200-800ms) to simulate real network conditions
 */
async function simulateLatency() {
  const delayMs = 200 + Math.random() * 600; // 200-800ms
  await delay(delayMs);
}

export const handlers = [
  // Health check
  http.get(`${API_BASE_URL}/v1/health`, async () => {
    await simulateLatency();
    return HttpResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }),

  // Search endpoint - success with results
  http.post(`${API_BASE_URL}/v1/search`, async () => {
    await simulateLatency();
    // const body = await request.json() as { query?: string; scope?: string };

    // Mock search results
    const mockResults = [
      {
        title: 'Sample Legal Case 1',
        snippet: 'This is a sample legal case snippet demonstrating search functionality...',
        url: 'https://example.com/case/1',
        source: 'precedent' as const,
        metadata: {
          date: '2023-01-15',
          court: 'Supreme Court',
        },
      },
      {
        title: 'Sample Legal Case 2',
        snippet: 'Another example of legal precedent with relevant information...',
        url: 'https://example.com/case/2',
        source: 'precedent' as const,
        metadata: {
          date: '2022-11-01',
          jurisdiction: 'civil',
        },
      },
    ];

    return HttpResponse.json({
      results: mockResults,
      total: mockResults.length,
      hasMore: false,
      cursor: null,
      requestId: crypto.randomUUID(),
    });
  }),

  // Chat endpoint - success with answer
  http.post(`${API_BASE_URL}/v1/chat`, async () => {
    await simulateLatency();
    // const body = await request.json() as { message?: string; scope?: string };

    return HttpResponse.json({
      answer: 'This is a mock chat response. In a real scenario, this would contain AI-generated legal insights.',
      citations: [
        {
          title: 'Reference Document 1',
          url: 'https://example.com/ref/1',
          snippet: 'Relevant excerpt from document...',
        },
        {
          title: 'Reference Document 2',
          url: 'https://example.com/ref/2',
          snippet: 'Another relevant excerpt...',
        },
      ],
      requestId: crypto.randomUUID(),
    });
  }),

  // User profile endpoint
  http.get(`${API_BASE_URL}/v1/me`, async () => {
    await simulateLatency();
    return HttpResponse.json({
      id: 'demo-user-id',
      email: 'demo@vnlaw.com.vn',
      name: 'Demo User',
      workspaceConnected: false,
      requestId: crypto.randomUUID(),
    });
  }),

  // Feature flags endpoint
  http.get(`${API_BASE_URL}/v1/flags`, async () => {
    await simulateLatency();
    return HttpResponse.json({
      flags: {
        INFOBANK_SEARCH_ENABLED: false,
        WORKSPACE_SEARCH_ENABLED: false,
        CHAT_STREAMING_ENABLED: false,
      },
      requestId: crypto.randomUUID(),
    });
  }),
];

