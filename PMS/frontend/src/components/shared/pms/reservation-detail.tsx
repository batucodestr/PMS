import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { api, errorMessage } from "@/lib/api";
import { formatCurrency, formatDate, nightsBetween } from "@/lib/pms/format";
import { guestName } from "@/lib/pms/labels";
import type { Guest, Property, Reservation, ReservationStatus } from "@/lib/pms/types";
import { useCallback, useEffect, useState } from "react";
import { ChannelBadge, StatusBadge } from "./badges";
import { Detail, ErrorBanner, LoadingBlock } from "./ui-bits";

interface Loaded {
  reservation: Reservation;
  guest: Guest | null;
  property: Property | null;
}

type Result = { key: string; data?: Loaded; error?: string };

export function ReservationDetail({
  reservationId,
  onClose,
  onChanged,
  onEdit,
}: {
  reservationId: string | null;
  onClose: () => void;
  onChanged?: () => void;
  onEdit?: (reservation: Reservation) => void;
}) {
  return (
    <Sheet open={!!reservationId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        {reservationId && (
          <DetailBody
            key={reservationId}
            reservationId={reservationId}
            onClose={onClose}
            onChanged={onChanged}
            onEdit={onEdit}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function DetailBody({
  reservationId,
  onClose,
  onChanged,
  onEdit,
}: {
  reservationId: string;
  onClose: () => void;
  onChanged?: () => void;
  onEdit?: (reservation: Reservation) => void;
}) {
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const requestKey = `${reservationId}#${tick}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const reservation = await api.get<Reservation>(`/reservations/${reservationId}/`);
      const [guest, property] = await Promise.all([
        api.get<Guest>(`/guests/${reservation.guest}/`).catch(() => null),
        api.get<Property>(`/properties/${reservation.property}/`).catch(() => null),
      ]);
      return { reservation, guest, property };
    })()
      .then((data) => !cancelled && setResult({ key: requestKey, data }))
      .catch((e: unknown) => !cancelled && setResult({ key: requestKey, error: errorMessage(e) }));
    return () => {
      cancelled = true;
    };
  }, [reservationId, requestKey]);

  const run = useCallback(
    async (action: () => Promise<unknown>, after?: "closed") => {
      setBusy(true);
      setActionError(null);
      try {
        await action();
        onChanged?.();
        if (after === "closed") onClose();
        else setTick((t) => t + 1);
      } catch (e) {
        setActionError(errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [onChanged, onClose],
  );

  const current = result?.key === requestKey ? result : null;
  const loaded = result?.data ?? null; // yenileme sırasında eski veri görünür kalır

  if (!loaded) {
    return (
      <>
        <SheetHeader>
          <SheetTitle>Reservation</SheetTitle>
          <SheetDescription>{current?.error ? "Could not load" : "Loading…"}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 px-6">
          {current?.error ? (
            <ErrorBanner message={current.error} onRetry={() => setTick((t) => t + 1)} />
          ) : (
            <LoadingBlock />
          )}
        </div>
      </>
    );
  }

  const { reservation: r, guest, property } = loaded;
  const nights = nightsBetween(r.check_in, r.check_out);
  const patchStatus = (status: ReservationStatus) =>
    run(() => api.patch(`/reservations/${r.id}/`, { status }));
  const post = (action: "check-in" | "check-out") =>
    run(() => api.post(`/reservations/${r.id}/${action}/`));
  const remove = () => {
    if (!window.confirm("Delete this reservation permanently?")) return;
    void run(() => api.delete(`/reservations/${r.id}/`), "closed");
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle className="font-mono text-base">{r.id.slice(0, 8)}</SheetTitle>
        <SheetDescription>{property?.name ?? "—"}</SheetDescription>
      </SheetHeader>
      <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-4">
        {actionError && <ErrorBanner message={actionError} />}
        {current?.error && <ErrorBanner message={current.error} onRetry={() => setTick((t) => t + 1)} />}
        <div className="flex items-center gap-3">
          <StatusBadge status={r.status} />
          <ChannelBadge source={r.source} />
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
          <Detail label="Guest">{guestName(guest)}</Detail>
          <Detail label="Contact">{guest?.phone}</Detail>
          <Detail label="Check-in">{formatDate(r.check_in)}</Detail>
          <Detail label="Check-out">{formatDate(r.check_out)}</Detail>
          <Detail label="Nights">{nights}</Detail>
          <Detail label="Guests">
            {r.adults} adults{r.children ? `, ${r.children} children` : ""}
          </Detail>
          <Detail label="Total price">{formatCurrency(r.total_price, r.currency)}</Detail>
          <Detail label="Avg. nightly">
            {nights ? formatCurrency(Number(r.total_price) / nights, r.currency) : "—"}
          </Detail>
        </dl>
        <Detail label="Special requests">{r.special_requests}</Detail>
      </div>
      <SheetFooter className="flex-row flex-wrap justify-end gap-2 border-t border-gray-100 dark:border-gray-800">
        <Button variant="outline" disabled={busy} onClick={remove}>
          Delete
        </Button>
        {onEdit && (
          <Button variant="outline" disabled={busy} onClick={() => onEdit(r)}>
            Edit
          </Button>
        )}
        {(r.status === "pending" || r.status === "confirmed") && (
          <Button variant="outline" disabled={busy} onClick={() => patchStatus("cancelled")}>
            Cancel reservation
          </Button>
        )}
        {r.status === "confirmed" && (
          <Button variant="outline" disabled={busy} onClick={() => patchStatus("no_show")}>
            No-show
          </Button>
        )}
        {r.status === "pending" && (
          <Button disabled={busy} onClick={() => patchStatus("confirmed")}>
            Confirm reservation
          </Button>
        )}
        {r.status === "confirmed" && (
          <>
            <Button variant="outline" disabled={busy} onClick={() => post("check-in")}>
              Check in
            </Button>
            <Button disabled={busy} onClick={() => post("check-out")}>
              Check out
            </Button>
          </>
        )}
      </SheetFooter>
    </>
  );
}
