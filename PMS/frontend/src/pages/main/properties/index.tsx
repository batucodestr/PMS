import { PageMeta } from "@/components/shared/page-meta";
import { StatusBadge } from "@/components/shared/pms/badges";
import {
  Detail,
  EmptyState,
  ErrorBanner,
  FilterBar,
  FilterSelect,
  LoadingBlock,
  PageHeader,
  Panel,
  SearchBox,
  Th,
  tdClass,
  theadClass,
  trClass,
} from "@/components/shared/pms/ui-bits";
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
import { EyeIcon, LayoutGridIcon, ListIcon, MapIcon, PencilIcon, PlusIcon } from "@/icons";
import { api, errorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/pms/format";
import type { Property } from "@/lib/pms/types";
import { cn } from "@/utils";
import { useMemo, useState } from "react";
import { PropertyFormDialog } from "./property-form";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function PropertyImage({ property, className }: { property: Property; className?: string }) {
  const src = property.images[0]?.image;
  if (!src) {
    return (
      <div className={cn("flex items-center justify-center bg-gray-100 text-gray-400 dark:bg-gray-800", className)}>
        <MapIcon className="size-8" />
      </div>
    );
  }
  return <img src={src} alt={property.images[0]?.alt_text || property.name} className={cn("object-cover", className)} loading="lazy" />;
}

export default function PropertiesPage() {
  const { data, loading, error, reload } = useApiAll<Property>("/properties/", { ordering: "name" });
  const properties = useMemo(() => data ?? [], [data]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [viewing, setViewing] = useState<Property | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const cities = useMemo(() => [...new Set(properties.map((p) => p.city))].sort(), [properties]);

  const filtered = properties.filter((p) => {
    const q = search.trim().toLowerCase();
    return (
      (!q || [p.name, p.city, p.address, p.country].some((v) => v.toLowerCase().includes(q))) &&
      (!status || (status === "active") === p.is_active) &&
      (!city || p.city === city)
    );
  });

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (p: Property) => { setEditing(p); setFormOpen(true); };

  const remove = async (p: Property) => {
    if (!window.confirm(`Delete ${p.name}? This cannot be undone.`)) return;
    setActionError(null);
    try {
      await api.delete(`/properties/${p.id}/`);
      setViewing(null);
      reload();
    } catch (e) {
      setActionError(errorMessage(e)); // örn. 409: rezervasyonu olan mülk silinemez
    }
  };

  return (
    <>
      <PageMeta title="Properties | PMS Console" description="Manage properties" />
      <PageHeader
        title="Properties"
        description={data ? `${properties.length} properties in your portfolio` : "Manage properties"}
        actions={<Button onClick={openAdd}><PlusIcon /> Add property</Button>}
      />
      {actionError && <ErrorBanner className="mb-4" message={actionError} />}

      <Panel>
        <FilterBar>
          <SearchBox value={search} onChange={setSearch} placeholder="Search name, city, address…" />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} allLabel="All statuses" />
          <FilterSelect label="City" value={city} onChange={setCity} options={cities} allLabel="All cities" />
          <div className="ms-auto inline-flex rounded-[10px] border border-gray-300 p-0.5 dark:border-gray-700" role="group" aria-label="View mode">
            {([["cards", LayoutGridIcon, "Card view"], ["table", ListIcon, "Table view"]] as const).map(([key, Icon, label]) => (
              <button
                key={key}
                type="button"
                aria-label={label}
                aria-pressed={view === key}
                onClick={() => setView(key)}
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg text-gray-500 transition-colors",
                  view === key && "bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400",
                )}
              >
                <Icon className="size-4.5" />
              </button>
            ))}
          </div>
        </FilterBar>

        {error ? (
          <div className="p-4"><ErrorBanner message={error} onRetry={reload} /></div>
        ) : !data && loading ? (
          <LoadingBlock label="Loading properties…" />
        ) : filtered.length === 0 ? (
          <EmptyState title="No properties found" />
        ) : view === "cards" ? (
          <div className={cn("grid grid-cols-1 gap-5 p-4 transition-opacity sm:grid-cols-2 sm:p-5 xl:grid-cols-3", loading && "opacity-60")}>
            {filtered.map((p) => (
              <article key={p.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-theme-md dark:border-gray-800 dark:bg-white/3">
                <div className="relative h-40 bg-gray-100 dark:bg-gray-800">
                  <PropertyImage property={p} className="size-full" />
                  <span className="absolute inset-s-3 top-3"><StatusBadge status={p.is_active ? "active" : "inactive"} className="bg-white/95! dark:bg-gray-900/90!" /></span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white/90">{p.name}</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{p.city}, {p.country}</p>
                  <div className="mt-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>{p.max_guests} guests · {p.bedroom_count} bd</span>
                    <span className="font-medium text-gray-900 dark:text-white/90">{formatCurrency(p.base_price)}<span className="font-normal text-gray-500"> / night</span></span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="xs" className="flex-1" onClick={() => setViewing(p)}><EyeIcon className="size-4" /> View</Button>
                    <Button variant="outline" size="xs" className="flex-1" onClick={() => openEdit(p)}><PencilIcon className="size-4" /> Edit</Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={cn("custom-scrollbar overflow-x-auto transition-opacity", loading && "opacity-60")}>
            <table className="min-w-full">
              <thead className={theadClass}>
                <tr><Th>Property</Th><Th>Location</Th><Th>Capacity</Th><Th>Base price</Th><Th>Status</Th><Th className="text-end">Actions</Th></tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className={trClass}>
                    <td className={tdClass}>
                      <div className="flex items-center gap-3">
                        <PropertyImage property={p} className="size-10 rounded-lg" />
                        <span className="font-medium text-gray-900 dark:text-white/90">{p.name}</span>
                      </div>
                    </td>
                    <td className={tdClass}>{p.city}, {p.country}</td>
                    <td className={tdClass}>{p.max_guests} guests · {p.bedroom_count} bd · {p.bathroom_count} ba</td>
                    <td className={cn(tdClass, "whitespace-nowrap")}>{formatCurrency(p.base_price)}</td>
                    <td className={tdClass}><StatusBadge status={p.is_active ? "active" : "inactive"} /></td>
                    <td className={cn(tdClass, "text-end")}>
                      <div className="inline-flex gap-1">
                        <Button variant="ghost" size="icon-xs" aria-label={`View ${p.name}`} onClick={() => setViewing(p)}><EyeIcon className="size-4" /></Button>
                        <Button variant="ghost" size="icon-xs" aria-label={`Edit ${p.name}`} onClick={() => openEdit(p)}><PencilIcon className="size-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <PropertyFormDialog open={formOpen} property={editing} onOpenChange={setFormOpen} onSaved={reload} />

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>{viewing.name}</DialogTitle>
                <DialogDescription>{viewing.city}, {viewing.country}</DialogDescription>
              </DialogHeader>
              <PropertyImage property={viewing} className="h-44 w-full rounded-xl" />
              <p className="text-sm text-gray-600 dark:text-gray-400">{viewing.description || "No description."}</p>
              <dl className="grid grid-cols-2 gap-4">
                <Detail label="Address">{viewing.address}{viewing.postal_code && `, ${viewing.postal_code}`}</Detail>
                <Detail label="Status"><StatusBadge status={viewing.is_active ? "active" : "inactive"} /></Detail>
                <Detail label="Phone">{viewing.phone}</Detail>
                <Detail label="Email">{viewing.email}</Detail>
                <Detail label="Base price">{formatCurrency(viewing.base_price)} / night</Detail>
                <Detail label="Max guests">{viewing.max_guests}</Detail>
                <Detail label="Bedrooms / beds / baths">{viewing.bedroom_count} / {viewing.bed_count} / {viewing.bathroom_count}</Detail>
                <Detail label="Area">{viewing.area} m²</Detail>
              </dl>
              <DialogFooter>
                <Button variant="outline" onClick={() => remove(viewing)}>Delete</Button>
                <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
                <Button onClick={() => { openEdit(viewing); setViewing(null); }}>Edit property</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
