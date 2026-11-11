import { SelectField, TextAreaField, TextField } from "@/components/shared/pms/form-bits";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApiAll } from "@/hooks/use-api";
import { api, errorMessage, fieldErrors } from "@/lib/api";
import { TASK_STATUS_OPTIONS } from "@/lib/pms/labels";
import { formatDateShort, todayISO } from "@/lib/pms/format";
import type { HousekeepingTask, Property, Reservation, TaskStatus } from "@/lib/pms/types";
import { useState } from "react";

interface Draft {
  property: string;
  reservation: string;
  scheduled_date: string;
  notes: string;
  status: TaskStatus;
}

function toDraft(task: HousekeepingTask | null): Draft {
  return task
    ? {
        property: task.property,
        reservation: task.reservation ?? "",
        scheduled_date: task.scheduled_date,
        notes: task.notes,
        status: task.status,
      }
    : { property: "", reservation: "", scheduled_date: todayISO(), notes: "", status: "pending" };
}

export function HousekeepingFormDialog({
  open,
  task,
  properties,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  task: HousekeepingTask | null;
  properties: Property[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {open && (
          <Form
            key={task?.id ?? "new"}
            task={task}
            properties={properties}
            onCancel={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Sadece property seçilince mount edilir; o property'nin rezervasyonlarını listeler. */
function ReservationSelect({
  propertyId,
  value,
  onChange,
  error,
}: {
  propertyId: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const { data, loading } = useApiAll<Reservation>("/reservations/", {
    property: propertyId,
    ordering: "-check_in",
  });
  const options = (data ?? []).map((r) => ({
    value: r.id,
    label: `${formatDateShort(r.check_in)} → ${formatDateShort(r.check_out)} · ${r.id.slice(0, 8)}`,
  }));
  return (
    <SelectField
      label="Reservation (optional)"
      value={value}
      onChange={onChange}
      placeholder={loading ? "Loading…" : "No reservation"}
      options={options}
      error={error}
    />
  );
}

function Form({
  task,
  properties,
  onCancel,
  onSaved,
}: {
  task: HousekeepingTask | null;
  properties: Property[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(toDraft(task));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!draft.property) next.property = "Select a property";
    if (!draft.scheduled_date) next.scheduled_date = "Date is required";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setSaving(true);
    const body = { ...draft, reservation: draft.reservation || null };
    try {
      if (task) await api.patch(`/housekeeping/${task.id}/`, body);
      else await api.post("/housekeeping/", body);
      onSaved();
    } catch (err) {
      const fields = fieldErrors(err);
      setErrors(fields);
      if (!Object.keys(fields).length) setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{task ? "Edit task" : "Add housekeeping task"}</DialogTitle>
        <DialogDescription>Schedule a cleaning task for a property.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Property"
          value={draft.property}
          onChange={(v) => setDraft((d) => ({ ...d, property: v, reservation: "" }))}
          placeholder="Select property…"
          options={properties.map((p) => ({ value: p.id, label: p.name }))}
          error={errors.property}
        />
        {draft.property ? (
          <ReservationSelect
            key={draft.property}
            propertyId={draft.property}
            value={draft.reservation}
            onChange={(v) => set("reservation", v)}
            error={errors.reservation}
          />
        ) : (
          <SelectField label="Reservation (optional)" value="" onChange={() => {}} placeholder="Select a property first" options={[]} />
        )}
        <TextField label="Scheduled date" type="date" value={draft.scheduled_date} onChange={(v) => set("scheduled_date", v)} error={errors.scheduled_date} />
        <SelectField label="Status" value={draft.status} onChange={(v) => set("status", v as TaskStatus)} options={TASK_STATUS_OPTIONS} error={errors.status} />
        <TextAreaField className="sm:col-span-2" label="Notes" value={draft.notes} onChange={(v) => set("notes", v)} rows={3} />
      </div>
      {formError && <p role="alert" className="text-sm text-red-500">{formError}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : task ? "Save changes" : "Add task"}</Button>
      </DialogFooter>
    </form>
  );
}
