export type WarehouseReceiptType = {
    id: string;
    code: string;
    status: string;
    type: string;
    createdAt: string;
    warehouse: {
        id: string;
        name: string;
        address: string;
    };
    details: [
        {
            id: string;
            quantity: number;
            unitPrice: string;
            product: {
                id: string;
                code: string;
                name: string;
            }
        }
    ]
}