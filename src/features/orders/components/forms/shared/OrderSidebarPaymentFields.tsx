import React from "react";
import { Control, Controller, FieldErrors, useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DatePicker } from "@/shared/components/date-picker";
import BankSelector from "@/components/orders/BankSelector";
import { AlertCircle, AlertTriangle, CheckCircle2, CreditCard, Loader2, Pencil } from "lucide-react";
import {
  ORDER_STATUSES, ORDER_STATUS_LABELS_VI,
  PURCHASE_ORDER_STATUSES, PURCHASE_ORDER_STATUS_LABELS_VI,
} from "@/constants/order-status.constants";
import { PAYMENT_METHOD_OPTIONS } from "../../../constants";
import { formatCurrency } from "../../../utils/formatters";
import type { OrderTotals } from "../../../hooks/useOrderTotals";
import { useUpdateOrderStatus } from "../../../hooks/useOrderMutation";
import { Autocomplete } from "@/shared/components/autocomplete";

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
  orderId?: string;
  mode?: "edit" | "create";
}

// ─── (A) Summary Block ────────────────────────────────────────────────────────

interface SummaryBlockProps {
  totals: OrderTotals;
  showBreakdown: boolean;
}

const SummaryBlock: React.FC<SummaryBlockProps> = ({ totals, showBreakdown }) => (
  <div className="space-y-3">
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-slate-400  tracking-wider">
        Tổng giá trị đơn hàng
      </p>
      <p className="text-3xl font-semibold text-slate-900 tabular-nums leading-tight">
        {formatCurrency(totals.grandTotal)}
      </p>
    </div>

    {showBreakdown && (
      <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 space-y-2">
        <BreakdownRow
          label="Tiền hàng"
          value={totals.subtotal}
          valueClass="text-slate-700"
        />
        <BreakdownRow
          label="Thuế (VAT)"
          value={totals.totalVat}
          valueClass="text-indigo-600"
        />
        <BreakdownRow
          label="Chi phí khác"
          value={totals.expensesTotal}
          valueClass="text-orange-500"
        />
      </div>
    )}
  </div>
);

interface BreakdownRowProps {
  label: string;
  value: number;
  valueClass?: string;
}

const BreakdownRow: React.FC<BreakdownRowProps> = ({ label, value, valueClass = "text-slate-700" }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-slate-500">{label}</span>
    <span className={`font-semibold tabular-nums ${valueClass}`}>
      {formatCurrency(value)}
    </span>
  </div>
);

// ─── (B) Payment Form ─────────────────────────────────────────────────────────

interface PaymentFormProps {
  control: Control<any>;
  errors: FieldErrors<any>;
  showStatus: boolean;
  disabled: boolean;
}

const FieldError: React.FC<{ message?: string }> = ({ message }) =>
  message ? (
    <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
      <AlertCircle className="w-3 h-3 shrink-0" />
      {message}
    </p>
  ) : null;

const PaymentForm: React.FC<PaymentFormProps> = ({ control, errors, showStatus, disabled }) => {
  const paymentMethod = useWatch({ control, name: "paymentMethod" });

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-400  tracking-wider">Thanh toán</p>

      <div className="space-y-1">
        <Label className="text-xs font-semibold text-slate-500">Thanh toán trước</Label>
        <Controller
          name="initialPayment"
          control={control}
          render={({ field }) => (
            <CurrencyInput
              value={field.value}
              onChange={field.onChange}
              className={`h-10 text-base font-bold tabular-nums${errors.initialPayment ? " border-red-500 focus-visible:ring-red-500" : ""}`}
              disabled={disabled}
            />
          )}
        />
        <FieldError message={errors.initialPayment?.message as string} />
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-semibold text-slate-500">
          Phương thức thanh toán <span className="text-destructive">*</span>
        </Label>
        <Controller
          name="paymentMethod"
          control={control}
          render={({ field }) => (
            <Autocomplete
              options={PAYMENT_METHOD_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              placeholder="Chọn phương thức"
              disabled={disabled}
              className={errors.paymentMethod ? "border-red-500" : ""}
            />
          )}
        />
        <FieldError message={errors.paymentMethod?.message as string} />
      </div>

      {paymentMethod === "bank_transfer" && (
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-slate-500">
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
                disabled={disabled}
              />
            )}
          />
          <FieldError message={errors.bank?.message as string} />
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-xs font-semibold text-slate-500">Hạn thanh toán</Label>
        <Controller
          name="paymentDeadline"
          control={control}
          render={({ field }) => (
            <DatePicker
              date={field.value ? new Date(field.value) : undefined}
              setDate={(d) => field.onChange(d ? d.toISOString() : null)}
              disabled={disabled}
            />
          )}
        />
        <FieldError message={errors.paymentDeadline?.message as string} />
      </div>
    </div>
  );
};

// ─── (C) Status Section ───────────────────────────────────────────────────────

