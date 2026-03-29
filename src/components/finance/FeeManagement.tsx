import React, { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ServerPagination } from "@/components/ui/server-pagination";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { usePagination } from "@/hooks/use-pagination";
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"


const FeeManagement = ({ canEdit }: { canEdit?: boolean }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showHeadingDialog, setShowHeadingDialog] = useState(false);
  const [showStructureDialog, setShowStructureDialog] = useState(false);

  const [headingForm, setHeadingForm] = useState({ name: '', description: '' });
  const [structureForm, setStructureForm] = useState({ fee_heading_id: '', class: '', amount: '', frequency: 'monthly' });

  const { page: headingPage, setPage: setHeadingPage, pageSize: headingPageSize, setPageSize: setHeadingPageSize } = usePagination();
  const { page: structurePage, setPage: setStructurePage, pageSize: structurePageSize, setPageSize: setStructurePageSize } = usePagination();

  const { data: headingsData, isLoading: headingsLoading } = useQuery({
    queryKey: ['fee-headings', user?.center_id, headingPage, headingPageSize],
    queryFn: async () => {
      if (!user?.center_id) return { data: [], count: 0 };
      const from = (headingPage - 1) * headingPageSize;
      const to = from + headingPageSize - 1;

      const { data, error, count } = await supabase
        .from('fee_headings')
        .select('*', { count: "exact" })
        .eq('center_id', user.center_id)
        .order('name')
        .range(from, to);

      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    enabled: !!user?.center_id,
    placeholderData: (previousData) => previousData
  });

  const headings = headingsData?.data || [];
  const headingTotalRows = headingsData?.count || 0;
  const headingTotalPages = Math.ceil(headingTotalRows / headingPageSize);

  // We still need all headings for the structure form dropdown
  const { data: allHeadings = [] } = useQuery({
    queryKey: ['fee-headings-all', user?.center_id],
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

  const { data: structuresData, isLoading: structuresLoading } = useQuery({
    queryKey: ['fee-structures', user?.center_id, structurePage, structurePageSize],
    queryFn: async () => {
      if (!user?.center_id) return { data: [], count: 0 };
      const from = (structurePage - 1) * structurePageSize;
      const to = from + structurePageSize - 1;

      const { data, error, count } = await supabase
        .from('fee_structures')
        .select('*', { count: "exact" })
        .eq('center_id', user.center_id)
        .order('class')
        .range(from, to);

      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    enabled: !!user?.center_id,
    placeholderData: (previousData) => previousData
  });

  const structures = structuresData?.data || [];
  const structureTotalRows = structuresData?.count || 0;
  const structureTotalPages = Math.ceil(structureTotalRows / structurePageSize);

  const createHeadingMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) throw new Error('Center ID not found');
      if (!canEdit) throw new Error('Access Denied: You do not have permission to create fee headings.');
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
      if (!canEdit) throw new Error('Access Denied: You do not have permission to create fee structures.');
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
      if (!canEdit) throw new Error('Access Denied: You do not have permission to delete fee headings.');
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
            {canEdit && (
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
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {headingsLoading && !headings.length ? (
            <TableSkeleton columns={4} rows={headingPageSize} />
          ) : headings.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No fee headings yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-6 py-4">Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right px-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {headings.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium px-6 py-4">{h.name}</TableCell>
                      <TableCell>{h.description || '-'}</TableCell>
                      <TableCell>{h.is_active ? <span className="text-green-600 flex items-center gap-1"><Check className="h-4 w-4" />Active</span> : 'Inactive'}</TableCell>
                      <TableCell className="text-right px-6">
                        {canEdit && (
                          <Button variant="ghost" size="sm" onClick={() => deleteHeadingMutation.mutate(h.id)}><Trash2 className="h-4 w-4" /></Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <ServerPagination
            currentPage={headingPage}
            totalPages={headingTotalPages}
            totalRows={headingTotalRows}
            pageSize={headingPageSize}
            onPageChange={setHeadingPage}
            onPageSizeChange={setHeadingPageSize}
          />
        </CardContent>
      </Card>

      {/* Fee Structures */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Fee Structures</CardTitle>
            {canEdit && (
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
                      className="w-full px-3 py-2 border rounded-xl"
                    >
                      <option value="">Select Heading</option>
                      {allHeadings.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Class *</Label>
                    <Input value={structureForm.class} onChange={(e) => setStructureForm({ ...structureForm, class: e.target.value })} placeholder="e.g., Grade 1" />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (Rs.) *</Label>
                    <Input type="number" value={structureForm.amount} onChange={(e) => setStructureForm({ ...structureForm, amount: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <select value={structureForm.frequency} onChange={(e) => setStructureForm({ ...structureForm, frequency: e.target.value })} className="w-full px-3 py-2 border rounded-xl">
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
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {structuresLoading && !structures.length ? (
            <TableSkeleton columns={4} rows={structurePageSize} />
          ) : structures.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No fee structures yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-6 py-4">Fee Heading</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="pr-6">Frequency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {structures.map((s) => {
                    const heading = allHeadings.find(h => h.id === s.fee_heading_id);
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium px-6 py-4">{heading?.name || '-'}</TableCell>
                        <TableCell>{s.class}</TableCell>
                        <TableCell>{formatCurrency(s.amount)}</TableCell>
                        <TableCell className="pr-6">{s.frequency}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <ServerPagination
            currentPage={structurePage}
            totalPages={structureTotalPages}
            totalRows={structureTotalRows}
            pageSize={structurePageSize}
            onPageChange={setStructurePage}
            onPageSizeChange={setStructurePageSize}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default FeeManagement;