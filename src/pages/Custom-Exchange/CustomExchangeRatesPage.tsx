import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Download,
  PackageOpen,
  RefreshCw,
  Search,
  Calculator,
  ArrowRightLeft,
  DollarSign,
  Euro,
  PoundSterling,
  Globe,
} from "lucide-react";
import * as XLSX from "xlsx";
import { format, isValid, parseISO } from "date-fns";

import { fetchExternalExchangeRates, fetchEximRates, type EximRate } from "@/api/customRates";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

/* ── Types & Helpers ───────────────────────────────────────── */

const ALLOWED_CURRENCIES = [
  "U.S.Dollar",
  "Euro",
  "UAE Dirham",
  "Australian Dollar",
  "Canadian Dollar",
  "Sterling Pound",
];

const ITEMS_DATA = [
  { label: "CDRO", value: "cdro", expense: 22.5 },
  { label: "Cold Press", value: "cold press", expense: 22.5 },
  { label: "Cold Press W/R", value: "cold press w/r", expense: 19 },
  { label: "Cold Press W/O/R", value: "cold press w/o/r", expense: 17 },
  { label: "Pomace", value: "pomace", expense: 48.5 },
  { label: "Extra Virgin", value: "extravirgin", expense: 52 },
  { label: "Extra Light", value: "extra light", expense: 39.5 },
];

const ORIGINS = ["Spain", "UAE", "Australia"];

const CURRENCY_MAP: Record<string, { flag: string; icon: any; color: string; code: string; short: string }> = {
  "U.S.Dollar": { flag: "https://flagcdn.com/w40/us.png", icon: DollarSign, color: "text-blue-600 dark:text-blue-400", code: "USD", short: "USD" },
  "Australian Dollar": { flag: "https://flagcdn.com/w40/au.png", icon: DollarSign, color: "text-amber-600 dark:text-amber-400", code: "AUD", short: "AUD" },
  "Euro": { flag: "https://flagcdn.com/w40/eu.png", icon: Euro, color: "text-indigo-600 dark:text-indigo-400", code: "EUR", short: "EUR" },
  "UAE Dirham": { flag: "https://flagcdn.com/w40/ae.png", icon: Globe, color: "text-emerald-600 dark:text-emerald-400", code: "AED", short: "AED" },
  "Sterling Pound": { flag: "https://flagcdn.com/w40/gb.png", icon: PoundSterling, color: "text-purple-600 dark:text-purple-400", code: "GBP", short: "GBP" },
  "Canadian Dollar": { flag: "https://flagcdn.com/w40/ca.png", icon: DollarSign, color: "text-red-600 dark:text-red-400", code: "CAD", short: "CAD" },
};

