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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { Settings as SettingsIcon, Shield, Users, Key, UserCheck, Mail, Loader2 } from "lucide-react";
import UserSettings from "@/components/UserSettings";

interface UserRole {
  id: string;
  user_id: string;
  email?: string;
  role: string;
  created_at: string;
  user_profile?: {
    full_name: string;
  };
}

interface EmailPreferences {
  receive_order_notifications: boolean;
  receive_status_updates: boolean;
  receive_payment_updates: boolean;
}

const Settings = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
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
    loadUserRoles();
    loadEmailPreferences();
    loadCurrentUserRole();

    // Set up real-time subscription for user roles
    const channel = supabase
      .channel('user-roles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles'
        },
        () => {
          // Reload user roles when any change occurs
          loadUserRoles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCurrentUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading current user role:', error);
        return;
      }

      setCurrentUserRole(data?.role || null);
    } catch (error) {
      console.error('Error loading current user role:', error);
    }
  };

  const loadUserRoles = async () => {
    try {
      console.log('Loading user roles...');
      
      // First try simple query without join
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('User roles query result:', { rolesData, rolesError });

      if (rolesError) {
        console.error('Error loading user roles:', rolesError);
        toast({
          title: "Lỗi tải danh sách người dùng",
          description: rolesError.message || "Không thể tải danh sách người dùng",
          variant: "destructive",
        });
        return;
      }

      // Then get profiles separately
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      console.log('Profiles query result:', { profilesData, profilesError });
      console.log('Profiles data structure:', profilesData);

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
      }

      // Transform data to match expected format
      const combinedData = rolesData?.map((roleItem: any) => {
        console.log('Processing role item:', roleItem);
        console.log('Looking for profile with id:', roleItem.user_id);
        
        const profile = profilesData?.find(p => {
          console.log('Checking profile:', p, 'against user_id:', roleItem.user_id);
          return p.id === roleItem.user_id;
        });
        
        console.log('Found profile:', profile);
        
        return {
          id: roleItem.id,
          user_id: roleItem.user_id,
          email: profile?.full_name || `User ${roleItem.user_id.slice(0, 8)}`, // Use full_name as display name
          role: roleItem.role,
          created_at: roleItem.created_at,
          user_profile: {
            full_name: profile?.full_name || 'Không xác định'
          }
        };
      }) || [];

      console.log('Final combined data:', combinedData);
      setUserRoles(combinedData);
      
      console.log('Successfully loaded user roles:', combinedData.length);
    } catch (error) {
      console.error('Error loading user roles:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách người dùng. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  const loadEmailPreferences = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('user_email_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading email preferences:', error);
        return;
      }

      if (data) {
        setEmailPreferences({
          receive_order_notifications: data.receive_order_notifications,
          receive_status_updates: data.receive_status_updates,
          receive_payment_updates: data.receive_payment_updates,
        });
      }
    } catch (error) {
      console.error('Error loading email preferences:', error);
    }
  };

  const updateEmailPreferences = async (newPrefs: Partial<EmailPreferences>) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const updatedPrefs = { ...emailPreferences, ...newPrefs };

      const { error } = await supabase
        .from('user_email_preferences')
        .upsert({
          user_id: user.id,
          ...updatedPrefs,
        });

      if (error) throw error;

      setEmailPreferences(updatedPrefs);
      toast({
        title: "Thành công",
        description: "Đã cập nhật cài đặt email",
      });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật cài đặt email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Thành công",
        description: "Đã đổi mật khẩu",
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
    console.log('=== START handleCreateUser ===');
    console.log('Email:', newUserEmail);
    console.log('Password length:', newUserPassword.length);
    
    if (!newUserEmail.trim() || !newUserPassword.trim()) {
      console.log('=== VALIDATION ERROR: Missing email or password ===');
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập đầy đủ thông tin tài khoản và mật khẩu",
        variant: "destructive",
      });
      return;
    }

    if (newUserPassword.length < 6) {
      console.log('=== VALIDATION ERROR: Password too short ===');
      toast({
        title: "Lỗi",
        description: "Mật khẩu phải có ít nhất 6 ký tự",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('=== STARTING API CALL ===');
      setCreateUserLoading(true);

      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session exists:', !!session);
      if (!session) {
        console.log('=== ERROR: No session ===');
        throw new Error('User not authenticated');
      }

      console.log('=== CALLING EDGE FUNCTION ===');
      // Call edge function to create user with admin privileges
      const response = await fetch(`https://elogncohkxrriqmvapqo.supabase.co/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          fullName: newUserName || newUserEmail,
          role: newUserRole,
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        console.log('=== RESPONSE NOT OK ===');
        if (response.status === 403) {
          console.log('=== 403 FORBIDDEN ===');
          toast({
            title: "Không có quyền",
            description: "Bạn không có quyền thực hiện hành động này",
            variant: "destructive",
          });
          return;
        }
        const errorText = await response.text();
        console.log('Error response text:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('=== PARSING RESPONSE ===');
      const result = await response.json();
      console.log('Result:', result);

      if (!result.success) {
        console.log('=== RESULT.SUCCESS IS FALSE ===');
        console.log('Error:', result.error);
        throw new Error(result.error || 'Failed to create user');
      }

      console.log('=== SUCCESS! User created successfully, closing form... ===');
      
      toast({
        title: "Thành công",
        description: "Đã tạo tài khoản và phân quyền thành công",
      });

      // Clear form fields
      setNewUserEmail("");
      setNewUserName("");
      setNewUserPassword("");
      setNewUserRole("accountant");
      
      // Close form
      setShowCreateUserForm(false);
      console.log('=== Form should be closed now ===');
      
      loadUserRoles();
    } catch (error: any) {
      console.log('=== CATCH BLOCK EXECUTED ===');
      console.error('Create user error:', error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tạo tài khoản người dùng",
        variant: "destructive",
      });
    } finally {
      console.log('=== FINALLY BLOCK ===');
      setCreateUserLoading(false);
    }
  };

  const handleDeleteUserAccount = async (userId: string, userEmail: string, userRole: string) => {
    // Check permissions: admin and owner_director can delete users
    // But admin cannot delete owner_director
    if (currentUserRole === 'admin' && userRole === 'owner_director') {
      toast({
        title: "Không có quyền",
        description: "Admin không thể xóa tài khoản Giám đốc",
        variant: "destructive",
      });
      return;
    }

    // Only admin and owner_director can delete users
    if (currentUserRole !== 'admin' && currentUserRole !== 'owner_director') {
      toast({
        title: "Không có quyền",
        description: "Bạn không có quyền xóa tài khoản người dùng",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Bạn có chắc muốn xóa tài khoản "${userEmail}"? Hành động này không thể hoàn tác.`)) {
      return;
    }

    try {
      setDeleteUserLoading(userId);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      // Call edge function to delete user
      const response = await fetch(`https://elogncohkxrriqmvapqo.supabase.co/functions/v1/delete-user`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: userId,
        }),
      });

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

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      // Call edge function to reset user password
      const response = await fetch(`https://elogncohkxrriqmvapqo.supabase.co/functions/v1/reset-user-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: selectedUserId,
          newPassword: newUserPasswordReset,
        }),
      });

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

  const handleUpdateUserRole = async (roleId: string, newRole: "accountant" | "owner_director" | "chief_accountant" | "inventory" | "shipper" | "admin") => {
    // Tìm user có role hiện tại
    const targetUser = userRoles.find(u => u.id === roleId);
    
    // Ngăn admin sửa owner_director
    if (currentUserRole === 'admin' && targetUser?.role === 'owner_director') {
      toast({
        title: "Không có quyền",
        description: "Admin không thể sửa quyền của Giám đốc",
        variant: "destructive",
      });
      return;
    }

    // Only admin and owner_director can edit user roles
    if (currentUserRole !== 'admin' && currentUserRole !== 'owner_director') {
      toast({
        title: "Không có quyền",
        description: "Bạn không có quyền sửa phân quyền người dùng",
        variant: "destructive",
      });
      return;
    }
    try {
      setUpdateRoleLoading(roleId);
      
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('id', roleId);

      if (error) throw error;

      toast({
        title: "Thành công",
        description: "Đã cập nhật phân quyền người dùng",
      });

      setEditingRole(null);
      loadUserRoles();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật phân quyền",
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

  // Check if current user can view password reset section (admin and owner_director can see)
  const canViewPasswordReset = currentUserRole === 'admin' || currentUserRole === 'owner_director';
  // Only admin can actually reset passwords
  const canResetPassword = currentUserRole === 'admin';

  // Debug log to check role
  console.log('Current user role:', currentUserRole, 'Can view password reset:', canViewPasswordReset, 'Can reset password:', canResetPassword);

  // Show loading state if role is not loaded yet
  if (currentUserRole === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Đang tải cài đặt...</p>
        </div>
      </div>
    );
  }

  // If not admin or owner_director, show only user settings (chỉ đổi mật khẩu)
  if (!canViewPasswordReset) {
    return <UserSettings />;
  }

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
          <TabsList className="grid w-full grid-cols-3">
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
                                {userRoles
                                  .filter(user => {
                                    // Không cho đổi mật khẩu chính mình
                                    return user.user_id !== user?.id;
                                  })
                                  .map((user) => (
                                    <SelectItem key={user.user_id} value={user.user_id}>
                                      {user.user_profile?.full_name} ({getRoleBadge(user.role)})
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

              {/* Add New User Role - For Admin and Owner Director */}
              {(currentUserRole === 'admin' || currentUserRole === 'owner_director') && (
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
                                <SelectItem value="owner_director">Giám đốc</SelectItem>
                                <SelectItem value="chief_accountant">Kế toán trưởng</SelectItem>
                                <SelectItem value="accountant">Kế toán</SelectItem>
                                <SelectItem value="inventory">Thủ kho</SelectItem>
                                <SelectItem value="shipper">Giao hàng</SelectItem>
                                <SelectItem value="admin">Quản trị hệ thống</SelectItem>
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
                              setNewUserRole("accountant");
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
              )}

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
                          {(currentUserRole === 'admin' || currentUserRole === 'owner_director') && <TableHead>Thao tác</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userRoles.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={(currentUserRole === 'admin' || currentUserRole === 'owner_director') ? 4 : 3} className="text-center">
                              Chưa có phân quyền nào
                            </TableCell>
                          </TableRow>
                        ) : (
                          userRoles.map((roleItem) => (
                            <TableRow key={roleItem.id}>
                                 <TableCell>
                                   <div>
                                     <p className="font-medium">{roleItem.user_profile?.full_name}</p>
                                     <p className="text-sm text-muted-foreground">ID: {roleItem.user_id.slice(0, 8)}...</p>
                                   </div>
                                 </TableCell>
                                <TableCell>
                                  {(currentUserRole === 'admin' || currentUserRole === 'owner_director') && editingRole === roleItem.id ? (
                                     <div className="flex items-center gap-2">
                                        <Select 
                                          defaultValue={roleItem.role} 
                                          onValueChange={(newRole) => {
                                            setTempRoleValues(prev => ({
                                              ...prev,
                                              [roleItem.id]: newRole
                                            }));
                                          }}
                                        >
                                         <SelectTrigger className="w-40">
                                           <SelectValue />
                                         </SelectTrigger>
                                         <SelectContent>
                                           <SelectItem value="owner_director">Giám đốc</SelectItem>
                                           <SelectItem value="chief_accountant">Kế toán trưởng</SelectItem>
                                           <SelectItem value="accountant">Kế toán</SelectItem>
                                           <SelectItem value="inventory">Thủ kho</SelectItem>
                                           <SelectItem value="shipper">Giao hàng</SelectItem>
                                           <SelectItem value="admin">Quản trị hệ thống</SelectItem>
                                         </SelectContent>
                                       </Select>
                                       <Button
                                         variant="outline"
                                         size="sm"
                                         onClick={() => handleUpdateUserRole(roleItem.id, (tempRoleValues[roleItem.id] || roleItem.role) as any)}
                                         disabled={updateRoleLoading === roleItem.id}
                                         className="animate-scale-in"
                                       >
                                         {updateRoleLoading === roleItem.id && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                         {updateRoleLoading === roleItem.id ? "Đang lưu..." : "Lưu"}
                                       </Button>
                                       <Button
                                         variant="outline"
                                         size="sm"
                                         onClick={() => {
                                           setEditingRole(null);
                                           setTempRoleValues(prev => {
                                             const newTemp = { ...prev };
                                             delete newTemp[roleItem.id];
                                             return newTemp;
                                           });
                                         }}
                                       >
                                         Hủy
                                       </Button>
                                     </div>
                                 ) : (
                                   <div className="flex items-center gap-2">
                                      {getRoleBadge(roleItem.role)}
                                      {(currentUserRole === 'admin' || currentUserRole === 'owner_director') && !(currentUserRole === 'admin' && roleItem.role === 'owner_director') && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setEditingRole(roleItem.id)}
                                          className="h-6 w-6 p-0"
                                        >
                                          ✏️
                                        </Button>
                                      )}
                                   </div>
                                 )}
                               </TableCell>
                              <TableCell>
                                {formatDateTime(roleItem.created_at)}
                              </TableCell>
                                   {(currentUserRole === 'admin' || currentUserRole === 'owner_director') && (
                                     <TableCell>
                                       <Button
                                         variant="outline"
                                         size="sm"
                                         onClick={() => handleDeleteUserAccount(roleItem.user_id, roleItem.email, roleItem.role)}
                                         className={`animate-fade-in ${
                                           currentUserRole === 'admin' && roleItem.role === 'owner_director' 
                                             ? 'text-gray-400 cursor-not-allowed opacity-50' 
                                             : 'text-red-600 hover:text-red-700'
                                         }`}
                                         disabled={
                                           deleteUserLoading === roleItem.user_id || 
                                           (currentUserRole === 'admin' && roleItem.role === 'owner_director')
                                         }
                                       >
                                         {deleteUserLoading === roleItem.user_id && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                         {deleteUserLoading === roleItem.user_id ? "Đang xóa..." : "Xóa tài khoản"}
                                       </Button>
                                    </TableCell>
                                  )}
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
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;