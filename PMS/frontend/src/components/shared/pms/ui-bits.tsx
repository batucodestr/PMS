import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpDownIcon,
  InboxIcon,
  SearchIcon,
} from "@/icons";
import { cn } from "@/utils";
import type { ReactNode, SelectHTMLAttributes } from "react";

/** Page title row with optional description + primary actions. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-title-sm font-semibold text-gray-900 sm:text-title-md dark:text-white/90">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Card size="sm" className="gap-3 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {label}
        </span>
        {icon && (
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400 [&_svg]:size-5">
            {icon}
          </span>
        )}
      </div>
      <div className="text-title-sm font-semibold text-gray-900 dark:text-white/90">
        {value}
      </div>
      {hint && (
        <div className="text-xs text-gray-500 dark:text-gray-400">{hint}</div>
      )}
    </Card>
  );
}

const controlClass =
  "h-10 rounded-[10px] border border-gray-300 bg-white px-3 text-sm text-gray-700 shadow-theme-xs outline-hidden transition-colors focus:border-brand-300 focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-brand-500/40";

export function SearchBox({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full sm:w-72", className)}>
      <SearchIcon className="pointer-events-none absolute inset-s-3 top-1/2 size-4.5 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(controlClass, "w-full ps-10 placeholder:text-gray-400")}
      />
    </div>
  );
}

/** Native <select> styled to match the Input primitive – used for filters. */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
  className,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[] | string[];
  allLabel?: string;
  className?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value">) {
  const opts = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(controlClass, "w-full sm:w-auto", className)}
      {...rest}
    >
      {allLabel !== undefined && <option value="">{allLabel}</option>}
      {opts.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function DateFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="date"
      aria-label={label}
      title={label}
      value={value}
      onClick={(e) => {
        try {
          e.currentTarget.showPicker?.();
        } catch {
          /* desteklenmiyor */
        }
      }}
      onChange={(e) => onChange(e.target.value)}
      className={cn(controlClass, "w-full sm:w-auto")}
    />
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:flex-wrap sm:items-center dark:border-gray-800">
      {children}
    </div>
  );
}

/** Sortable <th> button. */
export function SortHead({
  label,
  sortKey,
  active,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: string;
  active: boolean;
  dir: "asc" | "desc";
  onSort: (key: string) => void;
  className?: string;
}) {
  const Icon = !active ? ChevronUpDownIcon : dir === "asc" ? ArrowUpIcon : ArrowDownIcon;
  return (
    <th
      scope="col"
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn("px-4 py-3 text-start", className)}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 text-xs font-medium tracking-wide text-gray-500 uppercase hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
      >
        {label}
        <Icon className={cn("size-3.5", !active && "opacity-50")} />
      </button>
    </th>
  );
}

export function Th({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-3 text-start text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400",
        className,
      )}
    >
      {children}
    </th>
  );
}

export const tdClass = "px-4 py-3.5 text-sm text-gray-700 dark:text-gray-300";
export const trClass =
  "border-t border-gray-100 transition-colors hover:bg-gray-50/70 dark:border-gray-800 dark:hover:bg-white/2";
export const theadClass = "bg-gray-50/70 dark:bg-white/3";

export function TablePager({
  page,
  pageCount,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row dark:border-gray-800">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Showing <span className="font-medium text-gray-800 dark:text-white/90">{from}–{to}</span> of{" "}
        <span className="font-medium text-gray-800 dark:text-white/90">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeftIcon className="size-4 rtl:rotate-180" />
        </Button>
        <span className="min-w-16 text-center text-sm text-gray-600 dark:text-gray-400">
          {page} / {Math.max(pageCount, 1)}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Next page"
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRightIcon className="size-4 rtl:rotate-180" />
        </Button>
      </div>
    </div>
  );
}

export function EmptyState({
  title = "Nothing to show",
  description = "Try adjusting your search or filters.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-white/5">
        <InboxIcon className="size-6" />
      </span>
      <p className="font-medium text-gray-800 dark:text-white/90">{title}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card className={cn("gap-0 p-0 sm:p-0", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-gray-900 dark:text-white/90">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {description}
              </p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </Card>
  );
}

/** Label/value pair used in detail drawers. */
export function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs tracking-wide text-gray-500 uppercase dark:text-gray-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-gray-800 dark:text-white/90">
        {children || "—"}
      </dd>
    </div>
  );
}

/** Yükleme göstergesi (liste/sayfa içeriği beklerken). */
export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-gray-500 dark:text-gray-400">
      <Spinner />
      {label}
    </div>
  );
}

/** API hatası kutusu; onRetry verilirse "Retry" butonu çıkar. */
export function ErrorBanner({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
        className,
      )}
    >
      <span>{message}</span>
      {onRetry && (
        <Button variant="outline" size="xs" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
