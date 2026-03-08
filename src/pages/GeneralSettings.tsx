import React, { useState } from "react";
import { ArrowLeft, Check, KeyRound, Loader2, Palette, Save, Settings as SettingsIcon, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import * as bcrypt from 'bcryptjs';
import ThemeSelector from "@/components/ThemeSelector";

export default function GeneralSettings() {
  const { user, logout } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!user) {
      toast.error('User not logged in.');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error('New passwords do not match.');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long.');
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
        toast.error('Old password is incorrect.');
        setLoading(false);
        return;
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: hashedPassword, updated_at: new Date().toISOString() } as any)
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success('Password changed successfully. Please log in again.');
      setTimeout(() => logout(), 2000);
    } catch (error: any) {
      console.error('Password change error:', error);
      toast.error(error.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            System Preferences
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">Configure your personal workspace and visual parameters.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-8">
        {/* Theme Settings */}
        <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20">
          <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
            <CardTitle className="text-xl font-black flex items-center gap-3 text-foreground/90 uppercase tracking-widest">
              <div className="p-2 rounded-xl bg-primary/10">
                <Palette className="h-6 w-6 text-primary" />
              </div>
              Appearance Matrix
            </CardTitle>
            <CardDescription className="font-medium text-slate-500">Customize your interface theme, colors, and density</CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            <ThemeSelector />
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20">
          <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
            <CardTitle className="text-xl font-black flex items-center gap-3 text-foreground/90 uppercase tracking-widest">
              <div className="p-2 rounded-xl bg-primary/10">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              Security Protocols
            </CardTitle>
            <CardDescription className="font-medium text-slate-500">Update your access keys and authentication credentials</CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            <form onSubmit={handlePasswordChange} className="max-w-md space-y-6">
              <div className="space-y-2">
                <Label htmlFor="oldPassword">Current Access Key</Label>
                <Input
                  id="oldPassword"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 rounded-xl bg-card/50"
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Identity Token</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 rounded-xl bg-card/50"
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">Verify New Token</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 rounded-xl bg-card/50"
                  placeholder="Re-enter new token"
                />
              </div>
              <Button type="submit" className="h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px]" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> SYNCHRONIZING...</> : <><Save className="h-4 w-4 mr-2" /> UPDATE CREDENTIALS</>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
