import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const COLOR_PALETTE = [
  { name: "Crimson", hex: "#db3344" },
  { name: "Gold", hex: "#f8b90d" },
  { name: "Magenta", hex: "#db33ae" },
  { name: "Burnt Orange", hex: "#d95c26" },
  { name: "Peach", hex: "#e8a27d" },
  { name: "Tangerine", hex: "#db7633" },
  { name: "Salmon", hex: "#e98b8b" },
  { name: "Dark Red", hex: "#b01d03" },
  { name: "Mint", hex: "#59f37f" },
  { name: "Green", hex: "#17ee30" },
  { name: "Lime", hex: "#68f50a" },
  { name: "Sky Blue", hex: "#56b6f5" },
  { name: "Dodger Blue", hex: "#2198e8" },
  { name: "Steel Blue", hex: "#3498db" },
  { name: "Navy", hex: "#014f84" },
  { name: "Olive", hex: "#6c730d" },
  { name: "Turquoise", hex: "#19d7f0" },
  { name: "Snow", hex: "#f9fafa" },
  { name: "Maroon", hex: "#653439" },
  { name: "Aquamarine", hex: "#10e0c8" },
  { name: "Teal", hex: "#0a8999" },
  { name: "Indigo", hex: "#3e33db" },
  { name: "Midnight", hex: "#020969" },
  { name: "Yellow Green", hex: "#8e980b" },
  { name: "Forest Green", hex: "#228b22" },
  { name: "Grey", hex: "#9e9e9e" },
];

const COLOR_GROUPS: { label: string; colors: string[] }[] = [
  {
    label: "Reds & Pinks",
    colors: ["Crimson", "Dark Red", "Salmon", "Maroon", "Magenta", "Peach"],
  },
  {
    label: "Oranges & Yellows",
    colors: ["Burnt Orange", "Tangerine", "Gold"],
  },
  {
    label: "Greens",
    colors: ["Mint", "Green", "Lime", "Forest Green", "Yellow Green", "Olive"],
  },
  {
    label: "Blues",
    colors: ["Sky Blue", "Dodger Blue", "Steel Blue", "Navy", "Midnight", "Indigo"],
  },
  {
    label: "Teals & Cyans",
    colors: ["Turquoise", "Aquamarine", "Teal"],
  },
  {
    label: "Neutrals",
    colors: ["Snow", "Grey"],
  },
];

export function findPaletteColor(
  color: string,
  extras: { name: string; hex: string }[] = []
): string {
  const all = [...COLOR_PALETTE, ...extras];
  const match = all.find(
    (c) =>
      c.hex.toLowerCase() === color.toLowerCase() ||
      c.name.toLowerCase() === color.toLowerCase()
  );
  return match?.hex ?? "";
}

export function getColorName(
  color: string,
  extras: { name: string; hex: string }[] = []
): string {
  const all = [...COLOR_PALETTE, ...extras];
  const match = all.find(
    (c) =>
      c.hex.toLowerCase() === color.toLowerCase() ||
      c.name.toLowerCase() === color.toLowerCase()
  );
  return match?.name ?? color;
}

interface ColorPickerProps {
  selectedColor: string;
  onSelect: (hex: string) => void;
  customColors: { name: string; hex: string }[];
  onAddCustomColor: (color: { name: string; hex: string }) => void;
  onDeleteCustomColor: (hex: string) => void;
  compact?: boolean;
}

export function ColorPicker({
  selectedColor,
  onSelect,
  customColors,
  onAddCustomColor,
  onDeleteCustomColor,
  compact = false,
}: ColorPickerProps) {
  const [newColorHex, setNewColorHex] = useState("#000000");

  function handleAddColor() {
    const hex = newColorHex.toLowerCase();
    const allColors = [...COLOR_PALETTE, ...customColors];
    if (allColors.some((c) => c.hex.toLowerCase() === hex)) {
      toast.error("This color already exists in the palette.");
      return;
    }
    onAddCustomColor({ name: hex, hex });
    onSelect(hex);
    setNewColorHex("#000000");
    toast.success("Color added.");
  }

  function renderSwatch(color: { name: string; hex: string }, isCustom: boolean) {
    const size = compact ? "h-6 w-6" : "h-8 w-8";
    const checkSize = compact ? "h-3 w-3" : "h-4 w-4";
    return (
      <div key={color.hex} className="relative group">
        <button
          type="button"
          title={color.name}
          className={`relative ${size} rounded-full border-2 transition-all cursor-pointer hover:scale-110`}
          style={{
            backgroundColor: color.hex,
            borderColor:
              selectedColor === color.hex ? "var(--foreground)" : "transparent",
          }}
          onClick={() => onSelect(color.hex)}
        >
          {selectedColor === color.hex && (
            <Check
              className={`absolute inset-0 m-auto ${checkSize} text-white drop-shadow-md`}
            />
          )}
        </button>
        {isCustom && (
          <button
            type="button"
            className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onDeleteCustomColor(color.hex)}
            title="Remove color"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Color *</Label>

      {/* Grouped palette */}
      <div className="space-y-2">
        {COLOR_GROUPS.map((group) => {
          const groupColors = group.colors
            .map((name) => COLOR_PALETTE.find((c) => c.name === name))
            .filter(Boolean) as { name: string; hex: string }[];
          if (groupColors.length === 0) return null;
          return (
            <div key={group.label}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {groupColors.map((c) => renderSwatch(c, false))}
              </div>
            </div>
          );
        })}

        {/* Custom colors */}
        {customColors.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Custom
            </p>
            <div className="flex flex-wrap gap-1.5">
              {customColors.map((c) => renderSwatch(c, true))}
            </div>
          </div>
        )}
      </div>

      {selectedColor && (
        <p className="text-xs text-muted-foreground">
          Selected:{" "}
          {[...COLOR_PALETTE, ...customColors].find(
            (c) => c.hex === selectedColor
          )?.name}
        </p>
      )}

      {/* Add custom color */}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="color"
          value={newColorHex}
          onChange={(e) => setNewColorHex(e.target.value)}
          className="h-8 w-8 rounded cursor-pointer border border-border bg-transparent p-0"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={handleAddColor}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Color
        </Button>
      </div>
    </div>
  );
}
