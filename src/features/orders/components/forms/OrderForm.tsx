
import React, { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray, Controller, FormProvider } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trash2, Plus, ShoppingCart, ShoppingBag, User, Package,
  MapPin, CreditCard, ReceiptText, FileText, Receipt,
  Building2,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { formatCurrency } from "../../utils/formatters";
import { CreateOrderSchemaType, CreateOrderSchema, UpdateOrderSchema, UpdateOrderSchemaType, OrderSchemaType } from "../../schemas";
import { useCreateOrder } from "../../hooks";
import { useUpdateOrder } from "../../hooks/useOrderMutation";
import { useOrderDetail } from "../../hooks/useOrderQuery";
import { DynamicFormField } from "@/shared/components/DynamicFormField";
import { Autocomplete } from "@/shared/components/autocomplete";
import BankSelector from "@/components/orders/BankSelector";
import { useCustomerMutation } from "@/features/customers/hooks";
import { useSupplierMutation } from "@/features/suppliers/hooks";
import { customerBaseFields, vatFields, contractFields, receiverFields, supplierBaseFields } from "../../constants";
import { useProductList } from "@/features/products";
import { CustomerSchemaType } from "@/features/customers/schemas";
import { BackendResponse } from "@/shared/schemas";
import { SupplierSchemaType } from "@/features/suppliers/schemas";
import { orderApi, Order } from "@/api/order.api";
import { paymentsApi, Payment } from "@/api/payments.api";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-utils";
import {
  ORDER_STATUSES, ORDER_STATUS_LABELS_VI,
  PURCHASE_ORDER_STATUSES, PURCHASE_ORDER_STATUS_LABELS_VI,
  getOrderStatusConfig,
} from "@/constants/order-status.constants";
import { API_CONFIG } from "@/config/api";
import { SlipCreatingDialog } from "@/components/inventory/SlipCreatingDialog";
import { PaymentDialog } from "@/components/PaymentDialog";
import { DatePicker } from "@/shared/components/date-picker";

export type OrderFormMode = "create" | "edit" | "view";

interface OrderFormProps {
  mode: OrderFormMode;
  orderId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

// =============================================================================
// Create Form
// =============================================================================
interface CreateFormProps {
  onOrderCreated: () => void;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

const CreateForm: React.FC<CreateFormProps> = ({ onOrderCreated, onCancel, onDirtyChange }) => {
  const createOrderMutation = useCreateOrder();
  const createCustomerMutation = useCustomerMutation().createCustomer;
  const createSupplierMutation = useSupplierMutation().createSupplier;
  const productQuery = useProductList({ page: 1, limit: 1000 });

  const methods = useForm<CreateOrderSchemaType>({
    resolver: yupResolver(CreateOrderSchema),
    defaultValues: { type: "sale", paymentMethod: "cash" },
  });

  const { control, handleSubmit, watch, setValue, reset, formState: { errors, isDirty } } = methods;
  const { fields: detailFields, append: appendDetail, remove: removeDetail } = useFieldArray({ control, name: "details" as any });
  const { fields: expenseFields, append: appendExpense, remove: removeExpense } = useFieldArray({ control, name: "expenses" as any });

  const currentType = watch("type") || "sale";
  const currentDetails = watch("details") || [];
  const currentExpenses = watch("expenses") || [];
  const initialPayment = watch("initialPayment") || 0;
  const paymentMethod = watch("paymentMethod");
  const customerData = watch("customer");

  const totals = useMemo(() => {
    const subtotal = currentDetails.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
    const totalVat = currentDetails.reduce((sum, item) =>
      sum + ((item.quantity || 0) * (item.unitPrice || 0) * ((item.vatPercentage || 0) / 100)), 0);
    const expensesTotal = currentExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const grandTotal = subtotal + totalVat + expensesTotal;
    const debt = grandTotal - initialPayment;
    return { subtotal, totalVat, expensesTotal, grandTotal, debt };
  }, [currentDetails, currentExpenses, initialPayment]);

  useEffect(() => {
    setValue("totalAmount", totals.grandTotal, { shouldDirty: false });
    setValue("debtAmount", Math.max(0, totals.debt), { shouldDirty: false });
  }, [totals.grandTotal, totals.debt, setValue]);

  useEffect(() => {
    setValue("receiverName", customerData?.name, { shouldDirty: false });
    setValue("receiverPhone", customerData?.phoneNumber, { shouldDirty: false });
    setValue("receiverAddress", customerData?.address, { shouldDirty: false });
    setValue("addressInfo.provinceCode", customerData?.addressInfo?.provinceCode, { shouldDirty: false });
    setValue("addressInfo.wardCode", customerData?.addressInfo?.wardCode, { shouldDirty: false });
  }, [customerData, setValue]);

  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);

  const onSubmit = async (data: CreateOrderSchemaType) => {
    let resolvedCustomerId = data.customerId;
    if (data.customerId === "__new__") {
      if (data.type === "sale") {
        const payload = {
          name: data.customer.name, phoneNumber: data.customer.phoneNumber,
          email: data.customer.email || null, address: data.customer.address || null,
          addressInfo: data.addressInfo || null,
        };
        const customer = await createCustomerMutation.mutateAsync(payload) as BackendResponse<CustomerSchemaType>;
        resolvedCustomerId = customer.data.id;
      } else {
        const supplier = await createSupplierMutation.mutateAsync({ ...data.customer, addressInfo: data.addressInfo }) as BackendResponse<SupplierSchemaType>;
        resolvedCustomerId = supplier.data.id;
      }
    }
    await createOrderMutation.mutateAsync({ ...data, customerId: resolvedCustomerId });
    onOrderCreated();
  };

