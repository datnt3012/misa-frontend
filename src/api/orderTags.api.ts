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
  // Get all available tags
  getAllTags: async (): Promise<OrderTag[]> => {
    try {
      // For now, return predefined tags since we don't have API endpoint
      return getPredefinedTags();
    } catch (error) {
      console.error('Error loading tags:', error);
      return getPredefinedTags(); // Fallback to predefined tags
    }
  },

  // Get assigned tags for an order
  getAssignedTags: async (orderId: string): Promise<OrderTag[]> => {
    try {
      // For now, return empty array since we don't have API endpoint
      // This would be replaced with actual API call when available
      return [];
    } catch (error) {
      console.error('Error loading assigned tags:', error);
      return [];
    }
  },

  // Create a new tag
  createTag: async (tagData: CreateOrderTagRequest): Promise<OrderTag> => {
    // For now, simulate creation
    const newTag: OrderTag = {
      id: `tag_${Date.now()}`,
      name: tagData.name,
      color: tagData.color,
      description: tagData.description,
      created_at: new Date().toISOString(),
    };
    return newTag;
  },

  // Assign tag to order
  assignTag: async (orderId: string, tagId: string): Promise<OrderTagAssignment> => {
    // For now, simulate assignment
    const assignment: OrderTagAssignment = {
      id: `assignment_${Date.now()}`,
      order_id: orderId,
      tag_id: tagId,
      created_at: new Date().toISOString(),
    };
    return assignment;
  },

  // Remove tag from order
  removeTag: async (orderId: string, tagId: string): Promise<void> => {
    // For now, simulate removal
    console.log(`Removing tag ${tagId} from order ${orderId}`);
  },

  // Delete tag
  deleteTag: async (tagId: string): Promise<void> => {
    // For now, simulate deletion
    console.log(`Deleting tag ${tagId}`);
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
