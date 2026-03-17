import * as React from "react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { Label } from "@/shared/components/ui/label"
import { Calendar } from "@/shared/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/shared/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@radix-ui/react-select"
interface DatePickerProps {
    className?: string
    date?: Date
    setDate?: (date: Date | undefined) => void
    disabled?: boolean
    dropdown?: React.ComponentProps<typeof Calendar>["captionLayout"]
}

export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
    ({ className, date, setDate, disabled }, ref) => {
        const [dropdown, setDropdown] =
            React.useState<React.ComponentProps<typeof Calendar>["captionLayout"]>(
                "dropdown"
            )

        return (
            <div className={cn("grid gap-2", className)}>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            ref={ref}
                            variant="outline"
                            data-empty={!date}
                            className={cn(
                                "w-full justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                            )}
                            disabled={disabled}
                        >
                            <CalendarIcon />
                            {date ? format(date, "dd/MM/yyyy", { locale: vi }) : <span>Chọn ngày</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <div className="flex flex-col gap-4">
                            <Calendar
                                mode="single"
                                defaultMonth={date}
                                selected={date}
                                onSelect={setDate}
                                fromYear={1900}
                                toYear={2070}
                                captionLayout={dropdown}
                                className="rounded-lg border shadow-sm"
                            />
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        )
    }
)
DatePicker.displayName = "DatePicker"