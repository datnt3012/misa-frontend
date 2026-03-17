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
import { useState } from "react"

export interface AutocompleteOption {
    value: string
    label: string
}

interface AutocompleteProps {
    options: AutocompleteOption[]
    value?: string
    onChange: (value: string) => void
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
        placeholder = "Select option...",
        emptyMessage = "No option found.",
        className,
        disabled = false,
    }, ref) => {
        const [open, setOpen] = useState(false)
        const [searchQuery, setSearchQuery] = useState("")

        const selectedOption = options.find((option) => option.value.toString() === value?.toString())

        return (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        ref={ref}
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn("w-full justify-between relative", className)}
                        disabled={disabled}
                    >
                        {value
                            ? selectedOption?.label
                            : placeholder}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 absolute right-2" />
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
                                            onSelect={(currentValue) => {
                                                onChange(currentValue === value?.toString() ? "" : currentValue)
                                                setOpen(false)
                                                setSearchQuery("")
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    value?.toString() === option.value.toString() ? "opacity-100" : "opacity-0"
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