  return (
    <FormProvider {...methods}>
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="animate-in fade-in duration-500 pb-20 space-y-6">
        <Tabs value={currentType} onValueChange={(v) => { reset(), setValue("type", v as any), setValue("paymentMethod", "cash") }} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px] h-11 bg-slate-100 p-1">
            <TabsTrigger value="sale"><ShoppingCart className="w-4 h-4 mr-2" /> Bán hàng</TabsTrigger>
            <TabsTrigger value="purchase"><ShoppingBag className="w-4 h-4 mr-2" /> Mua hàng</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {/* Partner Info */}
            <Card className="shadow-premium border-none">
              <CardHeader className="pb-3 border-b flex flex-row items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <CardTitle className="text-sm font-bold uppercase text-slate-500">
                  {currentType === "sale" ? "Thông tin khách hàng" : "Thông tin nhà cung cấp"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-12 gap-4">
                  {currentType === "sale"
                    ? customerBaseFields.map((f) => <DynamicFormField key={f.name as string} config={f} />)
                    : supplierBaseFields.map((f) => <DynamicFormField key={f.name as string} config={f} />)}
                </div>
              </CardContent>
            </Card>

            {/* VAT — sale only */}
            {currentType === "sale" && (
              <Card className="shadow-premium border-none">
                <CardHeader className="pb-3 border-b flex flex-row items-center gap-2">
                  <Receipt className="w-4 h-4 text-violet-600" />
                  <CardTitle className="text-sm font-bold uppercase text-slate-500">Thông tin VAT</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-12 gap-4">
                    {vatFields.map((f) => <DynamicFormField key={f.name as string} config={f} />)}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Shipping — sale only */}
            {currentType === "sale" && (
              <Card className="shadow-premium border-none">
                <CardHeader className="pb-3 border-b flex flex-row items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-600" />
                  <CardTitle className="text-sm font-bold uppercase text-slate-500">Vận chuyển</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-12 gap-4">
                    {receiverFields.map((f) => <DynamicFormField key={f.name as string} config={f} />)}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contract & Notes */}
            <Card className="shadow-premium border-none">
              <CardHeader className="pb-3 border-b flex flex-row items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <CardTitle className="text-sm font-bold uppercase text-slate-500">Thông tin hợp đồng</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-12 gap-4">
                  {contractFields.map((f) => <DynamicFormField key={f.name as string} config={f} />)}
                </div>
              </CardContent>
            </Card>

            {/* Products Table */}
            <Card className="shadow-premium border-none overflow-hidden">
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase text-slate-500 flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-600" /> Sản phẩm
                </CardTitle>
                <Button onClick={() => appendDetail({ productId: "", quantity: 1, unitPrice: 0, vatPercentage: 0 })}
                  size="sm" variant="outline" type="button" className="h-8 border-dashed">
                  <Plus className="w-3 h-3 mr-1" /> Thêm dòng
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="w-10 text-center">#</TableHead>
                      <TableHead>Tên SP</TableHead>
                      <TableHead className="w-24 text-center">SL</TableHead>
                      <TableHead className="w-32 text-right">Đơn giá</TableHead>
                      <TableHead className="w-20 text-center">VAT%</TableHead>
                      <TableHead className="w-36 text-right">Chưa VAT</TableHead>
                      <TableHead className="w-36 text-right pr-4">Có VAT</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailFields.map((field, idx) => (
                      <TableRow key={field.id}>
                        <TableCell className="text-center">{idx + 1}</TableCell>
                        <TableCell>
                          <Controller name={`details.${idx}.productId` as any} control={control}
                            render={({ field }) => (
                              <Autocomplete
                                options={productQuery.data?.data.rows.map((p) => ({ label: `[${p.code}] ${p.name}`, value: p.id })) || []}
                                value={field.value} placeholder="Chọn sản phẩm"
                                onChange={(v) => {
                                  field.onChange(v);
                                  const p = productQuery.data?.data.rows.find((prod) => prod.id === v);
                                  if (p) setValue(`details.${idx}.unitPrice` as any, p.price);
                                }}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller name={`details.${idx}.quantity` as any} control={control}
                            render={({ field }) => <NumberInput value={field.value} onChange={field.onChange} min={1} />} />
                        </TableCell>
                        <TableCell>
                          <Controller name={`details.${idx}.unitPrice` as any} control={control}
                            render={({ field }) => <CurrencyInput value={field.value} onChange={field.onChange} />} />
                        </TableCell>
                        <TableCell>
                          <Controller name={`details.${idx}.vatPercentage` as any} control={control}
                            render={({ field }) => <NumberInput value={field.value} onChange={field.onChange} min={0} max={100} allowDecimal />} />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency((currentDetails[idx]?.quantity || 0) * (currentDetails[idx]?.unitPrice || 0))}
                        </TableCell>
                        <TableCell className="text-right pr-4 font-bold">
                          {formatCurrency((currentDetails[idx]?.quantity || 0) * (currentDetails[idx]?.unitPrice || 0) * (1 + (currentDetails[idx]?.vatPercentage || 0) / 100))}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeDetail(idx)} type="button">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {errors.details && <p className="text-red-500 text-xs p-4">{errors.details.message}</p>}
              </CardContent>
            </Card>

            {/* Expenses Table */}
            <Card className="shadow-premium border-none overflow-hidden">
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase text-slate-500 flex items-center gap-2">
                  <ReceiptText className="w-4 h-4 text-orange-500" /> Chi phí
                </CardTitle>
                <Button onClick={() => appendExpense({ name: "", amount: 0, note: "" })}
                  size="sm" variant="outline" type="button" className="h-8 border-dashed">
                  <Plus className="w-3 h-3 mr-1" /> Thêm chi phí
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {expenseFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4">
                    Chưa có chi phí nào. Nhấn <span className="font-medium">Thêm chi phí</span> để bắt đầu.
                  </p>
                ) : (
                  <>
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow>
                          <TableHead>Tên chi phí</TableHead>
                          <TableHead className="w-40">Số tiền</TableHead>
                          <TableHead>Ghi chú</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenseFields.map((field, idx) => (
                          <TableRow key={field.id}>
                            <TableCell>
                              <Controller name={`expenses.${idx}.name` as any} control={control}
                                render={({ field }) => (
                                  <input {...field} className="w-full bg-transparent outline-none text-sm" placeholder="Ví dụ: Phí vận chuyển" />
                                )} />
                            </TableCell>
                            <TableCell>
                              <Controller name={`expenses.${idx}.amount` as any} control={control}
                                render={({ field }) => <CurrencyInput value={field.value} onChange={field.onChange} />} />
                            </TableCell>
                            <TableCell>
                              <Controller name={`expenses.${idx}.note` as any} control={control}
                                render={({ field }) => (
                                  <input {...field} className="w-full bg-transparent outline-none text-sm" placeholder="Ghi chú (không bắt buộc)" />
                                )} />
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => removeExpense(idx)} type="button">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="px-4 py-2 text-right text-xs text-slate-500 border-t">
                      Tổng chi phí: <span className="font-bold text-orange-600">{formatCurrency(totals.expensesTotal)}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="sticky top-4 shadow-xl border-none overflow-hidden">
              <div className="h-1 bg-blue-600" />
              <CardHeader className="p-4 pb-2 flex flex-row items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <CardTitle className="text-[10px] font-bold uppercase text-slate-400">Tổng kết đơn hàng</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                <div className="space-y-1">
                  <div className="text-xs text-slate-500 font-medium">Tổng giá trị đơn hàng</div>
                  <div className="text-3xl font-black text-slate-900">{formatCurrency(totals.grandTotal)}</div>
                </div>
                <div className="space-y-3 pt-3 border-t">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase text-blue-600 font-bold">Thanh toán trước</Label>
                    <Controller name="initialPayment" control={control}
                      render={({ field }) => <CurrencyInput value={field.value} onChange={field.onChange} className="h-10 text-lg font-bold" />} />
                    {errors.initialPayment && <p className="text-red-500 text-xs">{errors.initialPayment.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase text-slate-500 font-bold">Phương thức thanh toán</Label>
                    <Controller name="paymentMethod" control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Chọn phương thức" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Tiền mặt</SelectItem>
                            <SelectItem value="bank_transfer">Chuyển khoản</SelectItem>
                          </SelectContent>
                        </Select>
                      )} />
                  </div>
                  {paymentMethod === "bank_transfer" && (
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase text-slate-500 font-bold">Ngân hàng <span className="text-destructive">*</span></Label>
                      <Controller name="bank" control={control}
                        render={({ field }) => <BankSelector value={field.value || ""} onValueChange={field.onChange} placeholder="Chọn ngân hàng" />} />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase text-slate-500 font-bold">Hạn thanh toán</Label>
                    <Controller name="paymentDeadline" control={control}
                      render={({ field }) => (
                        <DatePicker
                          date={field.value ? new Date(field.value) : undefined}
                          setDate={(d) => field.onChange(d ? d.toISOString() : null)}
                        />
                      )} />
                  </div>
                  <div className="space-y-1 pt-2 border-t">
                    <Label className="text-[10px] uppercase text-red-500 font-bold">Còn nợ</Label>
                    <div className="text-2xl font-bold text-red-600">{formatCurrency(Math.max(0, totals.debt))}</div>
                  </div>
                  <Button type="submit" disabled={createOrderMutation.isPending} className="w-full h-11 bg-slate-900 text-white font-bold">
                    {createOrderMutation.isPending ? "Đang xử lý..." : "Xác nhận tạo đơn"}
                  </Button>
                  <Button variant="outline" onClick={onCancel} type="button" className="w-full h-11">Hủy bỏ</Button>
                </div>
                {errors.root && <p className="text-red-500 text-xs">{errors.root.message}</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};

// =============================================================================
// Edit Form
// =============================================================================
interface EditFormProps {
  orderId: string;
  onOrderUpdated: () => void;
  onCancel: () => void;
}

const EditForm: React.FC<EditFormProps> = ({ orderId, onOrderUpdated, onCancel }) => {
  const orderQuery = useOrderDetail(orderId);
  const updateOrderMutation = useUpdateOrder();
  const productQuery = useProductList({ page: 1, limit: 1000 });

  const order = orderQuery.data as unknown as (OrderSchemaType & { data?: OrderSchemaType }) | undefined;
  // Handle both wrapped ({ data: OrderSchemaType }) and unwrapped responses
  const orderData: OrderSchemaType | undefined = (order as any)?.data ?? order;

  const defaultValues = useMemo<UpdateOrderSchemaType | undefined>(() => {
    if (!orderData) return undefined;
    return {
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
      status: (orderData.status?.code ?? null) as "new" | "confirmed" | "shipping" | "completed" | "cancelled" | null | undefined,
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
      })),
      expenses: (orderData.expenses ?? []).map((e) => ({
        name: e.name,
        amount: e.amount,
        note: e.note ?? "",
      })),
      paymentMethod: (orderData.paymentMethod ?? "cash") as any,
      initialPayment: orderData.initialPayment ?? 0,
      totalAmount: orderData.totalVatAmount ?? orderData.totalAmount ?? 0,
      paidAmount: orderData.totalPaidAmount ?? null,
      debtAmount: orderData.remainingDebt ?? null,
      paymentDeadline: orderData.paymentDeadline ?? null,
      bank: null,
      tags: (orderData.tags ?? null) as string[] | null | undefined,
    };
  }, [orderData]);

  const methods = useForm<UpdateOrderSchemaType>({
    resolver: yupResolver(UpdateOrderSchema) as any,
    defaultValues: defaultValues as any,
  });

  const { control, handleSubmit, watch, setValue, reset, formState: { errors } } = methods;

  useEffect(() => {
    if (defaultValues) reset(defaultValues as any);
  }, [defaultValues, reset]);

  const { fields: detailFields, append: appendDetail, remove: removeDetail } = useFieldArray({ control, name: "details" as any });
  const { fields: expenseFields, append: appendExpense, remove: removeExpense } = useFieldArray({ control, name: "expenses" as any });

  const currentType = watch("type") || "sale";
  const currentDetails = watch("details") || [];
  const currentExpenses = watch("expenses") || [];
  const initialPayment = watch("initialPayment") || 0;
  const paymentMethod = watch("paymentMethod");

  const totals = useMemo(() => {
    const subtotal = currentDetails.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
    const totalVat = currentDetails.reduce((sum, item) =>
      sum + ((item.quantity || 0) * (item.unitPrice || 0) * ((item.vatPercentage || 0) / 100)), 0);
    const expensesTotal = currentExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const grandTotal = subtotal + totalVat + expensesTotal;
    const debt = grandTotal - initialPayment;
    return { subtotal, totalVat, expensesTotal, grandTotal, debt };
  }, [currentDetails, currentExpenses, initialPayment]);

  useEffect(() => {
    setValue("totalAmount", totals.grandTotal, { shouldDirty: false });
    setValue("debtAmount", Math.max(0, totals.debt), { shouldDirty: false });
  }, [totals.grandTotal, totals.debt, setValue]);

  const onSubmit = async (data: UpdateOrderSchemaType) => {
    await updateOrderMutation.mutateAsync({ orderId, data });
    onOrderUpdated();
  };

  if (orderQuery.isLoading || !orderData) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;
  }

  const isPurchase = currentType === "purchase";

  return (
    <FormProvider {...methods}>
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="animate-in fade-in duration-500 pb-20 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {/* Partner Info */}
            <Card className="shadow-premium border-none">
              <CardHeader className="pb-3 border-b flex flex-row items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <CardTitle className="text-sm font-bold uppercase tracking-tight text-slate-500">
                  {isPurchase ? "Thông tin nhà cung cấp" : "Thông tin khách hàng"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-12 gap-4">
                  {isPurchase
                    ? supplierBaseFields.map((f) => <DynamicFormField key={f.name as string} config={f} />)
                    : customerBaseFields.map((f) => <DynamicFormField key={f.name as string} config={f} />)}
                </div>
              </CardContent>
            </Card>

            {/* VAT — sale only */}
            {!isPurchase && (
              <Card className="shadow-premium border-none">
                <CardHeader className="pb-3 border-b flex flex-row items-center gap-2">
                  <Receipt className="w-4 h-4 text-violet-600" />
                  <CardTitle className="text-sm font-bold uppercase text-slate-500">Thông tin VAT</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-12 gap-4">
                    {vatFields.map((f) => <DynamicFormField key={f.name as string} config={f} />)}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Shipping — sale only */}
            {!isPurchase && (
              <Card className="shadow-premium border-none">
                <CardHeader className="pb-3 border-b flex flex-row items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-600" />
                  <CardTitle className="text-sm font-bold uppercase tracking-tight text-slate-500">Vận chuyển</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-12 gap-4">
                    {receiverFields.map((f) => <DynamicFormField key={f.name as string} config={f} />)}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contract & Notes */}
            <Card className="shadow-premium border-none">
              <CardHeader className="pb-3 border-b flex flex-row items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <CardTitle className="text-sm font-bold uppercase text-slate-500">Thông tin hợp đồng</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-12 gap-4">
                  {contractFields.map((f) => <DynamicFormField key={f.name as string} config={f} />)}
                </div>
              </CardContent>
            </Card>

            {/* Products Table */}
            <Card className="shadow-premium border-none overflow-hidden">
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase text-slate-500 flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-600" /> Sản phẩm
                </CardTitle>
                <Button onClick={() => appendDetail({ productId: "", quantity: 1, unitPrice: 0, vatPercentage: 0 })}
                  size="sm" variant="outline" type="button" className="h-8 border-dashed">
                  <Plus className="w-3 h-3 mr-1" /> Thêm dòng
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="w-10 text-center">#</TableHead>
                      <TableHead>Tên SP</TableHead>
                      <TableHead className="w-24 text-center">SL</TableHead>
                      <TableHead className="w-32 text-right">Đơn giá</TableHead>
                      <TableHead className="w-20 text-center">VAT%</TableHead>
                      <TableHead className="w-36 text-right">Chưa VAT</TableHead>
                      <TableHead className="w-36 text-right pr-4">Có VAT</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailFields.map((field, idx) => (
                      <TableRow key={field.id}>
                        <TableCell className="text-center">{idx + 1}</TableCell>
                        <TableCell>
                          <Controller name={`details.${idx}.productId` as any} control={control}
                            render={({ field }) => (
                              <Autocomplete
                                options={productQuery.data?.data.rows.map((p) => ({ label: `[${p.code}] ${p.name}`, value: p.id })) || []}
                                value={field.value} placeholder="Chọn sản phẩm"
                                onChange={(v) => {
                                  field.onChange(v);
                                  const p = productQuery.data?.data.rows.find((prod) => prod.id === v);
                                  if (p) setValue(`details.${idx}.unitPrice` as any, p.price);
                                }}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller name={`details.${idx}.quantity` as any} control={control}
                            render={({ field }) => <NumberInput value={field.value} onChange={field.onChange} min={1} />} />
                        </TableCell>
                        <TableCell>
                          <Controller name={`details.${idx}.unitPrice` as any} control={control}
                            render={({ field }) => <CurrencyInput value={field.value} onChange={field.onChange} />} />
                        </TableCell>
                        <TableCell>
                          <Controller name={`details.${idx}.vatPercentage` as any} control={control}
                            render={({ field }) => <NumberInput value={field.value} onChange={field.onChange} min={0} max={100} allowDecimal />} />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency((currentDetails[idx]?.quantity || 0) * (currentDetails[idx]?.unitPrice || 0))}
                        </TableCell>
                        <TableCell className="text-right pr-4 font-bold">
                          {formatCurrency((currentDetails[idx]?.quantity || 0) * (currentDetails[idx]?.unitPrice || 0) * (1 + (currentDetails[idx]?.vatPercentage || 0) / 100))}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeDetail(idx)} type="button">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {errors.details && <p className="text-red-500 text-xs p-4">{errors.details.message}</p>}
              </CardContent>
            </Card>

            {/* Expenses Table */}
            <Card className="shadow-premium border-none overflow-hidden">
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase text-slate-500 flex items-center gap-2">
                  <ReceiptText className="w-4 h-4 text-orange-500" /> Chi phí
                </CardTitle>
                <Button onClick={() => appendExpense({ name: "", amount: 0, note: "" })}
                  size="sm" variant="outline" type="button" className="h-8 border-dashed">
                  <Plus className="w-3 h-3 mr-1" /> Thêm chi phí
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {expenseFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4">
                    Chưa có chi phí nào. Nhấn <span className="font-medium">Thêm chi phí</span> để bắt đầu.
                  </p>
                ) : (
                  <>
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow>
                          <TableHead>Tên chi phí</TableHead>
                          <TableHead className="w-40">Số tiền</TableHead>
                          <TableHead>Ghi chú</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenseFields.map((field, idx) => (
                          <TableRow key={field.id}>
                            <TableCell>
                              <Controller name={`expenses.${idx}.name` as any} control={control}
                                render={({ field }) => (
                                  <input {...field} className="w-full bg-transparent outline-none text-sm" placeholder="Ví dụ: Phí vận chuyển" />
                                )} />
                            </TableCell>
                            <TableCell>
                              <Controller name={`expenses.${idx}.amount` as any} control={control}
                                render={({ field }) => <CurrencyInput value={field.value} onChange={field.onChange} />} />
                            </TableCell>
                            <TableCell>
                              <Controller name={`expenses.${idx}.note` as any} control={control}
                                render={({ field }) => (
                                  <input {...field} className="w-full bg-transparent outline-none text-sm" placeholder="Ghi chú (không bắt buộc)" />
                                )} />
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => removeExpense(idx)} type="button">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="px-4 py-2 text-right text-xs text-slate-500 border-t">
                      Tổng chi phí: <span className="font-bold text-orange-600">{formatCurrency(totals.expensesTotal)}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="sticky top-4 shadow-xl border-none overflow-hidden">
              <div className="h-1 bg-amber-500" />
              <CardHeader className="p-4 pb-2 flex flex-row items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-500" />
                <CardTitle className="text-[10px] font-bold uppercase text-slate-400">Tổng kết đơn hàng</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                <div className="space-y-1">
                  <div className="text-xs text-slate-500 font-medium">Tổng giá trị đơn hàng</div>
                  <div className="text-3xl font-black text-slate-900">{formatCurrency(totals.grandTotal)}</div>
                </div>
                <div className="space-y-2 pt-3 border-t text-xs">
                  <div className="flex justify-between"><span className="text-slate-500">Tiền hàng:</span><span className="font-bold">{formatCurrency(totals.subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Thuế (VAT):</span><span className="font-bold">{formatCurrency(totals.totalVat)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Chi phí khác:</span><span className="font-bold">{formatCurrency(totals.expensesTotal)}</span></div>
                </div>
                <div className="space-y-3 pt-3 border-t">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase text-blue-600 font-bold">Thanh toán trước</Label>
                    <Controller name="initialPayment" control={control}
                      render={({ field }) => <CurrencyInput value={field.value} onChange={field.onChange} className="h-10 text-lg font-bold" />} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase text-slate-500 font-bold">Phương thức thanh toán</Label>
                    <Controller name="paymentMethod" control={control}
                      render={({ field }) => (
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Chọn phương thức" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Tiền mặt</SelectItem>
                            <SelectItem value="bank_transfer">Chuyển khoản</SelectItem>
                          </SelectContent>
                        </Select>
                      )} />
                  </div>
                  {paymentMethod === "bank_transfer" && (
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase text-slate-500 font-bold">Ngân hàng</Label>
                      <Controller name="bank" control={control}
                        render={({ field }) => <BankSelector value={field.value || ""} onValueChange={field.onChange} placeholder="Chọn ngân hàng" />} />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase text-slate-500 font-bold">Hạn thanh toán</Label>
                    <Controller name="paymentDeadline" control={control}
                      render={({ field }) => (
                        <DatePicker
                          date={field.value ? new Date(field.value) : undefined}
                          setDate={(d) => field.onChange(d ? d.toISOString() : null)}
                        />
                      )} />
                  </div>
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-[10px] font-bold uppercase text-slate-400">Trạng thái đơn hàng</Label>
                    <Controller name="status" control={control}
                      render={({ field }) => (
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <SelectTrigger className="h-10 font-bold border-slate-200"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(isPurchase ? PURCHASE_ORDER_STATUSES : ORDER_STATUSES).map(s => (
                              <SelectItem key={s} value={s}>{(isPurchase ? PURCHASE_ORDER_STATUS_LABELS_VI : ORDER_STATUS_LABELS_VI)[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )} />
                  </div>
                  <div className="space-y-1 pt-2 border-t">
                    <Label className="text-[10px] uppercase text-red-500 font-bold">Còn nợ</Label>
                    <div className="text-2xl font-bold text-red-600">{formatCurrency(Math.max(0, totals.debt))}</div>
                  </div>
                  <Button type="submit" disabled={updateOrderMutation.isPending} className="w-full h-11 bg-slate-900 text-white font-bold">
                    {updateOrderMutation.isPending ? "Đang lưu..." : "Cập nhật đơn hàng"}
                  </Button>
                  <Button variant="outline" onClick={onCancel} type="button" className="w-full h-11">Hủy bỏ</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};

// =============================================================================
// View Form
// =============================================================================
interface StatusHistoryItem {
  id: string; action: string; title: string;
  notes?: string; changed_by?: string; changed_at: string;
  user_profile?: { full_name: string };
}

interface ViewFormProps {
  orderId: string;
  onBack?: () => void;
}

const ViewForm: React.FC<ViewFormProps> = ({ orderId, onBack }) => {
  const [orderDetails, setOrderDetails] = useState<Order | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [activityHistory, setActivityHistory] = useState<StatusHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSlipDialog, setShowSlipDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => { if (orderId) loadData(); }, [orderId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [orderData, payments, orderHistory] = await Promise.all([
        orderApi.getOrder(orderId),
        paymentsApi.getPaymentsByOrder(orderId),
        orderApi.getOrderHistory(orderId),
      ]);
      setOrderDetails(orderData);
      setPaymentHistory(payments.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()));
      setActivityHistory((orderHistory || []).map((item: any) => ({ ...item, action: item.action || "update", title: item.title || "Cập nhật đơn hàng" })));
    } catch (error) {
      toast({ title: "Lỗi", description: getErrorMessage(error, "Không thể tải chi tiết đơn hàng"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!orderDetails) return;
    try {
      await orderApi.updateOrderStatus(orderId, newStatus);
      toast({ title: "Thành công", description: "Đã cập nhật trạng thái đơn hàng" });
      loadData();
    } catch (error) {
      toast({ title: "Lỗi", description: getErrorMessage(error, "Không thể cập nhật trạng thái"), variant: "destructive" });
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: vi });
  };

  if (loading && !orderDetails) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;
  if (!orderDetails) return <div className="text-center py-20 text-muted-foreground">Không tìm thấy đơn hàng</div>;

  const isPurchase = (orderDetails as any)?.type === "purchase";
  const subtotal = orderDetails.items?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0;
  const totalVat = orderDetails.items?.reduce((sum, item) => sum + ((item.vat_total_price || item.total_price) - (item.total_price || 0)), 0) || 0;
  const expensesTotal = orderDetails.expenses?.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0) || 0;
  const totalAmount = orderDetails.totalVat > 0 ? orderDetails.totalVatAmount : orderDetails.totalAmount || 0;
  const paidAmount = paymentHistory.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const debtAmount = Math.max(0, totalAmount - paidAmount);
  const getPaymentMethodLabel = (method: string) => ({ cash: "Tiền mặt", bank_transfer: "Chuyển khoản", card: "Thẻ", other: "Khác" }[method] || method);

  return (
    <>
      <div className="animate-in fade-in duration-500 pb-20 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {/* Customer Info */}
            <Card className="shadow-premium border-none">
              <CardHeader className="pb-3 flex flex-row items-center gap-2 border-b border-slate-50">
                <Building2 className="w-4 h-4 text-blue-600" />
                <CardTitle className="text-sm font-bold uppercase tracking-tight text-slate-500">Khách hàng</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 items-start gap-2">
                    <Label className="text-xs text-muted-foreground pt-1">Tên công ty:</Label>
                    <div className="col-span-2 text-sm font-bold text-slate-900">{orderDetails.companyName || orderDetails.customer_name}</div>
                  </div>
                  <div className="grid grid-cols-3 items-start gap-2">
                    <Label className="text-xs text-muted-foreground pt-1">Email công ty:</Label>
                    <div className="col-span-2 text-sm text-blue-600 underline">{orderDetails.vatEmail || orderDetails.customer_email || "-"}</div>
                  </div>
                  <div className="grid grid-cols-3 items-start gap-2">
                    <Label className="text-xs text-muted-foreground pt-1">Tên người đặt hàng:</Label>
                    <div className="col-span-2 text-sm font-medium">{orderDetails.customer_name}</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 items-start gap-2">
                    <Label className="text-xs text-muted-foreground pt-1">Mã số thuế:</Label>
                    <div className="col-span-2 text-sm font-mono font-medium">{orderDetails.taxCode || "-"}</div>
                  </div>
                  <div className="grid grid-cols-3 items-start gap-2">
                    <Label className="text-xs text-muted-foreground pt-1">Địa chỉ công ty:</Label>
                    <div className="col-span-2 text-sm leading-relaxed">{orderDetails.companyAddress || orderDetails.customer_address || "-"}</div>
                  </div>
                  <div className="grid grid-cols-3 items-start gap-2">
                    <Label className="text-xs text-muted-foreground pt-1">Số điện thoại:</Label>
                    <div className="col-span-2 text-sm font-medium text-blue-600 underline">{orderDetails.customer_phone || "-"}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping */}
            <Card className="shadow-premium border-none">
              <CardHeader className="pb-3 flex flex-row items-center gap-2 border-b border-slate-50">
                <Package className="w-4 h-4 text-amber-600" />
                <CardTitle className="text-sm font-bold uppercase tracking-tight text-slate-500">Vận chuyển</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                  <div className="grid grid-cols-3 items-start gap-2">
                    <Label className="text-xs text-muted-foreground pt-1">Người nhận:</Label>
                    <div className="col-span-2 text-sm font-bold text-slate-900">{orderDetails.receiverName || "-"}</div>
                  </div>
                  <div className="grid grid-cols-3 items-start gap-2">
                    <Label className="text-xs text-muted-foreground pt-1">SĐT người nhận:</Label>
                    <div className="col-span-2 text-sm font-medium">{orderDetails.receiverPhone || "-"}</div>
                  </div>
                  <div className="grid grid-cols-3 items-start gap-2 md:col-span-2">
                    <Label className="text-xs text-muted-foreground pt-1">Địa chỉ:</Label>
                    <div className="col-span-2 text-sm leading-relaxed text-blue-600 underline">{orderDetails.receiverAddress || "-"}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Products Table */}
            <Card className="shadow-premium border-none overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-50">
                <CardTitle className="text-sm font-bold uppercase tracking-tight text-slate-500 flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-600" /> Sản phẩm
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="w-10 text-center">#</TableHead>
                      <TableHead>Tên SP</TableHead>
                      <TableHead className="w-32">Hãng SX</TableHead>
                      <TableHead className="w-20 text-center">SL</TableHead>
                      <TableHead className="w-32 text-right">Thuế</TableHead>
                      <TableHead className="w-32 text-right">Tổng</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderDetails.items?.map((item, idx) => {
                      const itemVat = (item.vat_total_price || item.total_price) - (item.total_price || 0);
                      return (
                        <TableRow key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                          <TableCell className="text-center text-slate-400 font-medium">{idx + 1}</TableCell>
                          <TableCell className="py-3">
                            <div className="font-bold text-slate-900">[{item.product_code}]</div>
                            <div className="text-sm text-slate-600 leading-snug">{item.product_name}</div>
                          </TableCell>
                          <TableCell className="text-slate-500">{item.manufacturer || "-"}</TableCell>
                          <TableCell className="text-center font-medium">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            <div className="text-slate-900 font-medium">{formatCurrency(itemVat)}</div>
                            <div className="text-[10px] text-slate-400 border border-slate-100 rounded px-1 inline-block mt-0.5 bg-slate-50">{item.vat_percentage ?? 0}% VAT</div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-900">{formatCurrency(item.vat_total_price || item.total_price)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <tfoot>
                    <TableRow className="bg-slate-50/30">
                      <TableCell colSpan={3} className="pl-6 font-bold text-slate-900">Tổng</TableCell>
                      <TableCell className="text-center font-bold text-slate-900">{orderDetails.items?.reduce((s, i) => s + (i.quantity || 0), 0)}</TableCell>
                      <TableCell className="text-right font-bold text-slate-900">{formatCurrency(totalVat)}</TableCell>
                      <TableCell className="text-right font-bold text-slate-900">{formatCurrency(subtotal + totalVat)}</TableCell>
                    </TableRow>
                  </tfoot>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <Card className="shadow-premium border-none">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Status</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                <Select value={typeof orderDetails.status === "object" ? orderDetails.status?.code : orderDetails.status} onValueChange={handleUpdateStatus}>
                  <SelectTrigger className="w-full h-10 font-semibold border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(isPurchase ? PURCHASE_ORDER_STATUSES : ORDER_STATUSES).map(s => (
                      <SelectItem key={s} value={s}>{(isPurchase ? PURCHASE_ORDER_STATUS_LABELS_VI : ORDER_STATUS_LABELS_VI)[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-1 gap-2">
                  <Button variant="outline" size="sm" className="w-full text-xs h-9 justify-start font-medium"
                    onClick={() => setShowSlipDialog(true)}>
                    <FileText className="w-3.5 h-3.5 mr-2 text-slate-400" /> Tạo phiếu xuất kho
                  </Button>
                  <Button variant="outline" size="sm" className="w-full text-xs h-9 justify-start font-medium"
                    onClick={() => setShowPaymentDialog(true)}>
                    <Plus className="w-3.5 h-3.5 mr-2 text-slate-400" /> Thêm thanh toán
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Payment Info */}
            <Card className="shadow-premium border-none">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Thông tin thanh toán</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Phương thức</span>
                  <div className="flex items-center gap-1.5 font-bold text-xs uppercase">
                    <CreditCard className="w-3 h-3" /> {getPaymentMethodLabel(orderDetails.payment_method || "cash")}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Trạng thái</span>
                  <Badge className={`${debtAmount === 0 ? "bg-emerald-50 text-emerald-600" : paidAmount > 0 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"} border-none shadow-none text-[10px] px-2 py-0.5`}>
                    {debtAmount === 0 ? "Đã thanh toán" : paidAmount > 0 ? "Thanh toán một phần" : "Chưa thanh toán"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-xs text-slate-500">Đã thanh toán</span>
                  <span className="text-sm font-bold text-emerald-600">{formatCurrency(paidAmount)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-50 pt-2">
                  <span className="text-xs text-slate-500">Còn lại</span>
                  <span className="text-sm font-bold text-red-500">{formatCurrency(debtAmount)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Cost Breakdown */}
            <Card className="shadow-premium border-none bg-slate-50/50">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chi phí đơn hàng</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <div className="flex justify-between items-center"><span className="text-xs text-slate-500">Tạm tính</span><span className="text-xs font-medium">{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between items-center"><span className="text-xs text-slate-500">Thuế (VAT)</span><span className="text-xs font-medium">{formatCurrency(totalVat)}</span></div>
                {orderDetails.expenses && orderDetails.expenses.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-100 pb-1 mb-1">Chi phí khác</div>
                    {orderDetails.expenses.map((exp, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 italic">• {exp.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{formatCurrency(exp.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-1 font-bold">
                      <span className="text-[10px] text-slate-900">Tổng chi phí</span>
                      <span className="text-[10px] text-slate-900">{formatCurrency(expensesTotal)}</span>
                    </div>
                  </div>
                )}
                <Separator className="bg-slate-200" />
                <div className="flex justify-between items-end pt-1">
                  <span className="text-xs font-bold text-slate-900 uppercase">Tổng cộng</span>
                  <span className="text-lg font-black text-slate-900 leading-none">{formatCurrency(totalAmount)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card className="shadow-premium border-none">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nhãn đơn hàng</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex flex-wrap gap-1.5">
                  {(orderDetails.tags && orderDetails.tags.length > 0) ? orderDetails.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 border-none">{tag}</Badge>
                  )) : <span className="text-xs text-slate-400 italic">Không có nhãn</span>}
                  <Button variant="outline" size="icon" className="h-6 w-6 rounded-full border-dashed"><Plus className="w-3 h-3" /></Button>
                </div>
              </CardContent>
            </Card>

            {/* Activity Log */}
            <Card className="shadow-premium border-none">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lịch sử hoạt động</CardTitle>
                <CardDescription className="text-[10px]">Xem lịch sử hoạt động của đơn hàng</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-4 pt-2">
                  {activityHistory.slice(0, 5).map((log) => (
                    <div key={log.id} className="relative pl-5 border-l border-slate-100 pb-1 last:pb-0">
                      <div className="absolute left-[-4.5px] top-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-white" />
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-bold text-slate-800 leading-tight">{log.title}</p>
                        <p className="text-[10px] text-slate-400 leading-tight">{log.user_profile?.full_name || "Hệ thống"} • {formatDateTime(log.changed_at)}</p>
                        {log.notes && <p className="text-[10px] text-slate-500 italic mt-1 bg-slate-50 p-1 rounded leading-tight">{log.notes}</p>}
                      </div>
                    </div>
                  ))}
                  {activityHistory.length > 5 && (
                    <Button variant="link" className="text-[10px] h-auto p-0 text-blue-500">Xem tất cả ({activityHistory.length})</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <SlipCreatingDialog
        open={showSlipDialog}
        onOpenChange={setShowSlipDialog}
        slipType="export"
        orderId={orderId}
        onSlipCreated={() => { setShowSlipDialog(false); loadData(); }}
      />

      <PaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        order={orderDetails}
        onUpdate={() => loadData()}
      />
    </>
  );
};

// =============================================================================
// Public: OrderForm
// =============================================================================
export const OrderForm: React.FC<OrderFormProps> = ({ mode, orderId, onSuccess, onCancel, onDirtyChange }) => {
  if (mode === "create") return <CreateForm onOrderCreated={onSuccess!} onCancel={onCancel!} onDirtyChange={onDirtyChange} />;
  if (mode === "edit") return <EditForm orderId={orderId!} onOrderUpdated={onSuccess!} onCancel={onCancel!} />;
  return <ViewForm orderId={orderId!} onBack={onCancel} />;
};
