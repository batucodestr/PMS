import { PageMeta } from "@/components/shared/page-meta";
import { StatusBadge } from "@/components/shared/pms/badges";
import {
  DateFilter,
  EmptyState,
  ErrorBanner,
  FilterBar,
  FilterSelect,
  LoadingBlock,
  PageHeader,
  Panel,
  StatCard,
  TablePager,
  Th,
  tdClass,
  theadClass,
  trClass,
} from "@/components/shared/pms/ui-bits";
import { Button } from "@/components/ui/button";
import { useApiAll, useApiList } from "@/hooks/use-api";
import { api, errorMessage } from "@/lib/api";
import { formatDateShort, todayISO } from "@/lib/pms/format";
import { TASK_STATUS_OPTIONS } from "@/lib/pms/labels";
import type { HousekeepingTask, Property, TaskStatus } from "@/lib/pms/types";
import { PencilIcon, PlusIcon, TrashBinIcon } from "@/icons";
import { cn } from "@/utils";
import { useMemo, useState } from "react";
import { HousekeepingFormDialog } from "./housekeeping-form";

const PAGE_SIZE = 20;

const selectClass =
  "h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-700 outline-hidden focus:border-brand-300 focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200";

export default function HousekeepingPage() {
  const [propertyId, setPropertyId] = useState("");
  const [status, setStatus] = useState("");
  const [date, setDate] = useState(todayISO());
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<HousekeepingTask | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const properties = useApiAll<Property>("/properties/");
  const list = useApiList<HousekeepingTask>("/housekeeping/", {
    property: propertyId,
    status,
    scheduled_date: date,
    ordering: "scheduled_date,status",
    page,
    page_size: PAGE_SIZE,
  });

  // Üst kartlar: bugünün görev sayıları (filtreden bağımsız).
  const today = todayISO();
  const pending = useApiList<HousekeepingTask>("/housekeeping/", { scheduled_date: today, status: "pending", page_size: 1 });
  const inProgress = useApiList<HousekeepingTask>("/housekeeping/", { scheduled_date: today, status: "in_progress", page_size: 1 });
  const completed = useApiList<HousekeepingTask>("/housekeeping/", { scheduled_date: today, status: "completed", page_size: 1 });

  const propertyName = useMemo(
    () => new Map((properties.data ?? []).map((p) => [p.id, p.name])),
    [properties.data],
  );

  const reloadAll = () => {
    list.reload();
    pending.reload();
    inProgress.reload();
    completed.reload();
  };

  const changeStatus = async (task: HousekeepingTask, next: TaskStatus) => {
    setActionError(null);
    try {
      await api.patch(`/housekeeping/${task.id}/`, { status: next });
      reloadAll();
    } catch (e) {
      setActionError(errorMessage(e));
    }
  };

  const remove = async (task: HousekeepingTask) => {
    if (!window.confirm("Delete this task?")) return;
    setActionError(null);
    try {
      await api.delete(`/housekeeping/${task.id}/`);
      reloadAll();
    } catch (e) {
      setActionError(errorMessage(e));
    }
  };

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (t: HousekeepingTask) => { setEditing(t); setFormOpen(true); };

  const tasks = list.data?.results ?? [];
  const total = list.data?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const count = (r: { data: { count: number } | null }) => r.data?.count ?? "—";

  return (
    <>
      <PageMeta title="Housekeeping | PMS Console" description="Housekeeping tasks" />
      <PageHeader
        title="Housekeeping"
        description="Cleaning tasks per property."
        actions={<Button onClick={openAdd}><PlusIcon /> Add task</Button>}
      />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Pending today" value={count(pending)} hint="Waiting to be started" />
        <StatCard label="In progress today" value={count(inProgress)} hint="Currently being cleaned" />
        <StatCard label="Completed today" value={count(completed)} hint="Ready for guests" />
      </div>

      {actionError && <ErrorBanner className="mb-4" message={actionError} />}

      <Panel>
        <FilterBar>
          <FilterSelect label="Property" value={propertyId} onChange={(v) => { setPropertyId(v); setPage(1); }} options={(properties.data ?? []).map((p) => ({ value: p.id, label: p.name }))} allLabel="All properties" />
          <FilterSelect label="Task status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={TASK_STATUS_OPTIONS} allLabel="All tasks" />
          <DateFilter label="Scheduled date" value={date} onChange={(v) => { setDate(v); setPage(1); }} />
          {date && <Button variant="ghost" size="sm" onClick={() => { setDate(""); setPage(1); }}>All dates</Button>}
        </FilterBar>

        {list.error ? (
          <div className="p-4"><ErrorBanner message={list.error} onRetry={list.reload} /></div>
        ) : !list.data ? (
          <LoadingBlock />
        ) : tasks.length === 0 ? (
          <EmptyState title="No housekeeping tasks" description="No tasks for this date and filter combination." />
        ) : (
          <>
            <div className={cn("custom-scrollbar overflow-x-auto", list.loading && "opacity-60")}>
              <table className="min-w-full">
                <thead className={theadClass}>
                  <tr><Th>Property</Th><Th>Scheduled</Th><Th>Reservation</Th><Th>Notes</Th><Th>Completed</Th><Th>Status</Th><Th className="text-end">Actions</Th></tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t.id} className={trClass}>
                      <td className={cn(tdClass, "font-medium text-gray-900 dark:text-white/90")}>{propertyName.get(t.property) ?? "—"}</td>
                      <td className={cn(tdClass, "whitespace-nowrap")}>{formatDateShort(t.scheduled_date)}</td>
                      <td className={cn(tdClass, "font-mono text-xs")}>{t.reservation ? t.reservation.slice(0, 8) : "—"}</td>
                      <td className={cn(tdClass, "max-w-xs truncate")}>{t.notes || "—"}</td>
                      <td className={cn(tdClass, "whitespace-nowrap")}>{t.completed_date ? formatDateShort(t.completed_date) : "—"}</td>
                      <td className={tdClass}>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={t.status} />
                          <select
                            aria-label="Change task status"
                            className={selectClass}
                            value={t.status}
                            onChange={(e) => changeStatus(t, e.target.value as TaskStatus)}
                          >
                            {TASK_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                      </td>
                      <td className={cn(tdClass, "text-end")}>
                        <div className="inline-flex gap-1">
                          <Button variant="ghost" size="icon-xs" aria-label="Edit task" onClick={() => openEdit(t)}><PencilIcon className="size-4" /></Button>
                          <Button variant="ghost" size="icon-xs" aria-label="Delete task" onClick={() => remove(t)}><TrashBinIcon className="size-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePager page={page} pageCount={pageCount} total={total} pageSize={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </Panel>

      <HousekeepingFormDialog
        open={formOpen}
        task={editing}
        properties={properties.data ?? []}
        onOpenChange={setFormOpen}
        onSaved={() => { setFormOpen(false); reloadAll(); }}
      />
    </>
  );
}
