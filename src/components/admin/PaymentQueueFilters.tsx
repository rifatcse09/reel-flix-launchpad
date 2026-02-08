import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Search, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";

export interface PaymentFilters {
  search: string;
  status: string;
  plan: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}

interface PaymentQueueFiltersProps {
  filters: PaymentFilters;
  onFiltersChange: (filters: PaymentFilters) => void;
  planOptions: string[];
}

const PaymentQueueFilters = ({ filters, onFiltersChange, planOptions }: PaymentQueueFiltersProps) => {
  const hasActiveFilters = filters.search || filters.status !== "all" || filters.plan !== "all" || filters.dateFrom || filters.dateTo;

  const update = (partial: Partial<PaymentFilters>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  const clearAll = () => {
    onFiltersChange({ search: "", status: "all", plan: "all", dateFrom: undefined, dateTo: undefined });
  };

  return (
    <div className="flex flex-col gap-3 mb-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by email, name, or invoice number…"
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className="pl-9 h-9 text-sm"
        />
        {filters.search && (
          <button
            onClick={() => update({ search: "" })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status filter */}
        <Select value={filters.status} onValueChange={(v) => update({ status: v })}>
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">🟡 Pending</SelectItem>
            <SelectItem value="confirmed">🟢 Confirmed</SelectItem>
            <SelectItem value="failed">🔴 Failed</SelectItem>
            <SelectItem value="flagged">⚠ Flagged</SelectItem>
            <SelectItem value="no_payment">No Payment</SelectItem>
          </SelectContent>
        </Select>

        {/* Plan filter */}
        <Select value={filters.plan} onValueChange={(v) => update({ plan: v })}>
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue placeholder="All plans" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            {planOptions.map((plan) => (
              <SelectItem key={plan} value={plan}>{plan}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date from */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1.5 px-2.5", !filters.dateFrom && "text-muted-foreground")}>
              <CalendarIcon className="h-3.5 w-3.5" />
              {filters.dateFrom ? format(filters.dateFrom, "MMM d") : "From"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.dateFrom}
              onSelect={(d) => update({ dateFrom: d })}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {/* Date to */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1.5 px-2.5", !filters.dateTo && "text-muted-foreground")}>
              <CalendarIcon className="h-3.5 w-3.5" />
              {filters.dateTo ? format(filters.dateTo, "MMM d") : "To"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.dateTo}
              onSelect={(d) => update({ dateTo: d })}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 px-2 text-muted-foreground" onClick={clearAll}>
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
};

export default PaymentQueueFilters;

/** Client-side filter logic */
export const applyPaymentFilters = <T extends {
  id: string;
  invoice_number: string;
  plan_name: string | null;
  created_at: string;
  notes: string | null;
  profiles: { full_name: string | null; email: string | null } | null;
  payments: Array<{ status: string }>;
}>(
  items: T[],
  filters: PaymentFilters
): T[] => {
  let result = [...items];

  // Text search
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter((item) =>
      (item.profiles?.full_name || "").toLowerCase().includes(q) ||
      (item.profiles?.email || "").toLowerCase().includes(q) ||
      item.invoice_number.toLowerCase().includes(q)
    );
  }

  // Status filter
  if (filters.status !== "all") {
    if (filters.status === "flagged") {
      result = result.filter((item) => item.notes?.includes("[FLAGGED]"));
    } else if (filters.status === "no_payment") {
      result = result.filter((item) => item.payments.length === 0);
    } else {
      result = result.filter((item) =>
        item.payments.length > 0 && item.payments[0].status === filters.status
      );
    }
  }

  // Plan filter
  if (filters.plan !== "all") {
    result = result.filter((item) => item.plan_name === filters.plan);
  }

  // Date range
  if (filters.dateFrom) {
    const from = filters.dateFrom.getTime();
    result = result.filter((item) => new Date(item.created_at).getTime() >= from);
  }
  if (filters.dateTo) {
    const to = new Date(filters.dateTo);
    to.setHours(23, 59, 59, 999);
    result = result.filter((item) => new Date(item.created_at).getTime() <= to.getTime());
  }

  return result;
};
