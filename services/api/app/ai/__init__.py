"""AI orchestration layer.

Sub-packages (added across phases P2–P5):

    providers/    LLM + embedding provider adapters (base, openai_compatible, fake)
    prompts/      Versioned prompt templates
    scoring/      Deterministic rule-based match scoring
    validators/   JSON-schema / fact-consistency guards
    orchestration LLM call sequencing for parse / score / report / rewrite

The provider adapter pattern keeps the rest of the app independent of any
single LLM vendor; the default ``fake`` provider makes the whole system runnable
and testable with no external API keys.
"""
