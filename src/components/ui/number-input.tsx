import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number | string;
  onChange: (value: number) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, value, min, max, onChange, onBlur, ...props }, ref) => {
    // Convert value to number if it's a string
    const numericValue = typeof value === 'string' ? parseInt(value) || 0 : value || 0;
    
    const [displayValue, setDisplayValue] = React.useState(numericValue.toString());
    const [isFocused, setIsFocused] = React.useState(false);

    // Update display value when external value changes (but not when focused to avoid interrupting user input)
    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(numericValue.toString());
      }
    }, [numericValue, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value;
      
      // If input is empty, set to 0
      if (inputValue === '') {
        setDisplayValue('');
        onChange(0);
        return;
      }
      
      // Remove all non-digit characters
      inputValue = inputValue.replace(/[^0-9]/g, '');
      
      // Remove leading zeros (but keep single zero)
      // If user is typing and current value is 0, replace it with new input
      if (inputValue.length > 1 && inputValue[0] === '0') {
        inputValue = inputValue.substring(1);
      }
      
      // Parse to number
      let numValue = parseInt(inputValue) || 0;
      
      // Apply min/max constraints
      if (min !== undefined && numValue < min) {
        numValue = min;
      }
      if (max !== undefined && numValue > max) {
        numValue = max;
      }
      
      setDisplayValue(numValue.toString());
      onChange(numValue);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      // Ensure value is valid on blur
      let numValue = parseInt(displayValue) || 0;
      
      // Apply min/max constraints
      if (min !== undefined && numValue < min) {
        numValue = min;
      }
      if (max !== undefined && numValue > max) {
        numValue = max;
      }
      
      setDisplayValue(numValue.toString());
      onChange(numValue);
      
      if (onBlur) {
        onBlur(e);
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      // If value is 0, clear it so user can type new number
      if (numericValue === 0) {
        setDisplayValue('');
      } else {
        // Select all text on focus for easy editing
        e.target.select();
      }
    };

    return (
      <Input
        type="text"
        inputMode="numeric"
        ref={ref}
        className={cn(className)}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        {...props}
      />
    );
  }
);
NumberInput.displayName = "NumberInput";

export { NumberInput };

