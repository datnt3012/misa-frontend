import React from "react";
import { Control, Controller, FieldErrors, FieldArrayWithId } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CurrencyInput } from "@/components/ui/currency-input";
import { NumberInput } from "@/components/ui/number-input";
import { Autocomplete } from "@/shared/components/autocomplete";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Package, CheckCircle, AlertCircle } from "lucide-react";
import { formatCurrency } from "../../../utils/formatters";

interface DetailItem {
  quantity?: number;
  unitPrice?: number;
  vatPercentage?: number;
}

interface OrderProductsTableProps {
  control: Control<any>;
  fields: FieldArrayWithId<any>[];
  currentDetails: DetailItem[];
  errors?: FieldErrors<any>;
  productOptions: { label: string; value: string }[];
  onAppend: () => void;
  onRemove: (idx: number) => void;
  onProductSelect: (idx: number, productId: string) => void;
  disabled?: boolean;
  orderType?: 'sale' | 'purchase';
}

export const OrderProductsTable: React.FC<OrderProductsTableProps> = ({
  control,
  fields,
  currentDetails,
  errors,
  productOptions,
  onAppend,
  onRemove,
  onProductSelect,
  disabled = false,
  orderType = 'sale',
}) => (
  <Card className="shadow-premium border-none overflow-hidden">
    <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
      <CardTitle className="text-sm font-bold  text-slate-500 flex items-center gap-2">
        <Package className="w-4 h-4 text-emerald-600" /> Sản phẩm
      </CardTitle>
      {!disabled && (
        <Button onClick={onAppend} size="sm" variant="outline" type="button" className="h-8 border-dashed">
          <Plus className="w-3 h-3 mr-1" /> Thêm dòng
        </Button>
      )}
    </CardHeader>
    <CardContent className="p-0">
      <Table className="border border-slate-200">
        <TableHeader className="bg-slate-50/50">
          <TableRow className="divide-x divide-slate-200">
            <TableHead className="w-10 text-left"></TableHead>
            <TableHead className="text-left">Tên sản phẩm</TableHead>
            <TableHead className="w-24 text-left">Số lượng</TableHead>
            <TableHead className="w-32 text-left">Đơn giá</TableHead>
            <TableHead className="w-20 text-left">VAT%</TableHead>
            <TableHead className="w-36 text-right">Thành tiền</TableHead>
            <TableHead className="w-36 text-right pr-4">Tổng tiền</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-slate-200">
          {fields.map((field, idx) => (
            <React.Fragment key={field.id}>
              <TableRow className="divide-x divide-slate-200">
                <TableCell className="text-left text-sm">{idx + 1}</TableCell>
                <TableCell className="text-left">
                  <div className="space-y-2">
                    <Controller
                      name={`details.${idx}.productId`}
                      control={control}
                      render={({ field }) => (
                        <Autocomplete
                          options={productOptions}
                          value={field.value}
                          placeholder="Chọn sản phẩm"
                          disabled={disabled}
                          onChange={(v) => {
                            field.onChange(v);
                            onProductSelect(idx, v);
                          }}
                        />
                      )}
                    />
                    {orderType === 'sale' && (
                      <Controller
                        name={`details.${idx}.manageSerials`}
                        control={control}
                        render={({ field: manageField }) => (
                          <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer text-slate-500 hover:text-slate-700 transition-colors">
                            <input
                              type="checkbox"
                              checked={Boolean(manageField.value)}
                              onChange={(e) => manageField.onChange(e.target.checked)}
                              disabled={disabled}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>Quản lý serial</span>
                          </label>
                        )}
                      />
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-left">
                  <Controller
                    name={`details.${idx}.quantity`}
                    control={control}
                    render={({ field }) => (
                      <NumberInput value={field.value} onChange={field.onChange} min={1} disabled={disabled} />
                    )}
                  />
                </TableCell>
                <TableCell className="text-left">
                  <Controller
                    name={`details.${idx}.unitPrice`}
                    control={control}
                    render={({ field }) => (
                      <CurrencyInput value={field.value} onChange={field.onChange} disabled={disabled} />
                    )}
                  />
                </TableCell>
                <TableCell className="text-left">
                  <Controller
                    name={`details.${idx}.vatPercentage`}
                    control={control}
                    render={({ field }) => (
                      <NumberInput value={field.value} onChange={field.onChange} min={0} max={100} allowDecimal disabled={disabled} />
                    )}
                  />
                </TableCell>
                <TableCell className="text-right font-medium text-sm">
                  {formatCurrency(
                    (currentDetails[idx]?.quantity || 0) * (currentDetails[idx]?.unitPrice || 0)
                  )}
                </TableCell>
                <TableCell className="text-right pr-4 font-bold text-sm">
                  {formatCurrency(
                    (currentDetails[idx]?.quantity || 0) *
                    (currentDetails[idx]?.unitPrice || 0) *
                    (1 + (currentDetails[idx]?.vatPercentage || 0) / 100)
                  )}
                </TableCell>
                <TableCell>
                  {!disabled && (
                    <Button variant="ghost" size="icon" onClick={() => onRemove(idx)} type="button">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>

              {/* Serial Management Detail Row */}
              {orderType === 'sale' && (
                <Controller
                  name={`details.${idx}.manageSerials`}
                  control={control}
                  render={({ field: manageField }) =>
                    manageField.value ? (
                      <TableRow className="bg-slate-50/50 border-t-0">
                        <TableCell colSpan={8} className="p-4 pt-2">
                          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Danh sách mã serial</Label>
                                  <div className="text-xs font-medium">
                                    <Controller
                                      name={`details.${idx}.serials`}
                                      control={control}
                                      render={({ field: serialsField }) => {
                                        const count = (serialsField.value || []).length;
                                        const target = currentDetails[idx]?.quantity || 0;
                                        const isMatch = count === target;
                                        return (
                                          <span className={isMatch ? "text-emerald-600 flex items-center gap-1" : "text-rose-500 flex items-center gap-1"}>
                                            {isMatch ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                            {count}/{target} serial
                                          </span>
                                        );
                                      }}
                                    />
                                  </div>
                                </div>
                                <Controller
                                  name={`details.${idx}.serials`}
                                  control={control}
                                  render={({ field: serialsField }) => (
                                    <Textarea
                                      value={(serialsField.value || []).join(", ")}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const array = val.split(",").map(s => s.trim()).filter(Boolean);
                                        serialsField.onChange(array);
                                      }}
                                      placeholder="Nhập mã serial, cách nhau bởi dấu phẩy..."
                                      className="min-h-[80px] text-sm bg-slate-50/30 focus:bg-white transition-colors"
                                      disabled={disabled}
                                    />
                                  )}
                                />
                                <p className="text-[10px] text-slate-400 italic">* Các mã serial được phân tách bởi dấu phẩy</p>
                              </div>

                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Thông tin bảo hành</Label>
                                  <div className="flex items-center gap-3">
                                    <div className="w-24">
                                      <Controller
                                        name={`details.${idx}.warrantyMonths`}
                                        control={control}
                                        render={({ field: warrantyField }) => (
                                          <NumberInput
                                            value={warrantyField.value}
                                            onChange={warrantyField.onChange}
                                            min={0}
                                            disabled={disabled}
                                          />
                                        )}
                                      />
                                    </div>
                                    <span className="text-sm text-slate-500">tháng (tính từ ngày giao hàng)</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null
                  }
                />
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
      {errors?.details && (
        <p className="text-red-500 text-xs p-4">{errors.details.message as string}</p>
      )}
    </CardContent>
  </Card>
);
