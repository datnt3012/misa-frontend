import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number | string;
  onChange: (value: number) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, onBlur, ...props }, ref) => {
    // Convert value to number if it's a string
    const numericValue = typeof value === 'string' ? parseFloat(value) || 0 : value || 0;
    
    // Format number with thousand separators
    const formatCurrency = (num: number | string): string => {
      const numValue = typeof num === 'string' ? parseFloat(num.replace(/\./g, '')) || 0 : num || 0;
      if (numValue === 0) return '0';
      return numValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    // Remove thousand separators and convert to number
    const parseCurrency = (str: string): number => {
      const cleaned = str.replace(/\./g, '').replace(/[^0-9-]/g, '');
      if (cleaned === '' || cleaned === '-') return 0;
      return parseFloat(cleaned) || 0;
    };

    const [displayValue, setDisplayValue] = React.useState(formatCurrency(numericValue));
    const [isFocused, setIsFocused] = React.useState(false);

    // Update display value when external value changes (but not when focused to avoid interrupting user input)
    React.useEffect(() => {
      if (!isFocused) {
        const formatted = formatCurrency(numericValue);
        setDisplayValue(formatted);
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
      
      // Remove all non-digit characters except minus sign at the start
      inputValue = inputValue.replace(/[^0-9-]/g, '');
      
      // Only allow minus at the start
      if (inputValue.includes('-') && inputValue.indexOf('-') !== 0) {
        inputValue = inputValue.replace(/-/g, '');
      }
      
      // Remove leading zeros (but keep single zero or negative zero)
      // If user is typing and current value is 0, replace it with new input
      if (inputValue.length > 1) {
        if (inputValue[0] === '0' && inputValue[1] !== '-') {
          inputValue = inputValue.substring(1);
        }
        if (inputValue.length > 2 && inputValue[0] === '-' && inputValue[1] === '0' && inputValue[2] !== '-') {
          inputValue = '-' + inputValue.substring(2);
        }
      }
      
      // Parse and format
      const numValue = parseCurrency(inputValue);
      const formatted = formatCurrency(numValue);
      
      setDisplayValue(formatted);
      onChange(numValue);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      // Ensure value is formatted on blur
      const numValue = parseCurrency(displayValue);
      const formatted = formatCurrency(numValue);
      setDisplayValue(formatted);
      
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
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };

