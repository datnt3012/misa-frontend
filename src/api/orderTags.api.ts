import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';

export interface OrderTag {
  id: string;
  name: string;
  color: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateOrderTagRequest {
  name: string;
  color: string;
  description?: string;
}

export interface UpdateOrderTagRequest {
  name?: string;
  color?: string;
  description?: string;
}

export interface OrderTagAssignment {
  id: string;
  order_id: string;
  tag_id: string;
  created_at?: string;
}

export const orderTagsApi = {
  // Get all available tags (frontend-defined)
  getAllTags: async (): Promise<OrderTag[]> => {
    return getPredefinedTags();
  },

  // Get assigned tags for an order (from order data)
  getAssignedTags: async (orderId: string): Promise<OrderTag[]> => {
    // Tags are already included in order data via order_tag_assignments
    // This function is kept for compatibility but returns empty array
    // The actual tags are passed via currentTags prop in OrderTagsManager
    return [];
  },

  // Create a new tag (frontend-only, not persisted)
  createTag: async (tagData: CreateOrderTagRequest): Promise<OrderTag> => {
    // Since backend doesn't support creating tags, we create them locally
    const newTag: OrderTag = {
      id: `tag_${Date.now()}`,
      name: tagData.name,
      color: tagData.color,
      description: tagData.description,
      created_at: new Date().toISOString(),
    };
    return newTag;
  },

  // Assign tag to order (update order with new tag)
  assignTag: async (orderId: string, tagId: string): Promise<OrderTagAssignment> => {
    try {
      // Get current order to update its tags
      const { orderApi } = await import('./order.api');
      const currentOrder = await orderApi.getOrderIncludeDeleted(orderId);
      
      // Get the tag to assign
      const allTags = getPredefinedTags();
      const tagToAssign = allTags.find(t => t.id === tagId);
      
      if (!tagToAssign) {
        throw new Error(`Tag with id ${tagId} not found`);
      }
      
      // Get current tags from order (compare by name with FE tags)
      const currentTags = currentOrder.tags || [];
      const currentTagNames = currentTags;
      
      // Check if tag is already assigned (compare by name)
      const isAlreadyAssigned = currentTagNames.includes(tagToAssign.name);
      
      if (isAlreadyAssigned) {
        return {
          id: `assignment_${Date.now()}`,
          order_id: orderId,
          tag_id: tagId,
          created_at: new Date().toISOString(),
        };
      }
      
      // Add tag name to current tags
      const updatedTags = [...currentTagNames, tagToAssign.name];
      
      // Update order via API with tags array
      await orderApi.updateOrder(orderId, { 
        tags: updatedTags 
      });
      
      return {
        id: `assignment_${Date.now()}`,
        order_id: orderId,
        tag_id: tagId,
        created_at: new Date().toISOString(),
      };
    } catch (error) {
      // Throw error instead of fallback to simulation
      throw new Error(`Failed to assign tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Remove tag from order (update order to remove tag)
  removeTag: async (orderId: string, tagId: string): Promise<void> => {
    try {
      // Get current order to update its tags
      const { orderApi } = await import('./order.api');
      const currentOrder = await orderApi.getOrderIncludeDeleted(orderId);
      
      // Get the tag to remove
      const allTags = getPredefinedTags();
      const tagToRemove = allTags.find(t => t.id === tagId);
      
      if (!tagToRemove) {
        return;
      }
      
      // Remove tag name from current tags (compare by name)
      const currentTags = currentOrder.tags || [];
      const updatedTags = currentTags.filter(tagName => tagName !== tagToRemove.name);
      
      // Update order with removed tag
      await orderApi.updateOrder(orderId, { 
        tags: updatedTags 
      });
    } catch (error) {
      // Throw error instead of simulation
      throw new Error(`Failed to remove tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Delete tag (frontend-only, not persisted)
  deleteTag: async (tagId: string): Promise<void> => {
    // Since backend doesn't support deleting tags, we just log it
    // Tags are predefined and cannot be deleted
  },
};

// Predefined tags as requested
const getPredefinedTags = (): OrderTag[] => [
  {
    id: 'tag_chua_doi_soat',
    name: 'Chưa đối soát',
    color: '#ef4444', // red
    description: 'Đơn hàng chưa được đối soát',
  },
  {
    id: 'tag_da_doi_soat',
    name: 'Đã đối soát',
    color: '#10b981', // green
    description: 'Đơn hàng đã được đối soát',
  },
  {
    id: 'tag_khach_moi',
    name: 'Khách mới',
    color: '#3b82f6', // blue
    description: 'Khách hàng mới lần đầu mua hàng',
  },
  {
    id: 'tag_khach_quay_lai',
    name: 'Khách hàng quay lại',
    color: '#8b5cf6', // purple
    description: 'Khách hàng quay lại mua hàng',
  },
  {
    id: 'tag_uu_tien',
    name: 'Ưu tiên',
    color: '#f59e0b', // amber
    description: 'Đơn hàng ưu tiên cần xử lý nhanh',
  },
  {
    id: 'tag_loi',
    name: 'Lỗi',
    color: '#dc2626', // red-600
    description: 'Đơn hàng có lỗi cần xử lý',
  },
];
