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

interface ComboboxProps {
  options: { label: string; value: string }[]
  value?: string | string[]
  onValueChange?: (value: string | string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
  multiple?: boolean
  allValue?: string
  joinString?: boolean
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search options...",
  emptyMessage = "No options found.",
  disabled = false,
  className,
  multiple = false,
  allValue = "all",
  joinString = true,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  
  const isSelected = (optionValue: string) => {
    if (multiple) {
      if (Array.isArray(value)) {
        return value.includes(optionValue)
      }
      if (typeof value === 'string') {
        const values = value.split(',').filter(v => v)
        return values.includes(optionValue)
      }
    }
    return value === optionValue
  }
  
  const getDisplayText = () => {
    if (multiple) {
      if (Array.isArray(value)) {
        if (value.length === 0 || value.includes(allValue)) return placeholder
        return options
          .filter(opt => value.includes(opt.value) && opt.value !== allValue)
          .map(opt => opt.label)
          .join(', ')
      }
      if (typeof value === 'string') {
        if (!value || value === allValue) return placeholder
        const values = value.split(',').filter(v => v && v !== allValue)
        return options
          .filter(opt => values.includes(opt.value))
          .map(opt => opt.label)
          .join(', ')
      }
    }
    if (!value) return placeholder
    return options.find((option) => option.value === value)?.label || placeholder
  }
  
  const emitValue = (arrayValue: string[]) => {
    if (joinString) {
      onValueChange?.(arrayValue.filter(v => v !== allValue).join(','))
    } else {
      onValueChange?.(arrayValue)
    }
  }
  
  const handleSelect = (optionValue: string) => {
    if (multiple) {
      const currentArray = Array.isArray(value) 
        ? value 
        : (typeof value === 'string' ? value.split(',').filter(v => v) : [])
      
      if (optionValue === allValue) {
        // When "all" is selected, clear everything
        emitValue([])
      } else if (currentArray.includes(allValue)) {
        // If "all" was selected, start fresh with the new selection
        emitValue([optionValue])
      } else if (currentArray.includes(optionValue)) {
        emitValue(currentArray.filter(v => v !== optionValue))
      } else {
        emitValue([...currentArray, optionValue])
      }
    } else {
      onValueChange?.(value === optionValue ? "" : optionValue)
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          <span className="truncate text-left flex-1">
            {getDisplayText()}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start" sideOffset={4} onWheelCapture={(e) => e.stopPropagation()}>
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList onWheel={(e) => e.stopPropagation()}>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.value}`}
                  onSelect={() => {
                    handleSelect(option.value)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      isSelected(option.value) ? "opacity-100" : "opacity-0"
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