"use client";

import { useEffect, useState } from "react";
import { Separator } from "react-resizable-panels";
import { cn } from "@/lib/utils";

// A refined drag handle: an always-present hairline that brightens on hover,
// with a centered grip pill that fades in on hover and turns brand-violet while
// dragging. Drag state is tracked manually so the active styling is reliable.
export function ResizeHandle() {
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!dragging) return;
    const up = () => setDragging(false);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [dragging]);

  return (
    <Separator
      onPointerDown={() => setDragging(true)}
      className="group relative mx-0.5 flex w-3 shrink-0 cursor-col-resize items-center justify-center outline-none"
    >
      {/* hairline */}
      <span
        className={cn(
          "h-full w-px transition-colors duration-150",
          dragging
            ? "bg-brand"
            : "bg-border group-hover:bg-[rgba(184,139,255,0.5)]",
        )}
      />
      {/* grip */}
      <span
        className={cn(
          "absolute h-8 w-[3px] rounded-full transition-all duration-150",
          dragging
            ? "scale-100 bg-brand opacity-100"
            : "scale-90 bg-[rgba(255,255,255,0.28)] opacity-0 group-hover:scale-100 group-hover:opacity-100",
        )}
        style={
          dragging
            ? { boxShadow: "0 0 10px rgba(184,139,255,0.6)" }
            : undefined
        }
      />
    </Separator>
  );
}
