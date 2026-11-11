import { SelectField, TextAreaField, TextField } from "@/components/shared/pms/form-bits";
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
import type { Property, PropertyImage } from "@/lib/pms/types";
import { XIcon } from "@/icons";
import { useEffect, useMemo, useState } from "react";

type Draft = {
  name: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  postal_code: string;
  max_guests: string;
  bedroom_count: string;
  bed_count: string;
  bathroom_count: string;
  area: string;
  base_price: string;
  is_active: string; // "true" | "false"
};

const REQUIRED: [keyof Draft, string][] = [
  ["name", "Name is required"],
  ["phone", "Phone is required"],
  ["email", "Email is required"],
  ["address", "Address is required"],
  ["city", "City is required"],
  ["country", "Country is required"],
  ["postal_code", "Postal code is required"],
  ["max_guests", "Required"],
  ["bedroom_count", "Required"],
  ["bed_count", "Required"],
  ["bathroom_count", "Required"],
  ["area", "Required"],
  ["base_price", "Required"],
];

const NUMERIC: (keyof Draft)[] = [
  "max_guests",
  "bedroom_count",
  "bed_count",
  "bathroom_count",
  "area",
  "base_price",
];

const blank: Draft = {
  name: "",
  description: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  country: "Türkiye",
  postal_code: "",
  max_guests: "2",
  bedroom_count: "1",
  bed_count: "1",
  bathroom_count: "1",
  area: "",
  base_price: "",
  is_active: "true",
};

function toDraft(p: Property | null): Draft {
  if (!p) return blank;
  return {
    name: p.name,
    description: p.description,
    phone: p.phone,
    email: p.email,
    address: p.address,
    city: p.city,
    country: p.country,
    postal_code: p.postal_code,
    max_guests: String(p.max_guests),
    bedroom_count: String(p.bedroom_count),
    bed_count: String(p.bed_count),
    bathroom_count: String(p.bathroom_count),
    area: p.area,
    base_price: p.base_price,
    is_active: String(p.is_active),
  };
}

export function PropertyFormDialog({
  open,
  property,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  property: Property | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {open && (
          <PropertyForm
            key={property?.id ?? "new"}
            property={property}
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

function PropertyForm({
  property,
  onCancel,
  onSaved,
}: {
  property: Property | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(toDraft(property));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<PropertyImage[]>(property?.images ?? []);
  const [removedIds, setRemovedIds] = useState<number[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const previews = useMemo(() => newFiles.map((f) => URL.createObjectURL(f)), [newFiles]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);
  const set = <K extends keyof Draft>(key: K, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    for (const [key, message] of REQUIRED) {
      if (!draft[key].trim()) next[key] = message;
    }
    for (const key of NUMERIC) {
      if (draft[key].trim() && (Number.isNaN(Number(draft[key])) || Number(draft[key]) < 0))
        next[key] = "Enter a valid number";
    }
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    const body = {
      name: draft.name.trim(),
      description: draft.description,
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      address: draft.address.trim(),
      city: draft.city.trim(),
      country: draft.country.trim(),
      postal_code: draft.postal_code.trim(),
      max_guests: Number(draft.max_guests),
      bedroom_count: Number(draft.bedroom_count),
      bed_count: Number(draft.bed_count),
      bathroom_count: Number(draft.bathroom_count),
      area: draft.area.trim(),
      base_price: draft.base_price.trim(),
      is_active: draft.is_active === "true",
    };

    setSaving(true);
    try {
      const saved = property
        ? await api.patch<Property>(`/properties/${property.id}/`, body)
        : await api.post<Property>("/properties/", body);
      try {
        for (const id of removedIds) await api.delete(`/property-images/${id}/`);
        for (const file of newFiles) {
          const fd = new FormData();
          fd.append("property", saved.id);
          fd.append("image", file);
          await api.postForm("/property-images/", fd);
        }
      } catch (imgErr) {
        setFormError(`Property saved, but image update failed: ${errorMessage(imgErr)}`);
        setSaving(false);
        return;
      }
      onSaved();
    } catch (err) {
      const fields = fieldErrors(err);
      setErrors(fields);
      if (Object.keys(fields).length === 0) setFormError(errorMessage(err));
      setSaving(false);
    }
  };

  const text = (key: keyof Draft, label: string, extra: { type?: string; className?: string } = {}) => (
    <TextField label={label} value={draft[key]} onChange={(v) => set(key, v)} error={errors[key]} {...extra} />
  );

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{property ? "Edit property" : "Add property"}</DialogTitle>
        <DialogDescription>
          {property ? `Update details for ${property.name}.` : "Register a new property in your portfolio."}
        </DialogDescription>
      </DialogHeader>
      {formError && <ErrorBanner message={formError} />}
      <div className="grid gap-4 sm:grid-cols-2">
        {text("name", "Property name", { className: "sm:col-span-2" })}
        <TextAreaField className="sm:col-span-2" label="Description" value={draft.description} onChange={(v) => set("description", v)} />
        {text("phone", "Phone")}
        {text("email", "Email", { type: "email" })}
        {text("address", "Address", { className: "sm:col-span-2" })}
        {text("city", "City")}
        {text("country", "Country")}
        {text("postal_code", "Postal code")}
        <SelectField
          label="Status"
          value={draft.is_active}
          onChange={(v) => set("is_active", v)}
          options={[{ value: "true", label: "Active" }, { value: "false", label: "Inactive" }]}
        />
        {text("max_guests", "Max guests", { type: "number" })}
        {text("bedroom_count", "Bedrooms", { type: "number" })}
        {text("bed_count", "Beds", { type: "number" })}
        {text("bathroom_count", "Bathrooms", { type: "number" })}
        {text("area", "Area (m²)", { type: "number" })}
        {text("base_price", "Base price (per night)", { type: "number" })}
        <div className="flex flex-col gap-2 sm:col-span-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Image</span>
          <div className="flex flex-wrap gap-3">
            {existing.map((img) => (
              <Thumb key={img.id} src={img.image} onRemove={() => {
                setExisting((l) => l.filter((i) => i.id !== img.id));
                setRemovedIds((l) => [...l, img.id]);
              }} />
            ))}
            {previews.map((src, i) => (
              <Thumb key={src} src={src} onRemove={() => setNewFiles((l) => l.filter((_, j) => j !== i))} />
            ))}
            {existing.length + newFiles.length === 0 && (
            <label className="flex size-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-gray-300 text-2xl text-gray-400 hover:border-brand-400 hover:text-brand-500 dark:border-gray-700">
              +
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setNewFiles([file]);
                  e.target.value = "";
                }}
              />
            </label>
            )}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : property ? "Save changes" : "Add property"}</Button>
      </DialogFooter>
    </form>
  );
}

function Thumb({ src, onRemove }: { src: string; onRemove: () => void }) {
  return (
    <div className="relative size-20 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      <img src={src} alt="" className="size-full object-cover" />
      <button
        type="button"
        aria-label="Remove image"
        onClick={onRemove}
        className="absolute end-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
      >
        <XIcon className="size-3" />
      </button>
    </div>
  );
}
