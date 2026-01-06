import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// Yup validation schema
const loginSchema = yup.object({
  email: yup
    .string()
    .required('Vui lòng nhập tài khoản hoặc email')
    .min(3, 'Tài khoản phải có ít nhất 3 ký tự'),
  password: yup
    .string()
    .required('Vui lòng nhập mật khẩu')
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

type LoginFormData = yup.InferType<typeof loginSchema>;

export default function Auth() {
  const { user, signIn, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError: setFormError,
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
  });

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

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null); // Clear previous error

    const { error } = await signIn(data.email, data.password, rememberMe);

    if (error) {
      let errorMessage = 'Đăng nhập thất bại';

      if (error.message === 'Invalid login credentials') {
        errorMessage = 'Tài khoản hoặc mật khẩu không chính xác';
      } else if (error.message === 'Failed to establish session') {
        errorMessage = 'Không thể thiết lập phiên đăng nhập';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email">Tài khoản hoặc Email <span className="text-red-500">*</span></Label>
              <Input
                id="signin-email"
                type="text"
                placeholder="Nhập tài khoản hoặc email"
                disabled={isLoading}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="signin-password">Mật khẩu <span className="text-red-500">*</span></Label>
              <Input
                id="signin-password"
                type="password"
                placeholder="••••••••"
                disabled={isLoading}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                disabled={isLoading}
              />
              <Label
                htmlFor="remember-me"
                className="text-sm font-normal cursor-pointer"
              >
                Ghi nhớ đăng nhập
              </Label>
            </div>
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}
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