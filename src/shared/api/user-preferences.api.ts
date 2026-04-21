import { API } from "./api";
import { request } from "./request";

export interface ColumnVisibilityPreferences {
  [tableKey: string]: {
    [columnKey: string]: boolean;
  };
}

export const userPreferencesApi = {
  // Get column visibility preferences
  getColumnVisibility: async (): Promise<ColumnVisibilityPreferences> => {
    try {
      const response = await request<any>("get", API.USERS.GET_PREFERENCES, {
        params: { type: 'column_visibility' }
      });
      const data = response?.data || response;
      
      if (data?.data?.column_visibility) {
        return data.data.column_visibility;
      }
      
      if (data?.column_visibility) {
        return data.column_visibility;
      }
      
      return {};
    } catch (error) {
      console.error('Failed to get column visibility preferences:', error);
      return {};
    }
  },

  // Update column visibility preferences
  updateColumnVisibility: async (preferences: ColumnVisibilityPreferences): Promise<{ message: string }> => {
    return request<{ message: string }>("patch", `${API.USERS.ROOT}/preferences/column-visibility`, {
      data: { column_visibility: preferences }
    }).then(res => res.data);
  },
};
