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
      const absValue = Math.abs(numValue);
      const formatted = absValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return numValue < 0 ? '-' + formatted : formatted;
    };

    // Remove thousand separators and convert to number
    const parseCurrency = (str: string): number => {
      if (!str || str === '' || str === '-') return 0;
      const cleaned = str.replace(/\./g, '').replace(/[^0-9-]/g, '');
      if (cleaned === '' || cleaned === '-') return 0;
      const isNegative = cleaned.startsWith('-');
      const numPart = isNegative ? cleaned.substring(1) : cleaned;
      if (numPart === '') return 0;
      const numValue = parseFloat(numPart) || 0;
      return isNegative ? -numValue : numValue;
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
      
      // Allow "-" at the start for negative numbers
      // If user types "-" first, allow it
      if (inputValue === '-') {
        setDisplayValue('-');
        onChange(0);
        return;
      }
      
      // Remove all non-digit characters except minus sign
      inputValue = inputValue.replace(/[^0-9-]/g, '');
      
      // Handle minus sign - always move to start if present
      const hasMinus = inputValue.includes('-');
      const digitsOnly = inputValue.replace(/-/g, '');
      
      // If user typed "-" anywhere, move it to start and make number negative
      if (hasMinus) {
        inputValue = '-' + digitsOnly;
      } else {
        inputValue = digitsOnly;
      }
      
      // Handle negative number input
      const isNegative = inputValue.startsWith('-');
      let numPart = isNegative ? inputValue.substring(1) : inputValue;
      
      // Remove leading zeros (but keep single zero)
      if (numPart.length > 1 && numPart[0] === '0') {
        numPart = numPart.replace(/^0+/, '') || '0';
      }
      
      // Reconstruct input value
      inputValue = isNegative ? '-' + numPart : numPart;
      
      // If user is typing "-" followed by numbers, show it immediately with formatting
      if (isNegative && numPart && numPart !== '0') {
        const numValue = parseFloat(numPart) || 0;
        const formattedNum = numValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        setDisplayValue('-' + formattedNum);
        onChange(-numValue);
        return;
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
      // If value is 0, clear it so user can type new number (including "-")
      if (numericValue === 0) {
        setDisplayValue('');
      } else {
        // Don't select all - allow user to easily add "-" at the start
        // Just move cursor to start
        e.target.setSelectionRange(0, 0);
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

