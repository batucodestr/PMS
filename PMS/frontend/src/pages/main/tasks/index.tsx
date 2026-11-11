import { PageMeta } from "@/components/shared/page-meta";
import { StatusBadge } from "@/components/shared/pms/badges";
import {
  EmptyState,
  ErrorBanner,
  FilterBar,
  FilterSelect,
  LoadingBlock,
  PageHeader,
  Panel,
  SearchBox,
  TablePager,
  Th,
  tdClass,
  theadClass,
  trClass,
} from "@/components/shared/pms/ui-bits";
import { Button } from "@/components/ui/button";
import { useApiAll, useApiList, useDebounce } from "@/hooks/use-api";
import { api, errorMessage } from "@/lib/api";
import { formatDateShort } from "@/lib/pms/format";
import { TASK_STATUS_OPTIONS } from "@/lib/pms/labels";
import type { GeneralTask, Property, TaskStatus } from "@/lib/pms/types";
import { PencilIcon, PlusIcon, TrashBinIcon } from "@/icons";
import { cn } from "@/utils";
import { useMemo, useState } from "react";
import { TaskFormDialog } from "./task-form";

const PAGE_SIZE = 20;

const selectClass =
  "h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-700 outline-hidden focus:border-brand-300 focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200";

export default function TasksPage() {
  const [search, setSearch] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GeneralTask | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search.trim());
  const properties = useApiAll<Property>("/properties/");
  const list = useApiList<GeneralTask>("/general-tasks/", {
    search: debouncedSearch,
    property: propertyId,
    status,
    ordering: "due_date",
    page,
    page_size: PAGE_SIZE,
  });

  const propertyName = useMemo(
    () => new Map((properties.data ?? []).map((p) => [p.id, p.name])),
    [properties.data],
  );

  const changeStatus = async (task: GeneralTask, next: TaskStatus) => {
    setActionError(null);
    try {
      await api.patch(`/general-tasks/${task.id}/`, { status: next });
      list.reload();
    } catch (e) {
      setActionError(errorMessage(e));
    }
  };

  const remove = async (task: GeneralTask) => {
    if (!window.confirm("Delete this task?")) return;
    setActionError(null);
    try {
      await api.delete(`/general-tasks/${task.id}/`);
      list.reload();
    } catch (e) {
      setActionError(errorMessage(e));
    }
  };

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (t: GeneralTask) => { setEditing(t); setFormOpen(true); };

  const tasks = list.data?.results ?? [];
  const total = list.data?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageMeta title="Tasks | PMS Console" description="General operational tasks" />
      <PageHeader
        title="Tasks"
        description={list.data ? `${total} tasks` : "General operational tasks."}
        actions={<Button onClick={openAdd}><PlusIcon /> Add task</Button>}
      />

      {actionError && <ErrorBanner className="mb-4" message={actionError} />}

      <Panel>
        <FilterBar>
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search description…" />
          <FilterSelect label="Property" value={propertyId} onChange={(v) => { setPropertyId(v); setPage(1); }} options={(properties.data ?? []).map((p) => ({ value: p.id, label: p.name }))} allLabel="All properties" />
          <FilterSelect label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={TASK_STATUS_OPTIONS} allLabel="All statuses" />
        </FilterBar>

        {list.error ? (
          <div className="p-4"><ErrorBanner message={list.error} onRetry={list.reload} /></div>
        ) : !list.data ? (
          <LoadingBlock />
        ) : tasks.length === 0 ? (
          <EmptyState title="No tasks found" />
        ) : (
          <>
            <div className={cn("custom-scrollbar overflow-x-auto", list.loading && "opacity-60")}>
              <table className="min-w-full">
                <thead className={theadClass}>
                  <tr><Th>Description</Th><Th>Property</Th><Th>Due</Th><Th>Completed</Th><Th>Status</Th><Th className="text-end">Actions</Th></tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t.id} className={trClass}>
                      <td className={cn(tdClass, "max-w-sm font-medium text-gray-900 dark:text-white/90")}>{t.description}</td>
                      <td className={tdClass}>{propertyName.get(t.property) ?? "—"}</td>
                      <td className={cn(tdClass, "whitespace-nowrap")}>{formatDateShort(t.due_date)}</td>
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

      <TaskFormDialog
        open={formOpen}
        task={editing}
        properties={properties.data ?? []}
        onOpenChange={setFormOpen}
        onSaved={() => { setFormOpen(false); list.reload(); }}
      />
    </>
  );
}
