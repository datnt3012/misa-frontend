import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Auth() {
  const { user, signIn, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Watch for user state changes and redirect
  useEffect(() => {
    if (user && !loading) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  // Redirect if already logged in
  if (user && !loading) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);

    if (error) {
      let errorMessage = 'Đăng nhập thất bại';

      if (error.message === 'Invalid login credentials') {
        errorMessage = 'Tài khoản hoặc mật khẩu không chính xác';
      } else if (error.message === 'Failed to establish session') {
        errorMessage = 'Không thể thiết lập phiên đăng nhập';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Lỗi đăng nhập',
        description: errorMessage,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Đăng nhập thành công',
        description: 'Chào mừng bạn quay lại!',
      });
      // useEffect will handle the redirect when user state updates
    }

    setIsLoading(false);
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">PM Bán Hàng</CardTitle>
          <CardDescription>
            Đăng nhập để truy cập hệ thống quản lý
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email">Tài khoản hoặc Email</Label>
              <Input
                id="signin-email"
                name="email"
                type="text"
                required
                placeholder="Nhập tài khoản hoặc email"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signin-password">Mật khẩu</Label>
              <Input
                id="signin-password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                disabled={isLoading}
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Đăng nhập
            </Button>
            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Quên mật khẩu?
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}