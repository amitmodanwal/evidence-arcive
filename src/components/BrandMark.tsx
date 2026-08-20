import logoAsset from "@/assets/saksya-logo.jpg.asset.json";
import { cn } from "@/lib/utils";

/** Sākṣya wordmark: official emblem logo plus the Devanagari name. */
export function BrandMark({
  className,
  size = "md",
  showName = true,
}: {
  className?: string;
  size?: "sm" | "md";
  showName?: boolean;
}) {
  const box = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const text = size === "sm" ? "text-base" : "text-xl";
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span className={cn("brand-tile shrink-0 overflow-hidden", box)}>
        <img
          src={logoAsset.url}
          alt="Sākṣya emblem logo"
          className="h-full w-full object-contain"
          loading="lazy"
        />
      </span>
      {showName && (
        <span className={cn("font-display font-semibold tracking-tight leading-none", text)}>
          साक्ष्य
        </span>
      )}
    </span>
  );
}
