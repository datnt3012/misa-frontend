import React, { useEffect } from "react";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-utils";

function sanitizeData<T>(data: T): T {
  if (typeof data === "string") return (data.trim() === "" ? null : data) as T;
  if (Array.isArray(data)) return data.map(sanitizeData) as T;
  if (data !== null && typeof data === "object")
    return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, sanitizeData(v)])) as T;
  return data;
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, ShoppingBag, User, MapPin, Receipt, FileText } from "lucide-react";
import { CreateOrderSchemaType, CreateOrderSchema } from "../../schemas";
import { useCreateOrder } from "../../hooks";
import { DynamicFormField } from "@/shared/components/DynamicFormField";
import { useCustomerMutation } from "@/features/customers/hooks";
import { useSupplierMutation } from "@/features/suppliers/hooks";
import {
  customerBaseFields, vatFields, contractFields, receiverFields, supplierBaseFields,
  ORDER_DETAIL_DEFAULT, ORDER_EXPENSE_DEFAULT,
} from "../../constants";
import { useProductList } from "@/features/products";
import { CustomerSchemaType } from "@/features/customers/schemas";
import { BackendResponse } from "@/shared/schemas";
import { SupplierSchemaType } from "@/features/suppliers/schemas";
import { useOrderTotals } from "../../hooks/useOrderTotals";
import { OrderFormHeader } from "./shared/OrderFormHeader";
import { OrderProductsTable } from "./shared/OrderProductsTable";
import { OrderExpensesTable } from "./shared/OrderExpensesTable";
import { OrderSidebarPaymentFields } from "./shared/OrderSidebarPaymentFields";

interface CreateFormProps {
  onOrderCreated: () => void;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

const NewOrderForm: React.FC<CreateFormProps> = ({ onOrderCreated, onCancel, onDirtyChange }) => {
  const createOrderMutation = useCreateOrder();
  const createCustomerMutation = useCustomerMutation().createCustomer;
  const createSupplierMutation = useSupplierMutation().createSupplier;
  const productQuery = useProductList({ page: 1, limit: 1000 });
  const { toast } = useToast();

  const methods = useForm<CreateOrderSchemaType>({
    resolver: yupResolver(CreateOrderSchema),
    defaultValues: { type: "sale", paymentMethod: "cash" },
    mode: "onTouched",
  });

  const {
    control, handleSubmit, watch, setValue, reset,
    formState: { errors, isDirty },
  } = methods;

  const { fields: detailFields, append: appendDetail, remove: removeDetail } =
    useFieldArray({ control, name: "details" as any });
  const { fields: expenseFields, append: appendExpense, remove: removeExpense } =
    useFieldArray({ control, name: "expenses" as any });

  const currentType = watch("type") || "sale";
  const currentDetails = watch("details") || [];
  const customerData = watch("customer");

  const totals = useOrderTotals(control);

  useEffect(() => {
    setValue("totalAmount", totals.grandTotal, { shouldDirty: false });
    // setValue("debtAmount", Math.max(0, totals.debt), { shouldDirty: false });
  }, [totals.grandTotal, totals.debt, setValue]);

  useEffect(() => {
    setValue("receiverName", customerData?.name, { shouldDirty: false });
    setValue("receiverPhone", customerData?.phoneNumber, { shouldDirty: false });
    setValue("receiverAddress", customerData?.address, { shouldDirty: false });
    setValue("addressInfo.provinceCode", customerData?.addressInfo?.provinceCode, { shouldDirty: false });
    setValue("addressInfo.wardCode", customerData?.addressInfo?.wardCode, { shouldDirty: false });
  }, [customerData, setValue]);

  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);

  const productOptions =
    productQuery.data?.data.rows.map((p) => ({ label: `[${p.code}] ${p.name}`, value: p.id })) || [];

  const handleProductSelect = (idx: number, productId: string) => {
    const p = productQuery.data?.data.rows.find((prod) => prod.id === productId);
    if (p) setValue(`details.${idx}.unitPrice` as any, p.price);
  };

