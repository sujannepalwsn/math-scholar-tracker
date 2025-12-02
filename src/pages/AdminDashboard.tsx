import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Shield, Power, PowerOff, Edit } from 'lucide-react';
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-destructive" />
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
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

        <Card>
          <CardHeader><CardTitle>All Centers</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <p>Loading...</p> : centers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No centers registered yet</p>
            ) : (
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
                          {centerUser?.is_active ? <span className="text-green-600">Active</span> : <span className="text-red-600">Inactive</span>}
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
            )}
          </CardContent>
        </Card>

        <CenterFeaturePermissions />
      </div>
    </div>
  );
};

export default AdminDashboard;