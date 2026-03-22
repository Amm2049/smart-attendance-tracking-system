"use client";

import { cn } from "@/lib/utils";

type AppLogoProps = {
  className?: string;
  compact?: boolean;
};

export function AppLogo({ className, compact = false }: AppLogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <div className="relative flex size-11 items-center justify-center overflow-hidden rounded-2xl border border-primary/20 bg-[linear-gradient(145deg,color-mix(in_oklab,var(--primary)_18%,white),color-mix(in_oklab,var(--card)_82%,var(--primary)_18%))] shadow-[0_16px_34px_-18px_color-mix(in_oklab,var(--primary)_48%,transparent)]">
        <div className="absolute inset-x-2 top-2 h-2 rounded-full bg-primary/18" />
        <div className="absolute bottom-2 left-2 h-4 w-2 rounded-full bg-primary/85" />
        <div className="absolute bottom-2 left-5 h-6 w-2 rounded-full bg-primary/58" />
        <div className="absolute bottom-2 left-8 h-3 w-2 rounded-full bg-primary/36" />
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-xl font-semibold tracking-[0.22em] text-foreground sm:text-2xl">
          SATS
        </span>
        {!compact ? (
          <span className="text-[0.68rem] uppercase tracking-[0.28em] text-muted-foreground">
            Smart Attendance
          </span>
        ) : null}
      </div>
    </div>
  );
}
