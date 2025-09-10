import React from 'react';
import { useUserInfo } from '@/hooks/useUserInfo';

interface CreatorDisplayProps {
  createdBy: string | null;
  creatorInfo?: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  };
}

const CreatorDisplay: React.FC<CreatorDisplayProps> = ({ createdBy, creatorInfo }) => {
  const { userInfo, loading, error } = useUserInfo(createdBy);


  // Ưu tiên sử dụng creatorInfo từ order nếu có
  if (creatorInfo) {
    const getDisplayName = () => {
      const firstName = creatorInfo.firstName?.trim();
      const lastName = creatorInfo.lastName?.trim();
      const email = creatorInfo.email?.trim();

      // Ưu tiên: firstname + lastname > email
      if (firstName || lastName) {
        return `${firstName || ''} ${lastName || ''}`.trim();
      }
      
      if (email) {
        return email;
      }
      
      return null;
    };

    const displayName = getDisplayName();
    
    if (!displayName) {
      return null;
    }

    return (
      <div className="text-sm">
        <div className="font-medium text-slate-900">{displayName}</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">
        <span className="animate-pulse">Đang tải...</span>
      </div>
    );
  }

  if (error || !userInfo) {
    // Fallback: hiển thị ID rút gọn nếu có createdBy
    if (createdBy) {
      return (
        <div className="text-sm">
          <div className="font-medium text-slate-900">ID: {createdBy.slice(0, 8)}...</div>
        </div>
      );
    }
    return null; // Không hiển thị gì nếu không có createdBy
  }

  // Tạo tên hiển thị: firstname + lastname hoặc email
  const getDisplayName = () => {
    const firstName = userInfo.firstName?.trim();
    const lastName = userInfo.lastName?.trim();
    const fullName = userInfo.full_name?.trim();
    const email = userInfo.email?.trim();

    // Ưu tiên: firstname + lastname > full_name > email
    if (firstName || lastName) {
      return `${firstName || ''} ${lastName || ''}`.trim();
    }
    
    if (fullName) {
      return fullName;
    }
    
    if (email) {
      return email;
    }
    
    return null; // Không hiển thị gì nếu tất cả đều rỗng
  };

  const displayName = getDisplayName();
  
  // Không hiển thị gì nếu không có tên hoặc email
  if (!displayName) {
    return null;
  }

  return (
    <div className="text-sm">
      <div className="font-medium text-slate-900">{displayName}</div>
    </div>
  );
};

export default CreatorDisplay;
