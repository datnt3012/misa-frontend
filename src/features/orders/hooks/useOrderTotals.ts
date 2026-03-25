import { useMemo } from 'react';
import { useWatch, Control } from 'react-hook-form';

export interface OrderTotals {
  subtotal: number;
  totalVat: number;
  expensesTotal: number;
  grandTotal: number;
  debt: number;
}

/**
 * Subscribes directly to form fields via useWatch to guarantee re-calculation
 * whenever details, expenses, or initialPayment change — even for nested field updates
 * (e.g. changing quantity/unitPrice inside a detail row).
 */
export function useOrderTotals(control: Control<any>): OrderTotals {
  const details: any[] = useWatch({ control, name: 'details' }) || [];
  const expenses: any[] = useWatch({ control, name: 'expenses' }) || [];
  const initialPayment: number = useWatch({ control, name: 'initialPayment' }) || 0;

  return useMemo(() => {
    const subtotal = details.reduce(
      (sum, item) => sum + (item?.quantity || 0) * (item?.unitPrice || 0),
      0
    );
    const totalVat = details.reduce(
      (sum, item) =>
        sum + (item?.quantity || 0) * (item?.unitPrice || 0) * ((item?.vatPercentage || 0) / 100),
      0
    );
    const expensesTotal = expenses.reduce((sum, exp) => sum + (exp?.amount || 0), 0);
    const grandTotal = subtotal + totalVat + expensesTotal;
    const debt = grandTotal - initialPayment;
    return { subtotal, totalVat, expensesTotal, grandTotal, debt };
  }, [details, expenses, initialPayment]);
}
