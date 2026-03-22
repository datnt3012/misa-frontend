import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OrderPageHeaderProps {
    title?: string;
    description?: string;
    onCreateClick: () => void;
    className?: string;
}

export const OrderPageHeader: React.FC<OrderPageHeaderProps> = ({ 
    title = "Quản lý đơn hàng", 
    description,
    onCreateClick,
    className
}) => {
    return (
        <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 px-2", className)}>
            <div>
                <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {title}
                </h1>
                {description && (
                    <p className="text-muted-foreground text-sm mt-1">
                        {description}
                    </p>
                )}
            </div>
            
            <div className="flex items-center gap-3">
                <Button 
                    onClick={onCreateClick}
                    className="h-11 px-6 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 transition-all duration-300 active:scale-95 group font-semibold"
                >
                    <div className="bg-white/20 p-1 rounded-md group-hover:bg-white/30 transition-colors">
                        <Plus className="h-4 w-4" />
                    </div>
                    Thêm đơn hàng mới
                </Button>
            </div>
        </div>
    );
};
