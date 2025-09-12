import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { supabase } from "@/integrations/supabase/client"; // Removed - using API instead
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { PermissionGuard } from "@/components/PermissionGuard";
import { useNotifications } from "@/hooks/useNotifications";
import { Settings as SettingsIcon, Shield, Users, Key, UserCheck, Mail, Loader2 } from "lucide-react";
import UserSettings from "@/components/UserSettings";
import RolePermissionsManager from "@/components/settings/RolePermissionsManager";
import { usersApi, User, UserRole } from "@/api/users.api";

// UserRole interface imported from users.api.ts

interface EmailPreferences {
  receive_order_notifications: boolean;
  receive_status_updates: boolean;
  receive_payment_updates: boolean;
}

const SettingsContent = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("accountant");
  const [loading, setLoading] = useState(false);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [deleteUserLoading, setDeleteUserLoading] = useState<string | null>(null);
  const [updateRoleLoading, setUpdateRoleLoading] = useState<string | null>(null);
  const [testNotificationLoading, setTestNotificationLoading] = useState(false);
  const [tempRoleValues, setTempRoleValues] = useState<Record<string, string>>({});
  const [editingRole, setEditingRole] = useState<string | null>(null);
  // Permission checks removed - let backend handle authorization
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [showResetPasswordForm, setShowResetPasswordForm] = useState(false);
  const [emailPreferences, setEmailPreferences] = useState<EmailPreferences>({
    receive_order_notifications: true,
    receive_status_updates: true,
    receive_payment_updates: true,
  });
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newUserPasswordReset, setNewUserPasswordReset] = useState("");
  const [confirmUserPasswordReset, setConfirmUserPasswordReset] = useState("");
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { createNotification } = useNotifications();

  useEffect(() => {
    loadUsers();
    loadUserRoles();
    loadEmailPreferences();
    loadCurrentUserRole();
  }, []);


  const loadCurrentUserRole = async () => {
    // Backend API call will be implemented later
  };

  const loadUsers = async () => {
    try {
      const response = await usersApi.getUsers({ limit: 100 });
      const users = response.users || [];
      setUsers(users);
      
      // Extract unique roles from users data
      const uniqueRoles = users.reduce((acc: any[], user: any) => {
        if (user.role && !acc.find(role => role.id === user.role.id)) {
          acc.push(user.role);
        }
        return acc;
      }, []);
      
      if (uniqueRoles.length > 0) {
        setUserRoles(uniqueRoles);
      }
    } catch (error) {
      console.error('Error loading users from backend:', error);
      // Only use backend data - no fallback
      setUsers([]);
      setUserRoles([]);
    }
  };

  const loadUserRoles = async () => {
    try {
      const roles = await usersApi.getUserRoles();
      if (roles && roles.length > 0) {
        setUserRoles(roles);
      }
    } catch (error) {
      console.error('Error loading roles from /roles endpoint:', error);
      // Only use backend data - no fallback
      // Roles will be extracted from users data if available
    }
  };

  const loadEmailPreferences = async () => {
    // Backend API call will be implemented later
  };

  const updateEmailPreferences = async (newPrefs: Partial<EmailPreferences>) => {
    // Backend API call will be implemented later
    const updatedPrefs = { ...emailPreferences, ...newPrefs };
    setEmailPreferences(updatedPrefs);
    toast({
      title: "Thành công",
      description: "Đã cập nhật cài đặt email (local only)",
    });
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Lỗi",
        description: "Mật khẩu xác nhận không khớp",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Lỗi",
        description: "Mật khẩu phải có ít nhất 6 ký tự",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      // Backend API call will be implemented later
      
      toast({
        title: "Thông báo",
        description: "Chức năng đổi mật khẩu sẽ được triển khai sau",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể đổi mật khẩu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    
    if (!newUserEmail.trim() || !newUserPassword.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập đầy đủ thông tin tài khoản và mật khẩu",
        variant: "destructive",
      });
      return;
    }

    if (newUserPassword.length < 6) {
      toast({
        title: "Lỗi",
        description: "Mật khẩu phải có ít nhất 6 ký tự",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreateUserLoading(true);
      
      // Use the selected role ID directly
      if (!newUserRole) {
        throw new Error('Vai trò không hợp lệ');
      }

      await usersApi.createUser({
        email: newUserEmail,
        password: newUserPassword,
        firstName: newUserName || newUserEmail.split('@')[0],
        roleId: newUserRole,
      });

      toast({
        title: "Thành công",
        description: "Đã tạo tài khoản người dùng mới",
      });

      // Reset form
      setNewUserEmail("");
      setNewUserName("");
      setNewUserPassword("");
      setNewUserRole("");
      setShowCreateUserForm(false);

      // Reload users
      await loadUsers();

    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Thông báo",
        description: "Chức năng tạo người dùng chưa được triển khai trên backend",
        variant: "destructive",
      });
    } finally {
      setCreateUserLoading(false);
    }
  };

  const handleDeleteUserAccount = async (userId: string, userEmail: string, userRole: string) => {
    // Permission checks removed - let backend handle authorization

    if (!confirm(`Bạn có chắc muốn xóa tài khoản "${userEmail}"? Hành động này không thể hoàn tác.`)) {
      return;
    }

    try {
      setDeleteUserLoading(userId);
      
      // Backend API call will be implemented later
      const session = null; // Placeholder
      if (!session) {
        throw new Error('User not authenticated');
      }

      // Backend API call will be implemented later
      const response = { ok: false, status: 501 }; // Placeholder

      if (!response.ok) {
        if (response.status === 403) {
          toast({
            title: "Không có quyền",
            description: "Bạn không có quyền thực hiện hành động này",
            variant: "destructive",
          });
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete user');
      }

      toast({
        title: "Thành công",
        description: "Đã xóa tài khoản người dùng",
      });

      loadUserRoles();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa tài khoản người dùng",
        variant: "destructive",
      });
    } finally {
      setDeleteUserLoading(null);
    }
  };

  const handleResetUserPassword = async () => {
    if (!selectedUserId) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn nhân viên cần đổi mật khẩu",
        variant: "destructive",
      });
      return;
    }

    if (newUserPasswordReset !== confirmUserPasswordReset) {
      toast({
        title: "Lỗi",
        description: "Mật khẩu xác nhận không khớp",
        variant: "destructive",
      });
      return;
    }

    if (newUserPasswordReset.length < 6) {
      toast({
        title: "Lỗi",
        description: "Mật khẩu phải có ít nhất 6 ký tự",
        variant: "destructive",
      });
      return;
    }

    try {
      setResetPasswordLoading(true);

      // Backend API call will be implemented later
      const session = null; // Placeholder
      if (!session) {
        throw new Error('User not authenticated');
      }

      // Backend API call will be implemented later
      const response = { ok: false, status: 501 }; // Placeholder

      if (!response.ok) {
        if (response.status === 403) {
          toast({
            title: "Không có quyền",
            description: "Bạn không có quyền thực hiện hành động này",
            variant: "destructive",
          });
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to reset password');
      }

      toast({
        title: "Thành công",
        description: "Đã đổi mật khẩu nhân viên thành công",
      });

      setSelectedUserId("");
      setNewUserPasswordReset("");
      setConfirmUserPasswordReset("");
      setShowResetPasswordForm(false);
    } catch (error: any) {
      console.error('Reset user password error:', error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể đổi mật khẩu nhân viên",
        variant: "destructive",
      });
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRoleId: string) => {
    try {
      setUpdateRoleLoading(userId);
      
      await usersApi.updateUser(userId, {
        roleId: newRoleId,
      });

      toast({
        title: "Thành công",
        description: "Đã cập nhật vai trò người dùng",
      });

      setEditingRole(null);
      setTempRoleValues(prev => {
        const newTemp = { ...prev };
        delete newTemp[userId];
        return newTemp;
      });

      // Reload users and roles
      await loadUsers();
      await loadUserRoles();

    } catch (error: any) {
      toast({
        title: "Thông báo",
        description: "Chức năng cập nhật vai trò chưa được triển khai trên backend",
        variant: "destructive",
      });
    } finally {
      setUpdateRoleLoading(null);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      owner_director: { label: 'Giám đốc', variant: 'default' as const },
      chief_accountant: { label: 'Kế toán trưởng', variant: 'secondary' as const },
      accountant: { label: 'Kế toán', variant: 'outline' as const },
      inventory: { label: 'Thủ kho', variant: 'outline' as const },
      shipper: { label: 'Giao hàng', variant: 'secondary' as const },
      admin: { label: 'Quản trị', variant: 'destructive' as const }
    };

    const config = roleConfig[role as keyof typeof roleConfig] || { label: role, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  // Permission checks removed - let backend handle authorization
  const canViewPasswordReset = true; // Always show password reset - backend will handle access control
  const canResetPassword = true; // Always allow password reset - backend will handle access control

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <SettingsIcon className="w-8 h-8" />
            Cài Đặt Hệ Thống
          </h1>
          <p className="text-muted-foreground">Quản lý tài khoản và phân quyền hệ thống</p>
        </div>

        <Tabs defaultValue="password" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="password" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              Đổi mật khẩu
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Cài đặt email
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Phân quyền
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Quản lý quyền
            </TabsTrigger>
          </TabsList>

          {/* Password Change Tab */}
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Đổi mật khẩu
                </CardTitle>
                <CardDescription>
                  Thay đổi mật khẩu đăng nhập của bạn
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Mật khẩu hiện tại</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-password">Mật khẩu mới</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Xác nhận mật khẩu mới</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                  />
                </div>

                <Separator />

                <div className="flex justify-end">
                  <Button 
                    onClick={handlePasswordChange}
                    disabled={loading || !newPassword || !confirmPassword}
                    className="animate-fade-in"
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? "Đang cập nhật..." : "Đổi mật khẩu"}
                  </Button>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Test Notification</h4>
                  <Button 
                    onClick={async () => {
                      if (user?.id) {
                        setTestNotificationLoading(true);
                        try {
                          await createNotification({
                            user_id: user.id,
                            title: "Test notification",
                            message: "Đây là thông báo test từ hệ thống",
                            type: "info"
                          });
                          toast({
                            title: "Thành công",
                            description: "Đã tạo thông báo test",
                          });
                        } catch (error: any) {
                          toast({
                            title: "Lỗi",
                            description: "Không thể tạo thông báo test",
                            variant: "destructive",
                          });
                        } finally {
                          setTestNotificationLoading(false);
                        }
                      }
                    }}
                    variant="outline"
                    size="sm"
                    disabled={testNotificationLoading}
                    className="animate-fade-in"
                  >
                    {testNotificationLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {testNotificationLoading ? "Đang tạo..." : "Tạo thông báo test"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Preferences Tab */}
          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Cài đặt nhận email
                </CardTitle>
                <CardDescription>
                  Quản lý loại thông báo bạn muốn nhận qua email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                      checked={emailPreferences.receive_status_updates}
                      onChange={(e) => updateEmailPreferences({ receive_status_updates: e.target.checked })}
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Roles Tab - For Admin and Owner Director */}
          {canViewPasswordReset && (
            <TabsContent value="roles">
            <div className="space-y-6">
              {/* Reset User Password - Only for Admin */}
              {canResetPassword && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="w-5 h-5" />
                      Đổi mật khẩu nhân viên
                    </CardTitle>
                    <CardDescription>
                      Đặt lại mật khẩu cho tài khoản nhân viên trong hệ thống
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!showResetPasswordForm ? (
                      <Button 
                        onClick={() => setShowResetPasswordForm(true)}
                        className="w-full"
                      >
                        <Key className="w-4 h-4 mr-2" />
                        Bắt đầu đổi mật khẩu nhân viên
                      </Button>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="target-user">Chọn nhân viên</Label>
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Chọn nhân viên cần đổi mật khẩu" />
                              </SelectTrigger>
                              <SelectContent>
                                {users
                                  .filter(user => {
                                    // Không cho đổi mật khẩu chính mình
                                    return user.id !== user?.id;
                                  })
                                  .map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                      {user.firstName} {user.lastName} ({user.role?.name || 'Chưa phân quyền'})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="new-user-password">Mật khẩu mới</Label>
                            <Input
                              id="new-user-password"
                              type="password"
                              value={newUserPasswordReset}
                              onChange={(e) => setNewUserPasswordReset(e.target.value)}
                              placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                              minLength={6}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="confirm-user-password">Xác nhận mật khẩu mới</Label>
                            <Input
                              id="confirm-user-password"
                              type="password"
                              value={confirmUserPasswordReset}
                              onChange={(e) => setConfirmUserPasswordReset(e.target.value)}
                              placeholder="Nhập lại mật khẩu mới"
                              minLength={6}
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="outline"
                            onClick={() => {
                              setShowResetPasswordForm(false);
                              setSelectedUserId("");
                              setNewUserPasswordReset("");
                              setConfirmUserPasswordReset("");
                            }}
                            disabled={resetPasswordLoading}
                          >
                            Hủy
                          </Button>
                          <Button 
                            onClick={handleResetUserPassword}
                            disabled={resetPasswordLoading || !selectedUserId || !newUserPasswordReset || !confirmUserPasswordReset}
                            className="animate-fade-in"
                          >
                            {resetPasswordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {resetPasswordLoading ? "Đang đổi mật khẩu..." : "Đổi mật khẩu nhân viên"}
                          </Button>
                        </div>

                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <h4 className="font-medium text-yellow-800 mb-2">Lưu ý quan trọng</h4>
                          <ul className="text-sm text-yellow-700 space-y-1">
                            <li>• Chỉ admin mới có quyền đổi mật khẩu nhân viên</li>
                            <li>• Admin có thể đổi mật khẩu tất cả nhân viên kể cả giám đốc</li>
                            <li>• Nhân viên sẽ cần sử dụng mật khẩu mới để đăng nhập</li>
                            <li>• Hãy thông báo mật khẩu mới cho nhân viên một cách bảo mật</li>
                          </ul>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Add New User Role - Permission checks removed */}
              <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="w-5 h-5" />
                      Tạo tài khoản người dùng mới
                    </CardTitle>
                    <CardDescription>
                      Tạo tài khoản và phân quyền cho người dùng mới trong hệ thống
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!showCreateUserForm ? (
                      <Button 
                        onClick={() => setShowCreateUserForm(true)}
                        className="w-full"
                      >
                        <UserCheck className="w-4 h-4 mr-2" />
                        Bắt đầu tạo tài khoản mới
                      </Button>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="user-email">Tài khoản đăng nhập</Label>
                            <Input
                              id="user-email"
                              type="text"
                              value={newUserEmail}
                              onChange={(e) => setNewUserEmail(e.target.value)}
                              placeholder="Nhập tài khoản (có thể là email hoặc username)"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="user-name">Tên hiển thị</Label>
                            <Input
                              id="user-name"
                              type="text"
                              value={newUserName}
                              onChange={(e) => setNewUserName(e.target.value)}
                              placeholder="Nhập tên hiển thị"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="user-password">Mật khẩu</Label>
                            <Input
                              id="user-password"
                              type="password"
                              value={newUserPassword}
                              onChange={(e) => setNewUserPassword(e.target.value)}
                              placeholder="Nhập mật khẩu (ít nhất 6 ký tự)"
                              minLength={6}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="user-role">Vai trò</Label>
                            <Select value={newUserRole} onValueChange={setNewUserRole}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {userRoles.map((role) => (
                                  <SelectItem key={role.id} value={role.id}>
                                    {role.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="outline"
                            onClick={() => {
                              setShowCreateUserForm(false);
                              setNewUserEmail("");
                              setNewUserName("");
                              setNewUserPassword("");
                              setNewUserRole("");
                            }}
                            disabled={createUserLoading}
                          >
                            Hủy
                          </Button>
                          <Button 
                            onClick={handleCreateUser}
                            disabled={createUserLoading || !newUserEmail.trim() || !newUserPassword.trim()}
                            className="animate-fade-in"
                          >
                            {createUserLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {createUserLoading ? "Đang tạo..." : "Tạo tài khoản"}
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

              {/* Current User Roles */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Danh sách phân quyền
                  </CardTitle>
                  <CardDescription>
                    Tất cả người dùng và quyền trong hệ thống
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Người dùng</TableHead>
                          <TableHead>Vai trò</TableHead>
                          <TableHead>Ngày phân quyền</TableHead>
                          <TableHead>Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center">
                              Chưa có người dùng nào
                            </TableCell>
                          </TableRow>
                        ) : (
                          users.map((userItem) => (
                            <TableRow key={userItem.id}>
                                 <TableCell>
                                   <div>
                                     <p className="font-medium">{userItem.firstName} {userItem.lastName}</p>
                                     <p className="text-sm text-muted-foreground">{userItem.email}</p>
                                     <p className="text-xs text-muted-foreground">ID: {userItem.id.slice(0, 8)}...</p>
                                   </div>
                                 </TableCell>
                                <TableCell>
                                  {editingRole === userItem.id ? (
                                     <div className="flex items-center gap-2">
                                        <Select 
                                          value={tempRoleValues[userItem.id] || userItem.role?.id || userItem.roleId} 
                                          onValueChange={(newRole) => {
                                            setTempRoleValues(prev => ({
                                              ...prev,
                                              [userItem.id]: newRole
                                            }));
                                          }}
                                        >
                                         <SelectTrigger className="w-40">
                                           <SelectValue placeholder={userItem.role?.name || "Chọn vai trò"} />
                                         </SelectTrigger>
                                         <SelectContent>
                                           {userRoles.map((role) => (
                                             <SelectItem key={role.id} value={role.id}>
                                               {role.name}
                                             </SelectItem>
                                           ))}
                                         </SelectContent>
                                       </Select>
                                       <Button
                                         variant="outline"
                                         size="sm"
                                         onClick={() => handleUpdateUserRole(userItem.id, (tempRoleValues[userItem.id] || userItem.role?.id || userItem.roleId) as any)}
                                         disabled={updateRoleLoading === userItem.id}
                                         className="animate-scale-in"
                                       >
                                         {updateRoleLoading === userItem.id && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                         {updateRoleLoading === userItem.id ? "Đang lưu..." : "Lưu"}
                                       </Button>
                                       <Button
                                         variant="outline"
                                         size="sm"
                                         onClick={() => {
                                           setEditingRole(null);
                                           setTempRoleValues(prev => {
                                             const newTemp = { ...prev };
                                             delete newTemp[userItem.id];
                                             return newTemp;
                                           });
                                         }}
                                       >
                                         Hủy
                                       </Button>
                                     </div>
                                 ) : (
                                   <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        {userItem.role?.name || 'Chưa phân quyền'}
                                      </Badge>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditingRole(userItem.id)}
                                        className="h-6 w-6 p-0"
                                      >
                                        ✏️
                                      </Button>
                                   </div>
                                 )}
                               </TableCell>
                              <TableCell>
                                {formatDateTime(userItem.createdAt)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteUserAccount(userItem.id, userItem.email, userItem.role?.name || '')}
                                  className="animate-fade-in text-red-600 hover:text-red-700"
                                  disabled={deleteUserLoading === userItem.id}
                                >
                                  {deleteUserLoading === userItem.id && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                  {deleteUserLoading === userItem.id ? "Đang xóa..." : "Xóa tài khoản"}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Admin Info */}
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-blue-800">Thông tin quản trị</CardTitle>
                </CardHeader>
                <CardContent className="text-blue-700">
                  <p className="text-sm">
                    <strong>Tài khoản admin mặc định:</strong> anh.hxt@gmail.com
                  </p>
                  <p className="text-sm mt-1">
                    Chỉ tài khoản admin mới có thể quản lý phân quyền người dùng.
                  </p>
                  {!canResetPassword && (
                    <p className="text-sm mt-2 text-amber-600">
                      Bạn không có quyền quản lý phân quyền hệ thống.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
            </TabsContent>
          )}

          {/* Role Permissions Management Tab */}
          <TabsContent value="permissions">
            <PermissionGuard requiredPermissions={['permissions.read']}>
              <RolePermissionsManager onRoleUpdate={loadUserRoles} />
            </PermissionGuard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const Settings = () => {
  return (
    <PermissionGuard requiredPermissions={['settings.view']}>
      <SettingsContent />
    </PermissionGuard>
  );
};

export default Settings;

