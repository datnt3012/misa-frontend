import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import { MultiSelect } from '@/components/ui/multi-select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Search, Plus, Filter, ChevronUp, ChevronDown, RotateCw, Loader } from 'lucide-react';
import {
  ORDER_STATUSES, ORDER_STATUS_LABELS_VI,
  PURCHASE_ORDER_STATUSES, PURCHASE_ORDER_STATUS_LABELS_VI,
} from '@/constants/order-status.constants';
import type { OrderFiltersReturn } from '../hooks/useOrderFilters';
import type { OrderCatalogsReturn } from '../hooks/useOrderCatalogs';

interface OrderFilterBarProps {
  filters: OrderFiltersReturn;
  catalogs: OrderCatalogsReturn;
  isLoading: boolean;
  onCreateClick: () => void;
}

export const OrderFilterBar: React.FC<OrderFilterBarProps> = ({
  filters, catalogs, isLoading, onCreateClick,
}) => {
  const {
    searchTerm, handleSearchChange,
    statusFilter, setStatusFilter,
    creatorFilter, setCreatorFilter,
    filtersCollapsed, setFiltersCollapsed,
    startDate, setStartDate,
    endDate, setEndDate,
    completedStartDate, setCompletedStartDate,
    completedEndDate, setCompletedEndDate,
    minTotalAmount, setMinTotalAmount,
    maxTotalAmount, setMaxTotalAmount,
    paymentMethodFilters, setPaymentMethodFilters,
    bankFilter, setBankFilter,
    categoryFilter, setCategoryFilter,
    manufacturerFilter, setManufacturerFilter,
    orderType, handleResetFilters,
  } = filters;

  const { categories, creators, manufacturers, banks } = catalogs;

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Main filter row */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nhập từ khoá tìm kiếm..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-64 pl-8"
            />
          </div>

          <MultiSelect
            className="w-60"
            options={(orderType === 'purchase' ? PURCHASE_ORDER_STATUSES : ORDER_STATUSES).map((s) => ({
              value: s,
              label: orderType === 'purchase'
                ? PURCHASE_ORDER_STATUS_LABELS_VI[s as keyof typeof PURCHASE_ORDER_STATUS_LABELS_VI]
                : ORDER_STATUS_LABELS_VI[s as keyof typeof ORDER_STATUS_LABELS_VI],
            }))}
            value={statusFilter}
            onValueChange={setStatusFilter}
            placeholder="Tất cả trạng thái"
            selectAllLabel="Chọn tất cả"
          />

          <Combobox
            options={[
              { label: 'Tất cả người tạo', value: 'all' },
              ...creators.map((c) => ({
                label: `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email || 'Không xác định',
                value: c.id,
              })),
            ]}
            value={creatorFilter}
            onValueChange={setCreatorFilter}
            placeholder="Người tạo đơn"
            searchPlaceholder="Tìm người tạo..."
            emptyMessage="Không có người tạo nào"
            className="w-48"
            multiple={true}
          />

          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => setFiltersCollapsed(!filtersCollapsed)}
          >
            <Filter className="w-4 h-4" />
            {filtersCollapsed ? 'Thu gọn' : 'Mở rộng'}
            {filtersCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>

          <Button onClick={handleResetFilters} variant="outline" disabled={isLoading}>
            {!isLoading ? <RotateCw className="h-4 w-4" /> : <Loader className="h-4 w-4 animate-spin" />}
          </Button>

          <div className="flex ml-auto items-center">
            <Button onClick={onCreateClick} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />THÊM MỚI
            </Button>
          </div>
        </div>

        {/* Advanced filters */}
        {filtersCollapsed && (
          <div className="grid grid-cols-3 gap-3 gap-y-6 justify-items-center items-center mt-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Ngày tạo:</label>
              <Input type="date" className="w-40" value={startDate || ''} onChange={(e) => setStartDate(e.target.value || undefined)} />
              <label className="text-sm font-medium">-</label>
              <Input type="date" className="w-40" value={endDate || ''} onChange={(e) => setEndDate(e.target.value || undefined)} />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Ngày hoàn thành:</label>
              <Input type="date" className="w-40" value={completedStartDate || ''} onChange={(e) => setCompletedStartDate(e.target.value || undefined)} />
              <label className="text-sm font-medium">-</label>
              <Input type="date" className="w-40" value={completedEndDate || ''} onChange={(e) => setCompletedEndDate(e.target.value || undefined)} />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Tổng tiền:</label>
              <CurrencyInput className="w-40" value={minTotalAmount || ''} onChange={(v) => setMinTotalAmount(v || undefined)} />
              <label className="text-sm font-medium">-</label>
              <CurrencyInput className="w-40" value={maxTotalAmount || ''} onChange={(v) => setMaxTotalAmount(v || undefined)} />
            </div>

            <div className="flex items-center gap-2">
              <Combobox
                options={[
                  { label: 'Tất cả phương thức thanh toán', value: 'all' },
                  { label: 'Tiền mặt', value: 'cash' },
                  { label: 'Thẻ tín dụng', value: 'credit_card' },
                  { label: 'Chuyển khoản', value: 'bank_transfer' },
                ]}
                value={paymentMethodFilters}
                onValueChange={(v) => {
                  setPaymentMethodFilters(v as string);
                  if (typeof v === 'string' && !v.includes('bank_transfer')) setBankFilter('all');
                }}
                placeholder="Phương thức thanh toán"
                searchPlaceholder="Tìm..."
                emptyMessage="Không có"
                className="w-40"
                multiple={true}
              />
              {(paymentMethodFilters === 'bank_transfer' || paymentMethodFilters.includes('bank_transfer')) && (
                <Combobox
                  options={[
                    { label: 'Tất cả ngân hàng', value: 'all' },
                    ...banks.map((b) => ({ label: b.name, value: b.code })),
                  ]}
                  value={bankFilter}
                  onValueChange={setBankFilter}
                  placeholder="Ngân hàng"
                  searchPlaceholder="Tìm..."
                  emptyMessage="Không có NH"
                  className="w-40"
                  multiple={true}
                />
              )}
            </div>

            <Combobox
              options={[
                { label: 'Tất cả loại sản phẩm', value: 'all' },
                ...categories.map((c) => ({ label: c.name, value: c.id })),
              ]}
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              placeholder="Loại sản phẩm"
              searchPlaceholder="Tìm..."
              emptyMessage="Không có"
              className="w-40"
              multiple={true}
            />

            <Combobox
              options={[
                { label: 'Tất cả nhà sản xuất', value: 'all' },
                ...manufacturers.map((m) => ({ label: m, value: m })),
              ]}
              value={manufacturerFilter}
              onValueChange={setManufacturerFilter}
              placeholder="Nhà sản xuất"
              searchPlaceholder="Tìm nhà sản xuất..."
              emptyMessage="Không có"
              className="w-60"
              multiple={true}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
