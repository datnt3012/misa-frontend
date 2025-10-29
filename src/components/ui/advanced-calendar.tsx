import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { vi as viLocale } from "date-fns/locale";
import { format as formatDate } from "date-fns";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type AdvancedCalendarProps = React.ComponentProps<typeof DayPicker> & {
  showYearMonthPicker?: boolean;
};

function AdvancedCalendar({
  className,
  classNames,
  showOutsideDays = true,
  showYearMonthPicker = true,
  ...props
}: AdvancedCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState<Date>(
    (props as any).month || (props as any).defaultMonth || new Date()
  );

  // Generate years (current year ± 10 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

  // Generate months
  const months = [
    { value: 0, label: "Tháng 1" },
    { value: 1, label: "Tháng 2" },
    { value: 2, label: "Tháng 3" },
    { value: 3, label: "Tháng 4" },
    { value: 4, label: "Tháng 5" },
    { value: 5, label: "Tháng 6" },
    { value: 6, label: "Tháng 7" },
    { value: 7, label: "Tháng 8" },
    { value: 8, label: "Tháng 9" },
    { value: 9, label: "Tháng 10" },
    { value: 10, label: "Tháng 11" },
    { value: 11, label: "Tháng 12" },
  ];

  const handleYearChange = (year: string) => {
    const newDate = new Date(currentMonth);
    newDate.setFullYear(parseInt(year));
    setCurrentMonth(newDate);
  };

  const handleMonthChange = (month: string) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(parseInt(month));
    setCurrentMonth(newDate);
  };

  const handlePreviousMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentMonth(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentMonth(newDate);
  };

  const effectiveLocale = (props as any).locale ?? viLocale;
  const effectiveWeekStartsOn = (props as any).weekStartsOn ?? 1; // Monday
  const weekdayFormatters = {
    // Compact weekday: T2..T7, CN
    formatWeekdayName: (date: Date) => {
      const d = date.getDay();
      return d === 0 ? "CN" : `T${d + 1}`;
    },
  } as const;

  // Sync displayed month with selected date from parent
  React.useEffect(() => {
    const selected = (props as any).selected;
    if (!selected) return;
    const selectedDate: Date = Array.isArray(selected)
      ? selected[0]
      : (selected as any).from ?? (selected as any).start ?? selected;
    if (selectedDate instanceof Date && !isNaN(selectedDate.getTime())) {
      // Only update if month actually differs to avoid loops
      if (
        selectedDate.getFullYear() !== currentMonth.getFullYear() ||
        selectedDate.getMonth() !== currentMonth.getMonth()
      ) {
        setCurrentMonth(new Date(selectedDate));
      }
    }
  }, [(props as any).selected]);

  return (
    <div className="space-y-2 w-auto min-w-[280px]">
      {showYearMonthPicker && (
        <div className="flex items-center justify-between gap-2 py-2 px-3">
          <div className="flex items-center gap-2">
            <Select
              value={currentMonth.getMonth().toString()}
              onValueChange={handleMonthChange}
            >
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="bottom" align="start" className="z-[9999]">
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select
              value={currentMonth.getFullYear().toString()}
              onValueChange={handleYearChange}
            >
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="bottom" align="start" className="z-[9999]">
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={handlePreviousMonth}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-8 w-8 p-0"
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-8 w-8 p-0"
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <DayPicker
        month={currentMonth}
        onMonthChange={setCurrentMonth}
        showOutsideDays={showOutsideDays}
        locale={effectiveLocale}
        weekStartsOn={effectiveWeekStartsOn}
        formatters={weekdayFormatters}
        modifiersClassNames={{
          selected: "bg-primary text-primary-foreground",
          today: "bg-accent text-accent-foreground",
        }}
        styles={{
          table: { tableLayout: "fixed" },
          head_cell: { width: 32, textAlign: "center" },
          weekdays: { },
          weekday: { width: 32, textAlign: "center" },
          cell: { width: 32, height: 32, padding: 0 },
          day: { width: 32, height: 32 },
        }}
        className={cn("p-3", className)}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium",
          // Hide DayPicker internal nav; we provide our own above
          nav: "hidden",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          head_row: "flex",
          head_cell: "w-8 text-center font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: "text-center text-sm p-0 align-middle relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day_button: cn(
            buttonVariants({ variant: "ghost" }),
            "inline-flex h-8 w-8 items-center justify-center p-0 font-normal rounded-md aria-selected:opacity-100 aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:hover:bg-primary aria-selected:hover:text-primary-foreground"
          ),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside:
            "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        components={{
          Chevron: ({ disabled, orientation, ...props }) => 
            orientation === "left" ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            ),
        }}
        {...props}
      />
    </div>
  );
}

AdvancedCalendar.displayName = "AdvancedCalendar";

export { AdvancedCalendar };
