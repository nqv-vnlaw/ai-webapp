# Sample JSON Files for VNLaw Web Apps

These sample JSON files provide reference implementations for frontend development and MSW mock handlers. They align with **SRS v1.5.2** and `1. Research/openapi.yaml`.

## Files

| File | Endpoint | Description |
|------|----------|-------------|
| `upstream_discovery_engine_answer_minimal.json` | (Upstream) | Minimal raw Discovery Engine answer/reference shape (for BFF adapter development) |
| `search_response_success_minimal.json` | `POST /v1/search` | Minimal canonical `SearchResponse` (paired with upstream sample) |
| `search_response_success.json` | `POST /v1/search` | Successful search with 5 results, answer, and pagination |
| `search_response_empty.json` | `POST /v1/search` | No results found |
| `search_response_partial.json` | `POST /v1/search` | Partial success (one datastore failed) |
| `chat_response_success.json` | `POST /v1/chat` | Successful chat with answer and citations |
| `error_responses.json` | All | All error codes from Section 6.3 |
| `me_response.json` | `GET /v1/me` | User profile (connected/disconnected variants) |
| `flags_response.json` | `GET /v1/flags` | Feature flags (MVP/post-MVP variants) |

## Naming Note

Legacy sample files with a trailing ` 2` suffix were renamed to remove spaces and clarify roles:
- `de_reference_shape_minimal 2.json` → `upstream_discovery_engine_answer_minimal.json`
- `bff_normalized_response_success 2.json` → `search_response_success_minimal.json`

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
