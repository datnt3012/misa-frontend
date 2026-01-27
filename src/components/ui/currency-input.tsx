import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number | string;
  onChange: (value: number) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  allowDecimal?: boolean; // Cho phép số thập phân (mặc định: true - tiền tệ thường cần số thập phân)
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, onBlur, allowDecimal = true, ...props }, ref) => {
    // Convert value to number if it's a string
    const numericValue = typeof value === 'string' ? parseFloat(value) || 0 : value || 0;
    
    // Format number with thousand separators
    const formatCurrency = (num: number | string): string => {
      let numValue: number;
      if (typeof num === 'string') {
        // If string, parse it properly (handle decimal point)
        numValue = parseFloat(num) || 0;
      } else {
        numValue = num || 0;
      }
      
      if (numValue === 0) return '0';
      const absValue = Math.abs(numValue);
      
      if (allowDecimal) {
        // Format with decimals: split integer and decimal parts
        // Use '.' for thousand separator and ',' for decimal point (Vietnamese format)
        const parts = absValue.toString().split('.');
        const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        const decimalPart = parts[1] ? ',' + parts[1] : '';
        const formatted = integerPart + decimalPart;
        return numValue < 0 ? '-' + formatted : formatted;
      } else {
        // Format without decimals
        const formatted = absValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return numValue < 0 ? '-' + formatted : formatted;
      }
    };

    // Remove thousand separators and convert to number
    const parseCurrency = (str: string): number => {
      if (!str || str === '' || str === '-') return 0;
      
      if (allowDecimal) {
        // Handle decimal numbers: Vietnamese format uses '.' for thousands and ',' for decimal
        // Comma (,) is always decimal separator
        // Dot (.) is decimal only if at the end or has < 3 digits after it
        const isNegative = str.startsWith('-');
        const numPart = isNegative ? str.substring(1) : str;
        
        // Find decimal separator
        const lastCommaIndex = numPart.lastIndexOf(',');
        const lastDotIndex = numPart.lastIndexOf('.');
        
        let decimalIndex = -1;
        
        if (lastCommaIndex !== -1) {
          // Comma found - always use it as decimal separator
          decimalIndex = lastCommaIndex;
        } else if (lastDotIndex !== -1) {
          // Check if dot is at the end or has < 3 digits after
          const afterDot = numPart.substring(lastDotIndex + 1);
          if (numPart.endsWith('.') || afterDot.length < 3) {
            // This dot is a decimal separator
            decimalIndex = lastDotIndex;
          }
          // Otherwise, dot is thousand separator, ignore it
        }
        
        let cleaned: string;
        
        if (decimalIndex !== -1 && decimalIndex < numPart.length - 1) {
          // Has a decimal point - remove all other dots and commas (thousand separators) and convert to dot
          const beforeDecimal = numPart.substring(0, decimalIndex).replace(/[.,]/g, '');
          // After decimal: only remove dots (thousand separators), keep all digits
          let afterDecimal = numPart.substring(decimalIndex + 1);
          afterDecimal = afterDecimal.replace(/\./g, '');
          cleaned = beforeDecimal + '.' + afterDecimal;
        } else {
          // No decimal point - remove all dots and commas (thousand separators)
          cleaned = numPart.replace(/[.,]/g, '');
        }
        
        cleaned = cleaned.replace(/[^0-9.]/g, '');
        if (cleaned === '' || cleaned === '.') return 0;
        const numValue = parseFloat(cleaned) || 0;
        return isNegative ? -numValue : numValue;
      } else {
        // Integer only: remove all dots (thousand separators)
        const cleaned = str.replace(/\./g, '').replace(/[^0-9-]/g, '');
        if (cleaned === '' || cleaned === '-') return 0;
        const isNegative = cleaned.startsWith('-');
        const numPart = isNegative ? cleaned.substring(1) : cleaned;
        if (numPart === '') return 0;
        const numValue = parseFloat(numPart) || 0;
        return isNegative ? -numValue : numValue;
      }
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
      
      if (allowDecimal) {
        // Allow digits, decimal point (comma or dot), thousand separators (dot), and minus sign
        // Comma (,) is always decimal separator
        // Dot (.) is thousand separator, except when at the end (user typing decimal) or has < 3 digits after
        inputValue = inputValue.replace(/[^0-9.,-]/g, '');
        
        // Handle minus sign - always move to start if present
        const hasMinus = inputValue.includes('-');
        const withoutMinus = inputValue.replace(/-/g, '');
        const isNegative = hasMinus;
        
        // Check if user is typing a decimal point (comma or dot at the end)
        const endsWithComma = withoutMinus.endsWith(',');
        const endsWithDot = withoutMinus.endsWith('.') && !withoutMinus.endsWith('..');
        const isTypingDecimal = endsWithComma || endsWithDot;
        
        // Find decimal separator:
        // 1. Comma (,) is ALWAYS decimal separator (no matter how many digits after)
        // 2. Dot (.) is decimal only if at the end (user typing) or has < 3 digits after it
        const lastCommaIndex = withoutMinus.lastIndexOf(',');
        const lastDotIndex = withoutMinus.lastIndexOf('.');
        
        let decimalIndex = -1;
        let isCommaDecimal = false;
        
        if (lastCommaIndex !== -1) {
          // Comma found - ALWAYS use it as decimal separator, regardless of digits after
          decimalIndex = lastCommaIndex;
          isCommaDecimal = true;
        } else if (lastDotIndex !== -1) {
          // Check if dot is at the end (user typing) or has < 3 digits after
          const afterDot = withoutMinus.substring(lastDotIndex + 1);
          if (endsWithDot || afterDot.length < 3) {
            // This dot is a decimal separator
            decimalIndex = lastDotIndex;
            isCommaDecimal = false;
          }
          // Otherwise, dot is thousand separator, ignore it
        }
        
        let numPart: string;
        
        if (decimalIndex !== -1) {
          // Has a decimal point
          // For comma: remove all dots and commas before it (thousand separators)
          // For dot: remove all dots and commas before it (thousand separators)
          // Keep all digits after the decimal separator (don't remove anything after)
          const beforeDecimal = withoutMinus.substring(0, decimalIndex).replace(/[,.]/g, '');
          // After decimal: only remove thousand separators (dots), keep commas if any (shouldn't happen)
          let afterDecimal = withoutMinus.substring(decimalIndex + 1);
          // Remove only dots from afterDecimal (thousand separators), keep all digits
          afterDecimal = afterDecimal.replace(/\./g, '');
          numPart = beforeDecimal + '.' + afterDecimal; // Use dot internally
        } else {
          // No decimal point - remove all commas and dots (all are thousand separators)
          numPart = withoutMinus.replace(/[,.]/g, '');
        }
        
        // Remove leading zeros (but keep single zero before decimal point)
        const parts = numPart.split('.');
        if (parts[0] && parts[0].length > 1 && parts[0][0] === '0') {
          parts[0] = parts[0].replace(/^0+/, '') || '0';
          numPart = parts.join('.');
        }
        
        // If user is typing a decimal point, show it immediately
        if (isTypingDecimal) {
          const integerPart = numPart.split('.')[0] || '';
          if (integerPart === '' || integerPart === '0') {
            setDisplayValue(isNegative ? '-0,' : '0,');
            onChange(0);
            return;
          }
          const intValue = parseFloat(integerPart) || 0;
          const formattedInt = intValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
          setDisplayValue(isNegative ? '-' + formattedInt + ',' : formattedInt + ',');
          onChange(isNegative ? -intValue : intValue);
          return;
        }
        
        // Parse and format
        // If we have a comma as decimal separator, preserve the decimal part as-is during typing
        if (isCommaDecimal && decimalIndex !== -1) {
          const beforeDecimal = withoutMinus.substring(0, decimalIndex).replace(/[,.]/g, '');
          const afterDecimal = withoutMinus.substring(decimalIndex + 1).replace(/\./g, ''); // Only remove dots, keep all digits
          
          // Parse the integer part
          const intValue = parseFloat(beforeDecimal) || 0;
          const formattedInt = intValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
          
          // Keep the decimal part as user typed it (with comma)
          const displayValue = isNegative 
            ? '-' + formattedInt + ',' + afterDecimal 
            : formattedInt + ',' + afterDecimal;
          
          // Parse full value for onChange
          const fullValue = parseFloat(beforeDecimal + '.' + afterDecimal) || 0;
          
          setDisplayValue(displayValue);
          onChange(isNegative ? -fullValue : fullValue);
        } else {
          // Normal parse and format
          const internalValue = isNegative ? '-' + numPart : numPart;
          const numValue = parseCurrency(internalValue);
          const formatted = formatCurrency(numValue);
          
          setDisplayValue(formatted);
          onChange(numValue);
        }
      } else {
        // Integer only: remove all non-digit characters except minus sign
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
      }
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

