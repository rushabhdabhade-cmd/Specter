# Engine Types

## ActionType

Defined in [`src/lib/engine/types.ts`](../src/lib/engine/types.ts) and enforced via Zod schema in [`src/lib/engine/llm.ts`](../src/lib/engine/llm.ts).

Represents the type of action the AI agent took during a session step. Stored as `action_taken.type` in the `session_logs` table.

```ts
type ActionType = 'click' | 'type' | 'scroll' | 'wait' | 'complete' | 'fail' | 'skip_node';
```

| Value | Description |
|---|---|
| `click` | Agent clicked an element on the page |
| `type` | Agent typed text into an input field |
| `scroll` | Agent scrolled the page (e.g. to bottom for loop recovery) |
| `wait` | Agent waited before proceeding |
| `complete` | Agent determined the current task/node is successfully completed |
| `fail` | Agent declared it cannot complete the task |
| `skip_node` | Agent skipped to the next navigation node |

### UI fallback: `'system'`

In [`StepFeedbackCard.tsx`](../src/components/reports/StepFeedbackCard.tsx), the action type is read as:

```ts
const actionType = step.action_taken?.type ?? 'system';
```

`'system'` is not a real `ActionType` — it is a UI-only fallback used when `action_taken` is `null` (e.g. the very first step before any action, or a log entry generated outside the agent loop).
