const colSpanClasses = {
    1: "col-span-1",
    2: "col-span-2",
    3: "col-span-3",
    4: "col-span-4",
    6: "col-span-6",
    8: "col-span-8",
    12: "col-span-12"
};

export const getColSpan = (colSpan: number) => colSpanClasses[colSpan];