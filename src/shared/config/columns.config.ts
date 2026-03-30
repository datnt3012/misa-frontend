export type Column<T> = {
    key: string;
    title: string;
    className?: string;
    cellClassName?: string;
    onCellClick?: (row: T, e: React.MouseEvent<HTMLTableCellElement>) => void;
    render?: (row: T) => React.ReactNode;
};