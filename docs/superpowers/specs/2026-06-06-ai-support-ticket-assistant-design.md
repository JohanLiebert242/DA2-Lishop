# AI Support Ticket Assistant Design

## Goal

Add an admin-facing AI assistant for support tickets that summarizes the issue, suggests classification/status, and drafts a customer reply while keeping admins in control.

## Scope

Phase 3 covers admin support tickets only:

- Generate a ticket summary.
- Suggest category and status.
- Draft an admin reply.
- Insert the draft into the existing reply textarea.
- Provide deterministic fallback when `OPENAI_API_KEY` is missing or the model call fails.
- Unit tests, type checks, and Playwright e2e coverage.

This phase does not auto-send replies, auto-change ticket status, or modify customer-facing ticket pages.

## Backend Design

Add an admin-only endpoint:

- `POST /admin/tickets/:id/ai-assist`
- Response:
  - `summary: string`
  - `suggestedCategory: string`
  - `suggestedStatus: TicketStatus`
  - `replyDraft: string`
  - `fallback: boolean`

`SupportTicketsService.generateAdminAssist(ticketId)` will:

1. Load the ticket detail from `SupportTicketsRepository.findById`.
2. Return `NotFoundException` when the ticket is missing.
3. Build compact ticket context from subject, category, status, orderRef, user, and messages.
4. If OpenAI is not configured, return deterministic fallback.
5. If OpenAI is configured, call Responses API and parse JSON output.
6. If model output is invalid or request fails, log and return fallback.

The prompt must not promise refunds, replacements, delivery dates, or policy exceptions unless present in ticket context.

## Frontend Design

In `/admin/tickets`, inside the expanded reply row:

- Add an `AI goi y` button next to Send/Cancel controls.
- Button calls `adminApi.generateTicketAssist(ticket.id)`.
- Show summary/category/status suggestions in a small neutral panel.
- Populate the existing reply textarea with `replyDraft`.
- Admin can edit before sending.

## Testing

Backend tests:

- OpenAI success parses JSON and returns structured suggestion.
- Missing key returns fallback and does not call `fetch`.
- OpenAI failure returns fallback.
- Missing ticket throws `NotFoundException`.

Playwright e2e:

- Mock auth/admin stats/tickets.
- Mock `POST /admin/tickets/:id/ai-assist`.
- Open reply row, click `AI goi y`, assert summary is visible and textarea contains reply draft.

## Rollout

Feature is safe without `OPENAI_API_KEY`; admins still get fallback summary and draft.
