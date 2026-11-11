import { format, parseISO, differenceInCalendarDays } from "date-fns";

/** value API'den string ("120.00") ya da number gelebilir. */
export const formatCurrency = (value: number | string, currency = "TRY") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value));

export const formatDate = (iso: string) => format(parseISO(iso), "dd MMM yyyy");
export const formatDateShort = (iso: string) => format(parseISO(iso), "dd MMM");
export const formatDateTime = (iso: string) =>
  format(parseISO(iso), "dd MMM yyyy, HH:mm");
export const nightsBetween = (checkIn: string, checkOut: string) =>
  Math.max(0, differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn)));
export const toISODate = (d: Date) => format(d, "yyyy-MM-dd");
export const todayISO = () => toISODate(new Date());
/** "14:00:00" -> "14:00" */
export const formatTime = (time?: string | null) => (time ?? "").slice(0, 5);
