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
import { api, errorMessage, fieldErrors } from "@/lib/api";
import { todayISO } from "@/lib/pms/format";
import { TASK_STATUS_OPTIONS } from "@/lib/pms/labels";
import type { GeneralTask, Property, TaskStatus } from "@/lib/pms/types";
import { useState } from "react";

interface Draft {
  property: string;
  description: string;
  due_date: string;
  status: TaskStatus;
}

function toDraft(task: GeneralTask | null): Draft {
  return task
    ? { property: task.property, description: task.description, due_date: task.due_date, status: task.status }
    : { property: "", description: "", due_date: todayISO(), status: "pending" };
}

export function TaskFormDialog({
  open,
  task,
  properties,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  task: GeneralTask | null;
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

function Form({
  task,
  properties,
  onCancel,
  onSaved,
}: {
  task: GeneralTask | null;
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
    if (!draft.description.trim()) next.description = "Description is required";
    if (!draft.due_date) next.due_date = "Due date is required";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      if (task) await api.patch(`/general-tasks/${task.id}/`, draft);
      else await api.post("/general-tasks/", draft);
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
        <DialogTitle>{task ? "Edit task" : "Add task"}</DialogTitle>
        <DialogDescription>General operational task for a property.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Property"
          value={draft.property}
          onChange={(v) => set("property", v)}
          placeholder="Select property…"
          options={properties.map((p) => ({ value: p.id, label: p.name }))}
          error={errors.property}
        />
        <SelectField label="Status" value={draft.status} onChange={(v) => set("status", v as TaskStatus)} options={TASK_STATUS_OPTIONS} error={errors.status} />
        <TextField label="Due date" type="date" value={draft.due_date} onChange={(v) => set("due_date", v)} error={errors.due_date} />
        <div className="hidden sm:block" />
        <div className="sm:col-span-2">
          <TextAreaField label="Description" value={draft.description} onChange={(v) => set("description", v)} rows={3} />
          {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
        </div>
      </div>
      {formError && <p role="alert" className="text-sm text-red-500">{formError}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : task ? "Save changes" : "Add task"}</Button>
      </DialogFooter>
    </form>
  );
}
