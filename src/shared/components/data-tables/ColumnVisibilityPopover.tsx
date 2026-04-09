import React from 'react';
import { Settings2, RefreshCcw, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DataTableColumn } from './StripedDataTable';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface ColumnVisibilityPopoverProps<TColumn extends { key: any; label: React.ReactNode }> {
  columns: TColumn[];
  visibility: Record<string, boolean>;
  onToggle: (key: string) => void;
  onReset: () => void;
  onSetAll: (visible: boolean) => void;
  alwaysVisible?: string[];
  className?: string;
}

export function ColumnVisibilityPopover<TColumn extends { key: any; label: React.ReactNode }>({
  columns,
  visibility,
  onToggle,
  onReset,
  onSetAll,
  alwaysVisible = [],
  className,
}: ColumnVisibilityPopoverProps<TColumn>) {
  // Filter out the 'actions' and 'empty' columns from toggling if they are always visible or not needed
  const displayColumns = columns.filter(col =>
    col.key !== 'actions' && String(col.key).indexOf('empty') === -1
  );

  const toggleableColumns = displayColumns.filter(col => !alwaysVisible.includes(String(col.key)));
  const allSelected = toggleableColumns.every(col => visibility[String(col.key)] !== false);
  const someSelected = toggleableColumns.some(col => visibility[String(col.key)] !== false) && !allSelected;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-8 gap-2 bg-background border-border/60 hover:bg-muted/50", className)}
        >
          <Settings2 className="w-4 h-4 text-muted-foreground" />
          <span className="hidden sm:inline">Tuỳ chỉnh cột</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[240px] p-0 shadow-xl border-border/80">
        <div className="p-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Settings2 className="w-3.5 h-3.5" />
              Hiển thị cột
            </h4>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Chọn các cột muốn hiển thị trên bảng
          </p>
        </div>

        <Separator className="bg-border/60" />

        <div className="px-3 py-2 flex items-center justify-between bg-muted/10">
          <div
            className="flex items-center space-x-2 cursor-pointer hover:bg-muted/40 p-1 px-2 rounded -ml-2 transition-colors"
            onClick={() => onSetAll(!allSelected)}
          >
            <Checkbox
              id="col-all"
              checked={allSelected}
              onCheckedChange={() => onSetAll(!allSelected)}
              className="h-3.5 w-3.5"
            />
            <label htmlFor="col-all" className="text-[11px] font-semibold cursor-pointer">
              {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </label>
          </div>
        </div>

        <Separator className="bg-border/60 opacity-50" />

        <ScrollArea className="h-[300px] py-1 px-3">
          <div className="space-y-1 my-1">
            {displayColumns.map((col) => {
              const key = String(col.key);
              const isLocked = alwaysVisible.includes(key);
              const isChecked = isLocked || visibility[key] !== false;

              const content = (
                <div
                  key={key}
                  className={cn(
                    "flex items-center space-x-2 px-2 py-1.5 rounded-md transition-colors",
                    isLocked ? "opacity-60 cursor-not-allowed bg-muted/20" : "hover:bg-muted/60 cursor-pointer"
                  )}
                  onClick={() => !isLocked && onToggle(key)}
                >
                  <Checkbox
                    id={`col-${key}`}
                    checked={isChecked}
                    onCheckedChange={() => !isLocked && onToggle(key)}
                    disabled={isLocked}
                    className="h-3.5 w-3.5"
                  />
                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <label
                      htmlFor={`col-${key}`}
                      className={cn(
                        "text-sm font-medium leading-none truncate cursor-pointer",
                        isLocked && "cursor-not-allowed"
                      )}
                    >
                      {String(col.label)}
                    </label>
                    {isLocked && <Lock className="w-3 h-3 text-muted-foreground shrink-0 ml-2" />}
                  </div>
                </div>
              );

              if (isLocked) {
                return (
                  <TooltipProvider key={key} delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {content}
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-[10px] py-1 px-2">
                        Cột này luôn được hiển thị
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              }

              return content;
            })}
          </div>
        </ScrollArea>

        <Separator className="bg-border/60" />

        <div className="p-2 bg-muted/10">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-8 text-sm font-medium justify-center gap-2 hover:bg-muted/50"
            onClick={onReset}
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Đặt lại mặc định
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
