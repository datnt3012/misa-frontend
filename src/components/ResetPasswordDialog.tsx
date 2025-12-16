import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/api/auth.api';

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  temporaryPassword: string;
  onSuccess: () => void;
}

export default function ResetPasswordDialog({
  open,
  onOpenChange,
  email,
  temporaryPassword,
  onSuccess,
}: ResetPasswordDialogProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords
    if (!newPassword || !confirmPassword) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập mật khẩu mới',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Lỗi',
        description: 'Mật khẩu xác nhận không khớp',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword === temporaryPassword) {
      toast({
        title: 'Lỗi',
        description: 'Mật khẩu mới không được trùng với mật khẩu tạm thời',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      await authApi.resetPasswordWithTemporary({
        emailOrUsername: email,
        temporaryPassword,
        newPassword,
      });

      toast({
        title: 'Thành công',
        description: 'Mật khẩu đã được đổi thành công',
      });

      // Reset form
      setNewPassword('');
      setConfirmPassword('');
      onSuccess();
    } catch (error: any) {
      console.error('Reset password error:', error);
      let errorMessage = 'Có lỗi xảy ra khi đổi mật khẩu';

      if (error.response?.data?.message) {
        if (Array.isArray(error.response.data.message)) {
          errorMessage = error.response.data.message.join('\n');
        } else {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Lỗi',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Đặt mật khẩu mới</DialogTitle>
          <DialogDescription>
            Vui lòng nhập mật khẩu mới để hoàn tất quy trình khôi phục
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleResetPassword} className="space-y-4">
          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="new-password">Mật khẩu mới</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Ít nhất 8 chữ, số và ký tự đặc biệt
            </p>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Xác nhận mật khẩu</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading || !newPassword || !confirmPassword}
            >
              {isLoading ? 'Đang xử lý...' : 'Đặt mật khẩu mới'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
