import { GenericFormFieldConfig } from '@/shared/config';
import { WarehouseFilterSchemaType } from './schemas';
import { useCategoriesQuery } from '../categories/hooks';

export type FilterWarehouseFieldConfig = GenericFormFieldConfig<WarehouseFilterSchemaType>;

export const filterWarehouseConfig: FilterWarehouseFieldConfig[] = [
  {
    label: 'Tìm kiếm',
    name: 'keyword',
    type: 'text',
    placeholder: 'Tìm kiếm theo tên, mã, barcode...',
    colSpan: 3,
    colSpanMd: 3,
  },
  {
    label: 'Danh mục',
    name: 'categoryId',
    type: 'autocomplete',
    placeholder: 'Tất cả',
    fetchOptions: () => {
      const { data, isLoading, isFetching } = useCategoriesQuery();
      return {
        data:
          data?.data?.rows?.map((category) => ({
            value: category.id,
            label: category.name,
          })) ?? [],
        isLoading,
        isFetching,
      };
    },
    colSpan: 3,
    colSpanMd: 3,
  },
  {
    label: 'Trạng thái',
    name: 'isActive',
    type: 'select',
    placeholder: 'Tất cả',
    options: [
      { value: 'true', label: 'Đang kinh doanh' },
      { value: 'false', label: 'Ngừng kinh doanh' },
    ],
    colSpan: 3,
    colSpanMd: 3,
  },
  {
    label: 'Khoảng giá bán',
    name: 'minPrice',
    type: 'numberRange',
    minField: 'minPrice',
    maxField: 'maxPrice',
    colSpan: 6,
    colSpanMd: 6,
  },
  {
    label: 'Nhà sản xuất',
    name: 'manufacturer',
    type: 'autocomplete',
    placeholder: 'Chọn nhà sản xuất...',
    colSpan: 6,
    colSpanMd: 6,
  },
] as const;
