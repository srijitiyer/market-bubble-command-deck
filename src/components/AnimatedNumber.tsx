"use client";

import { useEffect, useRef, useState } from "react";

// Smoothly chases its target value via rAF lerp, so live counters feel alive
// instead of snapping. Renders through `format` (e.g. formatNumber).
export function AnimatedNumber({
  value,
  format,
}: {
  value: number;
  format: (n: number) => string;
}) {
  const [display, setDisplay] = useState(value);
  const currentRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = () => {
      const diff = value - currentRef.current;
      if (Math.abs(diff) < 0.5) {
        currentRef.current = value;
        setDisplay(value);
        return;
      }
      currentRef.current += diff * 0.2;
      setDisplay(currentRef.current);
      rafRef.current = requestAnimationFrame(animate);
    };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return <>{format(Math.round(display))}</>;
}
