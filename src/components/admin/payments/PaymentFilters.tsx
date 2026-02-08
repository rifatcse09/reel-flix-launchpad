import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { DateRange } from "react-day-picker";

interface PaymentFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  processorFilter: string;
  onProcessorChange: (value: string) => void;
  dateRange: string;
  onDateRangeChange: (value: string) => void;
  customDateRange: DateRange | undefined;
  onCustomDateRangeChange: (range: DateRange | undefined) => void;
}

export const PaymentFilters = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  processorFilter,
  onProcessorChange,
  dateRange,
  onDateRangeChange,
  customDateRange,
  onCustomDateRangeChange,
}: PaymentFiltersProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search transactions..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 focus:border-primary focus:ring-primary"
        />
      </div>
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger>
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent className="bg-background border-border z-50">
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>
      <Select value={processorFilter} onValueChange={onProcessorChange}>
        <SelectTrigger>
          <SelectValue placeholder="Filter by processor" />
        </SelectTrigger>
        <SelectContent className="bg-background border-border z-50">
          <SelectItem value="all">All Processors</SelectItem>
          <SelectItem value="nowpayments">NOWPayments</SelectItem>
          <SelectItem value="crypto">Crypto</SelectItem>
          <SelectItem value="manual">Manual</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={dateRange}
        onValueChange={(value) => {
          onDateRangeChange(value);
          if (value !== 'custom') {
            onCustomDateRangeChange(undefined);
          }
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Date range" />
        </SelectTrigger>
        <SelectContent className="bg-background border-border z-50">
          <SelectItem value="all">All Time</SelectItem>
          <SelectItem value="7">Last 7 Days</SelectItem>
          <SelectItem value="30">Last 30 Days</SelectItem>
          <SelectItem value="90">Last 90 Days</SelectItem>
          <SelectItem value="custom">Custom Range</SelectItem>
        </SelectContent>
      </Select>
      {dateRange === 'custom' && (
        <DateRangePicker date={customDateRange} onDateChange={onCustomDateRangeChange} />
      )}
    </div>
  );
};
