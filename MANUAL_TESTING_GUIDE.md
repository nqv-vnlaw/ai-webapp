# Manual Testing Guide - Phase 4 Chat Feature

## Prerequisites

1. **Start the dev server:**
   ```bash
   pnpm dev
   ```

2. **Open browser:** Navigate to `http://localhost:5173`

3. **Note:** The app uses MSW (Mock Service Worker) for API mocking in development. All API calls will be intercepted and return mock responses.

## Testing Checklist

### ✅ 1. Send a Chat Message

**Steps:**
1. Scroll down to the "Ask a Question" section
2. Type a message in the chat input (e.g., "What is contract law?")
3. Press Enter or click the "Send" button

**Expected Result:**
- ✅ Your message appears as a user message (blue bubble on the right)
- ✅ Loading indicator shows "Generating answer..." with spinner
- ✅ After ~200-800ms, assistant response appears (gray bubble on the left)
- ✅ Input field clears after successful send

**Verify:**
- Message appears immediately
- Loading state is visible
- Response appears after delay
- Input is cleared

---

### ✅ 2. Citations Panel

**Steps:**
1. After sending a message and receiving a response
2. Look below the chat messages area

**Expected Result:**
- ✅ Citations panel appears with title "Sources"
- ✅ Two citation cards displayed:
  - "Reference Document 1" with source badge "precedent"
  - "Reference Document 2" with source badge "precedent"
- ✅ Each citation shows:
  - Title (clickable link)
  - Source badge (colored)
  - Snippet preview (~100 chars)
  - "View source" link with external icon

**Verify:**
- Citations appear in order (Document 1, then Document 2)
- All citation fields are visible
- Links are clickable (open in new tab)
- Panel only appears when citations exist

---

### ✅ 3. Regenerate Button

**Steps:**
1. Send a chat message and wait for response
2. Look for action buttons below the last assistant message
3. Click "Regenerate" button

**Expected Result:**
- ✅ Loading indicator appears again ("Generating answer...")
- ✅ After delay, new assistant response replaces the old one
- ✅ Citations panel updates with new citations (if different)
- ✅ Message ID updates (for feedback)

**Verify:**
- Old answer is replaced (not duplicated)
- New answer appears
- Loading state works correctly
- Citations update

---

### ✅ 4. Copy Button

**Steps:**
1. Send a chat message and wait for response
2. Click "Copy" button below the assistant message
3. Open a text editor and paste (Ctrl+V / Cmd+V)

**Expected Result:**
- ✅ Assistant answer text is copied to clipboard
- ✅ Can paste the text in another application
- ✅ No visual feedback (could add toast notification in future)

**Verify:**
- Text is copied correctly
- Can paste elsewhere
- Works with latest assistant message only

---

### ✅ 5. Export Button

**Steps:**
1. Send multiple messages (user + assistant pairs)
2. Click "Export" button below the last assistant message
3. Check your Downloads folder

**Expected Result:**
- ✅ Markdown file downloads automatically
- ✅ Filename format: `chat-conversation-YYYY-MM-DD.md`
- ✅ File contains:
  - Conversation title
  - All user messages (marked as "## User")
  - All assistant messages (marked as "## Assistant")
  - Citations section at the end (if available)

**Verify:**
- File downloads successfully
- File contains all messages
- Format is valid Markdown
- Citations included if present

**Sample Export Content:**
```markdown
# Chat Conversation

## User
What is contract law?

## Assistant
This is a mock chat response...

## Sources
1. [Reference Document 1](https://example.com/ref/1) - Relevant excerpt...
2. [Reference Document 2](https://example.com/ref/2) - Another relevant excerpt...
```

---

### ✅ 6. Error + Retry

**To Simulate Error:**

**Option A: Temporarily break the mock handler**
1. Open `apps/precedent-search/src/__tests__/mocks/handlers.ts`
2. Temporarily modify the chat handler to return an error:
   ```typescript
   http.post(`${API_BASE_URL}/v1/chat`, async () => {
     return HttpResponse.json(
       {
         error: {
           code: 'INTERNAL_ERROR',
           message: 'Simulated error for testing',
           requestId: crypto.randomUUID(),
           retryable: true,
         },
       },
       { status: 500 }
     );
   }),
   ```
3. Save and refresh browser
4. Send a chat message

**Option B: Use browser DevTools**
1. Open DevTools (F12)
2. Go to Network tab
3. Find the `/v1/chat` request
4. Right-click → Block request URL
5. Send a chat message
6. Unblock and try again

**Expected Result:**
- ✅ Error banner appears at top of chat area
- ✅ Error message displayed: "Simulated error for testing" (or actual error message)
- ✅ Request ID shown (if available)
- ✅ "Retry" button appears in error banner
- ✅ Clicking "Retry" re-sends the last request
- ✅ On success, error banner disappears and response appears

**Verify:**
- Error message is user-friendly
- Request ID is visible (for support)
- Retry button works
- After retry success, error clears
- Conversation state is preserved

---

## Additional Tests

### Multi-turn Conversation

**Steps:**
1. Send first message: "What is contract law?"
2. Wait for response
3. Send follow-up: "Can you give more details?"
4. Wait for response

**Expected Result:**
- ✅ Both user messages appear
- ✅ Both assistant responses appear
- ✅ Conversation history is maintained
- ✅ Citations panel shows citations from latest response
- ✅ Regenerate only affects last assistant message

---

### Context Limit Warning

**To Test:**
1. Modify mock handler to return `contextLimitWarning: true`
2. Send a message

**Expected Result:**
- ✅ Yellow warning banner appears: "⚠️ Conversation history was truncated..."
- ✅ Banner appears above chat messages
- ✅ Warning persists until conversation reset

---

### Empty State

**Steps:**
1. Open app (no messages sent yet)
2. Look at chat area

**Expected Result:**
- ✅ Empty state message: "Start a conversation"
- ✅ Helpful text: "Ask questions about legal documents..."
- ✅ Input field is ready for typing

---

## Troubleshooting

### MSW Not Working
- Check browser console for MSW errors
- Verify `VITE_DEMO_MODE` is not blocking (if set)
- Check Network tab - requests should show "MSW" in initiator

### Citations Not Appearing
- Check mock handler returns citations array
- Verify citations have required fields: `title`, `url`, `source`
- Check browser console for errors

### Actions Not Working
- Verify you're clicking on the **last** assistant message actions
- Check browser console for JavaScript errors
- Verify clipboard permissions (for Copy)

### Export Not Downloading
- Check browser download settings (not blocked)
- Verify file downloads to default Downloads folder
- Check browser console for errors

---

## Test Results Template

```
Date: ___________
Tester: ___________

✅ Send a chat message: [ ] Pass [ ] Fail - Notes: ___________
✅ Citations panel: [ ] Pass [ ] Fail - Notes: ___________
✅ Regenerate button: [ ] Pass [ ] Fail - Notes: ___________
✅ Copy button: [ ] Pass [ ] Fail - Notes: ___________
✅ Export button: [ ] Pass [ ] Fail - Notes: ___________
✅ Error + Retry: [ ] Pass [ ] Fail - Notes: ___________

Additional Notes:
_________________________________________________
_________________________________________________
```

