# AI Review Moderation Design

## Goal

Add an AI assistant for admin review moderation. The assistant suggests whether a product review should be approved or rejected, explains the risk, and leaves the final moderation action to the admin.

## Current Context

Reviews are created as `APPROVED` by default in `ReviewsService.createReview`. Admins can list reviews in `/admin/reviews` and manually change status with the existing `PATCH /admin/reviews/:id/status` endpoint. Recent AI features use OpenAI Responses API when `OPENAI_API_KEY` exists and a deterministic fallback when it does not.

## Scope

This feature adds an admin-only AI moderation helper. It does not automatically update review status, does not change public review creation behavior, and does not remove the existing approve/reject buttons.

## Backend Design

Add `POST /admin/reviews/:id/ai-moderation`.

`ReviewsService.generateModerationAssist(reviewId)` loads the review through `ReviewsRepository.findByIdAdmin`. If the review does not exist, it throws `NotFoundException`.

The response shape is:

```ts
{
  suggestedStatus: 'APPROVED' | 'REJECTED';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  summary: string;
  reasons: string[];
  fallback: boolean;
}
```

When `OPENAI_API_KEY` is configured, the service calls the OpenAI Responses API with review content, rating, product name, current status, verified-purchase flag, and customer identity context. The prompt asks for strict JSON only. The assistant must flag spam, profanity, harassment, unrelated content, external links, scams, and policy-unsafe content. It must not punish normal negative feedback about product quality or delivery experience.

If OpenAI is unavailable or returns invalid data, fallback rules classify obvious spam, links, profanity, harassment, or scam-like language as `REJECTED`/`HIGH`. Ordinary product feedback is `APPROVED`/`LOW`.

## Frontend Design

In `/admin/reviews`, each review row gets an `AI kiem duyet` button. Clicking it calls `adminApi.generateReviewModeration(review.id)`.

The row displays a compact moderation panel with:

- Suggested status
- Risk level
- Short summary
- Reasons
- Fallback badge when applicable

The admin still chooses the final action using the existing `Duyet` or `Tu choi` buttons.

## Error Handling

OpenAI errors are swallowed by the service and return fallback output. Missing reviews return the existing admin API error path through `NotFoundException`.

The frontend keeps the row usable if AI fails through backend fallback. It disables the AI button while a request is pending.

## Testing

Backend unit tests cover:

- OpenAI success parses JSON into the moderation response.
- Missing `OPENAI_API_KEY` returns fallback.
- OpenAI failure returns fallback.
- Missing review throws `NotFoundException`.

Frontend verification covers:

- Admin type-check.
- Playwright e2e mocking the moderation endpoint, clicking `AI kiem duyet`, and asserting the moderation panel appears.

## Non-Goals

- No automatic moderation on customer review submission.
- No schema migration.
- No audit log persistence for AI suggestions.
- No model selection UI.
