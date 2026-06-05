import type { ReactNode } from "react";

// One header primitive for every panel — identical height, padding, border, and
// title treatment everywhere. Consistency of this single element is the biggest
// lever from "raggedy" to "designed".
export function PanelHeader({
  title,
  aside,
}: {
  title: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
      <span className="text-[13px] font-semibold tracking-tight text-fg">
        {title}
      </span>
      {aside}
    </div>
  );
}
