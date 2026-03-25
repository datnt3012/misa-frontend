import React from "react";
import { Control, Controller, FieldArrayWithId } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Trash2, Plus, ReceiptText } from "lucide-react";
import { formatCurrency } from "../../../utils/formatters";

interface OrderExpensesTableProps {
  control: Control<any>;
  fields: FieldArrayWithId<any>[];
  expensesTotal: number;
  onAppend: () => void;
  onRemove: (idx: number) => void;
}

export const OrderExpensesTable: React.FC<OrderExpensesTableProps> = ({
  control,
  fields,
  expensesTotal,
  onAppend,
  onRemove,
}) => (
  <Card className="shadow-premium border-none overflow-hidden">
    <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
      <CardTitle className="text-sm font-bold uppercase text-slate-500 flex items-center gap-2">
        <ReceiptText className="w-4 h-4 text-orange-500" /> Chi phí
      </CardTitle>
      <Button onClick={onAppend} size="sm" variant="outline" type="button" className="h-8 border-dashed">
        <Plus className="w-3 h-3 mr-1" /> Thêm chi phí
      </Button>
    </CardHeader>
    <CardContent className="p-0">
      {fields.length === 0 ? (
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
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, idx) => (
                <TableRow key={field.id}>
                  <TableCell>
                    <Controller
                      name={`expenses.${idx}.name`}
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          className="w-full bg-transparent outline-none text-sm"
                          placeholder="Ví dụ: Phí vận chuyển"
                        />
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Controller
                      name={`expenses.${idx}.amount`}
                      control={control}
                      render={({ field }) => (
                        <CurrencyInput value={field.value} onChange={field.onChange} />
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Controller
                      name={`expenses.${idx}.note`}
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          className="w-full bg-transparent outline-none text-sm"
                          placeholder="Ghi chú (không bắt buộc)"
                        />
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => onRemove(idx)} type="button">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="px-4 py-2 text-right text-sm text-slate-500 border-t">
            Tổng chi phí:{" "}
            <span className="font-bold text-orange-600">{formatCurrency(expensesTotal)}</span>
          </div>
        </>
      )}
    </CardContent>
  </Card>
);
