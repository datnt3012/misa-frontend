import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { customerApi, Customer } from "@/api/customer.api";
import { productApi } from "@/api/product.api";
import { quotationApi, Quotation } from "@/api/quotation.api";
import { getErrorMessage } from "@/lib/error-utils";
interface CreateQuotationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuotationCreated: () => void;
  initialQuotation?: Quotation | null; // For edit mode
}
interface QuotationDetail {
  id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  price: number;
  quantity: number;
  note?: string;
}
interface QuotationFormState {
  customer_id: string;
  note: string;
  status: string;
  details: QuotationDetail[];
}
const createInitialQuotationState = (): QuotationFormState => ({
  customer_id: "",
  note: "",
  status: "pending",
  details: []
});
const CreateQuotationForm: React.FC<CreateQuotationFormProps> = ({ 
  open, 
  onOpenChange, 
  onQuotationCreated,
  initialQuotation 
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [quotation, setQuotation] = useState<QuotationFormState>(() => createInitialQuotationState());
  const isEditMode = !!initialQuotation;
  useEffect(() => {
    if (open) {
      if (isEditMode && initialQuotation) {
        // Load quotation data for edit, but set status to pending by default
        setQuotation({
          customer_id: initialQuotation.customer_id,
          note: initialQuotation.note || "",
          status: "pending", // Mặc định chọn "pending" khi chỉnh sửa
          details: initialQuotation.details?.map((d, index) => ({
            id: `edit-detail-${index}`,
            product_id: d.product_id,
            product_code: d.product_code || "",
            product_name: d.product_name || "",
            price: d.price,
            quantity: d.quantity,
            note: d.note || ""
          })) || []
        });
      } else {
        setQuotation(createInitialQuotationState());
      }
    }
  }, [open, isEditMode, initialQuotation]);
  useEffect(() => {
    loadData();
  }, []);
  const loadData = async () => {
    try {
      const [customersRes, productsRes] = await Promise.all([
        customerApi.getCustomers({ page: 1, limit: 1000 }),
        productApi.getProducts({ page: 1, limit: 1000 })
      ]);
      setCustomers(customersRes.customers || []);
      setProducts(productsRes.products || []);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể tải dữ liệu"),
        variant: "destructive",
      });
    }
  };
  const addDetail = () => {
    const newDetailId = `detail-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setQuotation(prev => ({
      ...prev,
      details: [...prev.details, {
        id: newDetailId,
        product_id: "",
        product_code: "",
        product_name: "",
        price: 0,
        quantity: 1,
        note: ""
      }]
    }));
  };
  const removeDetail = (index: number) => {
    setQuotation(prev => ({
      ...prev,
      details: prev.details.filter((_, i) => i !== index)
    }));
  };
  const updateDetail = (index: number, field: keyof QuotationDetail, value: any) => {
    setQuotation(prev => {
      const details = [...prev.details];
      details[index] = { ...details[index], [field]: value };
      // Auto-fill product info when product is selected
      if (field === 'product_id') {
        const product = products.find(p => p.id === value);
        if (product) {
          details[index].product_code = product.code;
          details[index].product_name = product.name;
          details[index].price = product.price;
        }
      }
      return { ...prev, details };
    });
  };
  const calculateTotalAmount = () => {
    return quotation.details.reduce((sum, detail) => sum + (detail.price * detail.quantity), 0);
  };
  const handleSubmit = async () => {
    if (!quotation.customer_id) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn khách hàng",
        variant: "destructive",
      });
      return;
    }
    if (quotation.details.length === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng thêm ít nhất một sản phẩm",
        variant: "destructive",
      });
      return;
    }
    // Validate all details have required fields
    const invalidDetails = quotation.details.filter(detail => 
      !detail.product_id || !detail.product_name || !detail.product_code || 
      !detail.quantity || detail.quantity <= 0 || detail.price <= 0
    );
    if (invalidDetails.length > 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin sản phẩm",
        variant: "destructive",
      });
      return;
    }
    try {
      setLoading(true);
      const quotationData = {
        customerId: quotation.customer_id,
        note: quotation.note || undefined,
        status: quotation.status,
        details: quotation.details.map(d => ({
          productId: d.product_id,
          price: d.price,
          quantity: d.quantity,
          note: d.note || undefined
        }))
      };
      if (isEditMode && initialQuotation) {
        await quotationApi.updateQuotation(initialQuotation.id, quotationData);
        toast({
          title: "Thành công",
          description: `Đã cập nhật báo giá ${initialQuotation.code}`,
        });
      } else {
        await quotationApi.createQuotation(quotationData);
        toast({
          title: "Thành công",
          description: "Đã tạo báo giá mới",
        });
      }
      onQuotationCreated();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, isEditMode ? "Không thể cập nhật báo giá" : "Không thể tạo báo giá"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  const selectedCustomer = customers.find(c => c.id === quotation.customer_id);
  const totalAmount = calculateTotalAmount();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Chỉnh sửa báo giá" : "Tạo báo giá mới"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Cập nhật thông tin báo giá" : "Điền thông tin để tạo báo giá mới"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label htmlFor="customer">Khách hàng *</Label>
            <Combobox
              options={customers.map(customer => ({
                label: `${customer.name} ${customer.phoneNumber ? `(${customer.phoneNumber})` : ""}`,
                value: customer.id
              }))}
              value={quotation.customer_id}
              onValueChange={(value) => setQuotation(prev => ({ ...prev, customer_id: value }))}
              placeholder="Chọn khách hàng"
              searchPlaceholder="Tìm khách hàng..."
              emptyMessage="Không có khách hàng nào"
            />
          </div>
          {/* Status and Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Trạng thái</Label>
              <Select value={quotation.status} onValueChange={(value) => setQuotation(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Chờ xử lý</SelectItem>
                  <SelectItem value="completed">Hoàn thành</SelectItem>
                  <SelectItem value="cancelled">Đã hủy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú</Label>
            <Textarea
              id="note"
              value={quotation.note}
              onChange={(e) => setQuotation(prev => ({ ...prev, note: e.target.value }))}
              placeholder="Nhập ghi chú (nếu có)"
              rows={3}
            />
          </div>
          {/* Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Chi tiết sản phẩm</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addDetail}>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm sản phẩm
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {quotation.details.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Chưa có sản phẩm nào. Nhấn "Thêm sản phẩm" để thêm.
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sản phẩm</TableHead>
                        <TableHead>Giá</TableHead>
                        <TableHead>Số lượng</TableHead>
                        <TableHead>Thành tiền</TableHead>
                        <TableHead>Ghi chú</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quotation.details.map((detail, index) => (
                        <TableRow key={detail.id}>
                          <TableCell className="max-w-[300px]">
                            <Combobox
                              options={products
                                .filter(product => {
                                  // Loại bỏ sản phẩm đã được chọn trong các detail khác
                                  const isAlreadySelected = quotation.details.some((otherDetail, otherIndex) =>
                                    otherDetail.product_id === product.id && otherIndex !== index
                                  );
                                  return !isAlreadySelected;
                                })
                                .map(product => ({
                                  label: `${product.name} (${product.code})`,
                                  value: product.id
                                }))}
                              value={detail.product_id}
                              onValueChange={(value) => updateDetail(index, 'product_id', value)}
                              placeholder="Chọn sản phẩm"
                              searchPlaceholder="Tìm sản phẩm..."
                              emptyMessage="Không có sản phẩm nào"
                              className="w-full"
                            />
                          </TableCell>
                          <TableCell>
                            <NumberInput
                              value={detail.price}
                              onChange={(value) => updateDetail(index, 'price', value || 0)}
                              min={0}
                              step={1000}
                            />
                          </TableCell>
                          <TableCell>
                            <NumberInput
                              value={detail.quantity}
                              onChange={(value) => updateDetail(index, 'quantity', value || 1)}
                              min={1}
                            />
                          </TableCell>
                          <TableCell>
                            {new Intl.NumberFormat('vi-VN').format(detail.price * detail.quantity)}
                          </TableCell>
                          <TableCell>
                            <Input
                              value={detail.note || ""}
                              onChange={(e) => updateDetail(index, 'note', e.target.value)}
                              placeholder="Ghi chú"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeDetail(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex justify-end">
                    <div className="text-lg font-semibold">
                      Tổng tiền: {new Intl.NumberFormat('vi-VN').format(totalAmount)}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Đang lưu..." : isEditMode ? "Cập nhật" : "Tạo báo giá"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
export default CreateQuotationForm;
