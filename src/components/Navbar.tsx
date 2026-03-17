import { useState } from "react";
import { Link } from "react-router-dom";
import { Moon, Sun, Search, Trash2, Menu } from "lucide-react";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/context/ThemeContext";
import { getRmItem, getFgItem, getVendor, deleteRmItem, deleteFgItem, deleteVendor, type SapItem, type Vendor } from "@/api/sapSync";
import { getTankItem, deleteTankItem, type TankItem } from "@/api/tank";

export default function Navbar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { theme, toggleTheme } = useTheme();

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [rmItem, setRmItem] = useState<SapItem | null>(null);
  const [fgItem, setFgItem] = useState<SapItem | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [tankItem, setTankItem] = useState<TankItem | null>(null);
  const [searchError, setSearchError] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleSearch() {
    const code = query.trim();
    if (!code) return;

    setSearching(true);
    setSearchError("");
    setRmItem(null);
    setFgItem(null);
    setVendor(null);
    setTankItem(null);

    const results = await Promise.allSettled([
      getRmItem(code),
      getFgItem(code),
      getVendor(code),
      getTankItem(code),
    ]);

    const foundRm = results[0].status === "fulfilled" ? results[0].value : null;
    const foundFg = results[1].status === "fulfilled" ? results[1].value : null;
    const foundVendor = results[2].status === "fulfilled" ? results[2].value : null;
    const foundTank = results[3].status === "fulfilled" ? results[3].value : null;

    if (!foundRm && !foundFg && !foundVendor && !foundTank) {
      let msg = "No item, vendor, or tank item found for this code";
      const firstErr = results[0].status === "rejected" ? results[0].reason : null;
      if (firstErr instanceof AxiosError && firstErr.response?.status !== 404) {
        msg = firstErr.response?.data?.detail ?? firstErr.message;
      }
      setSearchError(msg);
    }

    setRmItem(foundRm);
    setFgItem(foundFg);
    setVendor(foundVendor);
    setTankItem(foundTank);
    setModalOpen(true);
    setSearching(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSearch();
  }

  const hasAnyResult = rmItem || fgItem || vendor || tankItem;

  async function handleDeleteRmItem() {
    if (!rmItem) return;
    setDeleting(true);
    try {
      await deleteRmItem(rmItem.item_code);
      setRmItem(null);
      window.dispatchEvent(new Event("rm-items-updated"));
      if (!fgItem && !vendor && !tankItem) closeModal();
    } catch (err) {
      if (err instanceof AxiosError) {
        setSearchError(err.response?.data?.detail ?? err.message);
      } else {
        setSearchError("Failed to delete raw material item");
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteFgItem() {
    if (!fgItem) return;
    setDeleting(true);
    try {
      await deleteFgItem(fgItem.item_code);
      setFgItem(null);
      window.dispatchEvent(new Event("fg-items-updated"));
      if (!rmItem && !vendor && !tankItem) closeModal();
    } catch (err) {
      if (err instanceof AxiosError) {
        setSearchError(err.response?.data?.detail ?? err.message);
      } else {
        setSearchError("Failed to delete finished goods item");
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteVendor() {
    if (!vendor) return;
    setDeleting(true);
    try {
      await deleteVendor(vendor.card_code);
      setVendor(null);
      window.dispatchEvent(new Event("vendors-updated"));
      if (!rmItem && !fgItem && !tankItem) closeModal();
    } catch (err) {
      if (err instanceof AxiosError) {
        setSearchError(err.response?.data?.detail ?? err.message);
      } else {
        setSearchError("Failed to delete vendor");
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteTankItem() {
    if (!tankItem) return;
    setDeleting(true);
    try {
      await deleteTankItem(tankItem.tank_item_code);
      setTankItem(null);
      window.dispatchEvent(new Event("tank-items-updated"));
      if (!rmItem && !fgItem && !vendor) closeModal();
    } catch (err) {
      if (err instanceof AxiosError) {
        setSearchError(err.response?.data?.detail ?? err.message);
      } else {
        setSearchError("Failed to delete tank item");
      }
    } finally {
      setDeleting(false);
    }
  }

  function closeModal() {
    setModalOpen(false);
    setRmItem(null);
    setFgItem(null);
    setVendor(null);
    setTankItem(null);
    setSearchError("");
  }

  // Reusable item section renderer
  function renderItemSection(label: string, item: SapItem, onDelete: () => void) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
            disabled={deleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Item Code</p>
            <p className="font-medium">{item.item_code}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Item Name</p>
            <p className="font-medium">{item.item_name}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Category</p>
            <p className="font-medium">{item.category}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Brand</p>
            <p className="font-medium">{item.u_brand}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Variety</p>
            <p className="font-medium">{item.u_variety}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Unit</p>
            <p className="font-medium">{item.u_unit}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b glass-navbar shadow-sm">
        <div className="flex h-14 items-center justify-between px-3 sm:px-6">
          <div className="flex items-center gap-2">
            {onMenuToggle && (
              <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" onClick={onMenuToggle}>
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <Link to="/" className="text-base sm:text-lg font-bold tracking-wide">
              JIVO EXIM
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <div className="flex items-center gap-1">
              <Input
                placeholder="Search by code"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-32 sm:w-48 md:w-64 h-9"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={handleSearch}
                disabled={searching || !query.trim()}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Search Result Modal */}
      <Dialog open={modalOpen} onOpenChange={closeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Search Result</DialogTitle>
            <DialogDescription>Details for the searched code.</DialogDescription>
          </DialogHeader>

          {searchError && (
            <p className="text-sm text-destructive">{searchError}</p>
          )}

          {rmItem && renderItemSection("Raw Material", rmItem, handleDeleteRmItem)}

          {rmItem && (fgItem || vendor || tankItem) && <Separator />}

          {fgItem && renderItemSection("Finished Goods", fgItem, handleDeleteFgItem)}

          {fgItem && (vendor || tankItem) && <Separator />}

          {vendor && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Vendor
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleDeleteVendor}
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Vendor Code</p>
                  <p className="font-medium">{vendor.card_code}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Vendor Name</p>
                  <p className="font-medium">{vendor.card_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">State</p>
                  <p className="font-medium">{vendor.state}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Main Group</p>
                  <p className="font-medium">{vendor.u_main_group}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Country</p>
                  <p className="font-medium">{vendor.country}</p>
                </div>
              </div>
            </div>
          )}

          {(rmItem || fgItem || vendor) && tankItem && <Separator />}

          {tankItem && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Tank Item
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleDeleteTankItem}
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Item Code</p>
                  <p className="font-medium">{tankItem.tank_item_code}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Item Name</p>
                  <p className="font-medium">{tankItem.tank_item_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Color</p>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-4 w-4 rounded-full border border-border"
                      style={{ backgroundColor: tankItem.color }}
                    />
                    <p className="font-medium">{tankItem.color}</p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Active</p>
                  <p className="font-medium">{tankItem.is_active ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Created By</p>
                  <p className="font-medium">{tankItem.created_by}</p>
                </div>
              </div>
            </div>
          )}

          {!hasAnyResult && !searchError && (
            <p className="text-sm text-muted-foreground text-center py-4">No results found.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
