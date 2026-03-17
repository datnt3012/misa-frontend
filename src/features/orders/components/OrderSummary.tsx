import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '../utils/formatters';

interface OrderSummaryProps {
  totalOrders: number;
  totalAmount: number;
  paidAmount: number;
  debtAmount: number;
  totalExpenses: number;
  orderType: 'sale' | 'purchase';
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  totalOrders, totalAmount, paidAmount, debtAmount, totalExpenses, orderType,
}) => (
  <Card>
    <CardContent className="pt-6">
      <div className="grid grid-cols-5 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold">{totalOrders}</div>
          <div className="text-sm text-muted-foreground">Đơn hàng</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalAmount)}</div>
          <div className="text-sm text-muted-foreground">Tổng tiền</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(paidAmount)}</div>
          <div className="text-sm text-muted-foreground">{orderType === 'sale' ? 'Đã trả' : 'Đã chi'}</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-red-600">{formatCurrency(debtAmount)}</div>
          <div className="text-sm text-muted-foreground">{orderType === 'sale' ? 'Còn nợ' : 'Còn phải trả'}</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalExpenses)}</div>
          <div className="text-sm text-muted-foreground">Tổng chi phí</div>
        </div>
      </div>
    </CardContent>
  </Card>
);