interface StatusSectionProps {
  control: Control<any>;
  isPurchase: boolean;
  disabled: boolean;
}

const StatusSection: React.FC<StatusSectionProps> = ({ control, isPurchase, disabled }) => (
  <div className="space-y-1">
    <Label className="text-xs font-semibold text-slate-500  tracking-wider">
      Trạng thái đơn hàng
    </Label>
    <Controller
      name="status"
      control={control}
      disabled={disabled}
      render={({ field }) => (
        <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={disabled}>
          <SelectTrigger className="h-9 font-semibold border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(isPurchase ? PURCHASE_ORDER_STATUSES : ORDER_STATUSES).map((s: string) => (
              <SelectItem key={s} value={s}>
                {(isPurchase ? PURCHASE_ORDER_STATUS_LABELS_VI : ORDER_STATUS_LABELS_VI)[s as keyof typeof ORDER_STATUS_LABELS_VI]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  </div>
);

// ─── Debt Summary ─────────────────────────────────────────────────────────────

interface DebtSummaryProps {
  totals: OrderTotals;
  mode?: "edit" | "create";
}

const DebtSummary: React.FC<DebtSummaryProps> = ({ totals, mode }) => {
  const isPaid = totals.debt <= 0;
  const isOverpaid = totals.grandTotal > 0 && totals.debt < -100;

  if (isOverpaid) {
    return (
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1">
        <div className="flex items-center gap-1.5 text-amber-600">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">Thanh toán vượt quá tổng tiền</span>
        </div>
        <p className="text-xs text-amber-500">
          Đã thu vượt{" "}
          <span className="font-bold tabular-nums">
            {formatCurrency(Math.abs(totals.debt))}
          </span>
        </p>
      </div>
    );
  }

  if (isPaid && mode !== "create") {
    return (
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-semibold text-emerald-700">Đã thanh toán đủ</span>
        </div>
        <span className="text-sm font-bold tabular-nums text-emerald-600">0</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-center justify-between">
      <span className="text-sm font-semibold text-red-600">Còn nợ</span>
      <span className="text-xl font-bold tabular-nums text-red-600">
        {formatCurrency(totals.debt)}
      </span>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

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
  orderId,
  mode,
}) => {
  const currentStatus = useWatch({ control, name: "status" });
  const { setValue } = useFormContext();
  const updateStatusMutation = useUpdateOrderStatus();

  // Only "new" status allows editing; for new orders (no status), always editable
  const isReadOnly = showStatus && currentStatus !== "new";
  const accentBar = accentColor === "amber" ? "bg-amber-500" : "bg-blue-600";

  const handleResetToNew = async () => {
    if (!orderId) return;
    await updateStatusMutation.mutateAsync({ orderId, status: "new" });
    setValue("status", "new");
  };

  return (
    <Card className="sticky top-20 shadow-xl border border-slate-100 overflow-hidden">
      <div className={`h-1 w-full ${accentBar}`} />

      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-400 tracking-wider">
            Tổng kết đơn hàng
          </span>
        </div>

        {/* Read-only banner */}
        {isReadOnly && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-2">
            <p className="text-xs font-semibold text-amber-700">
              Chỉ đơn hàng ở trạng thái <span className="font-black">Mới</span> được phép chỉnh sửa.
            </p>
            {orderId && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={updateStatusMutation.isPending}
                onClick={handleResetToNew}
                className="w-full h-8 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                {updateStatusMutation.isPending ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" /> Đang xử lý...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Pencil className="w-3 h-3" /> Chuyển về Mới để chỉnh sửa
                  </span>
                )}
              </Button>
            )}
          </div>
        )}

        {/* (A) Summary */}
        <SummaryBlock totals={totals} showBreakdown={showBreakdown} />

        <div className="border-t border-slate-100" />

        {/* (B) Payment inputs */}
        <PaymentForm
          control={control}
          errors={errors}
          showStatus={showStatus}
          disabled={isReadOnly}
        />

        {showStatus && (
          <>
            <div className="border-t border-slate-100" />
            {/* (C) Status */}
            <StatusSection
              control={control}
              isPurchase={isPurchase}
              disabled={currentStatus === "new" ? false : true}
            />
          </>
        )}

        <div className="border-t border-slate-100" />

        {/* Debt summary */}
        <DebtSummary totals={totals} mode={mode} />

        {/* Root error */}
        {errors.root && (
          <p className="text-red-500 text-xs">{errors.root.message as string}</p>
        )}

        {/* CTAs */}
        <div className="space-y-2 pt-1">
          <Button
            type="submit"
            disabled={isSubmitting || isReadOnly}
            className="w-full h-11 bg-slate-900 hover:bg-slate-700 text-white font-bold text-sm"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang xử lý...
              </span>
            ) : (
              submitLabel
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            type="button"
            className="w-full h-10 font-medium text-sm text-slate-600"
          >
            Hủy bỏ
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
