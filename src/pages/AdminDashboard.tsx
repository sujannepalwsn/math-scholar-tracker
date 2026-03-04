import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Plus, Shield, Users } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import * as bcrypt from 'bcryptjs';
import CenterFeaturePermissions from '@/components/admin/CenterFeaturePermissions';

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
        center_id: centerData.id,
      });
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
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight">System Administration</h1>
            <p className="text-muted-foreground text-lg">Manage centers, user permissions and system status.</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Create Center</Button>
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

        <Card className="border-none shadow-medium overflow-hidden">
          <CardHeader className="bg-muted/30 pb-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Registered Tuition Centers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? <p>Loading...</p> : centers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No centers registered yet</p>
            ) : (
              <div className="overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Center Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {centers.map((center: any) => {
                    const centerUser = center.users?.[0];
                    return (
                      <TableRow key={center.id}>
                        <TableCell className="font-medium">{center.name}</TableCell>
                        <TableCell>{center.address || '-'}</TableCell>
                        <TableCell>{center.phone || '-'}</TableCell>
                        <TableCell>{centerUser?.username || '-'}</TableCell>
                        <TableCell>
                          {centerUser?.is_active ?
                            <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-none">Active</Badge> :
                            <Badge variant="destructive" className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-none">Inactive</Badge>
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEditDialog(center)}><Edit className="h-4 w-4" /></Button>
                            {centerUser && (
                              <Button variant="ghost" size="sm" onClick={() => toggleStatusMutation.mutate({ userId: centerUser.id, isActive: centerUser.is_active })}>
                                {centerUser.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
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