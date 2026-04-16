import { useEffect, useState } from "react";
import { format, isValid, parse, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function isoToDisplay(iso: string): string {
  if (!iso) return "";
  try {
    const d = parseISO(iso);
    return isValid(d) ? format(d, "dd/MM/yyyy") : "";
  } catch {
    return "";
  }
}

export function DatePicker({ value, onChange, placeholder = "dd/mm/yyyy", className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState(() => isoToDisplay(value));

  // Sync when external value changes (e.g. form reset)
  useEffect(() => {
    setInputText(isoToDisplay(value));
  }, [value]);

  const selected = (() => {
    if (!value) return undefined;
    try {
      const d = parseISO(value);
      return isValid(d) ? d : undefined;
    } catch {
      return undefined;
    }
  })();

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;

    // Strip non-digits and limit to 8 digits (ddmmyyyy)
    const digits = raw.replace(/\D/g, "").slice(0, 8);

    // Auto-format with slashes: dd/mm/yyyy
    let formatted = digits;
    if (digits.length > 2) formatted = digits.slice(0, 2) + "/" + digits.slice(2);
    if (digits.length > 4) formatted = formatted.slice(0, 5) + "/" + formatted.slice(5);

    setInputText(formatted);

    if (formatted === "") {
      onChange("");
      return;
    }

    if (digits.length === 8) {
      const parsed = parse(formatted, "dd/MM/yyyy", new Date());
      if (isValid(parsed)) {
        onChange(format(parsed, "yyyy-MM-dd"));
      }
    }
  }

  function handleCalendarSelect(date: Date | undefined) {
    if (date) {
      onChange(format(date, "yyyy-MM-dd"));
      setInputText(format(date, "dd/MM/yyyy"));
    } else {
      onChange("");
      setInputText("");
    }
    setOpen(false);
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Input
        value={inputText}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="flex-1 min-w-0"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 h-9 w-9">
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleCalendarSelect}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
