import React, { useEffect, useRef } from "react";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, MapPin, Receipt, FileText } from "lucide-react";
import { UpdateOrderSchema, UpdateOrderSchemaType, OrderSchemaType } from "../../schemas";
import { useUpdateOrder } from "../../hooks/useOrderMutation";
import { useOrderDetail } from "../../hooks/useOrderQuery";
import { DynamicFormField } from "@/shared/components/DynamicFormField";
import {
  customerBaseFields, vatFields, contractFields, receiverFields, supplierBaseFields,
  ORDER_DETAIL_DEFAULT, ORDER_EXPENSE_DEFAULT,
} from "../../constants";
import { useProductList } from "@/features/products";
import { useOrderTotals } from "../../hooks/useOrderTotals";
import { OrderFormHeader } from "./shared/OrderFormHeader";
import { OrderProductsTable } from "./shared/OrderProductsTable";
import { OrderExpensesTable } from "./shared/OrderExpensesTable";
import { OrderSidebarPaymentFields } from "./shared/OrderSidebarPaymentFields";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-utils";

function sanitizeData<T>(data: T): T {
  if (typeof data === "string") return (data.trim() === "" ? null : data) as T;
  if (Array.isArray(data)) return data.map(sanitizeData) as T;
  if (data !== null && typeof data === "object")
    return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, sanitizeData(v)])) as T;
  return data;
}

interface EditFormProps {
  orderId: string;
  onOrderUpdated: () => void;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

const EditOrderForm: React.FC<EditFormProps> = ({ orderId, onOrderUpdated, onCancel, onDirtyChange }) => {
  const orderQuery = useOrderDetail(orderId);
  const updateOrderMutation = useUpdateOrder();
  const productQuery = useProductList({ page: 1, limit: 1000 });
  const hasInitialized = useRef(false);
  const { toast } = useToast();

  // useOrderDetail unwraps res.data; guard against wrapped response edge case
  const orderData: OrderSchemaType | undefined =
    (orderQuery.data as any)?.data ?? orderQuery.data;

  const methods = useForm<UpdateOrderSchemaType>({
    resolver: yupResolver(UpdateOrderSchema) as any,
    mode: "onTouched",
  });

  const { control, handleSubmit, watch, setValue, reset, formState: { errors, isDirty } } = methods;

  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);

  // Initialize form only once when data first loads — prevents losing unsaved changes on background refetch
  useEffect(() => {
    if (!orderData || hasInitialized.current) return;
    hasInitialized.current = true;
    reset({
      id: orderData.id,
      customerId: orderData.customer?.id ?? "",
      customer: {
        name: orderData.customer?.name ?? "",
        email: orderData.customer?.email ?? null,
        phoneNumber: orderData.customer?.phoneNumber ?? null,
        address: orderData.customer?.address ?? null,
        vatInfo: orderData.customer?.vatInfo ?? null,
        addressInfo: orderData.addressInfo ?? null,
      },
      type: ((orderData.type || orderData.orderType) ?? "sale") as "sale" | "purchase",
      status: (orderData.status?.code ?? null) as any,
      contractCode: orderData.contractCode ?? null,
      purchaseOrderNumber: null,
      note: orderData.note ?? null,
      receiverName: orderData.receiverName ?? null,
      receiverPhone: orderData.receiverPhone ?? null,
      receiverAddress: orderData.receiverAddress ?? null,
      addressInfo: orderData.addressInfo ?? null,
      details: (orderData.details ?? []).map((d) => ({
        productId: d.product.id,
        quantity: d.quantity,
        unitPrice: d.unitPrice,
        vatPercentage: d.vatPercentage ?? 0,
        manageSerials: d.manageSerials ?? false,
        serials: d.serials ?? [],
        warrantyMonths: d.warrantyMonths ?? 1,
      })),
      expenses: (orderData.expenses ?? []).map((e) => ({
        name: e.name,
        amount: e.amount,
        note: e.note ?? "",
      })),
      paymentMethod: (orderData.paymentMethod || "cash") as any,
      initialPayment: orderData.initialPayment ?? 0,
      totalAmount: orderData.totalVatAmount ?? orderData.totalAmount ?? 0,
      // paidAmount: orderData.totalPaidAmount ?? null,
      // debtAmount: orderData.remainingDebt ?? null,
      paymentDeadline: orderData.paymentDeadline || null,
      bank: null,
      tags: (orderData.tags ?? null) as string[] | null | undefined,
    });
  }, [orderData, reset]);

  const { fields: detailFields, append: appendDetail, remove: removeDetail } =
    useFieldArray({ control, name: "details" as any });
  const { fields: expenseFields, append: appendExpense, remove: removeExpense } =
    useFieldArray({ control, name: "expenses" as any });

  const currentType = watch("type") || "sale";
  const currentDetails = watch("details") || [];
  const currentStatus = watch("status");
  const isPurchase = currentType === "purchase";
  const isReadOnly = !!currentStatus && currentStatus !== "new";

  const totals = useOrderTotals(control);

