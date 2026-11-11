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
import { useApiAll } from "@/hooks/use-api";
import { api, errorMessage, fieldErrors } from "@/lib/api";
import { formatCurrency, nightsBetween, todayISO } from "@/lib/pms/format";
import { guestName, RESERVATION_STATUS_OPTIONS, SOURCE_OPTIONS } from "@/lib/pms/labels";
import type { Guest, Property, Reservation, ReservationSource, ReservationStatus } from "@/lib/pms/types";
import { addDays, format, parseISO } from "date-fns";
import { useState } from "react";

// Backend ALLOWED_TRANSITIONS ile aynı: düzenlemede seçilebilecek durumlar.
const TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["cancelled", "no_show"],
  cancelled: ["pending", "confirmed"],
  completed: [],
  no_show: [],
};

const FIELDS = [
  "guest", "property", "check_in", "check_out", "adults", "children",
  "total_price", "currency", "source", "status", "special_requests",
];

export function ReservationFormDialog({
  open,
  onOpenChange,
  reservation,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** null: yeni kayıt, dolu: düzenleme */
  reservation: Reservation | null;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {open && (
          <Form
            key={reservation?.id ?? "new"}
            reservation={reservation}
            onCancel={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Form({
  reservation,
  onCancel,
  onSaved,
}: {
  reservation: Reservation | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const guests = useApiAll<Guest>("/guests/", { ordering: "first_name" });
  const properties = useApiAll<Property>("/properties/", { ordering: "name" });

  const [guestId, setGuestId] = useState(reservation?.guest ?? "");
  const [propertyId, setPropertyId] = useState(reservation?.property ?? "");
  const [checkIn, setCheckIn] = useState(reservation?.check_in ?? todayISO());
  const [checkOut, setCheckOut] = useState(
    reservation?.check_out ?? format(addDays(parseISO(todayISO()), 2), "yyyy-MM-dd"),
  );
  const [adults, setAdults] = useState(String(reservation?.adults ?? 2));
  const [children, setChildren] = useState(String(reservation?.children ?? 0));
  // null: otomatik (base_price × gece). Kullanıcı yazarsa kendi değeri kullanılır.
  const [totalOverride, setTotalOverride] = useState<string | null>(
    reservation ? reservation.total_price : null,
  );
  const [currency, setCurrency] = useState(reservation?.currency ?? "TRY");
  const [source, setSource] = useState<ReservationSource>(reservation?.source ?? "direct");
  const [status, setStatus] = useState<ReservationStatus>(reservation?.status ?? "pending");
  const [requests, setRequests] = useState(reservation?.special_requests ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const property = properties.data?.find((p) => p.id === propertyId);
  const nights = nightsBetween(checkIn, checkOut);
  const autoTotal = property ? (Number(property.base_price) * nights).toFixed(2) : "";
  const total = totalOverride ?? autoTotal;

  const statusValues: ReservationStatus[] = reservation
    ? [reservation.status, ...TRANSITIONS[reservation.status]]
    : ["pending", "confirmed"];
  const statusOptions = RESERVATION_STATUS_OPTIONS.filter((o) => statusValues.includes(o.value));

  const propertyOptions = (properties.data ?? [])
    .filter((p) => p.is_active || p.id === reservation?.property)
    .map((p) => ({ value: p.id, label: p.name }));
  const guestOptions = (guests.data ?? []).map((g) => ({ value: g.id, label: guestName(g) }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!guestId) next.guest = "Select a guest";
    if (!propertyId) next.property = "Select a property";
    if (nights < 1) next.check_out = "Check-out must be after check-in";
    if (!total.trim()) next.total_price = "Total price is required";
    if (currency.trim().length !== 3) next.currency = "3-letter code (e.g. TRY)";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setSaving(true);
    const body = {
      guest: guestId,
      property: propertyId,
      check_in: checkIn,
      check_out: checkOut,
      adults: Number(adults),
      children: Number(children),
      total_price: total.trim(),
      currency: currency.trim().toUpperCase(),
      source,
      status,
      special_requests: requests,
    };
    try {
      if (reservation) await api.patch(`/reservations/${reservation.id}/`, body);
      else await api.post("/reservations/", body);
      onSaved();
      onCancel();
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors(fe);
      // Formda alanı olmayan hatalar (non_field_errors, 409, ağ hatası...) üstte gösterilir.
      const extra = Object.entries(fe).filter(([k]) => !FIELDS.includes(k));
      setFormError(
        Object.keys(fe).length === 0
          ? errorMessage(err)
          : extra.length
            ? extra.map(([, v]) => v).join(" ")
            : null,
      );
    } finally {
      setSaving(false);
    }
  };

  const loadError = guests.error ?? properties.error;
  const loading = guests.loading || properties.loading;

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{reservation ? "Edit reservation" : "Add reservation"}</DialogTitle>
        <DialogDescription>
          Availability, capacity and blocked dates are validated by the server.
        </DialogDescription>
      </DialogHeader>
      {loadError && (
        <ErrorBanner
          message={loadError}
          onRetry={() => {
            guests.reload();
            properties.reload();
          }}
        />
      )}
      {formError && <ErrorBanner message={formError} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Guest" value={guestId} onChange={setGuestId} placeholder={loading ? "Loading…" : "Select guest…"} error={errors.guest} options={guestOptions} />
        <SelectField label="Booking source" value={source} onChange={(v) => setSource(v as ReservationSource)} options={SOURCE_OPTIONS} error={errors.source} />
        <SelectField label="Property" value={propertyId} onChange={setPropertyId} placeholder={loading ? "Loading…" : "Select property…"} error={errors.property} options={propertyOptions} />
        <SelectField label="Status" value={status} onChange={(v) => setStatus(v as ReservationStatus)} options={statusOptions} error={errors.status} />
        <TextField label="Check-in" type="date" value={checkIn} onChange={setCheckIn} error={errors.check_in} />
        <TextField label="Check-out" type="date" value={checkOut} onChange={setCheckOut} error={errors.check_out} />
        <TextField label="Adults" type="number" value={adults} onChange={setAdults} error={errors.adults} />
        <TextField label="Children" type="number" value={children} onChange={setChildren} error={errors.children} />
        <TextField label="Total price" type="number" value={total} onChange={setTotalOverride} error={errors.total_price} />
        <TextField label="Currency" value={currency} onChange={setCurrency} error={errors.currency} placeholder="TRY" />
        <TextAreaField className="sm:col-span-2" label="Special requests" value={requests} onChange={setRequests} rows={2} />
      </div>
      <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm dark:bg-white/3">
        <span className="text-gray-500 dark:text-gray-400">
          {nights > 0 ? `${nights} nights` : "Select dates"}
          {property && ` × ${formatCurrency(property.base_price, currency.length === 3 ? currency.toUpperCase() : "TRY")}`}
        </span>
        <span className="text-base font-semibold text-gray-900 dark:text-white/90">
          {total ? formatCurrency(total, currency.length === 3 ? currency.toUpperCase() : "TRY") : "—"}
        </span>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : reservation ? "Save changes" : "Create reservation"}
        </Button>
      </DialogFooter>
    </form>
  );
}
