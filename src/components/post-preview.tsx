import { Bookmark, Eye, Heart, MessageCircle, Repeat2, Send, Share2, ThumbsUp } from "lucide-react";
import { PLATFORMS, isPlatformId } from "@/lib/platforms/meta";
import { PlatformBadge } from "./platform-badge";

type Props = { platform: string; text: string; media: string[]; name: string; handle: string };

function Linkified({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(https?:\/\/\S+|#[\p{L}\d_]+|@[\w.]+)/gu);
  return (
    <p className={`break-words whitespace-pre-wrap ${className ?? ""}`}>
      {parts.map((p, i) =>
        /^(https?:\/\/|#|@)/.test(p) ? (
          <span key={i} className="text-[#1d9bf0]">{p}</span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </p>
  );
}

function Avatar({ platform }: { platform: string }) {
  return (
    <div className="relative size-10 shrink-0 rounded-full bg-gradient-to-br from-paper-2 to-line">
      <PlatformBadge platform={platform} size={16} className="absolute -right-0.5 -bottom-0.5 ring-2 ring-white" />
    </div>
  );
}

function MediaGrid({ media, square }: { media: string[]; square?: boolean }) {
  if (!media.length) return null;
  const shown = media.slice(0, 4);
  return (
    <div className={`mt-3 grid gap-0.5 overflow-hidden rounded-xl border border-black/10 ${shown.length > 1 ? "grid-cols-2" : ""}`}>
      {shown.map((m) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={m} src={m} alt="" className={`w-full object-cover ${square || shown.length > 1 ? "aspect-square" : "max-h-80"}`} />
      ))}
    </div>
  );
}

export function PostPreview({ platform, text, media, name, handle }: Props) {
  const limit = isPlatformId(platform) ? PLATFORMS[platform].charLimit : Infinity;
  const over = text.length > limit;
  const shownText = platform === "linkedin" && text.length > 210 ? text.slice(0, 210) : text;

  if (platform === "instagram") {
    return (
      <div className="overflow-hidden rounded-xl border border-black/10 bg-white text-[14px] text-black">
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <div className="size-8 rounded-full bg-[radial-gradient(circle_at_30%_110%,#fdf497,#fd5949_45%,#d6249f_60%,#285AEB)] p-[2px]">
            <div className="size-full rounded-full border-2 border-white bg-paper-2" />
          </div>
          <span className="font-semibold">{handle}</span>
        </div>
        {media[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media[0]} alt="" className="aspect-square w-full object-cover" />
        ) : (
          <div className="grid aspect-square w-full place-items-center bg-paper-2 px-8 text-center text-sm text-danger">
            Instagram requires an image
          </div>
        )}
        <div className="flex gap-4 px-3 pt-2.5">
          <Heart className="size-6" /> <MessageCircle className="size-6" /> <Send className="size-6" />
          <Bookmark className="ml-auto size-6" />
        </div>
        <div className="px-3 pt-2 pb-3">
          <p className="break-words whitespace-pre-wrap">
            <span className="mr-1.5 font-semibold">{handle}</span>
            {text.length > 125 ? <>{text.slice(0, 125)}<span className="text-black/50">… more</span></> : text}
          </p>
        </div>
      </div>
    );
  }

  if (platform === "linkedin") {
    return (
      <div className="rounded-xl border border-black/10 bg-white p-4 text-[14px] text-black/90">
        <div className="flex gap-2.5">
          <Avatar platform={platform} />
          <div>
            <p className="font-semibold leading-tight">{name}</p>
            <p className="text-xs text-black/55">Now · 🌐</p>
          </div>
        </div>
        <p className="mt-3 break-words whitespace-pre-wrap">
          {shownText}
          {shownText !== text && <span className="text-black/55">…see more</span>}
        </p>
        <MediaGrid media={media.slice(0, 1)} />
        <div className="mt-3 flex justify-around border-t border-black/10 pt-2 text-xs font-semibold text-black/60">
          <span className="flex items-center gap-1.5"><ThumbsUp className="size-4" /> Like</span>
          <span className="flex items-center gap-1.5"><MessageCircle className="size-4" /> Comment</span>
          <span className="flex items-center gap-1.5"><Repeat2 className="size-4" /> Repost</span>
          <span className="flex items-center gap-1.5"><Send className="size-4" /> Send</span>
        </div>
        {over && <OverLimit limit={limit} />}
      </div>
    );
  }

  if (platform === "facebook") {
    return (
      <div className="rounded-xl border border-black/10 bg-white p-4 text-[15px] text-black/90">
        <div className="flex gap-2.5">
          <Avatar platform={platform} />
          <div>
            <p className="font-semibold leading-tight">{name}</p>
            <p className="text-xs text-black/55">Just now · 🌐</p>
          </div>
        </div>
        <Linkified text={text} className="mt-3" />
        <MediaGrid media={media.slice(0, 1)} />
        <div className="mt-3 flex justify-around border-t border-black/10 pt-2 text-sm font-semibold text-black/60">
          <span className="flex items-center gap-1.5"><ThumbsUp className="size-4" /> Like</span>
          <span className="flex items-center gap-1.5"><MessageCircle className="size-4" /> Comment</span>
          <span className="flex items-center gap-1.5"><Share2 className="size-4" /> Share</span>
        </div>
      </div>
    );
  }

  // X and Threads share a similar compact layout.
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 text-[15px] text-black">
      <div className="flex gap-3">
        <Avatar platform={platform} />
        <div className="min-w-0 flex-1">
          <p className="truncate leading-tight">
            <span className="font-bold">{name}</span>{" "}
            <span className="text-black/50">
              {platform === "x" ? `@${handle}` : ""} · now
            </span>
          </p>
          <Linkified text={text || " "} className="mt-1" />
          <MediaGrid media={platform === "x" ? media : media.slice(0, 1)} />
          <div className="mt-3 flex max-w-xs justify-between text-black/50">
            <MessageCircle className="size-[18px]" />
            <Repeat2 className="size-[18px]" />
            <Heart className="size-[18px]" />
            {platform === "x" ? <Eye className="size-[18px]" /> : <Send className="size-[18px]" />}
          </div>
        </div>
      </div>
      {over && <OverLimit limit={limit} />}
    </div>
  );
}

function OverLimit({ limit }: { limit: number }) {
  return <p className="mt-3 rounded-md bg-danger/10 px-2 py-1 text-xs text-danger">Over the {limit.toLocaleString()} character limit</p>;
}
