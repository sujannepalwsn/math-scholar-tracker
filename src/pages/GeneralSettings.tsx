import React, { useState } from "react";
import { ArrowLeft, Check, KeyRound, Loader2, Palette, Save, Settings as SettingsIcon, ShieldCheck, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import * as bcrypt from 'bcryptjs';
import ThemeSelector from "@/components/ThemeSelector";
import { logger } from "@/utils/logger";
import { UserRole } from "@/types/roles";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export default function GeneralSettings() {
  const queryClient = useQueryClient();
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
      logger.error('Password change error:', error);
      toast.error(error.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  const { data: teacherProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['teacher-profile', user?.teacher_id],
    queryFn: async () => {
      if (!user?.teacher_id) return null;
      const { data, error } = await supabase
        .from("teachers").select("id, name, email, department, subject, grade, status, user_id")
        .eq('id', user.teacher_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.teacher_id && user.role === UserRole.TEACHER
  });

  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    if (teacherProfile) {
      setProfileData({
        name: teacherProfile.name || '',
        email: teacherProfile.email || '',
        contact_number: teacherProfile.contact_number || teacherProfile.phone || '',
        address: teacherProfile.address || '',
        date_of_birth: teacherProfile.date_of_birth || '',
        gender: teacherProfile.gender || 'Male',
        qualifications: Array.isArray(teacherProfile.qualifications) ? teacherProfile.qualifications.join(', ') : (teacherProfile.qualifications || ''),
        emergency_contact: teacherProfile.emergency_contact || { name: '', relation: '', phone: '' },
        bank_details: teacherProfile.bank_details || { account_name: '', account_number: '', bank_name: '' }
      });
    }
  }, [teacherProfile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      if (!user?.teacher_id) throw new Error('Teacher ID not found');

      const qualificationsArray = typeof updatedData.qualifications === 'string'
        ? updatedData.qualifications.split(',').map((s: string) => s.trim()).filter(Boolean)
        : updatedData.qualifications;

      const { error } = await supabase
        .from('teachers')
        .update({
          name: updatedData.name,
          email: updatedData.email,
          contact_number: updatedData.contact_number,
          address: updatedData.address,
          date_of_birth: updatedData.date_of_birth,
          gender: updatedData.gender,
          qualifications: qualificationsArray,
          emergency_contact: updatedData.emergency_contact,
          bank_details: updatedData.bank_details,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.teacher_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-profile'] });
      toast.success('Profile updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update profile');
    }
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
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

      <Tabs defaultValue="appearance" className="w-full space-y-8">
        <TabsList className="bg-card/40 backdrop-blur-md border border-border/20 rounded-2xl p-1 h-12 shadow-soft">
          <TabsTrigger value="appearance" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest">Appearance</TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest">Security</TabsTrigger>
          {user?.role === UserRole.TEACHER && (
            <TabsTrigger value="profile" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest">Profile Details</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="appearance" className="outline-none space-y-8">
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
        </TabsContent>

        <TabsContent value="security" className="outline-none space-y-8">
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
        </TabsContent>

        {user?.role === UserRole.TEACHER && profileData && (
          <TabsContent value="profile" className="outline-none space-y-8">
            <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20">
              <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
                <CardTitle className="text-xl font-black flex items-center gap-3 text-foreground/90 uppercase tracking-widest">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  Personal Profile Matrix
                </CardTitle>
                <CardDescription className="font-medium text-slate-500">Maintain your professional identity and contact protocols</CardDescription>
              </CardHeader>
              <CardContent className="p-6 md:p-8">
                <form onSubmit={handleProfileSubmit} className="space-y-8 max-w-4xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</Label>
                      <Input
                        value={profileData.name}
                        onChange={e => setProfileData({...profileData, name: e.target.value})}
                        className="h-12 rounded-xl bg-card/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</Label>
                      <Input
                        value={profileData.email}
                        onChange={e => setProfileData({...profileData, email: e.target.value})}
                        className="h-12 rounded-xl bg-card/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contact Number</Label>
                      <Input
                        value={profileData.contact_number}
                        onChange={e => setProfileData({...profileData, contact_number: e.target.value})}
                        className="h-12 rounded-xl bg-card/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date of Birth</Label>
                      <Input
                        type="date"
                        value={profileData.date_of_birth}
                        onChange={e => setProfileData({...profileData, date_of_birth: e.target.value})}
                        className="h-12 rounded-xl bg-card/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gender</Label>
                      <Select value={profileData.gender} onValueChange={v => setProfileData({...profileData, gender: v})}>
                        <SelectTrigger className="h-12 rounded-xl bg-card/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Qualifications</Label>
                      <Input
                        value={profileData.qualifications}
                        onChange={e => setProfileData({...profileData, qualifications: e.target.value})}
                        placeholder="e.g. M.Sc Mathematics, B.Ed"
                        className="h-12 rounded-xl bg-card/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Residential Address</Label>
                    <Textarea
                      value={profileData.address}
                      onChange={e => setProfileData({...profileData, address: e.target.value})}
                      className="rounded-xl bg-card/50 resize-none min-h-[100px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-600 mb-2">Emergency Contact</h4>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold uppercase text-slate-400">Contact Name</Label>
                          <Input
                            value={profileData.emergency_contact.name}
                            onChange={e => setProfileData({...profileData, emergency_contact: {...profileData.emergency_contact, name: e.target.value}})}
                            className="h-10 rounded-lg bg-white border-none shadow-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold uppercase text-slate-400">Relationship</Label>
                          <Input
                            value={profileData.emergency_contact.relation}
                            onChange={e => setProfileData({...profileData, emergency_contact: {...profileData.emergency_contact, relation: e.target.value}})}
                            className="h-10 rounded-lg bg-white border-none shadow-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold uppercase text-slate-400">Phone Number</Label>
                          <Input
                            value={profileData.emergency_contact.phone}
                            onChange={e => setProfileData({...profileData, emergency_contact: {...profileData.emergency_contact, phone: e.target.value}})}
                            className="h-10 rounded-lg bg-white border-none shadow-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-600 mb-2">Bank Details</h4>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold uppercase text-slate-400">Account Name</Label>
                          <Input
                            value={profileData.bank_details.account_name}
                            onChange={e => setProfileData({...profileData, bank_details: {...profileData.bank_details, account_name: e.target.value}})}
                            className="h-10 rounded-lg bg-white border-none shadow-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold uppercase text-slate-400">Account Number</Label>
                          <Input
                            value={profileData.bank_details.account_number}
                            onChange={e => setProfileData({...profileData, bank_details: {...profileData.bank_details, account_number: e.target.value}})}
                            className="h-10 rounded-lg bg-white border-none shadow-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold uppercase text-slate-400">Bank Name</Label>
                          <Input
                            value={profileData.bank_details.bank_name}
                            onChange={e => setProfileData({...profileData, bank_details: {...profileData.bank_details, bank_name: e.target.value}})}
                            className="h-10 rounded-lg bg-white border-none shadow-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Restricted Read-only Info */}
                  <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 grid grid-cols-2 md:grid-cols-4 gap-6 opacity-80">
                    <div className="space-y-1">
                      <Label className="text-[9px] font-bold uppercase text-amber-600/60">Hire Date</Label>
                      <p className="text-sm font-black text-amber-900">{teacherProfile?.hire_date ? new Date(teacherProfile.hire_date).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-bold uppercase text-amber-600/60">Contract Status</Label>
                      <p className="text-sm font-black text-amber-900">{teacherProfile?.contract_end_date ? new Date(teacherProfile.contract_end_date).toLocaleDateString() : 'PERMANENT'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-bold uppercase text-amber-600/60">Monthly Remuneration</Label>
                      <p className="text-sm font-black text-amber-900">NPR {teacherProfile?.monthly_salary?.toLocaleString() || '0'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-bold uppercase text-amber-600/60">Official Shift</Label>
                      <p className="text-sm font-black text-amber-900">{teacherProfile?.regular_in_time || '09:00'} - {teacherProfile?.regular_out_time || '17:00'}</p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="h-12 px-12 rounded-xl font-black uppercase tracking-widest text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-strong"
                    >
                      {updateProfileMutation.isPending ? 'SYNCHRONIZING...' : 'UPDATE PROFILE MATRIX'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
