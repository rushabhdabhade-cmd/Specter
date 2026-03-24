# LLM Providers

Specter supports four LLM backends. The provider is set per-project in the setup UI and stored in the `projects` table (`llm_provider`, `llm_model_name`, `encrypted_llm_key`).

| Provider | Class | Default model | Vision | Cost |
|---|---|---|---|---|
| **Gemini** | `GeminiProvider` | `gemini-2.0-flash` | ✅ | Free tier (15 RPM) |
| **OpenRouter** | `OpenRouterProvider` | `anthropic/claude-3-5-sonnet` | model-dependent | Pay-per-token |
| **OpenAI** | `OpenAIProvider` | `gpt-4o` | ✅ | Pay-per-token |
| **Ollama** | `OllamaProvider` | `llama3.2-vision` | model-dependent | Free (local) |

Default when no provider is configured: **Gemini** (free tier).

---

## OpenRouter

OpenRouter is an OpenAI-compatible gateway to 100+ models. Specter uses the `openai` SDK pointed at `https://openrouter.ai/api/v1`.

### Recommended models

| Model ID | Vision | JSON reliability | Notes |
|---|---|---|---|
| `openai/gpt-4o-mini` | ✅ | ✅ Excellent | **Best overall** — cheap, fast, stable |
| `openai/gpt-4o` | ✅ | ✅ Excellent | Highest quality, ~20× more expensive |
| `anthropic/claude-3-5-haiku` | ✅ | ✅ Excellent | Good Claude reasoning at lower cost |
| `anthropic/claude-3-5-sonnet` | ✅ | ✅ Excellent | High quality, high contention → more 429s |
| `google/gemini-2.0-flash` | ✅ | ✅ Good | Fast and cheap |
| `meta-llama/llama-3.2-11b-vision-instruct:free` | ✅ | ⚠️ Unreliable | Free, but often ignores JSON format |
| `meta-llama/llama-3.2-90b-vision-instruct:free` | ✅ | ⚠️ Unreliable | Free, slightly better reasoning |

> Free models (`:free` suffix) frequently return non-JSON output, wrong field names, or unquoted keys. The engine normalizes what it can but these models will still produce lower-quality sessions.

### Model ID format

- Paid models: `provider/model-name` (e.g. `openai/gpt-4o-mini`)
- Free-tier models: `provider/model-name:free` (e.g. `meta-llama/llama-3.2-11b-vision-instruct:free`)

The `:free` suffix is required. Without it, OpenRouter returns `404 No endpoints found`.

### Error handling

| Error | Behaviour |
|---|---|
| `429` rate limit | Retry with backoff: 15s → 30s → 60s |
| `400` provider error (transient) | Retry with backoff: 1s → 2s → 4s |
| `404` no endpoints found | Fail immediately — wrong model ID |
| Non-JSON response | `extractJson` strips markdown fences and unquoted keys; falls back to `skip_node` if unparseable |

---

## Token Usage Per Test Run

Based on engine constants: `MAX_PAGES = 15`, `MAX_ACTIONS_PAGE = 5`, 5 personas per test run.

### Per LLM call

| Call | Input tokens | Output tokens | Notes |
|---|---|---|---|
| `decideNextAction` | ~900 | ~200 | Action prompt + DOM context (28 elements) + 1 screenshot @ 85 tokens (detail:low) |
| `analyzePageSections` | ~420 + ~255 | ~500 | Page scan prompt + 3 screenshots @ 85 tokens each |
| `generatePersonas` | ~200 | ~500 | Text-only, called once per test run |
| `generateSummary` | ~300 | ~300 | Text-only, called once per session |

### Per session (1 persona)

|  | Calls | Tokens |
|--|-------|--------|
| Page scans | up to 15 | ~17K |
| Actions | up to 75 | ~82K |
| Summary | 1 | ~600 |
| **Worst case (15 pages × 5 actions)** | | **~100K** |
| **Realistic avg (~3 actions/page)** | | **~65K** |

Most pages exit early via `skip_node` or `complete`, so 65K is the typical figure.

### Per full test run (5 personas)

| | Tokens |
|--|--------|
| 5 sessions × 65K | ~325K |
| `generatePersonas` (once) | ~700 |
| Report synthesis | **Gemini only** — not billed to OpenRouter/OpenAI key |
| **Total (user's LLM key)** | **~325K tokens** |

### Cost at ~325K tokens

| Model | Est. cost per test run |
|---|---|
| `openai/gpt-4o-mini` | **~$0.07** |
| `google/gemini-2.0-flash` | **~$0.03** |
| `anthropic/claude-3-5-haiku` | **~$0.40** |
| `anthropic/claude-3-5-sonnet` | **~$3.50** |
| Free models | $0 (unreliable) |

`gpt-4o-mini` is the practical default for OpenRouter — reliable JSON, vision support, and negligible cost at this token volume.

---

## Gemini (Default)

Uses `gemini-2.0-flash` for all calls. Free tier allows 15 RPM; on 429 the engine retries with exponential backoff starting at 10s (up to 60s, 4 retries).

The report synthesis step always uses Gemini regardless of the project's LLM provider.

---

## Ollama (Local)

Set `OLLAMA_HOST` (default `http://localhost:11434`) and `OLLAMA_MODELS` (comma-separated, e.g. `llama3.2-vision,bakllava`). The first model is tried first; if it fails the second is used as fallback.

Ollama sends only the first section screenshot for `analyzePageSections` to keep inference fast.
