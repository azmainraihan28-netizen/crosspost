import clsx from "clsx";
import type { PlatformId } from "@/lib/platforms/meta";

/** Simple, brand-evoking marks (not official logos). */
export function PlatformBadge({ platform, size = 28, className }: { platform: PlatformId | string; size?: number; className?: string }) {
  const s = { width: size, height: size, fontSize: size * 0.46 };
  const base = "inline-flex shrink-0 items-center justify-center rounded-[28%] font-bold text-white leading-none select-none";
  switch (platform) {
    case "x":
      return (
        <span style={s} className={clsx(base, "bg-black", className)} aria-label="X">
          <svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5} fill="currentColor" aria-hidden>
            <path d="M3 3h5.2l4.3 6 5.1-6H20l-6.3 7.4L21 21h-5.2l-4.7-6.5L5.4 21H3l7-8.1z" />
          </svg>
        </span>
      );
    case "linkedin":
      return (
        <span style={s} className={clsx(base, "bg-[#0A66C2] font-sans tracking-tight", className)} aria-label="LinkedIn">
          in
        </span>
      );
    case "instagram":
      return (
        <span
          style={s}
          className={clsx(base, "bg-[radial-gradient(circle_at_30%_110%,#fdf497_0%,#fd5949_45%,#d6249f_60%,#285AEB_90%)]", className)}
          aria-label="Instagram"
        >
          <svg viewBox="0 0 24 24" width={size * 0.58} height={size * 0.58} fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
          </svg>
        </span>
      );
    case "facebook":
      return (
        <span style={s} className={clsx(base, "bg-[#1877F2] font-sans", className)} aria-label="Facebook">
          f
        </span>
      );
    case "threads":
      return (
        <span style={s} className={clsx(base, "bg-[#101010] font-sans", className)} aria-label="Threads">
          @
        </span>
      );
    default:
      return <span style={s} className={clsx(base, "bg-muted", className)}>?</span>;
  }
}
