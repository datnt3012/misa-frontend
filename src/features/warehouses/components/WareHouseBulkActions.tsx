import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface WareHouseBulkActionsProps {
  selectedCount: number;
  onDelete: () => void;
  onClearSelection: () => void;
}

export const WareHouseBulkActions: React.FC<WareHouseBulkActionsProps> = ({
  selectedCount,
  onDelete,
  onClearSelection,
}) => {
  if (selectedCount === 0) return null;
  return (
    <Card className="shadow-sm border bg-blue-50">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-blue-700">Đã chọn {selectedCount} kho</span>
          <div className="flex items-center gap-2">
            <Button onClick={onDelete} variant="destructive" size="sm">
              <Trash2 className="w-4 h-4 mr-2" />Xóa
            </Button>
            <Button onClick={onClearSelection} variant="outline" size="sm">
              Bỏ chọn
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
