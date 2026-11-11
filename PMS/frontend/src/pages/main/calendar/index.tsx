import { PageMeta } from "@/components/shared/page-meta";
import { CHANNEL_STYLES } from "@/components/shared/pms/badges";
import { ReservationDetail } from "@/components/shared/pms/reservation-detail";
import { ErrorBanner, FilterSelect, PageHeader } from "@/components/shared/pms/ui-bits";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts";
import { useApiAll } from "@/hooks/use-api";
import { toISODate } from "@/lib/pms/format";
import { SOURCE_LABELS, SOURCE_OPTIONS, STATUS_LABELS, guestName } from "@/lib/pms/labels";
import type { Guest, Property, Reservation } from "@/lib/pms/types";
import { ChevronLeftIcon, ChevronRightIcon } from "@/icons";
import { cn } from "@/utils";
import type { EventDisplayInfo } from "@fullcalendar/react";
import FullCalendar, { type CalendarRef } from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import themePlugin from "@fullcalendar/react/themes/classic";
import { addDays, addMonths, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subDays } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { toCalendarEvents } from "./events";
import { ResourceTimeline, TIMELINE_DAYS } from "./resource-timeline";

type ViewKey = "dayGridMonth" | "dayGridWeek" | "dayGridDay" | "timeline";
const VIEWS: { key: ViewKey; label: string }[] = [
  { key: "dayGridMonth", label: "Month" },
  { key: "dayGridWeek", label: "Week" },
  { key: "dayGridDay", label: "Day" },
  { key: "timeline", label: "Timeline" },
];

function EventChip({ info }: { info: EventDisplayInfo }) {
  const { source, status, propertyName } = info.event.extendedProps as {
    source: keyof typeof CHANNEL_STYLES;
    status: string;
    propertyName: string;
  };
  const s = CHANNEL_STYLES[source] ?? CHANNEL_STYLES.other;
  return (
    <div dir="ltr" className={cn("flex w-full min-w-0 items-center gap-1.5 rounded-md border px-2 py-1 text-xs", s.bg, s.border)}>
      <span className={cn("size-1.5 shrink-0 rounded-full", s.dot)} />
      <span className={cn("truncate font-semibold", s.text)}>{info.event.title}</span>
      <span className="hidden truncate text-gray-500 sm:inline dark:text-gray-400">
        {propertyName} · {STATUS_LABELS[status] ?? status}
      </span>
    </div>
  );
}

