import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface PaginationBarProps {
    filters: { page: number; limit: number;[key: string]: any };
    total: number;
    onFiltersChange: (f: any) => void;
}

export const PaginationBar = ({
    filters,
    total,
    onFiltersChange,
}: PaginationBarProps) => {
    const limit = filters.limit ?? 10;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = filters.page;

    const btnBase =
        "inline-flex items-center justify-center h-8 min-w-[2rem] px-2 rounded text-xs border border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:pointer-events-none";
    const btnActive = "bg-primary text-white border-primary hover:bg-primary";

    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        if (page > 3) pages.push("...");
        for (
            let i = Math.max(2, page - 1);
            i <= Math.min(totalPages - 1, page + 1);
            i++
        )
            pages.push(i);
        if (page < totalPages - 2) pages.push("...");
        pages.push(totalPages);
    }

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1 py-2">
            {/* Page size + total */}
            <div className="flex items-center gap-2 order-2 sm:order-1">
                <span className="text-sm text-gray-500 whitespace-nowrap">Hiển thị</span>
                <Select
                    value={String(limit)}
                    onValueChange={(value) =>
                        onFiltersChange({ ...filters, limit: parseInt(value, 10), page: 1 })
                    }
                >
                    <SelectTrigger className="w-[70px] h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {[10, 25, 50, 100].map((opt) => (
                            <SelectItem key={opt} value={String(opt)} className="text-xs">
                                {opt}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <span className="text-sm text-gray-500 whitespace-nowrap">
                    trong tổng số {total} bản ghi
                </span>
            </div>

            {/* Page numbers */}
            <nav className="flex items-center gap-1 order-1 sm:order-2">
                <button
                    onClick={() =>
                        page > 1 && onFiltersChange({ ...filters, page: page - 1 })
                    }
                    disabled={page <= 1}
                    className={btnBase}
                    aria-label="Trang trước"
                >
                    ‹ Trước
                </button>

                <div className="hidden sm:flex items-center gap-1">
                    {pages.map((p, i) =>
                        p === "..." ? (
                            <span key={`ellipsis-${i}`} className="px-1 text-gray-400 text-xs">
                                ...
                            </span>
                        ) : (
                            <button
                                key={p}
                                onClick={() => onFiltersChange({ ...filters, page: p })}
                                className={cn(btnBase, page === p && btnActive)}
                            >
                                {p}
                            </button>
                        )
                    )}
                </div>

                <span className="flex sm:hidden items-center px-3 text-xs text-gray-500">
                    {page} / {totalPages}
                </span>

                <button
                    onClick={() =>
                        page < totalPages &&
                        onFiltersChange({ ...filters, page: page + 1 })
                    }
                    disabled={page >= totalPages}
                    className={btnBase}
                    aria-label="Trang sau"
                >
                    Sau ›
                </button>
            </nav>
        </div>
    );
}