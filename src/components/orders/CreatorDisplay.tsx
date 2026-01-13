import React from 'react';
import { useUserInfo } from '@/hooks/useUserInfo';

interface CreatorDisplayProps {
  createdBy: string | null;
  creatorInfo?: {
    id: string;
    email?: string;
    username?: string;
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
      const username = creatorInfo.username?.trim();
      const email = creatorInfo.email?.trim();
      
      // Ưu tiên: firstname + lastname > username > email
      if (firstName || lastName) {
        return `${firstName || ''} ${lastName || ''}`.trim();
      }

      if (username) {
        return username;
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
      <div className="text-sm whitespace-nowrap">
        <div className="font-medium text-slate-900 text-center">{displayName}</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">
        <span className="animate-pulse text-center">Đang tải...</span>
      </div>
    );
  }

  if (error || !userInfo) {
    // Không hiển thị gì nếu không tìm thấy thông tin người dùng
    return null;
  }

  // Tạo tên hiển thị: firstname + lastname hoặc email hoặc username
  const getDisplayName = () => {
    const firstName = userInfo.firstName?.trim();
    const lastName = userInfo.lastName?.trim();
    const fullName = userInfo.full_name?.trim();
    const email = userInfo.email?.trim();
    const username = userInfo.username?.trim();

    // Ưu tiên: firstname + lastname > full_name > email > username
    if (firstName || lastName) {
      return `${firstName || ''} ${lastName || ''}`.trim();
    }
    
    if (fullName) {
      return fullName;
    }

    if (username) {
      return username;
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
    <div className="text-sm whitespace-nowrap">
      <div className="font-medium text-slate-900">{displayName}</div>
    </div>
  );
};

export default CreatorDisplay;