export default function CalendarPage() {
  const { theme } = useTheme();
  const calendarRef = useRef<CalendarRef>(null);
  const [view, setView] = useState<ViewKey>("dayGridMonth");
  const [cursor, setCursor] = useState(() => new Date());
  const [propertyId, setPropertyId] = useState("");
  const [source, setSource] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const properties = useApiAll<Property>("/properties/");
  const guests = useApiAll<Guest>("/guests/");

  // Görünen aralık: timeline'da cursor…+14 gün, diğerlerinde cursor ayı ±7 gün.
  const rangeStart = view === "timeline" ? cursor : subDays(startOfMonth(cursor), 7);
  const rangeEnd = view === "timeline" ? addDays(cursor, TIMELINE_DAYS) : addDays(endOfMonth(cursor), 7);
  const reservationsQuery = useApiAll<Reservation>("/reservations/", {
    check_in__lte: toISODate(rangeEnd),
    check_out__gte: toISODate(rangeStart),
    property: propertyId,
    source,
  });

  const guestMap = useMemo(() => new Map((guests.data ?? []).map((g) => [g.id, g])), [guests.data]);
  const propertyMap = useMemo(() => new Map((properties.data ?? []).map((p) => [p.id, p])), [properties.data]);
  const guestLabel = (id: string) => (guestMap.has(id) ? guestName(guestMap.get(id)) : "Guest");

  const reservations = reservationsQuery.data;
  const events = useMemo(
    () =>
      toCalendarEvents(
        reservations ?? [],
        (id) => (guestMap.has(id) ? guestName(guestMap.get(id)) : "Guest"),
        (id) => propertyMap.get(id)?.name ?? "",
      ),
    [reservations, guestMap, propertyMap],
  );
  const timelineProperties = useMemo(
    () => (properties.data ?? []).filter((p) => (propertyId ? p.id === propertyId : p.is_active)),
    [properties.data, propertyId],
  );
  const error = reservationsQuery.error ?? properties.error ?? guests.error;

  // Keep FullCalendar in sync with our own toolbar state.
  useEffect(() => {
    if (view === "timeline") return;
    const api = calendarRef.current?.getApi();
    if (!api) return;
    if (api.view?.type !== view) api.changeView(view);
    api.gotoDate(cursor);
  }, [view, cursor]);

  const step = (dir: 1 | -1) =>
    setCursor((c) =>
      view === "dayGridMonth" ? addMonths(c, dir)
      : view === "dayGridDay" ? addDays(c, dir)
      : addDays(c, dir * 7),
    );

  const title =
    view === "dayGridMonth" ? format(cursor, "MMMM yyyy")
    : view === "dayGridDay" ? format(cursor, "EEEE, d MMMM yyyy")
    : view === "dayGridWeek"
      ? `${format(startOfWeek(cursor), "d MMM")} – ${format(endOfWeek(cursor), "d MMM yyyy")}`
      : `${format(cursor, "d MMM")} – ${format(addDays(cursor, TIMELINE_DAYS - 1), "d MMM yyyy")}`;


  return (
    <>
      <PageMeta title="Calendar | PMS Console" description="Availability calendar" />
      <PageHeader title="Calendar" description="Reservations by property." />

      {error && <ErrorBanner className="mb-4" message={error} onRetry={reservationsQuery.reload} />}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3" data-color-scheme={theme}>
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 dark:border-gray-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon-sm" aria-label="Previous" onClick={() => step(-1)}><ChevronLeftIcon className="size-4 rtl:rotate-180" /></Button>
              <Button variant="outline" size="icon-sm" aria-label="Next" onClick={() => step(1)}><ChevronRightIcon className="size-4 rtl:rotate-180" /></Button>
              <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>Today</Button>
              <h2 className="ms-2 text-base font-semibold text-gray-900 dark:text-white/90">{title}</h2>
            </div>
            <div className="inline-flex rounded-[10px] border border-gray-300 p-0.5 dark:border-gray-700" role="group" aria-label="Calendar view">
              {VIEWS.map((v) => (
                <button key={v.key} type="button" aria-pressed={view === v.key} onClick={() => setView(v.key)}
                  className={cn("h-8 rounded-lg px-3 text-sm font-medium text-gray-600 transition-colors dark:text-gray-400", view === v.key && "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400")}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <FilterSelect label="Property" value={propertyId} onChange={setPropertyId} options={(properties.data ?? []).map((p) => ({ value: p.id, label: p.name }))} allLabel="All properties" />
            <FilterSelect label="Source" value={source} onChange={setSource} options={SOURCE_OPTIONS} allLabel="All sources" />
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:ms-auto" aria-label="Channel legend">
              {SOURCE_OPTIONS.map((o) => (
                <li key={o.value} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                  <span className={cn("size-2 rounded-full", CHANNEL_STYLES[o.value].dot)} />{SOURCE_LABELS[o.value]}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {view === "timeline" ? (
          <ResourceTimeline reservations={reservations ?? []} properties={timelineProperties} start={cursor} guestLabel={guestLabel} onSelect={setSelectedId} />
        ) : (
          <div className="custom-calendar" data-color-scheme={theme}>
            <FullCalendar
              ref={calendarRef}
              plugins={[themePlugin, dayGridPlugin, interactionPlugin]}
              initialView={view}
              initialDate={cursor}
              headerToolbar={false}
              height="auto"
              borderless
              events={events}
              dayMaxEvents={3}
              nowIndicator={false}
              viewClass="border-0! bg-transparent!"
              dayHeaderClass="border-0! bg-gray-50! dark:bg-gray-900! py-2.5! text-xs! font-medium! uppercase text-gray-500!"
              dayCellClass={(d: { isToday: boolean }) => cn("p-1!", d.isToday && "bg-brand-50/60! dark:bg-brand-500/5!")}
              dayCellTopInnerClass="text-xs! text-gray-600 dark:text-gray-300"
              rowEventClass="bg-transparent! border-0! px-0.5! py-0.5! shadow-none! hover:shadow-none! focus:outline-none"
              rowEventInnerClass="p-0! border-0! bg-transparent!"
              eventClick={(arg) => setSelectedId(String(arg.event.extendedProps.reservationId))}
              eventContent={(info: EventDisplayInfo) => <EventChip info={info} />}
            />
          </div>
        )}
      </div>

      <ReservationDetail reservationId={selectedId} onClose={() => setSelectedId(null)} onChanged={reservationsQuery.reload} />
    </>
  );
}
