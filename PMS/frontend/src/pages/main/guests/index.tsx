import { PageMeta } from "@/components/shared/page-meta";
import { ChannelBadge, StatusBadge } from "@/components/shared/pms/badges";
import {
  Detail,
  EmptyState,
  ErrorBanner,
  FilterBar,
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
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useApiAll, useApiList, useDebounce } from "@/hooks/use-api";
import { PlusIcon } from "@/icons";
import { api, errorMessage } from "@/lib/api";
import { formatCurrency, formatDate, formatDateShort } from "@/lib/pms/format";
import { guestName } from "@/lib/pms/labels";
import type { Guest, Property, Reservation } from "@/lib/pms/types";
import { cn, getInitials } from "@/utils";
import { useState } from "react";
import { GuestFormDialog } from "./guest-form";

const PAGE_SIZE = 10;

export default function GuestsPage() {
  const [search, setSearch] = useState("");
  const [ordering, setOrdering] = useState("first_name");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Guest | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Guest | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const debounced = useDebounce(search);
  const { data, loading, error, reload } = useApiList<Guest>("/guests/", {
    search: debounced.trim(),
    ordering,
    page,
    page_size: PAGE_SIZE,
  });

  const guests = data?.results ?? [];
  const total = data?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const sortDir = ordering.startsWith("-") ? "desc" : "asc";
  const sortKey = ordering.replace(/^-/, "");
  const toggleSort = (key: string) => {
    setOrdering(sortKey === key && sortDir === "asc" ? `-${key}` : key);
    setPage(1);
  };
  const head = (label: string, key: string) => (
    <SortHead label={label} sortKey={key} active={sortKey === key} dir={sortDir} onSort={toggleSort} />
  );

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (g: Guest) => { setEditing(g); setFormOpen(true); };

  const remove = async (g: Guest) => {
    if (!window.confirm(`Delete ${guestName(g)}? This cannot be undone.`)) return;
    setActionError(null);
    try {
      await api.delete(`/guests/${g.id}/`);
      setSelected(null);
      reload();
    } catch (e) {
      setActionError(errorMessage(e));
    }
  };

  return (
    <>
      <PageMeta title="Guests | PMS Console" description="Guest directory" />
      <PageHeader
        title="Guests"
        description={data ? `${total} guests on record` : "Guest directory"}
        actions={<Button onClick={openAdd}><PlusIcon /> Add guest</Button>}
      />
      {actionError && <ErrorBanner className="mb-4" message={actionError} />}
      <Panel>
        <FilterBar>
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search name, email, phone…" />
        </FilterBar>
        {error ? (
          <div className="p-4"><ErrorBanner message={error} onRetry={reload} /></div>
        ) : !data && loading ? (
          <LoadingBlock label="Loading guests…" />
        ) : guests.length === 0 ? (
          <EmptyState title="No guests found" />
        ) : (
          <>
            <div className={cn("custom-scrollbar overflow-x-auto transition-opacity", loading && "opacity-60")}>
              <table className="min-w-full">
                <thead className={theadClass}>
                  <tr>
                    {head("First name", "first_name")}
                    {head("Last name", "last_name")}
                    <Th>Email</Th>
                    <Th>Phone</Th>
                    <Th>Nationality</Th>
                    {head("Created", "created_at")}
                  </tr>
                </thead>
                <tbody>
                  {guests.map((g) => (
                    <tr key={g.id} className={cn(trClass, "cursor-pointer")} onClick={() => setSelected(g)}>
                      <td className={tdClass}>
                        <span className="flex items-center gap-3">
                          <span className="flex size-9 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">{getInitials(guestName(g))}</span>
                          <span className="font-medium text-gray-900 dark:text-white/90">{g.first_name}</span>
                        </span>
                      </td>
                      <td className={cn(tdClass, "font-medium text-gray-900 dark:text-white/90")}>{g.last_name}</td>
                      <td className={tdClass}>{g.email}</td>
                      <td className={cn(tdClass, "whitespace-nowrap")}>{g.phone}</td>
                      <td className={tdClass}>{g.nationality || "—"}</td>
                      <td className={cn(tdClass, "whitespace-nowrap")}>{formatDateShort(g.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePager page={page} pageCount={pageCount} total={total} pageSize={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </Panel>

      <GuestDetail
        guest={selected}
        onClose={() => setSelected(null)}
        onEdit={(g) => { setSelected(null); openEdit(g); }}
        onDelete={remove}
      />
      <GuestFormDialog open={formOpen} guest={editing} onOpenChange={setFormOpen} onSaved={reload} />
    </>
  );
}

function GuestDetail({
  guest,
  onClose,
  onEdit,
  onDelete,
}: {
  guest: Guest | null;
  onClose: () => void;
  onEdit: (g: Guest) => void;
  onDelete: (g: Guest) => void;
}) {
  return (
    <Sheet open={!!guest} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        {guest && (
          <>
            <SheetHeader>
              <SheetTitle>{guestName(guest)}</SheetTitle>
              <SheetDescription>Guest since {formatDate(guest.created_at)}</SheetDescription>
            </SheetHeader>
            <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-4">
              <section>
                <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white/90">Personal & contact</h3>
                <dl className="grid grid-cols-2 gap-4">
                  <Detail label="Nationality">{guest.nationality}</Detail>
                  <Detail label="Identity number">{guest.identity_number_masked}</Detail>
                  <Detail label="Email">{guest.email}</Detail>
                  <Detail label="Phone">{guest.phone}</Detail>
                </dl>
              </section>
              <GuestHistory guestId={guest.id} />
              <section>
                <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white/90">Internal notes</h3>
                <p className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">{guest.notes || "—"}</p>
              </section>
            </div>
            <SheetFooter className="flex-row justify-end gap-2 border-t border-gray-100 dark:border-gray-800">
              <Button variant="outline" onClick={() => onDelete(guest)}>Delete</Button>
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button onClick={() => onEdit(guest)}>Edit guest</Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function GuestHistory({ guestId }: { guestId: string }) {
  const history = useApiList<Reservation>("/reservations/", { guest: guestId, ordering: "-check_in", page_size: 20 });
  const properties = useApiAll<Property>("/properties/");
  const propertyName = (id: string) => properties.data?.find((p) => p.id === id)?.name ?? "—";
  const items = history.data?.results ?? [];

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white/90">
        Reservation history{history.data ? ` (${history.data.count})` : ""}
      </h3>
      {history.error ? (
        <ErrorBanner message={history.error} onRetry={history.reload} />
      ) : !history.data ? (
        <LoadingBlock label="Loading reservations…" />
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">No reservations yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {items.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white/90">{propertyName(r.property)}</p>
                <p className="text-xs text-gray-500">{formatDateShort(r.check_in)} → {formatDateShort(r.check_out)} · {formatCurrency(r.total_price, r.currency)}</p>
              </div>
              <div className="flex items-center gap-3"><ChannelBadge source={r.source} /><StatusBadge status={r.status} /></div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
