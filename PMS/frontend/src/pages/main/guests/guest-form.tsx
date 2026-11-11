import { TextAreaField, TextField } from "@/components/shared/pms/form-bits";
import { ErrorBanner } from "@/components/shared/pms/ui-bits";
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
import type { Guest } from "@/lib/pms/types";
import { useState } from "react";

type Draft = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  nationality: string;
  identity_number: string;
  notes: string;
};

function toDraft(g: Guest | null): Draft {
  return {
    first_name: g?.first_name ?? "",
    last_name: g?.last_name ?? "",
    email: g?.email ?? "",
    phone: g?.phone ?? "",
    nationality: g?.nationality ?? "",
    identity_number: "", // API sadece maskeli halini döndürür
    notes: g?.notes ?? "",
  };
}

export function GuestFormDialog({
  open,
  guest,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  guest: Guest | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {open && (
          <GuestForm
            key={guest?.id ?? "new"}
            guest={guest}
            onCancel={() => onOpenChange(false)}
            onSaved={() => {
              onOpenChange(false);
              onSaved();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function GuestForm({
  guest,
  onCancel,
  onSaved,
}: {
  guest: Guest | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(toDraft(guest));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Draft>(key: K, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!draft.first_name.trim()) next.first_name = "First name is required";
    if (!draft.last_name.trim()) next.last_name = "Last name is required";
    if (!draft.email.trim()) next.email = "Email is required";
    if (!draft.phone.trim()) next.phone = "Phone is required";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    const body: Record<string, unknown> = {
      first_name: draft.first_name.trim(),
      last_name: draft.last_name.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      nationality: draft.nationality.trim(),
      notes: draft.notes,
    };
    // Kimlik no boş bırakılırsa mevcut değer korunur (göndermiyoruz).
    if (draft.identity_number.trim()) {
      body.identity_number = draft.identity_number.trim();
    }

    setSaving(true);
    try {
      if (guest) await api.patch(`/guests/${guest.id}/`, body);
      else await api.post("/guests/", body);
      onSaved();
    } catch (err) {
      const fields = fieldErrors(err);
      setErrors(fields);
      if (Object.keys(fields).length === 0) setFormError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{guest ? "Edit guest" : "Add guest"}</DialogTitle>
        <DialogDescription>
          {guest
            ? `Update details for ${guest.first_name} ${guest.last_name}.`
            : "Register a new guest."}
        </DialogDescription>
      </DialogHeader>
      {formError && <ErrorBanner message={formError} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="First name" value={draft.first_name} onChange={(v) => set("first_name", v)} error={errors.first_name} />
        <TextField label="Last name" value={draft.last_name} onChange={(v) => set("last_name", v)} error={errors.last_name} />
        <TextField label="Email" type="email" value={draft.email} onChange={(v) => set("email", v)} error={errors.email} />
        <TextField label="Phone" value={draft.phone} onChange={(v) => set("phone", v)} error={errors.phone} />
        <TextField label="Nationality" value={draft.nationality} onChange={(v) => set("nationality", v)} error={errors.nationality} />
        <TextField
          label="Identity number"
          value={draft.identity_number}
          onChange={(v) => set("identity_number", v)}
          error={errors.identity_number}
          placeholder={guest?.identity_number_masked ? `${guest.identity_number_masked} (leave empty to keep)` : ""}
        />
        <TextAreaField className="sm:col-span-2" label="Internal notes" value={draft.notes} onChange={(v) => set("notes", v)} />
        {errors.notes && <p className="text-xs text-red-500 sm:col-span-2">{errors.notes}</p>}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : guest ? "Save changes" : "Add guest"}</Button>
      </DialogFooter>
    </form>
  );
}
