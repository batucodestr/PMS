import type { Guest, ReservationSource, ReservationStatus, TaskStatus } from "./types";

/** API durum kodu -> ekranda görünen yazı. */
export const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
  no_show: "No show",
  in_progress: "In progress",
  active: "Active",
  inactive: "Inactive",
};

type Option<T extends string> = { value: T; label: string };

export const RESERVATION_STATUS_OPTIONS: Option<ReservationStatus>[] = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "completed", label: "Completed" },
  { value: "no_show", label: "No show" },
];

export const SOURCE_LABELS: Record<ReservationSource, string> = {
  direct: "Direct",
  airbnb: "Airbnb",
  booking: "Booking.com",
  other: "Other",
};

export const SOURCE_OPTIONS: Option<ReservationSource>[] = (
  Object.keys(SOURCE_LABELS) as ReservationSource[]
).map((value) => ({ value, label: SOURCE_LABELS[value] }));

export const TASK_STATUS_OPTIONS: Option<TaskStatus>[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

export const guestName = (
  guest?: Pick<Guest, "first_name" | "last_name"> | null,
) => (guest ? `${guest.first_name} ${guest.last_name}`.trim() : "—");
