import { useSim } from "@/state/simStore";
import { useEffect, useRef } from "react";

export function LevPanel() {
  const messages = useSim((s) => s.levMessages);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
      <div ref={ref} className="flex-1 space-y-2 overflow-y-auto p-3" aria-live="polite">
        {messages.map((message, index) => (
          <div
            key={`${index}-${message}`}
            className="rounded border border-border bg-[var(--panel-2)] p-2 font-mono text-[11px] leading-relaxed text-foreground"
          >
            <div className="mb-1 text-[9px] uppercase tracking-widest text-accent">Lev</div>
            {message}
          </div>
        ))}
      </div>
    </div>
  );
}
