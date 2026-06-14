"""Rule-based match scoring engine (design §5.3–§5.6).

The scoring is fully deterministic and offline: it combines skill overlap,
embedding similarity, keyword coverage and resume-quality heuristics into a
weighted score with per-dimension evidence, gaps and actionable suggestions.
"""

from __future__ import annotations

from app.ai.scoring.engine import MatchScorer, ScoreResult
from app.ai.scoring.weights import SCORING_VERSION

__all__ = ["SCORING_VERSION", "MatchScorer", "ScoreResult"]
