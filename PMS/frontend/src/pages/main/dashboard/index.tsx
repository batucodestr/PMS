import { PageMeta } from "@/components/shared/page-meta";
import { CHANNEL_STYLES, ChannelBadge, StatusBadge } from "@/components/shared/pms/badges";
import {
  ErrorBanner,
  LoadingBlock,
  PageHeader,
  Panel,
  StatCard,
  Th,
  tdClass,
  theadClass,
  trClass,
} from "@/components/shared/pms/ui-bits";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts";
import { useApiAll, useApiList } from "@/hooks/use-api";
import { formatCurrency, formatDateShort, toISODate, todayISO } from "@/lib/pms/format";
import { SOURCE_LABELS, guestName } from "@/lib/pms/labels";
import type { Guest, Property, Reservation, ReservationSource } from "@/lib/pms/types";
import {
  ArrowLeftRightIcon,
  CalendarIcon,
  DollarIcon,
  MapIcon,
  PieChartIcon,
  TicketIcon,
} from "@/icons";
import { cn } from "@/utils";
import type { ApexOptions } from "apexcharts";
import { addDays, endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import { Link } from "react-router";

const NIGHTS = 14;

/** Cancelled / no-show rezervasyonlar gelir ve doluluk hesabına girmez. */
const isLive = (r: Reservation) => r.status !== "cancelled" && r.status !== "no_show";

export default function DashboardPage() {
  const { theme } = useTheme();
  const dark = theme === "dark";

  const today = todayISO();
  const todayDate = parseISO(today);
  const tomorrow = toISODate(addDays(todayDate, 1));
  const windowEnd = toISODate(addDays(todayDate, NIGHTS - 1));
  const monthStart = toISODate(startOfMonth(todayDate));
  const monthEnd = toISODate(endOfMonth(todayDate));

  const properties = useApiAll<Property>("/properties/");
  const guests = useApiAll<Guest>("/guests/");
  const pending = useApiList<Reservation>("/reservations/", { status: "pending", page_size: 1 });
  const confirmed = useApiList<Reservation>("/reservations/", { status: "confirmed", page_size: 1 });
  const arrivals = useApiAll<Reservation>("/reservations/", { check_in: today });
  const departures = useApiAll<Reservation>("/reservations/", { check_out: today });
  // Önümüzdeki 14 geceye değen rezervasyonlar (bu geceyi de kapsar).
  const windowRes = useApiAll<Reservation>("/reservations/", {
    check_in__lte: windowEnd,
    check_out__gte: tomorrow,
  });
  const month = useApiAll<Reservation>("/reservations/", {
    check_in__gte: monthStart,
    check_in__lte: monthEnd,
  });
  const upcoming = useApiList<Reservation>("/reservations/", {
    check_in__gte: today,
    ordering: "check_in",
    page_size: 20,
  });

  const queries = [properties, guests, pending, confirmed, arrivals, departures, windowRes, month, upcoming];
  const error = queries.find((q) => q.error)?.error ?? null;
  const loading = queries.some((q) => !q.data);
  const reloadAll = () => queries.forEach((q) => q.reload());

  const propertyName = useMemo(
    () => new Map((properties.data ?? []).map((p) => [p.id, p.name])),
    [properties.data],
  );
  const guestById = useMemo(
    () => new Map((guests.data ?? []).map((g) => [g.id, g])),
    [guests.data],
  );

  const activeProperties = useMemo(
    () => (properties.data ?? []).filter((p) => p.is_active),
    [properties.data],
  );

  const series = useMemo(() => {
    const activeIds = new Set(activeProperties.map((p) => p.id));
    return Array.from({ length: NIGHTS }, (_, i) => {
      const date = addDays(todayDate, i);
      const day = toISODate(date);
      const occupied = new Set(
        (windowRes.data ?? [])
          .filter((r) => isLive(r) && r.check_in <= day && day < r.check_out && activeIds.has(r.property))
          .map((r) => r.property),
      ).size;
      return {
        label: format(date, "dd MMM"),
        value: activeIds.size ? Math.round((occupied / activeIds.size) * 100) : 0,
      };
    });
  }, [windowRes.data, activeProperties, today]);

  const monthLive = useMemo(() => (month.data ?? []).filter(isLive), [month.data]);

  const revenue = useMemo(() => {
    const byCurrency = new Map<string, number>();
    for (const r of monthLive) {
      byCurrency.set(r.currency, (byCurrency.get(r.currency) ?? 0) + Number(r.total_price));
    }
    if (!byCurrency.size) return formatCurrency(0);
    return [...byCurrency.entries()].map(([cur, sum]) => formatCurrency(sum, cur)).join(" · ");
  }, [monthLive]);

  const bySource = useMemo(() => {
    const counts: Record<ReservationSource, number> = { direct: 0, airbnb: 0, booking: 0, other: 0 };
    for (const r of monthLive) counts[r.source] += 1;
    return counts;
  }, [monthLive]);

  const upcomingRows = (upcoming.data?.results ?? []).filter(isLive).slice(0, 6);
  const checkIns = (arrivals.data ?? []).filter(isLive).length;
  const checkOuts = (departures.data ?? []).filter(isLive).length;
  const activeCount = (pending.data?.count ?? 0) + (confirmed.data?.count ?? 0);
  const occupancy = series[0]?.value ?? 0;

  const chartOptions: ApexOptions = {
    colors: ["#465fff"],
    chart: { type: "bar", height: 240, toolbar: { show: false }, fontFamily: "Outfit, sans-serif", background: "transparent" },
    plotOptions: { bar: { columnWidth: "55%", borderRadius: 4, borderRadiusApplication: "end" } },
    dataLabels: { enabled: false },
    grid: { borderColor: dark ? "#1f2937" : "#eef0f3", strokeDashArray: 3 },
    xaxis: {
      categories: series.map((s) => s.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { rotate: -45, style: { colors: dark ? "#94a3b8" : "#667085", fontSize: "11px" } },
    },
    yaxis: { max: 100, labels: { formatter: (v) => `${v}%`, style: { colors: dark ? "#94a3b8" : "#667085" } } },
    tooltip: { theme: dark ? "dark" : "light", y: { formatter: (v) => `${v}% occupied` } },
  };

  const header = (
    <PageHeader
      title="Dashboard"
      description="Today's operations and performance at a glance."
      actions={
        <Button render={<Link to="/reservations" />} size="sm">
          <TicketIcon /> New reservation
        </Button>
      }
    />
  );

  if (error) {
    return (
      <>
        <PageMeta title="Dashboard | PMS Console" description="Property management overview" />
        {header}
        <ErrorBanner message={error} onRetry={reloadAll} />
      </>
    );
  }

  if (loading) {
    return (
      <>
        <PageMeta title="Dashboard | PMS Console" description="Property management overview" />
        {header}
        <LoadingBlock />
      </>
    );
  }

  return (
    <>
      <PageMeta title="Dashboard | PMS Console" description="Property management overview" />
      {header}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Total Properties" value={properties.data?.length ?? 0} hint={`${activeProperties.length} active`} icon={<MapIcon />} />
        <StatCard label="Active Reservations" value={activeCount} hint="Pending & confirmed" icon={<TicketIcon />} />
        <StatCard label="Today's Check-ins" value={checkIns} hint="Arrivals expected today" icon={<ArrowLeftRightIcon />} />
        <StatCard label="Today's Check-outs" value={checkOuts} hint="Departures due today" icon={<CalendarIcon />} />
        <StatCard label="Occupancy Rate" value={`${occupancy}%`} hint="Tonight, active properties" icon={<PieChartIcon />} />
        <StatCard label="Monthly Revenue" value={revenue} hint="By check-in month, excl. cancelled" icon={<DollarIcon />} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Panel
          title="Upcoming Reservations"
          description="Next arrivals across all properties"
          className="xl:col-span-2"
          action={<Button variant="outline" size="xs" render={<Link to="/reservations" />}>View all</Button>}
        >
          {upcomingRows.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-500">No upcoming reservations.</p>
          ) : (
            <div className="custom-scrollbar overflow-x-auto">
              <table className="min-w-full">
                <thead className={theadClass}>
                  <tr>
                    <Th>Guest</Th>
                    <Th>Property</Th>
                    <Th>Check-in</Th>
                    <Th>Check-out</Th>
                    <Th>Source</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingRows.map((r) => (
                    <tr key={r.id} className={trClass}>
                      <td className={cn(tdClass, "font-medium text-gray-900 dark:text-white/90")}>
                        {guestName(guestById.get(r.guest))}
                      </td>
                      <td className={tdClass}>{propertyName.get(r.property) ?? "—"}</td>
                      <td className={cn(tdClass, "whitespace-nowrap")}>{formatDateShort(r.check_in)}</td>
                      <td className={cn(tdClass, "whitespace-nowrap")}>{formatDateShort(r.check_out)}</td>
                      <td className={tdClass}><ChannelBadge source={r.source} /></td>
                      <td className={tdClass}><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Bookings by Source" description="This month's reservations (excl. cancelled)" bodyClassName="px-5 py-2">
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {(Object.keys(bySource) as ReservationSource[]).map((source) => (
              <li key={source} className="flex items-center justify-between gap-3 py-3.5">
                <span className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white/90">
                  <span className={cn("size-2 rounded-full", CHANNEL_STYLES[source].dot)} />
                  {SOURCE_LABELS[source]}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {bySource[source]} {bySource[source] === 1 ? "booking" : "bookings"}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel
          title="Occupancy Overview"
          description="Projected occupancy, next 14 nights"
          bodyClassName="px-3 pt-4 pb-2"
        >
          <ReactApexChart key={theme} options={chartOptions} series={[{ name: "Occupancy", data: series.map((s) => s.value) }]} type="bar" height={240} />
        </Panel>
      </div>
    </>
  );
}
