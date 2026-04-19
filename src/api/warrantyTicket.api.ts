import apiClient from '@/lib/api';
import { api } from '@/lib/api';

export const warrantyTicketApi = {
  createWarrantyTicket: async (data: {
    orderId: string;
    warehouseId?: string;
    personInCharge?: string;
    note?: string;
    status?: string;
    serialWarranties: {
      productId: string;
      orderDetailId?: string;
      serialNumbers: string[];
      warrantyMonths: number;
    }[];
  }) => {
    const response = await api.post('/warranty-tickets', data);
    return response;
  },

  updateWarrantyTicket: async (id: string, data: {
    warehouseId?: string;
    personInCharge?: string;
    note?: string;
    status?: string;
  }) => {
    const response = await api.patch(`/warranty-tickets/${id}`, data);
    return response;
  },

  getWarrantyTickets: async (params?: {
    page?: number;
    limit?: number;
    orderId?: string;
    status?: string;
    keywords?: string;
    personInCharge?: string;
    createdStartDate?: string;
    createdEndDate?: string;
  }) => {
    const response = await api.get('/warranty-tickets', { params });
    return response;
  },

  getWarrantyTicket: async (id: string) => {
    const response = await api.get(`/warranty-tickets/${id}`);
    return response;
  },

  deleteWarrantyTicket: async (id: string) => {
    const response = await api.delete(`/warranty-tickets/${id}`);
    return response;
  },

   processWarranty: async (id: string, data: {
     detail: {
       detailId: string;
       serialNumber?: string;
       processStatus: string;
       note?: string;
     }[];
     note?: string;
   }) => {
     const response = await api.post(`/warranty-tickets/${id}/process`, data);
     return response;
   },

   exportWarrantyTicket: async (id: string, format: string = 'xlsx') => {
     const response = await apiClient.get(`/warranty-tickets/${id}/export?format=${format}`, {
       responseType: 'blob',
     });
     return response.data;
   },
 };