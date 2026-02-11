import * as React from "react"
import { Check, ChevronsUpDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"

interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onValueChange: (value: string[] | string) => void
  placeholder?: string
  className?: string
  selectAllLabel?: string
  allValue?: string
  joinString?: boolean
}

export function MultiSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select options...",
  className,
  selectAllLabel = "Select all",
  allValue = "all",
  joinString = true,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const labels: Record<string, string> = {}
  options.forEach(opt => {
    labels[opt.value] = opt.label
  })

  const allValues = options.filter(opt => opt.value !== allValue).map(opt => opt.value)

  const emitValue = (arrayValue: string[]) => {
    if (joinString) {
      onValueChange(arrayValue.filter(v => v !== allValue).join(','))
    } else {
      onValueChange(arrayValue)
    }
  }

  const toArray = (v: string[] | string): string[] => {
    if (Array.isArray(v)) return v
    return v.split(',').filter(val => val)
  }

  const currentValueArray = toArray(value)

  const handleSelectAll = () => {
    if (currentValueArray.length === 0 || currentValueArray.includes(allValue)) {
      emitValue([...allValues])
    } else {
      emitValue([])
    }
  }

  const handleToggle = (optionValue: string) => {
    if (optionValue === allValue) {
      // When "all" is selected, clear everything
      emitValue([])
    } else if (currentValueArray.includes(allValue)) {
      // If "all" was selected, start fresh with the new selection
      emitValue([optionValue])
    } else if (currentValueArray.includes(optionValue)) {
      emitValue(currentValueArray.filter(v => v !== optionValue))
    } else {
      emitValue([...currentValueArray, optionValue])
    }
  }

  const displayText = currentValueArray.length === 0 || currentValueArray.includes(allValue)
    ? placeholder
    : currentValueArray.filter(v => v !== allValue).map(v => labels[v] || v).join(", ")

  const isAllSelected = currentValueArray.length === allValues.length && !currentValueArray.includes(allValue)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-between", className)}
        >
          <span className="truncate text-left flex-1">
            {displayText}
          </span>
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <div
          className="flex items-center space-x-2 px-2 py-1.5 cursor-pointer hover:bg-accent rounded-sm"
          onClick={(e) => {
            e.stopPropagation()
            handleSelectAll()
          }}
        >
          <Checkbox checked={isAllSelected} />
          <span className="text-sm">{selectAllLabel}</span>
        </div>
        {options.map((option) => (
          <div
            key={option.value}
            className="flex items-center space-x-2 px-2 py-1.5 cursor-pointer hover:bg-accent rounded-sm"
            onClick={(e) => {
              e.stopPropagation()
              handleToggle(option.value)
            }}
          >
            <Checkbox checked={value.includes(option.value) && option.value !== allValue} />
            <span className="text-sm">{option.label}</span>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  )
}
