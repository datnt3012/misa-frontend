import React, { useState, useCallback, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export const useOrderFilters = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [startDate, setStartDate] = useState<string | undefined>();
  const [endDate, setEndDate] = useState<string | undefined>();
  const [completedStartDate, setCompletedStartDate] = useState<string | undefined>();
  const [completedEndDate, setCompletedEndDate] = useState<string | undefined>();
  const [minTotalAmount, setMinTotalAmount] = useState<number | undefined>();
  const [maxTotalAmount, setMaxTotalAmount] = useState<number | undefined>();
  const [creatorFilter, setCreatorFilter] = useState('all');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [orderType, setOrderType] = useState<'sale' | 'purchase'>('sale');
  const [manufacturerFilter, setManufacturerFilter] = useState('all');
  const [paymentMethodFilters, setPaymentMethodFilters] = useState('all');
  const [bankFilter, setBankFilter] = useState('all');
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 50 });

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset page on filter change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [
    debouncedSearch, statusFilter, categoryFilter, startDate, endDate,
    completedStartDate, completedEndDate, minTotalAmount, maxTotalAmount,
    creatorFilter, manufacturerFilter, paymentMethodFilters, bankFilter, orderType,
  ]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value.trim()),
    []
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter([]);
    setCategoryFilter('all');
    setStartDate(undefined);
    setEndDate(undefined);
    setMinTotalAmount(undefined);
    setMaxTotalAmount(undefined);
    setCompletedStartDate(undefined);
    setCompletedEndDate(undefined);
    setCreatorFilter('all');
    setFiltersCollapsed(false);
    setPaymentMethodFilters('all');
    setBankFilter('all');
    setManufacturerFilter('all');
    setPagination({ page: 1, limit: 50 });
  };

  const handleSort = (field: string) => {
    if (sortField === field) setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDirection('asc'); }
  };

  const getSortIcon = (field: string): React.ReactNode => {
    if (sortField !== field) return null;
    return sortDirection === 'asc'
      ? React.createElement(ChevronUp, { className: 'w-3 h-3 inline ml-1' })
      : React.createElement(ChevronDown, { className: 'w-3 h-3 inline ml-1' });
  };

  const queryParams = {
    page: pagination.page,
    limit: pagination.limit,
    search: debouncedSearch || undefined,
    status: statusFilter.length > 0 ? statusFilter.join(',') : undefined,
    startDate,
    endDate,
    completedStartDate,
    completedEndDate,
    minTotalAmount,
    maxTotalAmount,
    categories: categoryFilter !== 'all' ? categoryFilter : undefined,
    paymentMethods: paymentMethodFilters !== 'all' ? paymentMethodFilters : undefined,
    manufacturers: manufacturerFilter !== 'all' ? manufacturerFilter : undefined,
    createdBy: creatorFilter !== 'all' ? creatorFilter : undefined,
    bank:
      paymentMethodFilters === 'bank_transfer' && bankFilter !== 'all'
        ? bankFilter
        : undefined,
    type: orderType,
    sortBy: sortField,
    sortOrder: sortDirection,
  };

  return {
    // state
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    categoryFilter, setCategoryFilter,
    startDate, setStartDate,
    endDate, setEndDate,
    completedStartDate, setCompletedStartDate,
    completedEndDate, setCompletedEndDate,
    minTotalAmount, setMinTotalAmount,
    maxTotalAmount, setMaxTotalAmount,
    creatorFilter, setCreatorFilter,
    sortField, sortDirection,
    orderType, setOrderType,
    manufacturerFilter, setManufacturerFilter,
    paymentMethodFilters, setPaymentMethodFilters,
    bankFilter, setBankFilter,
    filtersCollapsed, setFiltersCollapsed,
    pagination, setPagination,
    // derived
    queryParams,
    // handlers
    handleSearchChange,
    handleResetFilters,
    handleSort,
    getSortIcon,
  };
};

export type OrderFiltersReturn = ReturnType<typeof useOrderFilters>;
