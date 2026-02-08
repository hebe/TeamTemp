"use client";

import Badge from "./Badge";

type MixedSignalsProps = {
  spread: number;
  scaleMax: number;
};

export default function MixedSignals({ spread, scaleMax }: MixedSignalsProps) {
  const threshold = (scaleMax - 1) * 0.35;
  if (spread < threshold) return null;

  return (
    <Badge variant="warm" dot>
      Mixed signals
    </Badge>
  );
}
