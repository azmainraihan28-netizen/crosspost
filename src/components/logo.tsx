import Link from "next/link";
import { APP_NAME } from "@/lib/brand";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2">
      <span className="relative grid size-7 place-items-center rounded-full bg-ink text-paper">
        <span className="absolute size-2 rounded-full bg-signal" />
        <span className="absolute size-5 rounded-full border border-paper/40 transition group-hover:scale-110" />
      </span>
      <span className="font-display text-2xl leading-none tracking-tight">{APP_NAME}</span>
    </Link>
  );
}
