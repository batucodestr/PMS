import { PageMeta } from "@/components/shared/page-meta";
import { ChannelBadge, StatusBadge } from "@/components/shared/pms/badges";
import { ReservationDetail } from "@/components/shared/pms/reservation-detail";
import {
  DateFilter,
  EmptyState,
  ErrorBanner,
  FilterBar,
  FilterSelect,
  LoadingBlock,
  PageHeader,
  Panel,
  SearchBox,
  SortHead,
  TablePager,
  Th,
  tdClass,
  theadClass,
  trClass,
} from "@/components/shared/pms/ui-bits";
import { Button } from "@/components/ui/button";
import { useApiAll, useApiList, useDebounce } from "@/hooks/use-api";
import { formatCurrency, formatDateShort, nightsBetween } from "@/lib/pms/format";
import { guestName, RESERVATION_STATUS_OPTIONS, SOURCE_OPTIONS } from "@/lib/pms/labels";
import type { Guest, Property, Reservation } from "@/lib/pms/types";
import { PlusIcon } from "@/icons";
import { cn } from "@/utils";
import { useMemo, useState } from "react";
import { ReservationFormDialog } from "./reservation-form";

const PAGE_SIZE = 10;

export default function ReservationsPage() {
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "check_in", dir: "desc" });
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Reservation | null>(null);

  const debouncedSearch = useDebounce(search.trim());
  const list = useApiList<Reservation>("/reservations/", {
    search: debouncedSearch,
    property: propertyId,
    status,
    source,
    check_in__gte: fromDate,
    ordering: sort.dir === "desc" ? `-${sort.key}` : sort.key,
    page,
    page_size: PAGE_SIZE,
  });
  const guests = useApiAll<Guest>("/guests/");
  const properties = useApiAll<Property>("/properties/");

  const guestById = useMemo(() => new Map((guests.data ?? []).map((g) => [g.id, g])), [guests.data]);
  const propertyById = useMemo(() => new Map((properties.data ?? []).map((p) => [p.id, p])), [properties.data]);

  // Filtre değişince ilk sayfaya dön.
  const filter = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1); };
  const toggleSort = (key: string) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
    setPage(1);
  };
  const head = (label: string, key: string, className?: string) => (
    <SortHead label={label} sortKey={key} active={sort.key === key} dir={sort.dir} onSort={toggleSort} className={className} />
  );

  const resetFilters = () => { setSearch(""); setSource(""); setStatus(""); setPropertyId(""); setFromDate(""); setPage(1); };
  const hasFilters = search || source || status || propertyId || fromDate;

  const rows = list.data?.results ?? [];
  const total = list.data?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (r: Reservation) => { setSelectedId(null); setEditing(r); setFormOpen(true); };

  return (
    <>
      <PageMeta title="Reservations | PMS Console" description="Manage reservations" />
      <PageHeader
        title="Reservations"
        description={list.data ? `${total} reservations` : "Loading reservations…"}
        actions={<Button onClick={openAdd}><PlusIcon /> Add reservation</Button>}
      />
      <Panel>
        <FilterBar>
          <SearchBox value={search} onChange={filter(setSearch)} placeholder="Search guest, email, property…" />
          <FilterSelect label="Property" value={propertyId} onChange={filter(setPropertyId)} options={(properties.data ?? []).map((p) => ({ value: p.id, label: p.name }))} allLabel="All properties" />
          <FilterSelect label="Source" value={source} onChange={filter(setSource)} options={SOURCE_OPTIONS} allLabel="All sources" />
          <FilterSelect label="Status" value={status} onChange={filter(setStatus)} options={RESERVATION_STATUS_OPTIONS} allLabel="All statuses" />
          <DateFilter label="Check-in on or after" value={fromDate} onChange={filter(setFromDate)} />
          {hasFilters && <Button variant="ghost" size="sm" onClick={resetFilters}>Clear filters</Button>}
        </FilterBar>

        {list.error ? (
          <div className="p-4"><ErrorBanner message={list.error} onRetry={list.reload} /></div>
        ) : !list.data ? (
          <LoadingBlock label="Loading reservations…" />
        ) : rows.length === 0 ? (
          <EmptyState title="No reservations match your filters" />
        ) : (
          <>
            <div className={cn("custom-scrollbar overflow-x-auto transition-opacity", list.loading && "opacity-60")}>
              <table className="min-w-full">
                <thead className={theadClass}>
                  <tr>
                    <Th>ID</Th>
                    <Th>Guest</Th>
                    <Th>Property</Th>
                    {head("Check-in", "check_in")}
                    {head("Check-out", "check_out")}
                    <Th>Nights</Th>
                    {head("Total", "total_price")}
                    <Th>Source</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className={cn(trClass, "cursor-pointer")} onClick={() => setSelectedId(r.id)}>
                      <td className={tdClass}>
                        <button type="button" className="font-mono text-xs font-medium text-brand-600 hover:underline dark:text-brand-400" onClick={(e) => { e.stopPropagation(); setSelectedId(r.id); }}>
                          {r.id.slice(0, 8)}
                        </button>
                      </td>
                      <td className={cn(tdClass, "font-medium text-gray-900 dark:text-white/90")}>{guestName(guestById.get(r.guest))}</td>
                      <td className={tdClass}>{propertyById.get(r.property)?.name ?? "—"}</td>
                      <td className={cn(tdClass, "whitespace-nowrap")}>{formatDateShort(r.check_in)}</td>
                      <td className={cn(tdClass, "whitespace-nowrap")}>{formatDateShort(r.check_out)}</td>
                      <td className={tdClass}>{nightsBetween(r.check_in, r.check_out)}</td>
                      <td className={cn(tdClass, "font-medium")}>{formatCurrency(r.total_price, r.currency)}</td>
                      <td className={tdClass}><ChannelBadge source={r.source} /></td>
                      <td className={tdClass}><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePager page={Math.min(page, pageCount)} pageCount={pageCount} total={total} pageSize={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </Panel>

      <ReservationDetail reservationId={selectedId} onClose={() => setSelectedId(null)} onChanged={list.reload} onEdit={openEdit} />
      <ReservationFormDialog open={formOpen} onOpenChange={setFormOpen} reservation={editing} onSaved={list.reload} />
    </>
  );
}
