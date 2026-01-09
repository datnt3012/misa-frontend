import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { authApi } from "@/api/auth.api";
import { usersApi, EmailPreferences } from "@/api/users.api";
import { Key, Loader2, Mail } from "lucide-react";
import { convertPermissionCodesInMessage } from "@/utils/permissionMessageConverter";
interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
const UserProfileDialog: React.FC<UserProfileDialogProps> = ({ open, onOpenChange }) => {
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    address: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [emailPreferences, setEmailPreferences] = useState<EmailPreferences>({
    receive_order_notifications: true,
    receive_order_status_updates: true,
    receive_payment_updates: true,
  });
  const { toast } = useToast();
  const { user: currentUser, refreshUser } = useAuth();
  useEffect(() => {
    if (open) {
      // Refresh user data when dialog opens to ensure we have the latest data
      // This is important because username might have been updated
      refreshUser().catch(error => {
      });
      // Load email preferences when dialog opens
      loadEmailPreferences();
    }
  }, [open]); // Only depend on open to avoid infinite loops
  useEffect(() => {
    if (open && currentUser) {
      // Update form data when currentUser changes
      setFormData({
        email: currentUser.email || '',
        username: currentUser.username || '',
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        phoneNumber: currentUser.phoneNumber || '',
        address: currentUser.address || '',
      });
      // Reset password fields when dialog opens
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
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
      // Thêm username (có thể là chuỗi rỗng để xóa username)
      // Gửi username ngay cả khi rỗng để backend có thể xử lý
      updateData.username = formData.username || undefined;
      // Gọi API cập nhật thông tin người dùng hiện tại
      const updatedUserResponse = await authApi.updateProfile(updateData);
      // The updateProfile API returns the updated user data with username
      // We need to update the global user state immediately so the UI reflects the change
      // Refresh user data to update global state and localStorage
      // This should fetch the updated username from the backend
      await refreshUser();
      toast({
        title: "Thành công",
        description: "Đã cập nhật thông tin người dùng",
      });
      // Close dialog after a short delay to ensure state is updated
      setTimeout(() => {
        onOpenChange(false);
      }, 200);
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể cập nhật thông tin",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập đầy đủ mật khẩu hiện tại, mật khẩu mới và xác nhận mật khẩu",
        variant: "destructive",
      });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Lỗi",
        description: "Mật khẩu xác nhận không khớp",
        variant: "destructive",
      });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Lỗi",
        description: "Mật khẩu phải có ít nhất 6 ký tự",
        variant: "destructive",
      });
      return;
    }
    try {
      setChangingPassword(true);
      // Change password using API
      await authApi.changePassword({
        oldPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast({
        title: "Thành công",
        description: "Đã đổi mật khẩu thành công",
      });
      // Clear password fields after successful change
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || error.message || "Không thể đổi mật khẩu",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };
  const loadEmailPreferences = async () => {
    try {
      const preferences = await usersApi.getEmailPreferences();
      setEmailPreferences(preferences);
    } catch (error: any) {
      // If GET endpoint doesn't exist or returns error, use default values
      console.log('Could not load email preferences from backend, using defaults:', error);
    }
  };

  const updateEmailPreferences = async (newPrefs: Partial<EmailPreferences>) => {
    try {
      const updatedPrefs = { ...emailPreferences, ...newPrefs };
      await usersApi.updateEmailPreferences(updatedPrefs);
      setEmailPreferences(updatedPrefs);

      toast({
        title: "Thành công",
        description: "Đã cập nhật cài đặt email",
      });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: convertPermissionCodesInMessage(error.response?.data?.message || error.message || "Không thể cập nhật cài đặt email"),
        variant: "destructive",
      });
    }    
  };

  const handleCancel = () => {
    // Reset form data to original values
    if (currentUser) {
      setFormData({
        email: currentUser.email || '',
        username: currentUser.username || '',
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        phoneNumber: currentUser.phoneNumber || '',
        address: currentUser.address || '',
      });
    }
    // Reset password fields
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    // Reload email preferences to reset to saved values
    loadEmailPreferences();
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
        <Separator />
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-muted-foreground" />
            <Label className="text-base font-medium">Đổi mật khẩu</Label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Mật khẩu hiện tại</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Nhập mật khẩu hiện tại"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Mật khẩu mới</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Xác nhận mật khẩu mới</Label>
            <Input
              id="confirm-password"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Nhập lại mật khẩu mới"
            />
          </div>
          <Button
            variant="outline"
            onClick={handleChangePassword}
            disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
            className="w-full"
          >
            {changingPassword ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang đổi mật khẩu...
              </>
            ) : (
              <>
                <Key className="w-4 h-4 mr-2" />
                Đổi mật khẩu
              </>
            )}
          </Button>
        </div>
        <Separator />
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <Label className="text-base font-medium">Cài đặt nhận email</Label>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base">Thông báo đơn hàng tổng quát</Label>
                <p className="text-sm text-muted-foreground">
                  Nhận email về các hoạt động chung liên quan đến đơn hàng
                </p>
              </div>
              <input
                type="checkbox"
                checked={emailPreferences.receive_order_notifications}
                onChange={(e) => updateEmailPreferences({ receive_order_notifications: e.target.checked })}
                className="w-4 h-4"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base">Thay đổi trạng thái đơn hàng</Label>
                <p className="text-sm text-muted-foreground">
                  Nhận email khi trạng thái đơn hàng được cập nhật
                </p>
              </div>
              <input
                type="checkbox"
                checked={emailPreferences.receive_order_status_updates}
                onChange={(e) => updateEmailPreferences({ receive_order_status_updates: e.target.checked })}
                className="w-4 h-4"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base">Cập nhật thanh toán</Label>
                <p className="text-sm text-muted-foreground">
                  Nhận email khi có thay đổi về thanh toán đơn hàng
                </p>
              </div>
              <input
                type="checkbox"
                checked={emailPreferences.receive_payment_updates}
                onChange={(e) => updateEmailPreferences({ receive_payment_updates: e.target.checked })}
                className="w-4 h-4"
              />
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Lưu ý về email</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Email sẽ được gửi khi có thay đổi quan trọng về đơn hàng</li>
              <li>• Bạn có thể tắt bất kỳ loại thông báo nào bằng cách bỏ chọn</li>
              <li>• Cài đặt này chỉ áp dụng cho tài khoản của bạn</li>
            </ul>
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