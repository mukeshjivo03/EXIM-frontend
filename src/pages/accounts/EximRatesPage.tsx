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
import { format, isBefore, subDays, isValid, parseISO } from "date-fns";

import { fetchEximRates, type EximRate } from "@/api/eximRates";
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
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";

/* ── Types & Helpers ───────────────────────────────────────── */

const ALLOWED_CURRENCIES = [
  "U.S.Dollar",
  "Australian Dollar",
  "Euro",
  "UAE Dirham",
  "Sterling Pound",
  "Canadian Dollar",
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

const CURRENCY_MAP: Record<string, { flag: string; icon: any; color: string; code: string }> = {
  "U.S.Dollar": { flag: "https://flagcdn.com/w40/us.png", icon: DollarSign, color: "text-blue-600 dark:text-blue-400", code: "US" },
  "Australian Dollar": { flag: "https://flagcdn.com/w40/au.png", icon: DollarSign, color: "text-amber-600 dark:text-amber-400", code: "AU" },
  "Euro": { flag: "https://flagcdn.com/w40/eu.png", icon: Euro, color: "text-indigo-600 dark:text-indigo-400", code: "EU" },
  "UAE Dirham": { flag: "https://flagcdn.com/w40/ae.png", icon: Globe, color: "text-emerald-600 dark:text-emerald-400", code: "AE" },
  "Sterling Pound": { flag: "https://flagcdn.com/w40/gb.png", icon: PoundSterling, color: "text-purple-600 dark:text-purple-400", code: "GB" },
  "Canadian Dollar": { flag: "https://flagcdn.com/w40/ca.png", icon: DollarSign, color: "text-red-600 dark:text-red-400", code: "CA" },
};

function fmtRate(v: number, decimals = 2): string {
  return Number(v).toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/* ── Module-level cache ────────────────────────────────────── */

let cachedRates: EximRate[] = [];
let hasFetched = false;
let lastFetchTime: Date | null = null;
let lastFetchedDate: string = "";

/* ── Component ─────────────────────────────────────────────── */

export default function EximRatesPage() {
  const [rates, setRates] = useState<EximRate[]>(cachedRates);
  const [fetching, setFetching] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(lastFetchTime);
  const [selectedDate, setSelectedDate] = useState<string>(lastFetchedDate);
  const [search, setSearch] = useState("");

  // Converter state (Import)
  const [convItem, setConvItem] = useState<string>("cdro");
  const [convOrigin, setConvOrigin] = useState<string>("Spain");
  const [convCurrency, setConvCurrency] = useState<string>("U.S.Dollar");
  const [convPrice, setConvPrice] = useState<string>("1000");
  const [convExpense, setConvExpense] = useState<string>("22.5");

  // Converter state (Local)
  const [localItem, setLocalItem] = useState<string>("cdro");
  const [localOrigin, setLocalOrigin] = useState<string>("Spain");
  const [localCurrency, setLocalCurrency] = useState<string>("U.S.Dollar");
  const [localPrice, setLocalPrice] = useState<string>("1000");
  const [localExpense, setLocalExpense] = useState<string>("22.5");

  useEffect(() => {
    if (!hasFetched) {
      handleFetch();
    }
  }, []);

  // Auto-update expense when item changes
  const handleItemChange = (val: string) => {
    setConvItem(val);
    const item = ITEMS_DATA.find(i => i.value === val);
    if (item) {
      setConvExpense(item.expense.toString());
    }
  };

  const handleLocalItemChange = (val: string) => {
    setLocalItem(val);
    const item = ITEMS_DATA.find(i => i.value === val);
    if (item) {
      setLocalExpense(item.expense.toString());
    }
  };

  /* ── Fetch ────────────────────────────────────────────────── */

  async function handleFetch(dateToFetch?: string) {
    setFetching(true);
    const dateStr = dateToFetch !== undefined ? dateToFetch : selectedDate;
    
    try {
      const response = await fetchEximRates(dateStr || undefined);
      const data = response.data || [];
      
      cachedRates = data;
      hasFetched = true;
      const now = new Date();
      lastFetchTime = now;
      lastFetchedDate = dateStr;
      
      setRates(data);
      setFetchedAt(now);
      
      if (dateStr) {
        toast.success(`Loaded exchange rates for ${dateStr}`);
      } else {
        toast.success(`Loaded current exchange rates`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to fetch exchange rates"));
    } finally {
      setFetching(false);
    }
  }

  /* ── Excel Export ─────────────────────────────────────────── */

  function exportExcel() {
    const rows = filteredRates.map((r, i) => ({
      "S.No": i + 1,
      "CURRENCY": r.currency,
      "IMPORT RATE": r.import,
      "EXPORT RATE": r.export,
      "NOTIFICATION NO": r.notification_no || "---",
      "AS OF DATE": format(new Date(r.date), "dd-MM-yyyy"),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Exchange Rates");
    const fileNameDate = selectedDate || format(new Date(), "yyyy-MM-dd");
    XLSX.writeFile(wb, `Exchange_Rates_${fileNameDate}.xlsx`);
  }

  /* ── Filtering & Sorting ──────────────────────────────────── */

  const filteredRates = useMemo(() => {
    let result = rates.filter((r) => ALLOWED_CURRENCIES.includes(r.currency));

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) =>
        r.currency.toLowerCase().includes(q)
      );
    }

    // Sort: U.S.Dollar always at the top
    return result.sort((a, b) => {
      if (a.currency === "U.S.Dollar") return -1;
      if (b.currency === "U.S.Dollar") return 1;
      return a.currency.localeCompare(b.currency);
    });
  }, [rates, search]);

  /* ── Converter Logic ─────────────────────────────────────── */

  const conversionResults = useMemo(() => {
    const target = rates.find(r => r.currency === convCurrency);
    if (!target || isNaN(Number(convPrice))) return null;

    const pricePerTon = Number(convPrice);
    const importRate = Number(target.import);
    const expensePct = isNaN(Number(convExpense)) ? 0 : Number(convExpense);
    
    // Total INR per Ton = (Price in Currency * Rate) + Expense%
    const inrPerTon = (pricePerTon * importRate) * (1 + (expensePct / 100));
    
    const inrPerKg = inrPerTon / 1000;
    // 1kg = 1ltr * 1.0989 => Weight of 1Ltr is 1.0989kg
    const inrPerLtr = inrPerKg * 1.0989;

    return { inrPerTon, inrPerKg, inrPerLtr };
  }, [rates, convPrice, convCurrency, convExpense]);

  const localResults = useMemo(() => {
    const target = rates.find(r => r.currency === localCurrency);
    if (!target || isNaN(Number(localPrice))) return null;

    const pricePerTon = Number(localPrice);
    const exportRate = Number(target.export);
    const expensePct = isNaN(Number(localExpense)) ? 0 : Number(localExpense);
    
    const inrPerTon = (pricePerTon * exportRate) * (1 + (expensePct / 100));
    const inrPerKg = inrPerTon / 1000;
    const inrPerLtr = inrPerKg * 1.0989;

    return { inrPerTon, inrPerKg, inrPerLtr };
  }, [rates, localPrice, localCurrency, localExpense]);

  const keyCurrencies = ["U.S.Dollar", "Euro", "Sterling Pound", "Australian Dollar", "UAE Dirham"];

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <ArrowRightLeft className="h-6 w-6 text-primary" />
            Exchange Rates
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage and convert foreign exchange rates for business transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DatePicker
            value={selectedDate}
            placeholder="Rates for date..."
            onChange={(val) => {
              setSelectedDate(val);
              handleFetch(val);
            }}
          />
          <Button
            className="btn-press"
            onClick={() => handleFetch()}
            disabled={fetching}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${fetching ? "animate-spin" : ""}`}
            />
            {fetching ? "Fetching..." : "Fetch Rates"}
          </Button>
          {hasFetched && filteredRates.length > 0 && (
            <Button
              variant="outline"
              className="btn-press gap-2"
              onClick={exportExcel}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Top Cards (Key Currencies) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {keyCurrencies.map((ccy) => {
          const rate = rates.find(r => r.currency === ccy);
          const meta = CURRENCY_MAP[ccy];
          return (
            <Card key={ccy} className="card-hover border-l-4 border-l-primary/50 overflow-hidden relative">
              <div className="absolute top-2 right-3 opacity-10 pointer-events-none">
                <img src={meta?.flag} alt="" className="w-12 grayscale" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <img src={meta?.flag} alt={meta?.code} className="h-4 w-6 object-cover rounded-sm shadow-sm" />
                  {ccy.replace("U.S.", "US ")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    ₹ {rate?.import || "---"}
                  </span>
                  <span className="text-xs text-muted-foreground font-bold uppercase">Import</span>
                </div>
                <div className="mt-4 flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-bold uppercase">Export:</span>
                  <span className="font-semibold text-primary">₹ {rate?.export || "---"}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT: Quick Converter Import */}
        <div className="xl:col-span-3">
          <Card className="card-hover h-fit border-t-4 border-t-primary shadow-lg sticky top-20">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Quick Converter Import
              </CardTitle>
              <CardDescription className="text-xs">Import Rates (Landing Cost)</CardDescription>
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
                    <span className="font-bold text-base">₹ {fmtRate(conversionResults?.inrPerKg || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-primary/10 p-2.5 rounded border border-primary/20">
                    <span className="text-sm font-bold text-primary">Price/Liter</span>
                    <span className="text-xl font-black text-primary">₹ {fmtRate(conversionResults?.inrPerLtr || 0)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CENTER: Detailed Rates Table */}
        <div className="xl:col-span-6">
          <Card className="card-hover">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-xl">Detailed Rates</CardTitle>
                  <CardDescription className="text-sm">
                    {hasFetched
                      ? selectedDate && isValid(parseISO(selectedDate))
                        ? `As of ${format(parseISO(selectedDate), "dd MMM yyyy")}`
                        : "Current official exchange rates"
                      : "Fetching latest data..."}
                  </CardDescription>
                </div>
                {hasFetched && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search currency..."
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
                    <TableRow className="bg-muted/30 hover:bg-muted/30 text-xs font-bold uppercase tracking-wider">
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>CURRENCY</TableHead>
                      <TableHead className="text-right font-black">IMPORT</TableHead>
                      <TableHead className="text-right font-black">EXPORT</TableHead>
                      <TableHead className="text-center">DATE</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fetching ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <RefreshCw className="h-10 w-10 animate-spin text-primary opacity-50" />
                            <span className="text-muted-foreground font-semibold text-base">Updating rates...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredRates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <div className="flex flex-col items-center gap-3 text-muted-foreground py-24">
                            <PackageOpen className="h-16 w-16 stroke-1 opacity-20" />
                            <p className="font-bold text-base">No currency data available</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRates.map((rate, idx) => {
                        const meta = CURRENCY_MAP[rate.currency];
                        const rateDate = new Date(rate.date);
                        
                        return (
                          <TableRow key={rate.currency} className="hover:bg-accent/5 transition-colors group h-14">
                            <TableCell className="text-xs text-muted-foreground font-mono">
                              {(idx + 1).toString().padStart(2, '0')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <img src={meta?.flag} alt={meta?.code} className="h-5 w-8 object-cover rounded shadow-sm" />
                                <div className="flex flex-col">
                                  <span className="font-bold text-sm tracking-tight">
                                    {rate.currency.replace("U.S.", "US ")}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono font-black text-sm text-primary">
                              {rate.import}
                            </TableCell>
                            <TableCell className="text-right font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                              {rate.export}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-xs font-bold text-muted-foreground">
                                {isValid(rateDate) ? format(rateDate, "dd-MM-yyyy") : "---"}
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
              <CardDescription className="text-xs">Export Rates (Local Cost)</CardDescription>
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
