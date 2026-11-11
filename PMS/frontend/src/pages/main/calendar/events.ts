import type { Reservation, ReservationSource, ReservationStatus } from "@/lib/pms/types";

export interface ReservationEvent {
  id: string;
  title: string;
  start: string;
  end: string; // exclusive check-out date
  allDay: true;
  extendedProps: {
    reservationId: string;
    source: ReservationSource;
    status: ReservationStatus;
    propertyName: string;
  };
}

/** Rezervasyonları FullCalendar event'lerine çevirir (cancelled / no-show gösterilmez). */
export function toCalendarEvents(
  reservations: Reservation[],
  guestLabel: (guestId: string) => string,
  propertyName: (propertyId: string) => string,
): ReservationEvent[] {
  return reservations
    .filter((r) => r.status !== "cancelled" && r.status !== "no_show")
    .map((r) => ({
      id: r.id,
      title: guestLabel(r.guest),
      start: r.check_in,
      end: r.check_out,
      allDay: true,
      extendedProps: {
        reservationId: r.id,
        source: r.source,
        status: r.status,
        propertyName: propertyName(r.property),
      },
    }));
}