  useEffect(() => {
    setValue("totalAmount", totals.grandTotal, { shouldDirty: false });
    // setValue("debtAmount", Math.max(0, totals.debt), { shouldDirty: false });
  }, [totals.grandTotal, totals.debt, setValue]);

  const productOptions =
    productQuery.data?.data.rows.map((p) => ({ label: `[${p.code}] ${p.name}`, value: p.id })) || [];

  const handleProductSelect = (idx: number, productId: string) => {
    const p = productQuery.data?.data.rows.find((prod) => prod.id === productId);
    if (p) setValue(`details.${idx}.unitPrice` as any, p.price);
  };

  const onSubmit = async (data: UpdateOrderSchemaType) => {
    try {
      await updateOrderMutation.mutateAsync({ orderId, data: sanitizeData(data) });
      onOrderUpdated();
    } catch (err) {
      toast({ title: "Lỗi", description: getErrorMessage(err, "Không thể cập nhật đơn hàng"), variant: "destructive" });
    }
  };

  if (orderQuery.isLoading || !orderData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <OrderFormHeader
        onBack={onCancel}
        title={isPurchase ? "Chỉnh sửa đơn mua hàng" : "Chỉnh sửa đơn bán hàng"}
        subtitle={isPurchase ? "Chỉnh sửa thông tin đơn mua hàng" : "Chỉnh sửa thông tin đơn bán hàng"}
        badgeLabel="Chỉnh sửa đơn hàng"
        codeLabel={orderData?.code ? `#${orderData.code}` : undefined}
      />
      <FormProvider {...methods}>
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit, () => {
            toast({ title: "Lỗi xác thực", description: "Vui lòng kiểm tra lại các trường bắt buộc.", variant: "destructive" });
          })}
          className="animate-in fade-in duration-500 space-y-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 space-y-6">
              {/* Partner Info */}
              <Card className="shadow-premium border-none">
                <CardHeader className="pb-3 border-b flex flex-row items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <CardTitle className="text-sm font-bold  tracking-tight text-slate-500">
                    {isPurchase ? "Thông tin nhà cung cấp" : "Thông tin khách hàng"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-12 gap-4">
                    {isPurchase
                      ? supplierBaseFields.map((f) => (
                        <DynamicFormField key={f.name as string} config={f} isReadOnly={isReadOnly} />
                      ))
                      : customerBaseFields.map((f) => (
                        <DynamicFormField key={f.name as string} config={f} isReadOnly={isReadOnly} />
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* VAT — sale only */}
              {!isPurchase && (
                <Card className="shadow-premium border-none">
                  <CardHeader className="pb-3 border-b flex flex-row items-center gap-2">
                    <Receipt className="w-4 h-4 text-violet-600" />
                    <CardTitle className="text-sm font-bold  text-slate-500">
                      Thông tin VAT
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-12 gap-4">
                      {vatFields.map((f) => (
                        <DynamicFormField key={f.name as string} config={f} isReadOnly={isReadOnly} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Shipping — sale only */}
              {!isPurchase && (
                <Card className="shadow-premium border-none">
                  <CardHeader className="pb-3 border-b flex flex-row items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-600" />
                    <CardTitle className="text-sm font-bold  tracking-tight text-slate-500">
                      Vận chuyển
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-12 gap-4">
                      {receiverFields.map((f) => (
                        <DynamicFormField key={f.name as string} config={f} isReadOnly={isReadOnly} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Contract & Notes */}
              <Card className="shadow-premium border-none">
                <CardHeader className="pb-3 border-b flex flex-row items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <CardTitle className="text-sm font-bold  text-slate-500">
                    Thông tin hợp đồng
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-12 gap-4">
                    {contractFields.map((f) => (
                      <DynamicFormField key={f.name as string} config={f} isReadOnly={isReadOnly} />
                    ))}
                  </div>
                </CardContent>
              </Card>

              <OrderProductsTable
                control={control}
                fields={detailFields}
                currentDetails={currentDetails}
                errors={errors}
                productOptions={productOptions}
                onAppend={() => appendDetail(ORDER_DETAIL_DEFAULT)}
                onRemove={removeDetail}
                onProductSelect={handleProductSelect}
                disabled={isReadOnly}
                orderType={currentType}
              />

              <OrderExpensesTable
                control={control}
                fields={expenseFields}
                expensesTotal={totals.expensesTotal}
                onAppend={() => appendExpense(ORDER_EXPENSE_DEFAULT)}
                onRemove={removeExpense}
                disabled={isReadOnly}
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <OrderSidebarPaymentFields
                control={control}
                errors={errors}
                totals={totals}
                showBreakdown
                showStatus
                isPurchase={isPurchase}
                submitLabel="Cập nhật đơn hàng"
                isSubmitting={updateOrderMutation.isPending}
                onCancel={onCancel}
                accentColor="amber"
                orderId={orderId}
              />
            </div>
          </div>
        </form>
      </FormProvider>
    </>
  );
};

export default EditOrderForm;
