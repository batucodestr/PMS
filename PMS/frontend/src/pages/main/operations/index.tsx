import { PageMeta } from "@/components/shared/page-meta";
import { StatusBadge } from "@/components/shared/pms/badges";
import {
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  PageHeader,
  Panel,
  Th,
  tdClass,
  theadClass,
  trClass,
} from "@/components/shared/pms/ui-bits";
import { Button } from "@/components/ui/button";
import { useApiAll } from "@/hooks/use-api";
import { api, errorMessage } from "@/lib/api";
import { todayISO } from "@/lib/pms/format";
import { guestName } from "@/lib/pms/labels";
import type { Guest, Property, Reservation } from "@/lib/pms/types";
import { cn } from "@/utils";
import { useMemo, useState } from "react";

const isLive = (r: Reservation) => r.status !== "cancelled" && r.status !== "no_show";

export default function OperationsPage() {
  // todayISO sayfa açıkken sabit kalsın diye bir kez hesaplanır.
  const [today] = useState(todayISO);
  const arrivalsQ = useApiAll<Reservation>("/reservations/", { check_in: today, ordering: "check_in" });
  const departuresQ = useApiAll<Reservation>("/reservations/", { check_out: today, ordering: "check_out" });
  const guests = useApiAll<Guest>("/guests/");
  const properties = useApiAll<Property>("/properties/");

  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const guestById = useMemo(() => new Map((guests.data ?? []).map((g) => [g.id, g])), [guests.data]);
  const propertyById = useMemo(() => new Map((properties.data ?? []).map((p) => [p.id, p])), [properties.data]);

  const arrivals = (arrivalsQ.data ?? []).filter(isLive);
  const departures = (departuresQ.data ?? []).filter(isLive);

  const act = async (r: Reservation, action: "check-in" | "check-out") => {
    setBusyId(r.id);
    setActionError(null);
    try {
      await api.post(`/reservations/${r.id}/${action}/`);
      arrivalsQ.reload();
      departuresQ.reload();
    } catch (e) {
      // Örn. 409: "This reservation has already checked in."
      setActionError(`${guestName(guestById.get(r.guest))}: ${errorMessage(e)}`);
    } finally {
      setBusyId(null);
    }
  };

  const loadError = arrivalsQ.error ?? departuresQ.error ?? guests.error ?? properties.error;

  return (
    <>
      <PageMeta title="Check-in / Check-out | PMS Console" description="Daily arrivals and departures" />
      <PageHeader title="Check-in / Check-out" description="Arrivals and departures for today." />

      {actionError && <ErrorBanner className="mb-4" message={actionError} />}
      {loadError && (
        <ErrorBanner
          className="mb-4"
          message={loadError}
          onRetry={() => { arrivalsQ.reload(); departuresQ.reload(); guests.reload(); properties.reload(); }}
        />
      )}

      <div className="space-y-6">
        <Panel title={`Today's Check-ins (${arrivals.length})`}>
          {!arrivalsQ.data ? (
            <LoadingBlock />
          ) : arrivals.length === 0 ? (
            <EmptyState title="No arrivals today" description="" />
          ) : (
            <div className="custom-scrollbar overflow-x-auto">
              <table className="min-w-full">
                <thead className={theadClass}><tr><Th>Guest</Th><Th>Property</Th><Th>Guests</Th><Th>Contact</Th><Th>Status</Th><Th className="text-end">Action</Th></tr></thead>
                <tbody>
                  {arrivals.map((r) => {
                    const guest = guestById.get(r.guest);
                    return (
                      <tr key={r.id} className={trClass}>
                        <td className={cn(tdClass, "font-medium text-gray-900 dark:text-white/90")}>{guestName(guest)}</td>
                        <td className={tdClass}>{propertyById.get(r.property)?.name ?? "—"}</td>
                        <td className={tdClass}>{r.adults + r.children}</td>
                        <td className={cn(tdClass, "whitespace-nowrap")}>{guest?.phone ?? "—"}</td>
                        <td className={tdClass}><StatusBadge status={r.status} /></td>
                        <td className={cn(tdClass, "text-end")}>
                          {r.status === "completed" ? (
                            <StatusBadge status="completed" />
                          ) : (
                            <Button
                              size="xs"
                              disabled={busyId === r.id || r.status !== "confirmed"}
                              title={r.status !== "confirmed" ? "Confirm the reservation first" : undefined}
                              onClick={() => act(r, "check-in")}
                            >
                              Check in
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title={`Today's Check-outs (${departures.length})`}>
          {!departuresQ.data ? (
            <LoadingBlock />
          ) : departures.length === 0 ? (
            <EmptyState title="No departures today" description="" />
          ) : (
            <div className="custom-scrollbar overflow-x-auto">
              <table className="min-w-full">
                <thead className={theadClass}><tr><Th>Guest</Th><Th>Property</Th><Th>Contact</Th><Th>Status</Th><Th className="text-end">Action</Th></tr></thead>
                <tbody>
                  {departures.map((r) => {
                    const guest = guestById.get(r.guest);
                    const departed = r.status === "completed";
                    return (
                      <tr key={r.id} className={trClass}>
                        <td className={cn(tdClass, "font-medium text-gray-900 dark:text-white/90")}>{guestName(guest)}</td>
                        <td className={tdClass}>{propertyById.get(r.property)?.name ?? "—"}</td>
                        <td className={cn(tdClass, "whitespace-nowrap")}>{guest?.phone ?? "—"}</td>
                        <td className={tdClass}>{departed ? <StatusBadge status="completed" /> : <StatusBadge status={r.status} />}</td>
                        <td className={cn(tdClass, "text-end")}>
                          {departed ? (
                            <span className="text-sm text-gray-500">Departed</span>
                          ) : (
                            <Button
                              size="xs"
                              disabled={busyId === r.id || r.status !== "confirmed"}
                              title={r.status !== "confirmed" ? "Only confirmed reservations can check out" : undefined}
                              onClick={() => act(r, "check-out")}
                            >
                              Check out
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