function fmtRate(v: number, decimals = 4): string {
  return Number(v).toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/* ── Module-level cache ────────────────────────────────────── */

let cachedCustomRates: EximRate[] = [];
let cachedLiveRates: EximRate[] = [];
let hasFetched = false;
let lastFetchTime: Date | null = null;

/* ── Component ─────────────────────────────────────────────── */

export default function CustomExchangeRatesPage() {
  const [customRates, setCustomRates] = useState<EximRate[]>(cachedCustomRates);
  const [liveRates, setLiveRates] = useState<EximRate[]>(cachedLiveRates);
  const [fetching, setFetching] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(lastFetchTime);
  const [search, setSearch] = useState("");

  // Converter state
  const [convItem, setConvItem] = useState<string>("cdro");
  const [convOrigin, setConvOrigin] = useState<string>("Spain");
  const [convCurrency, setConvCurrency] = useState<string>("U.S.Dollar");
  const [convPrice, setConvPrice] = useState<string>("1000");
  const [convExpense, setConvExpense] = useState<string>("22.5");

  useEffect(() => {
    if (!hasFetched) {
      handleFetch();
    }
  }, []);

  const handleItemChange = (val: string) => {
    setConvItem(val);
    const item = ITEMS_DATA.find(i => i.value === val);
    if (item) {
      setConvExpense(item.expense.toString());
    }
  };

  /* ── Fetch ────────────────────────────────────────────────── */

  async function handleFetch() {
    setFetching(true);
    try {
      // Fetch both simultaneously
      const [customRes, liveRes] = await Promise.all([
        fetchEximRates(),
        fetchExternalExchangeRates()
      ]);

      const cData = customRes.data || [];
      const lData = liveRes.data || [];
      
      cachedCustomRates = cData;
      cachedLiveRates = lData;
      hasFetched = true;
      const now = new Date();
      lastFetchTime = now;
      
      setCustomRates(cData);
      setLiveRates(lData);
      setFetchedAt(now);
      
      // Check if live rates are from today's live fetch or cache
      const STORAGE_KEY = "exim_live_rates_cache";
      const cached = localStorage.getItem(STORAGE_KEY);
      const cacheState = cached ? JSON.parse(cached) : null;
      
      if (cacheState && cacheState.count >= 10) {
        toast.info("Daily live rate limit reached. Showing last fetched data.");
      } else {
        toast.success("Exchange rates updated successfully");
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to refresh rates"));
    } finally {
      setFetching(false);
    }
  }

  /* ── Excel Export ─────────────────────────────────────────── */

  function exportExcel() {
    const rows = filteredCustomRates.map((r, i) => ({
      "S.No": i + 1,
      "CURRENCY": r.currency,
      "IMPORT RATE": r.import,
      "EXPORT RATE": r.export,
      "NOTIFICATION NO": r.notification_no || "---",
      "DATE": format(new Date(r.date), "dd-MM-yyyy"),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Custom Rates");
    XLSX.writeFile(wb, `Custom_Exchange_Rates_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  }

  /* ── Filtering & Sorting ──────────────────────────────────── */

  const filteredCustomRates = useMemo(() => {
    let result = customRates.filter((r) => ALLOWED_CURRENCIES.includes(r.currency));

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) =>
        r.currency.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => {
      return ALLOWED_CURRENCIES.indexOf(a.currency) - ALLOWED_CURRENCIES.indexOf(b.currency);
    });
  }, [customRates, search]);

  /* ── Converter Logic ─────────────────────────────────────── */

  const conversionResults = useMemo(() => {
    // Usually conversions use official/custom rates
    const target = customRates.find(r => r.currency === convCurrency);
    if (!target || isNaN(Number(convPrice))) return null;

    const pricePerTon = Number(convPrice);
    const rateValue = Number(target.import);
    const expensePct = isNaN(Number(convExpense)) ? 0 : Number(convExpense);
    
    const inrPerTon = (pricePerTon * rateValue) * (1 + (expensePct / 100));
    const inrPerKg = inrPerTon / 1000;
    const inrPerLtr = inrPerKg * 1.0989;

    return { inrPerTon, inrPerKg, inrPerLtr };
  }, [customRates, convPrice, convCurrency, convExpense]);

  const keyCurrencies = ["U.S.Dollar", "Euro", "UAE Dirham", "Australian Dollar", "Canadian Dollar", "Sterling Pound"];

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            Detailed Live Rates
          </h1>
          <p className="text-sm text-muted-foreground">
            View live market rates and manage custom exchange data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="btn-press"
            onClick={() => handleFetch()}
            disabled={fetching}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${fetching ? "animate-spin" : ""}`}
            />
            {fetching ? "Refreshing..." : "Refresh All Rates"}
          </Button>
          {hasFetched && filteredCustomRates.length > 0 && (
            <Button
              variant="outline"
              className="btn-press gap-2"
              onClick={exportExcel}
            >
              <Download className="h-4 w-4" />
              Export Custom
            </Button>
          )}
        </div>
      </div>

      {/* Top Cards (Live Exchange Rates) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {keyCurrencies.map((ccy) => {
          const rate = liveRates.find(r => r.currency === ccy);
          const meta = CURRENCY_MAP[ccy];
          return (
            <Card key={ccy} className="card-hover border-l-4 border-l-primary/50 overflow-hidden relative">
              <div className="absolute top-1 right-2 opacity-10 pointer-events-none">
                <img src={meta?.flag} alt="" className="w-10 grayscale" />
              </div>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-[13px] font-black text-muted-foreground flex items-center gap-2 uppercase tracking-widest">
                  <img src={meta?.flag} alt={meta?.code} className="h-4 w-6 object-cover rounded-sm shadow-sm" />
                  {meta?.short} to INR
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 pt-1 px-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black tracking-tighter text-primary">
                    ₹ {rate ? fmtRate(Number(rate.import), 2) : "---"}
                  </span>
                </div>
                <div className="mt-3 flex justify-between items-center text-[10px] uppercase font-black text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE
                  </span>
                  <span>
                    {fetchedAt ? format(fetchedAt, "HH:mm") : "--:--"}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT: Quick Converter */}
        <div className="xl:col-span-3">
          <Card className="card-hover h-fit border-t-4 border-t-primary shadow-lg sticky top-20">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Quick Converter
              </CardTitle>
              <CardDescription className="text-xs">Using Custom Exchange Rates</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Item</label>
                  <Select value={convItem} onValueChange={handleItemChange}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEMS_DATA.map(item => (
                        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Origin</label>
                  <Select value={convOrigin} onValueChange={setConvOrigin}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORIGINS.map(o => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Currency</label>
                <Select value={convCurrency} onValueChange={setConvCurrency}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALLOWED_CURRENCIES.map(ccy => (
                      <SelectItem key={ccy} value={ccy}>
                        <div className="flex items-center gap-2">
                          <img src={CURRENCY_MAP[ccy]?.flag} alt="" className="h-3 w-4 object-cover rounded-sm" />
                          {ccy.replace("U.S.", "US ")}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Price (Ton)</label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={convPrice}
                      onChange={(e) => setConvPrice(e.target.value)}
                      className="pl-10 h-10 text-sm font-bold"
                    />
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-50">
                      <img src={CURRENCY_MAP[convCurrency]?.flag} alt="" className="h-4 w-6 object-cover" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Expense (%)</label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={convExpense}
                      onChange={(e) => setConvExpense(e.target.value)}
                      className="pr-8 h-10 text-sm font-bold"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold opacity-50">%</div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-muted-foreground">Price/KG</span>
                    <span className="font-bold text-base">₹ {fmtRate(conversionResults?.inrPerKg || 0, 2)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-primary/10 p-2.5 rounded border border-primary/20">
                    <span className="text-sm font-bold text-primary">Price/Liter</span>
                    <span className="text-xl font-black text-primary">₹ {fmtRate(conversionResults?.inrPerLtr || 0, 2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CENTER: Custom Exchange Rates Table */}
        <div className="xl:col-span-6">
          <Card className="card-hover">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-xl">Custom Exchange Rates</CardTitle>
                  <CardDescription className="text-sm">
                    {hasFetched
                      ? `Updated as of ${fetchedAt ? format(fetchedAt, "dd MMM yyyy, HH:mm:ss") : "--"}`
                      : "Loading data..."}
                  </CardDescription>
                </div>
                {hasFetched && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search custom..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 h-10 w-48 text-sm"
                    />
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30 text-sm font-black uppercase tracking-widest h-14">
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>CURRENCY</TableHead>
                      <TableHead className="text-right">IMPORT</TableHead>
                      <TableHead className="text-right">EXPORT</TableHead>
                      <TableHead className="text-center">DATE</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fetching ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <RefreshCw className="h-10 w-10 animate-spin text-primary opacity-50" />
                            <span className="text-muted-foreground font-semibold text-base">Refreshing rates...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredCustomRates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <div className="flex flex-col items-center gap-3 text-muted-foreground py-24">
                            <PackageOpen className="h-16 w-16 stroke-1 opacity-20" />
                            <p className="font-bold text-base">No custom rates available</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCustomRates.map((rate, idx) => {
                        const meta = CURRENCY_MAP[rate.currency];
                        const rDate = new Date(rate.date);
                        
                        return (
                          <TableRow key={rate.currency} className="hover:bg-accent/5 transition-colors group h-20">
                            <TableCell className="text-sm text-muted-foreground font-mono font-black">
                              {(idx + 1).toString().padStart(2, '0')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-4">
                                <img src={meta?.flag} alt={meta?.code} className="h-7 w-11 object-cover rounded shadow-md border border-muted" />
                                <div className="flex flex-col">
                                  <span className="font-black text-lg tracking-tight leading-none">
                                    {rate.currency.replace("U.S.", "US ")}
                                  </span>
                                  <span className="text-xs font-black text-muted-foreground uppercase mt-1 tracking-tighter">{meta?.short}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono font-black text-lg text-primary">
                              {rate.import}
                            </TableCell>
                            <TableCell className="text-right font-mono font-black text-lg text-emerald-600">
                              {rate.export}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm font-black text-muted-foreground">
                                {isValid(rDate) ? format(rDate, "dd-MM-yyyy") : "---"}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Quick Converter Local */}
        <div className="xl:col-span-3">
          <Card className="card-hover h-fit border-t-4 border-t-emerald-500 shadow-lg sticky top-20">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-emerald-500" />
                Quick Converter Local
              </CardTitle>
              <CardDescription className="text-xs">Local Cost Tools</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 h-64 flex flex-col items-center justify-center text-center">
              <div className="bg-emerald-500/10 p-4 rounded-full mb-4">
                <ArrowRightLeft className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Feature Coming Soon</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-[200px]">
                Local cost conversion tools are currently under development.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
