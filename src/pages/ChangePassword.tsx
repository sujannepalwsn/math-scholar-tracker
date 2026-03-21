import React, { useState } from "react";
import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"

export default function ChangePassword() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    if (user?.role === 'admin') navigate('/admin-dashboard');
    else if (user?.role === 'parent') navigate('/parent-dashboard');
    else if (user?.role === 'teacher') navigate('/teacher-dashboard');
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

    if (newPassword.length < 8) {
      toast({ title: 'Error', description: 'New password must be at least 8 characters long.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('change-password', {
        body: { userId: user.id, oldPassword, newPassword }
      });

      if (invokeError) throw invokeError;
      if (!data.success) throw new Error(data.error || 'Failed to change password');

      toast({ title: 'Success', description: 'Password changed successfully. Please log in again.' });
      logout();
      if (user.role === 'admin') navigate('/login-admin');
      else if (user.role === 'parent') navigate('/login-parent');
      else navigate('/login');
    } catch (error: any) {
      console.error('Password change error:', error);
      toast({ title: 'Error', description: error.message || 'Failed to change password.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 pt-6">
          <Button variant="ghost" size="sm" className="w-fit -ml-2" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
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
