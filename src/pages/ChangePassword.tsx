import React, { useState } from "react";
import { UserRole } from "@/types/roles";
import { ArrowLeft, KeyRound, Loader2, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import * as bcrypt from 'bcryptjs';
import { logger } from "@/utils/logger";
import { useIsMobile } from "@/hooks/use-mobile";

export default function ChangePassword() {
  const isMobile = useIsMobile();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    if (user?.role === UserRole.ADMIN) navigate('/admin-dashboard');
    else if (user?.role === UserRole.PARENT) navigate('/parent-dashboard');
    else if (user?.role === UserRole.TEACHER) navigate('/teacher-dashboard');
    else navigate('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!user) {
      toast({ title: 'Error', description: 'User not logged in.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({ title: 'Error', description: 'New passwords do not match.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'New password must be at least 6 characters long.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    try {
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('password_hash')
        .eq('id', user.id)
        .single();

      if (fetchError || !userData) throw new Error('Failed to fetch user data.');

      const passwordMatch = await bcrypt.compare(oldPassword, userData.password_hash);
      if (!passwordMatch) {
        toast({ title: 'Error', description: 'Old password is incorrect.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: hashedPassword, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast({ title: 'Success', description: 'Password changed successfully. Please log in again.' });
      logout();
      if (user.role === UserRole.ADMIN) navigate('/login-admin');
      else if (user.role === UserRole.PARENT) navigate('/login-parent');
      else navigate('/login');
    } catch (error: any) {
      logger.error('Password change error:', error);
      toast({ title: 'Error', description: error.message || 'Failed to change password.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 h-10 w-10 rounded-xl bg-white/50 backdrop-blur-md border shadow-sm z-50"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
      )}
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 pt-6">
          {!isMobile && (
            <Button variant="ghost" size="sm" className="w-fit -ml-2" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          )}
          <div className="mx-auto bg-primary/10 p-3 rounded-xl w-fit">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Change Password</CardTitle>
            <CardDescription className="text-center">Update your password to keep your account safe</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oldPassword">Old Password</Label>
              <Input id="oldPassword" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
              <Input id="confirmNewPassword" type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required disabled={loading} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</> : 'Confirm New Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
