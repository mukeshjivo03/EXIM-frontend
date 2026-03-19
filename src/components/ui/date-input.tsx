import * as React from "react";
import { cn } from "@/lib/utils";

/** Convert yyyy-mm-dd → dd/mm/yyyy for display */
function toDisplay(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** Convert dd/mm/yyyy → yyyy-mm-dd for storage */
function toISO(display: string): string {
  const parts = display.split("/");
  if (parts.length !== 3) return "";
  const [d, m, y] = parts;
  if (!d || !m || !y || y.length !== 4) return "";
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "value"> {
  /** Value in yyyy-mm-dd (ISO) format */
  value: string;
  /** Called with yyyy-mm-dd string */
  onChange: (e: { target: { value: string } }) => void;
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const [display, setDisplay] = React.useState(() => toDisplay(value));

    // Sync display when external value changes
    React.useEffect(() => {
      setDisplay(toDisplay(value));
    }, [value]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      let raw = e.target.value.replace(/[^\d/]/g, "");

      // Auto-insert slashes
      const digits = raw.replace(/\//g, "");
      if (digits.length >= 2 && !raw.includes("/")) {
        raw = digits.slice(0, 2) + "/" + digits.slice(2);
      }
      if (digits.length >= 4) {
        raw = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4, 8);
      }

      setDisplay(raw);

      // Only emit if we have a valid full date
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
        const iso = toISO(raw);
        if (iso) onChange({ target: { value: iso } });
      } else if (raw === "") {
        onChange({ target: { value: "" } });
      }
    }

    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/yyyy"
        maxLength={10}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        value={display}
        onChange={handleChange}
        {...props}
      />
    );
  }
);
DateInput.displayName = "DateInput";

export { DateInput };
