import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Check } from 'lucide-react';
import { formatCurrency } from '@/integrations/supabase/finance-types';

const FeeManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showHeadingDialog, setShowHeadingDialog] = useState(false);
  const [showStructureDialog, setShowStructureDialog] = useState(false);

  const [headingForm, setHeadingForm] = useState({ name: '', description: '' });
  const [structureForm, setStructureForm] = useState({ fee_heading_id: '', class: '', amount: '', frequency: 'monthly' });

  const { data: headings = [], isLoading: headingsLoading } = useQuery({
    queryKey: ['fee-headings', user?.center_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fee_headings')
        .select('*')
        .eq('center_id', user?.center_id!)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id
  });

  const { data: structures = [], isLoading: structuresLoading } = useQuery({
    queryKey: ['fee-structures', user?.center_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fee_structures')
        .select('*')
        .eq('center_id', user?.center_id!)
        .order('class');
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id
  });

  const createHeadingMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) throw new Error('Center ID not found');
      const { error } = await supabase
        .from('fee_headings')
        .insert({
          center_id: user.center_id,
          name: headingForm.name,
          description: headingForm.description || null,
          is_active: true
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Fee heading created successfully');
      setShowHeadingDialog(false);
      setHeadingForm({ name: '', description: '' });
      queryClient.invalidateQueries({ queryKey: ['fee-headings'] });
    },
    onError: (error: any) => toast.error(error.message || 'Failed to create fee heading')
  });

  const createStructureMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) throw new Error('Center ID not found');
      const { error } = await supabase
        .from('fee_structures')
        .insert({
          center_id: user.center_id,
          fee_heading_id: structureForm.fee_heading_id,
          class: structureForm.class,
          amount: parseFloat(structureForm.amount),
          frequency: structureForm.frequency
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Fee structure created successfully');
      setShowStructureDialog(false);
      setStructureForm({ fee_heading_id: '', class: '', amount: '', frequency: 'monthly' });
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
    },
    onError: (error: any) => toast.error(error.message || 'Failed to create fee structure')
  });

  const deleteHeadingMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fee_headings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Fee heading deleted');
      queryClient.invalidateQueries({ queryKey: ['fee-headings'] });
    },
    onError: (error: any) => toast.error(error.message || 'Failed to delete')
  });

  return (
    <div className="space-y-6">
      {/* Fee Headings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Fee Headings</CardTitle>
            <Dialog open={showHeadingDialog} onOpenChange={setShowHeadingDialog}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />New Heading</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Fee Heading</DialogTitle>
                  <DialogDescription>Define a new fee category.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={headingForm.name}
                      onChange={(e) => setHeadingForm({ ...headingForm, name: e.target.value })}
                      placeholder="e.g., Tuition Fee"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desc">Description</Label>
                    <Input
                      id="desc"
                      value={headingForm.description}
                      onChange={(e) => setHeadingForm({ ...headingForm, description: e.target.value })}
                    />
                  </div>
                  <Button onClick={() => createHeadingMutation.mutate()} disabled={!headingForm.name || createHeadingMutation.isPending} className="w-full">
                    {createHeadingMutation.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {headingsLoading ? <p>Loading...</p> : headings.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No fee headings yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {headings.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.name}</TableCell>
                    <TableCell>{h.description || '-'}</TableCell>
                    <TableCell>{h.is_active ? <span className="text-green-600 flex items-center gap-1"><Check className="h-4 w-4" />Active</span> : 'Inactive'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => deleteHeadingMutation.mutate(h.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Fee Structures */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Fee Structures</CardTitle>
            <Dialog open={showStructureDialog} onOpenChange={setShowStructureDialog}>
              <DialogTrigger asChild>
                <Button disabled={headings.length === 0}><Plus className="h-4 w-4 mr-2" />New Structure</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Fee Structure</DialogTitle>
                  <DialogDescription>Define fee amounts per class.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Fee Heading *</Label>
                    <select
                      value={structureForm.fee_heading_id}
                      onChange={(e) => setStructureForm({ ...structureForm, fee_heading_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Select Heading</option>
                      {headings.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Class *</Label>
                    <Input value={structureForm.class} onChange={(e) => setStructureForm({ ...structureForm, class: e.target.value })} placeholder="e.g., Grade 1" />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (₹) *</Label>
                    <Input type="number" value={structureForm.amount} onChange={(e) => setStructureForm({ ...structureForm, amount: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <select value={structureForm.frequency} onChange={(e) => setStructureForm({ ...structureForm, frequency: e.target.value })} className="w-full px-3 py-2 border rounded-md">
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <Button onClick={() => createStructureMutation.mutate()} disabled={!structureForm.fee_heading_id || !structureForm.class || !structureForm.amount || createStructureMutation.isPending} className="w-full">
                    {createStructureMutation.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {structuresLoading ? <p>Loading...</p> : structures.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No fee structures yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fee Heading</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Frequency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {structures.map((s) => {
                  const heading = headings.find(h => h.id === s.fee_heading_id);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{heading?.name || '-'}</TableCell>
                      <TableCell>{s.class}</TableCell>
                      <TableCell>{formatCurrency(s.amount)}</TableCell>
                      <TableCell>{s.frequency}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FeeManagement;