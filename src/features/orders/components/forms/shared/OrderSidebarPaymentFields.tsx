import React from "react";
import { Control, Controller, FieldErrors, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DatePicker } from "@/shared/components/date-picker";
import BankSelector from "@/components/orders/BankSelector";
import { CreditCard } from "lucide-react";
import {
  ORDER_STATUSES, ORDER_STATUS_LABELS_VI,
  PURCHASE_ORDER_STATUSES, PURCHASE_ORDER_STATUS_LABELS_VI,
} from "@/constants/order-status.constants";
import { PAYMENT_METHOD_OPTIONS } from "../../../constants";
import { formatCurrency } from "../../../utils/formatters";
import type { OrderTotals } from "../../../hooks/useOrderTotals";

interface OrderSidebarPaymentFieldsProps {
  control: Control<any>;
  errors: FieldErrors<any>;
  totals: OrderTotals;
  showBreakdown?: boolean;
  showStatus?: boolean;
  isPurchase?: boolean;
  submitLabel: string;
  isSubmitting: boolean;
  onCancel: () => void;
  accentColor?: "blue" | "amber";
}

export const OrderSidebarPaymentFields: React.FC<OrderSidebarPaymentFieldsProps> = ({
  control,
  errors,
  totals,
  showBreakdown = false,
  showStatus = false,
  isPurchase = false,
  submitLabel,
  isSubmitting,
  onCancel,
  accentColor = "blue",
}) => {
  const paymentMethod = useWatch({ control, name: "paymentMethod" });
  const accentClass = accentColor === "amber" ? "bg-amber-500" : "bg-blue-600";
  const accentIconClass = accentColor === "amber" ? "text-amber-500" : "text-blue-600";

  return (
    <Card className="sticky top-20 shadow-xl border-none overflow-hidden">
      <div className={`h-1 ${accentClass}`} />
      <CardHeader className="p-4 pb-2 flex flex-row items-center gap-2">
        <CreditCard className={`w-4 h-4 ${accentIconClass}`} />
        <CardTitle className="text-xs font-bold uppercase text-slate-400">
          Tổng kết đơn hàng
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        <div className="space-y-1">
          <div className="text-sm text-slate-500 font-medium">Tổng giá trị đơn hàng</div>
          <div className="text-3xl font-black text-slate-900">
            {formatCurrency(totals.grandTotal)}
          </div>
        </div>

        {showBreakdown && (
          <div className="space-y-2 pt-3 border-t text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Tiền hàng:</span>
              <span className="font-bold">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Thuế (VAT):</span>
              <span className="font-bold">{formatCurrency(totals.totalVat)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Chi phí khác:</span>
              <span className="font-bold">{formatCurrency(totals.expensesTotal)}</span>
            </div>
          </div>
        )}

        <div className="space-y-3 pt-3 border-t">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-blue-600 font-bold">Thanh toán trước</Label>
            <Controller
              name="initialPayment"
              control={control}
              render={({ field }) => (
                <CurrencyInput
                  value={field.value}
                  onChange={field.onChange}
                  className="h-10 text-lg font-bold"
                />
              )}
            />
            {errors.initialPayment && (
              <p className="text-red-500 text-xs">{errors.initialPayment.message as string}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-slate-500 font-bold">
              Phương thức thanh toán
            </Label>
            <Controller
              name="paymentMethod"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Chọn phương thức" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHOD_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {paymentMethod === "bank_transfer" && (
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-slate-500 font-bold">
                Ngân hàng {!showStatus && <span className="text-destructive">*</span>}
              </Label>
              <Controller
                name="bank"
                control={control}
                render={({ field }) => (
                  <BankSelector
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    placeholder="Chọn ngân hàng"
                  />
                )}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-slate-500 font-bold">Hạn thanh toán</Label>
            <Controller
              name="paymentDeadline"
              control={control}
              render={({ field }) => (
                <DatePicker
                  date={field.value ? new Date(field.value) : undefined}
                  setDate={(d) => field.onChange(d ? d.toISOString() : null)}
                />
              )}
            />
          </div>

          {showStatus && (
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs font-bold uppercase text-slate-400">
                Trạng thái đơn hàng
              </Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger className="h-10 font-bold border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(isPurchase ? PURCHASE_ORDER_STATUSES : ORDER_STATUSES).map((s) => (
                        <SelectItem key={s} value={s}>
                          {(isPurchase
                            ? PURCHASE_ORDER_STATUS_LABELS_VI
                            : ORDER_STATUS_LABELS_VI)[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          <div className="space-y-1 pt-2 border-t">
            <Label className="text-xs uppercase text-red-500 font-bold">Còn nợ</Label>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(Math.max(0, totals.debt))}
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 bg-slate-900 text-white font-bold"
          >
            {isSubmitting ? "Đang xử lý..." : submitLabel}
          </Button>
          <Button variant="outline" onClick={onCancel} type="button" className="w-full h-11">
            Hủy bỏ
          </Button>
        </div>

        {errors.root && (
          <p className="text-red-500 text-xs">{errors.root.message as string}</p>
        )}
      </CardContent>
    </Card>
  );
};
