import React, { useState } from "react";
import { Edit, Plus, Power, PowerOff, Users } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import * as bcrypt from 'bcryptjs';
import CenterFeaturePermissions from '@/components/admin/CenterFeaturePermissions';
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"


const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<any>(null);
  const [editedCenterData, setEditedCenterData] = useState({ centerName: '', address: '' });
  const [newCenter, setNewCenter] = useState({ centerName: '', address: '', phone: '', username: '', password: '' });

  if (user?.role !== 'admin') {
    navigate('/');
    return null;
  }

  const { data: centers = [], isLoading } = useQuery({
    queryKey: ['centers-with-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('centers')
        .select('*, users(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const createCenterMutation = useMutation({
    mutationFn: async () => {
      const hashedPassword = await bcrypt.hash(newCenter.password, 12);

      const { data: centerData, error: centerError } = await supabase
        .from('centers')
        .insert({
          name: newCenter.centerName,
          address: newCenter.address || null,
          phone: newCenter.phone || null
        })
        .select()
        .single();

      if (centerError) throw centerError;

      const { error: userError } = await supabase
        .from('users')
        .insert({
          username: newCenter.username,
          password_hash: hashedPassword,
          role: 'center',
          center_id: centerData.id,
          is_active: true
        });

      if (userError) throw userError;

      // Create default permissions
      const { error: permError } = await supabase.from('center_feature_permissions').insert({
        center_id: centerData.id });
      if (permError) console.error('Error seeding permissions:', permError);

      return centerData;
    },
    onSuccess: () => {
      toast({ title: 'Center created', description: 'New center has been created successfully' });
      setIsCreateDialogOpen(false);
      setNewCenter({ centerName: '', address: '', phone: '', username: '', password: '' });
      queryClient.invalidateQueries({ queryKey: ['centers-with-users'] });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to create center', description: error.message, variant: 'destructive' });
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase.from('users').update({ is_active: !isActive }).eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Status updated' });
      queryClient.invalidateQueries({ queryKey: ['centers-with-users'] });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to update status', description: error.message, variant: 'destructive' });
    }
  });

  const updateCenterMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('centers')
        .update({ name: editedCenterData.centerName, address: editedCenterData.address })
        .eq('id', editingCenter.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Center updated' });
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['centers-with-users'] });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to update center', description: error.message, variant: 'destructive' });
    }
  });

  const handleOpenEditDialog = (center: any) => {
    setEditingCenter(center);
    setEditedCenterData({ centerName: center.name, address: center.address || '' });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
              System Administration
            </h1>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <p className="text-muted-foreground text-sm font-medium">Global management and institutional oversight.</p>
            </div>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="rounded-2xl shadow-strong h-12 px-6 text-sm font-black tracking-tight bg-gradient-to-r from-primary to-violet-600 hover:scale-[1.02] transition-all duration-300">
                <Plus className="h-5 w-5 mr-2" />
                REGISTER NEW CENTER
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Center</DialogTitle>
                <DialogDescription>Add a new tuition center with login credentials</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Center Name *</Label>
                  <Input value={newCenter.centerName} onChange={(e) => setNewCenter({ ...newCenter, centerName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={newCenter.address} onChange={(e) => setNewCenter({ ...newCenter, address: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={newCenter.phone} onChange={(e) => setNewCenter({ ...newCenter, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Username *</Label>
                  <Input value={newCenter.username} onChange={(e) => setNewCenter({ ...newCenter, username: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Password *</Label>
                  <Input type="password" value={newCenter.password} onChange={(e) => setNewCenter({ ...newCenter, password: e.target.value })} />
                </div>
                <Button onClick={() => createCenterMutation.mutate()} disabled={!newCenter.centerName || !newCenter.username || !newCenter.password || createCenterMutation.isPending} className="w-full">
                  {createCenterMutation.isPending ? 'Creating...' : 'Create Center'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Center</DialogTitle>
              <DialogDescription>Update center details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Center Name *</Label>
                <Input value={editedCenterData.centerName} onChange={(e) => setEditedCenterData({ ...editedCenterData, centerName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={editedCenterData.address} onChange={(e) => setEditedCenterData({ ...editedCenterData, address: e.target.value })} />
              </div>
              <Button onClick={() => updateCenterMutation.mutate()} disabled={!editedCenterData.centerName || updateCenterMutation.isPending} className="w-full">
                {updateCenterMutation.isPending ? 'Updating...' : 'Update Center'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20">
          <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
            <CardTitle className="text-xl font-black flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              Registered Tuition Centers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
              </div>
            ) : centers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground font-medium italic">No active center registrations discovered.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/5">
                      <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Center Entity</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Physical Location</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Telecom</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Identity</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Status</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4 text-right">Operations</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {centers.map((center: any) => {
                      const centerUser = center.users?.[0];
                      return (
                        <TableRow key={center.id} className="group transition-all duration-300 hover:bg-card/60">
                          <TableCell className="px-6 py-4 font-black text-slate-700 group-hover:text-primary transition-colors">{center.name}</TableCell>
                          <TableCell className="px-6 py-4 font-medium text-slate-500 text-xs truncate max-w-[200px]">{center.address || '-'}</TableCell>
                          <TableCell className="px-6 py-4 font-bold text-primary text-xs">{center.phone || '-'}</TableCell>
                          <TableCell className="px-6 py-4">
                            <code className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-700">{centerUser?.username || '-'}</code>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            {centerUser?.is_active ?
                              <Badge className="bg-green-500/10 text-green-600 border-none rounded-lg font-black uppercase text-[9px] tracking-tighter px-2 py-0.5">Operational</Badge> :
                              <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-none rounded-lg font-black uppercase text-[9px] tracking-tighter px-2 py-0.5">Suspended</Badge>
                            }
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white shadow-soft" onClick={() => handleOpenEditDialog(center)}>
                                <Edit className="h-3.5 w-3.5 text-primary" />
                              </Button>
                              {centerUser && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    "h-8 w-8 rounded-full shadow-soft transition-all",
                                    centerUser.is_active ? "bg-white hover:bg-red-50 text-red-600" : "bg-white hover:bg-green-50 text-green-600"
                                  )}
                                  onClick={() => toggleStatusMutation.mutate({ userId: centerUser.id, isActive: centerUser.is_active })}
                                >
                                  {centerUser.is_active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <CenterFeaturePermissions />
      </div>
    </div>
  );
};

export default AdminDashboard;