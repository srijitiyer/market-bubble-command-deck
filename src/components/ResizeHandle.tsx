"use client";

import { useEffect, useState } from "react";
import { Separator } from "react-resizable-panels";
import { cn } from "@/lib/utils";

// A refined drag handle: a wide invisible hit target around a hairline that
// brightens on hover, with a centered grip pill that turns brand-violet while
// dragging. Drag state is tracked manually so the active styling is reliable.
// While dragging, a body class disables text selection + forces the resize
// cursor everywhere so the gesture feels locked to this one handle.
export function ResizeHandle() {
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!dragging) return;
    document.body.classList.add("mb-resizing");
    const up = () => setDragging(false);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      document.body.classList.remove("mb-resizing");
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [dragging]);

  return (
    <Separator
      onPointerDown={() => setDragging(true)}
      className="group relative flex w-4 shrink-0 cursor-col-resize touch-none items-center justify-center outline-none"
    >
      {/* hairline */}
      <span
        className={cn(
          "h-full w-px transition-colors duration-150",
          dragging
            ? "bg-brand"
            : "bg-border group-hover:bg-[rgba(233,225,209,0.55)]",
        )}
      />
      {/* grip */}
      <span
        className={cn(
          "absolute h-9 w-[3px] rounded-full transition-all duration-150",
          dragging
            ? "scale-100 bg-brand opacity-100"
            : "scale-90 bg-[rgba(255,255,255,0.3)] opacity-0 group-hover:scale-100 group-hover:opacity-100",
        )}
        style={
          dragging ? { boxShadow: "0 0 12px rgba(233,225,209,0.7)" } : undefined
        }
      />
    </Separator>
  );
}