  const onSubmit = async (data: CreateOrderSchemaType) => {
    const clean = sanitizeData(data);
    try {
      let resolvedCustomerId = clean.customerId;
      if (clean.customerId === "__new__") {
        if (clean.type === "sale") {
          const payload = {
            name: clean.customer.name,
            phoneNumber: clean.customer.phoneNumber,
            email: clean.customer.email || null,
            address: clean.customer.address || null,
            addressInfo: clean.addressInfo || null,
          };
          const customer = await createCustomerMutation.mutateAsync(payload) as BackendResponse<CustomerSchemaType>;
          resolvedCustomerId = customer.data.id;
        } else {
          const supplier = await createSupplierMutation.mutateAsync({
            ...clean.customer,
            addressInfo: clean.addressInfo,
          }) as BackendResponse<SupplierSchemaType>;
          resolvedCustomerId = supplier.data.id;
        }
      }
      await createOrderMutation.mutateAsync({ ...clean, customerId: resolvedCustomerId });
      onOrderCreated();
    } catch (err) {
      toast({ title: "Lỗi", description: getErrorMessage(err, "Không thể tạo đơn hàng"), variant: "destructive" });
    }
  };

  return (
    <>
      <OrderFormHeader
        onBack={onCancel}
        title="Tạo mới đơn hàng"
        subtitle="Khởi tạo dữ liệu cho đơn hàng"
        badgeLabel="Tạo mới đơn hàng"
        badgeVariant="secondary"
      />
      <FormProvider {...methods}>
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit, () => {
            toast({ title: "Lỗi xác thực", description: "Vui lòng kiểm tra lại các trường bắt buộc.", variant: "destructive" });
          })}
          className="animate-in fade-in duration-500 space-y-6"
        >
          <Tabs
            value={currentType}
            onValueChange={(v) => reset({ type: v as any, paymentMethod: "cash", details: [], expenses: [] })}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 lg:w-[400px] h-11 bg-slate-100 p-1">
              <TabsTrigger value="sale">
                <ShoppingCart className="w-4 h-4 mr-2" /> Bán hàng
              </TabsTrigger>
              <TabsTrigger value="purchase">
                <ShoppingBag className="w-4 h-4 mr-2" /> Mua hàng
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div key={currentType} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 space-y-6">
              {/* Partner Info */}
              <Card className="shadow-premium border-none">
                <CardHeader className="pb-3 border-b flex flex-row items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <CardTitle className="text-sm font-bold  text-slate-500">
                    {currentType === "sale" ? "Thông tin khách hàng" : "Thông tin nhà cung cấp"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-12 gap-4">
                    {currentType === "sale"
                      ? customerBaseFields.map((f) => (
                        <DynamicFormField key={f.name as string} config={f} />
                      ))
                      : supplierBaseFields.map((f) => (
                        <DynamicFormField key={f.name as string} config={f} />
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* VAT — sale only */}
              {currentType === "sale" && (
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
                        <DynamicFormField key={f.name as string} config={f} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Shipping — sale only */}
              {currentType === "sale" && (
                <Card className="shadow-premium border-none">
                  <CardHeader className="pb-3 border-b flex flex-row items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-600" />
                    <CardTitle className="text-sm font-bold  text-slate-500">
                      Vận chuyển
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-12 gap-4">
                      {receiverFields.map((f) => (
                        <DynamicFormField key={f.name as string} config={f} />
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
                      <DynamicFormField key={f.name as string} config={f} />
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
              />

              <OrderExpensesTable
                control={control}
                fields={expenseFields}
                expensesTotal={totals.expensesTotal}
                onAppend={() => appendExpense(ORDER_EXPENSE_DEFAULT)}
                onRemove={removeExpense}
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <OrderSidebarPaymentFields
                control={control}
                errors={errors}
                totals={totals}
                submitLabel="Xác nhận tạo đơn"
                isSubmitting={createOrderMutation.isPending}
                onCancel={onCancel}
                accentColor="blue"
                mode="create"
              />
            </div>
          </div>
        </form>
      </FormProvider>
    </>
  );
};

export default NewOrderForm;
