"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div
        className="h-12 w-12 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 36% 30%, #fefdfb, #ece3d0 32%, #bcab86 68%, #6f6450)",
          boxShadow: "0 0 40px rgba(233,225,209,0.5)",
        }}
      />
      <div>
        <h1 className="text-lg font-semibold">Something popped.</h1>
        <p className="mt-1 max-w-sm text-sm text-dim">
          The command deck hit an unexpected error. Reconnecting usually fixes
          it.
        </p>
        {error?.message && (
          <p className="mono mt-2 max-w-sm break-words text-[11px] text-faint">
            {error.message}
          </p>
        )}
      </div>
      <button
        onClick={reset}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
      >
        Reload deck
      </button>
    </div>
  );
}
