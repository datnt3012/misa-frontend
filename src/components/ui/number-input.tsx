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
  allowDecimal?: boolean; // Cho phép số thập phân (mặc định: false - chỉ số nguyên)
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, value, min, max, onChange, onBlur, allowDecimal = false, ...props }, ref) => {
    // Convert value to number if it's a string
    const parseValue = allowDecimal ? parseFloat : parseInt;
    const numericValue = typeof value === 'string' ? parseValue(value) || 0 : value || 0;
    
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
      
      if (allowDecimal) {
        // Allow digits and one decimal point
        // Remove all characters except digits and decimal point
        inputValue = inputValue.replace(/[^0-9.]/g, '');
        
        // Only allow one decimal point
        const parts = inputValue.split('.');
        if (parts.length > 2) {
          inputValue = parts[0] + '.' + parts.slice(1).join('');
        }
        
        // Remove leading zeros (but keep single zero before decimal point)
        // Handle cases like "00.5" -> "0.5" or "000" -> "0"
        if (parts[0] && parts[0].length > 1 && parts[0][0] === '0') {
          parts[0] = parts[0].replace(/^0+/, '') || '0';
          inputValue = parts.join('.');
        }
        
        // Parse to number
        let numValue = parseFloat(inputValue) || 0;
        
        // Apply min/max constraints
        if (min !== undefined && numValue < min) {
          numValue = min;
        }
        if (max !== undefined && numValue > max) {
          numValue = max;
        }
        
        // If user is typing a decimal (ends with .), keep it in display
        if (inputValue.endsWith('.') && !inputValue.endsWith('..')) {
          setDisplayValue(inputValue);
          onChange(numValue);
        } else {
          setDisplayValue(numValue.toString());
          onChange(numValue);
        }
      } else {
        // Remove all non-digit characters (integer only)
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
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      // Ensure value is valid on blur
      const parseValue = allowDecimal ? parseFloat : parseInt;
      let numValue = parseValue(displayValue) || 0;
      
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

