import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import ResetPasswordDialog from '@/components/ResetPasswordDialog';
import { API_ENDPOINTS } from '@/config/api';
import { api } from '@/lib/api';
import { ca } from 'date-fns/locale';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { resetPassword } = useAuth();
  const { toast } = useToast();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [step, setStep] = useState<'email' | 'verify'>('email');

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTemporaryPassword('');
    setStep('email');

    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        toast({
          title: "Lỗi",
          description: error.message || "Có lỗi xảy ra khi gửi email khôi phục",
          variant: "destructive",
        });
      } else {
        setIsSubmitted(true);
        toast({
          title: "Thành công",
          description: "Email khôi phục mật khẩu đã được gửi",
        });
        setStep('verify');
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi gửi email khôi phục",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyTemporaryPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!temporaryPassword.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập mật khẩu tạm thời',
        variant: 'destructive',
      });
      return;
    }
    try { 
      const response = await api.post<any>(
        API_ENDPOINTS.AUTH.VERIFY_TEMPORARY_PASSWORD,
        {
          emailOrUsername: email,
          temporaryPassword,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      if (response && response.data?.valid) {
        setShowResetDialog(true);
      }
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: error.response?.data?.message || 'Xác minh mật khẩu tạm thời thất bại',
        variant: 'destructive',
      });
    }
  };

  const handleResetDialogSuccess = () => {
    setShowResetDialog(false);
    setStep('email');
    setEmail('');
    setTemporaryPassword('');
    setIsSubmitted(false);
    
    toast({
      title: 'Thành công',
      description: 'Mật khẩu đã được đặt lại. Vui lòng đăng nhập với mật khẩu mới.',
    });
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Kiểm tra email của bạn</CardTitle>
            <CardDescription>
              Chúng tôi đã gửi hướng dẫn khôi phục mật khẩu đến email {email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {step === 'verify' ? (
                <>
                  <p className="text-sm text-muted-foreground text-center">
                    Nhập mật khẩu tạm thời mà chúng tôi vừa gửi đến email của bạn
                  </p>
                  <form onSubmit={handleVerifyTemporaryPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="temp-password">Mật khẩu tạm thời</Label>
                      <Input
                        id="temp-password"
                        type="text"
                        value={temporaryPassword}
                        onChange={(e) => setTemporaryPassword(e.target.value)}
                        placeholder="Nhập mật khẩu tạm thời"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Tiếp tục
                    </Button>
                  </form>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setIsSubmitted(false);
                      setStep('email');
                      setTemporaryPassword('');
                    }}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Quay lại
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground text-center">
                    Không nhận được email? Kiểm tra thư mục spam hoặc thử lại sau vài phút.
                  </p>
                  <Link to="/auth" className="w-full">
                    <Button variant="outline" className="w-full">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Quay lại đăng nhập
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        
        {showResetDialog && (
          <ResetPasswordDialog
            open={showResetDialog}
            onOpenChange={setShowResetDialog}
            email={email}
            temporaryPassword={temporaryPassword}
            onSuccess={handleResetDialogSuccess}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Quên mật khẩu</CardTitle>
          <CardDescription className="text-center">
            Nhập email của bạn để nhận hướng dẫn khôi phục mật khẩu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Đang gửi..." : "Gửi email khôi phục"}
            </Button>
            
            <Link to="/auth" className="w-full">
              <Button variant="outline" className="w-full mt-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Quay lại đăng nhập
              </Button>
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}