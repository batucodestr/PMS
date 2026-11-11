import { CHANNEL_STYLES } from "@/components/shared/pms/badges";
import { todayISO } from "@/lib/pms/format";
import { SOURCE_LABELS, STATUS_LABELS } from "@/lib/pms/labels";
import type { Property, Reservation } from "@/lib/pms/types";
import { cn } from "@/utils";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";

export const TIMELINE_DAYS = 14;

/**
 * Hafif resource timeline (property × gün). FullCalendar'ın resource timeline'ı
 * premium olduğu için rezervasyon verisiyle beslenen özel bir grid.
 */
export function ResourceTimeline({
  reservations,
  properties,
  start,
  guestLabel,
  onSelect,
}: {
  reservations: Reservation[];
  properties: Property[];
  start: Date;
  guestLabel: (guestId: string) => string;
  onSelect: (id: string) => void;
}) {
  const days = Array.from({ length: TIMELINE_DAYS }, (_, i) => addDays(start, i));
  const startISO = format(start, "yyyy-MM-dd");
  const today = todayISO();
  const cols = `repeat(${TIMELINE_DAYS}, minmax(48px, 1fr))`;

  return (
    <div className="custom-scrollbar overflow-x-auto">
      <div className="min-w-[960px]">
        <div className="sticky top-0 z-10 grid grid-cols-[180px_1fr] border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
          <div className="px-4 py-3 text-xs font-medium tracking-wide text-gray-500 uppercase">Property</div>
          <div className="grid" style={{ gridTemplateColumns: cols }}>
            {days.map((d) => {
              const iso = format(d, "yyyy-MM-dd");
              return (
                <div key={iso} className={cn("border-s border-gray-200 py-2 text-center text-xs dark:border-gray-800", iso === today && "bg-brand-50 font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400")}>
                  <div className="text-gray-400 uppercase">{format(d, "EEE")}</div>
                  <div>{format(d, "d MMM")}</div>
                </div>
              );
            })}
          </div>
        </div>

        {properties.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-gray-500">No properties to show.</p>
        )}

        {properties.map((p) => {
          const bars = reservations.filter(
            (r) =>
              r.property === p.id &&
              r.status !== "cancelled" &&
              r.status !== "no_show" &&
              r.check_out > startISO &&
              differenceInCalendarDays(parseISO(r.check_in), start) < TIMELINE_DAYS,
          );
          return (
            <div key={p.id} className="grid grid-cols-[180px_1fr] border-b border-gray-100 dark:border-gray-800">
              <div className="px-4 py-3 text-sm text-gray-800 dark:text-white/90">
                {p.name}
                <span className="block text-xs text-gray-500">{p.city}</span>
              </div>
              <div className="relative grid h-14" style={{ gridTemplateColumns: cols }}>
                {days.map((d) => {
                  const iso = format(d, "yyyy-MM-dd");
                  return <div key={iso} className={cn("border-s border-gray-100 dark:border-gray-800", iso === today && "bg-brand-50/50 dark:bg-brand-500/5")} />;
                })}
                {bars.map((r) => {
                  const s = Math.max(0, differenceInCalendarDays(parseISO(r.check_in), start));
                  const e = Math.min(TIMELINE_DAYS, differenceInCalendarDays(parseISO(r.check_out), start));
                  const style = CHANNEL_STYLES[r.source] ?? CHANNEL_STYLES.other;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => onSelect(r.id)}
                      title={`${guestLabel(r.guest)} · ${SOURCE_LABELS[r.source]} · ${STATUS_LABELS[r.status] ?? r.status}`}
                      style={{ gridColumn: `${s + 1} / ${e + 1}`, gridRow: 1 }}
                      className={cn("absolute inset-y-2 z-1 mx-0.5 flex min-w-0 items-center gap-1.5 truncate rounded-md border px-2 text-start text-xs font-medium transition-shadow hover:shadow-theme-sm", style.bg, style.border, style.text)}
                    >
                      <span className={cn("size-1.5 shrink-0 rounded-full", style.dot)} />
                      <span className="truncate">{guestLabel(r.guest)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
