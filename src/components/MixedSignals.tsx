"use client";

import Badge from "./Badge";

type MixedSignalsProps = {
  /** Normalized spread (0–1 range, where 1 = max possible disagreement) */
  spread: number;
};

export default function MixedSignals({ spread }: MixedSignalsProps) {
  // Show "Mixed signals" when normalized spread exceeds ~35%
  if (spread < 0.35) return null;

  return (
    <Badge variant="warm" dot>
      Mixed signals
    </Badge>
  );
}
