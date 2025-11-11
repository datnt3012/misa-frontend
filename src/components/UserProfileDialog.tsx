import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { authApi } from "@/api/auth.api";
import { User } from "@/types/auth";

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UserProfileDialog: React.FC<UserProfileDialogProps> = ({ open, onOpenChange }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    address: '',
  });
  const { toast } = useToast();
  const { user: currentUser, refreshUser } = useAuth();

  useEffect(() => {
    if (open && currentUser) {
      setFormData({
        email: currentUser.email || '',
        username: (currentUser as any).username || (currentUser as any).user_metadata?.username || '',
        firstName: currentUser.firstName || currentUser.user_metadata?.firstName || '',
        lastName: currentUser.lastName || currentUser.user_metadata?.lastName || '',
        phoneNumber: (currentUser as any).phoneNumber || (currentUser as any).phone_number || '',
        address: (currentUser as any).address || '',
      });
    }
  }, [open, currentUser]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!currentUser) {
      toast({
        title: "Lỗi",
        description: "Không tìm thấy thông tin người dùng",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      
      // Cập nhật thông tin người dùng
      const updateData: any = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber || undefined,
        address: formData.address || undefined,
      };
      
      // Thêm username nếu có
      if (formData.username) {
        updateData.username = formData.username;
      }

      // Gọi API cập nhật thông tin người dùng hiện tại
      await authApi.updateProfile(updateData);

      // Refresh user data to update UI
      await refreshUser();

      toast({
        title: "Thành công",
        description: "Đã cập nhật thông tin người dùng",
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể cập nhật thông tin",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original values
    if (currentUser) {
      setFormData({
        email: currentUser.email || '',
        username: (currentUser as any).username || (currentUser as any).user_metadata?.username || '',
        firstName: currentUser.firstName || currentUser.user_metadata?.firstName || '',
        lastName: currentUser.lastName || currentUser.user_metadata?.lastName || '',
        phoneNumber: (currentUser as any).phoneNumber || (currentUser as any).phone_number || '',
        address: (currentUser as any).address || '',
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa thông tin cá nhân</DialogTitle>
          <DialogDescription>
            Cập nhật thông tin cá nhân của bạn
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Nhập email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Tên đăng nhập (Username)</Label>
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="Nhập tên đăng nhập"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Tên</Label>
              <Input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Nhập tên"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Họ</Label>
              <Input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Nhập họ"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Số điện thoại</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
              placeholder="Nhập số điện thoại"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Địa chỉ</Label>
            <Input
              id="address"
              type="text"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Nhập địa chỉ"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileDialog;
