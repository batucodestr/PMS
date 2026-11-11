import { Badge } from "@/components/ui/badge";
import { SOURCE_LABELS, STATUS_LABELS } from "@/lib/pms/labels";
import type { ReservationSource } from "@/lib/pms/types";
import { cn } from "@/utils";

type BadgeColor = "primary" | "success" | "error" | "warning" | "info" | "gray";

const STATUS_COLORS: Record<string, BadgeColor> = {
  // reservation + task status codes (API)
  pending: "warning",
  confirmed: "primary",
  cancelled: "error",
  completed: "success",
  no_show: "gray",
  in_progress: "info",
  // property
  active: "success",
  inactive: "gray",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <Badge
      variant="light"
      size="sm"
      color={STATUS_COLORS[status] ?? "gray"}
      className={cn("[text-shadow:none]!", className)}
    >
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

export const CHANNEL_STYLES: Record<
  ReservationSource,
  { dot: string; text: string; bg: string; border: string; hex: string }
> = {
  airbnb: {
    dot: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-50 dark:bg-rose-500/15",
    border: "border-rose-200 dark:border-rose-500/30",
    hex: "#f43f5e",
  },
  booking: {
    dot: "bg-brand-500",
    text: "text-brand-700 dark:text-brand-300",
    bg: "bg-brand-50 dark:bg-brand-500/15",
    border: "border-brand-200 dark:border-brand-500/30",
    hex: "#465fff",
  },
  direct: {
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-500/15",
    border: "border-emerald-200 dark:border-emerald-500/30",
    hex: "#10b981",
  },
  other: {
    dot: "bg-gray-400",
    text: "text-gray-700 dark:text-gray-300",
    bg: "bg-gray-100 dark:bg-white/5",
    border: "border-gray-200 dark:border-gray-700",
    hex: "#9ca3af",
  },
};

export function ChannelBadge({ source }: { source: ReservationSource }) {
  const s = CHANNEL_STYLES[source] ?? CHANNEL_STYLES.other;
  return (
    <span className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
      <span className={cn("size-2 rounded-full", s.dot)} />
      {SOURCE_LABELS[source] ?? source}
    </span>
  );
}
