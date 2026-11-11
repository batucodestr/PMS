import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils";
import { useId, type ReactNode } from "react";

export function FormField({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </Label>
      {children(id)}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

/** Tarih alanına tıklayınca takvimi aç. */
const openPicker = (e: React.MouseEvent<HTMLInputElement>) => {
  try {
    e.currentTarget.showPicker?.();
  } catch {
    /* showPicker desteklenmiyor */
  }
};

export function TextField({
  label,
  value,
  onChange,
  error,
  className,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  error?: string;
  className?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <FormField label={label} error={error} className={className}>
      {(id) => (
        <Input
          id={id}
          type={type}
          value={value}
          required={required}
          placeholder={placeholder}
          aria-invalid={!!error}
          onClick={type === "date" ? openPicker : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </FormField>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  className,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  rows?: number;
}) {
  return (
    <FormField label={label} className={className}>
      {(id) => (
        <Textarea
          id={id}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </FormField>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  className,
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[] | string[];
  className?: string;
  error?: string;
  placeholder?: string;
}) {
  const opts = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  return (
    <FormField label={label} className={className} error={error}>
      {(id) => (
        <select
          id={id}
          value={value}
          aria-invalid={!!error}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full rounded-[10px] border border-gray-300 bg-white px-3 text-sm text-gray-800 shadow-theme-xs outline-hidden focus:border-brand-300 focus:ring-3 focus:ring-brand-500/20 aria-invalid:border-red-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </FormField>
  );
}
