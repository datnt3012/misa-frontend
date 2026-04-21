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
import { Trash2, Plus, Package } from "lucide-react";
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
            <TableRow key={field.id} className="divide-x divide-slate-200">
              <TableCell className="text-left text-sm">{idx + 1}</TableCell>
              <TableCell className="text-left">
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
          ))}
        </TableBody>
      </Table>
      {errors?.details && (
        <p className="text-red-500 text-xs p-4">{errors.details.message as string}</p>
      )}
    </CardContent>
  </Card>
);
