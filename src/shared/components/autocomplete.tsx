import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"

export interface AutocompleteOption {
    value: string
    label: string
}

interface AutocompleteProps {
    options: AutocompleteOption[]
    value?: string | string[]
    onChange: (value: any) => void
    multiple?: boolean
    placeholder?: string
    emptyMessage?: string
    className?: string
    disabled?: boolean
}

export const Autocomplete = React.forwardRef<HTMLButtonElement, AutocompleteProps>(
    ({
        options,
        value,
        onChange,
        multiple = false,
        placeholder = "Chọn...",
        emptyMessage = "Không tìm thấy kết quả.",
        className,
        disabled = false,
    }, ref) => {
        const [open, setOpen] = useState(false)
        const [searchQuery, setSearchQuery] = useState("")

        const values = Array.isArray(value) ? value : value ? [value] : []
        const selectedOptions = options.filter((option) => values.includes(option.value.toString()))

        const handleSelect = (currentValue: string) => {
            if (multiple) {
                const newValue = values.includes(currentValue)
                    ? values.filter((v) => v !== currentValue)
                    : [...values, currentValue]
                onChange(newValue)
            } else {
                onChange(currentValue === value?.toString() ? "" : currentValue)
                setOpen(false)
                setSearchQuery("")
            }
        }

        return (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        ref={ref}
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn("w-full justify-between relative min-h-10 h-auto py-2", className)}
                        disabled={disabled}
                    >
                        <div className="flex flex-wrap gap-1 mr-6">
                            {selectedOptions.length > 0 ? (
                                multiple ? (
                                    selectedOptions.map((option) => (
                                        <Badge
                                            key={option.value}
                                            variant="secondary"
                                            className="font-normal border-none bg-muted/50"
                                        >
                                            {option.label}
                                        </Badge>
                                    ))
                                ) : (
                                    selectedOptions[0].label
                                )
                            ) : (
                                <span className="text-muted-foreground">{placeholder}</span>
                            )}
                        </div>
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 absolute right-2 top-3" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={false}>
                        <CommandInput
                            placeholder={placeholder}
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                        />
                        <CommandList>
                            <CommandEmpty>{emptyMessage}</CommandEmpty>
                            <CommandGroup>
                                {options
                                    .filter((option) =>
                                        option.label.toLowerCase().includes(searchQuery.toLowerCase())
                                    )
                                    .map((option) => (
                                        <CommandItem
                                            key={option.value}
                                            value={option.value.toString()}
                                            onSelect={handleSelect}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    values.includes(option.value.toString()) ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {option.label}
                                        </CommandItem>
                                    ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        )
    }
)
Autocomplete.displayName = "Autocomplete"
