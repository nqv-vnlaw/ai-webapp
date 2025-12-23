# Sample JSON Files for VNLaw Web Apps

These sample JSON files provide reference implementations for frontend development and MSW mock handlers. They match the canonical API format defined in **SRS v1.4.0 Section 6.2**.

## Files

| File | Endpoint | Description |
|------|----------|-------------|
| `search_response_success.json` | `POST /v1/search` | Successful search with 5 results, answer, and pagination |
| `search_response_empty.json` | `POST /v1/search` | No results found |
| `search_response_partial.json` | `POST /v1/search` | Partial success (one datastore failed) |
| `chat_response_success.json` | `POST /v1/chat` | Successful chat with answer and citations |
| `error_responses.json` | All | All error codes from Section 6.3 |
| `me_response.json` | `GET /v1/me` | User profile (connected/disconnected variants) |
| `flags_response.json` | `GET /v1/flags` | Feature flags (MVP/post-MVP variants) |

## Data Source

These samples are derived from actual production logs of the existing Chat Bot (Cloud Run), with the following transformations:

1. **Google Workspace Chat format** → **Canonical BFF format** (per Section 6.2.9)
2. **HTML entities** → **Markdown** (e.g., `<b>` → `**`)
3. **Drive URLs preserved** as-is (format: `https://drive.google.com/file/d/{id}/view`)
4. **Metadata inferred** where not present in original logs

## Key Field Mappings

From Discovery Engine to Canonical format (BFF responsibility):

| Discovery Engine | Canonical (Frontend) |
|------------------|---------------------|
| `document.uri` | `url` |
| `document.title` | `title` |
| `snippet.text` | `snippet` |
| (inferred from datastore) | `source` |
| `document.metadata.*` | `metadata.*` |

## Usage in MSW

```typescript
// Example MSW handler using these samples
import searchSuccess from './samples/search_response_success.json';
import searchEmpty from './samples/search_response_empty.json';
import errorResponses from './samples/error_responses.json';

export const handlers = [
  http.post('/v1/search', async ({ request }) => {
    const body = await request.json();

    // Simulate empty results for specific queries
    if (body.query.includes('no results')) {
      return HttpResponse.json(searchEmpty);
    }

    // Simulate rate limit
    if (body.query.includes('rate limit test')) {
      return HttpResponse.json(errorResponses.RATE_LIMITED, { status: 429 });
    }

    // Default success response
    return HttpResponse.json(searchSuccess);
  }),
];
```

## Validation

These samples conform to:
- **Section 6.0.2**: Canonical error contract
- **Section 6.2**: API endpoint schemas
- **Section 6.2.9**: Canonical result model
- **Section 6.3**: Error codes and HTTP status mapping

---

*Generated from production logs on 2025-12-23*
