import React, { useState } from "react";
import {
 Users,
 Calendar,
 Search,
 MoreHorizontal,
 Mail,
 Phone,
 Building2,
 CheckCircle2,
 Clock,
 AlertCircle,
 Loader2,
 Trash2,
 MessageSquare,
 Filter
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow
} from "@/components/ui/table";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
 DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SaaSBookings from "./SaaSBookings";

const DemoRequests = () => {
 const [searchTerm, setSearchTerm] = useState("");
 const [selectedRequest, setSelectedRequest] = useState<any>(null);
 const [isDetailsOpen, setIsDetailsOpen] = useState(false);
 const [adminNotes, setAdminNotes] = useState("");
 const queryClient = useQueryClient();

 const { data: requests, isLoading } = useQuery({
  queryKey: ['demo_requests'],
  queryFn: async () => {
   const { data, error } = await supabase
    .from('demo_requests')
    .select('*')
    .order('created_at', { ascending: false });

   if (error) throw error;
   return data;
  }
 });

 const updateStatusMutation = useMutation({
  mutationFn: async ({ id, status, notes }: { id: string, status: string, notes?: string }) => {
   const { error } = await supabase
    .from('demo_requests')
    .update({ status, admin_notes: notes, updated_at: new Date().toISOString() })
    .eq('id', id);

   if (error) throw error;
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ['demo_requests'] });
   toast.success("Request updated successfully");
   setIsDetailsOpen(false);
  },
  onError: (error: any) => {
   toast.error(error.message || "Failed to update request");
  }
 });

 const deleteMutation = useMutation({
  mutationFn: async (id: string) => {
   const { error } = await supabase
    .from('demo_requests')
    .delete()
    .eq('id', id);

   if (error) throw error;
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ['demo_requests'] });
   toast.success("Request deleted");
  }
 });

 const filteredRequests = requests?.filter(req =>
  req.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  req.school_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  req.email.toLowerCase().includes(searchTerm.toLowerCase())
 );

 const getStatusBadge = (status: string) => {
  switch (status) {
   case 'pending': return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 font-bold uppercase text-[10px]">Pending</Badge>;
   case 'contacted': return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 font-bold uppercase text-[10px]">Contacted</Badge>;
   case 'scheduled': return <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200 font-bold uppercase text-[10px]">Scheduled</Badge>;
   case 'completed': return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 font-bold uppercase text-[10px]">Completed</Badge>;
   case 'cancelled': return <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 font-bold uppercase text-[10px]">Cancelled</Badge>;
   default: return <Badge variant="outline">{status}</Badge>;
  }
 };

 const handleOpenDetails = (request: any) => {
  setSelectedRequest(request);
  setAdminNotes(request.admin_notes || "");
  setIsDetailsOpen(true);
 };

 if (isLoading) {
  return (
   <div className="flex items-center justify-center h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
   </div>
  );
 }

 return (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
     <h1 className="text-4xl font-black tracking-tight text-foreground">Revenue & Growth</h1>
     <p className="text-muted-foreground mt-2 font-medium">Manage demo requests and institutional plan bookings.</p>
    </div>
    <div className="flex items-center gap-4">
      <div className="relative w-full md:w-64">
       <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
       <Input
        placeholder="Search leads..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-10 h-11 rounded-xl bg-muted/50 border border-border focus-visible:ring-1"
       />
      </div>
      <Button variant="outline" className="h-11 w-11 p-0 rounded-xl bg-muted/50 border border-border">
       <Filter className="h-4 w-4" />
      </Button>
    </div>
   </div>

   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
     <Card className="border border-border shadow-sm rounded-2xl bg-indigo-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-black uppercase tracking-widest text-indigo-600/60">Total Leads</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-black text-indigo-600">{requests?.length || 0}</div>
      </CardContent>
     </Card>
     <Card className="border border-border shadow-sm rounded-2xl bg-amber-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-black uppercase tracking-widest text-amber-600/60">New Requests</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-black text-amber-600">
         {requests?.filter(r => r.status === 'pending').length || 0}
        </div>
      </CardContent>
     </Card>
     <Card className="border border-border shadow-sm rounded-2xl bg-emerald-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-black uppercase tracking-widest text-emerald-600/60">Scheduled</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-black text-emerald-600">
         {requests?.filter(r => r.status === 'scheduled').length || 0}
        </div>
      </CardContent>
     </Card>
   </div>

   <Tabs defaultValue="leads" className="space-y-6">
     <TabsList className="bg-muted/50 p-1 rounded-2xl h-14 w-fit border border-muted-foreground/10">
      <TabsTrigger value="leads" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Demo Requests</TabsTrigger>
      <TabsTrigger value="bookings" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Plan Bookings</TabsTrigger>
     </TabsList>

     <TabsContent value="leads" className="space-y-6 outline-none">
   <Card className="border border-border shadow-sm rounded-2xl overflow-hidden bg-white ">
    <Table>
     <TableHeader className="bg-muted/50">
      <TableRow className="hover:bg-transparent border border-border">
       <TableHead className="font-black uppercase text-[10px] tracking-widest py-5 px-6">Requester</TableHead>
       <TableHead className="font-black uppercase text-[10px] tracking-widest">Institution</TableHead>
       <TableHead className="font-black uppercase text-[10px] tracking-widest text-center">Students</TableHead>
       <TableHead className="font-black uppercase text-[10px] tracking-widest">Status</TableHead>
       <TableHead className="font-black uppercase text-[10px] tracking-widest">Date</TableHead>
       <TableHead className="w-[80px]"></TableHead>
      </TableRow>
     </TableHeader>
     <TableBody>
      {filteredRequests?.map((request) => (
       <TableRow key={request.id} className="hover:bg-white transition-colors border-b border-muted/20 cursor-pointer" onClick={() => handleOpenDetails(request)}>
        <TableCell className="py-4 px-6">
         <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
           {request.full_name.charAt(0)}
          </div>
          <div>
           <div className="font-bold text-slate-900">{request.full_name}</div>
           <div className="text-xs text-slate-500 font-medium">{request.email}</div>
          </div>
         </div>
        </TableCell>
        <TableCell>
          <div className="flex flex-col">
           <span className="font-bold text-slate-700">{request.school_name}</span>
           <span className="text-[10px] text-slate-500 uppercase font-black">{request.role}</span>
          </div>
        </TableCell>
        <TableCell className="text-center">
          <Badge variant="secondary" className="rounded-lg font-bold">{request.student_count}</Badge>
        </TableCell>
        <TableCell>
         {getStatusBadge(request.status)}
        </TableCell>
        <TableCell>
         <div className="flex items-center gap-2 text-slate-500 font-medium">
          <Calendar className="h-3 w-3" />
          <span className="text-xs">{format(new Date(request.created_at), 'MMM dd, yyyy')}</span>
         </div>
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
         <DropdownMenu>
          <DropdownMenuTrigger asChild>
           <Button variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-white">
            <MoreHorizontal className="h-4 w-4" />
           </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl border-slate-200">
           <DropdownMenuItem className="font-bold gap-2 focus:bg-indigo-50 focus:text-indigo-600 py-2" onClick={() => handleOpenDetails(request)}>
            <Users className="h-4 w-4" /> View Details
           </DropdownMenuItem>
           <DropdownMenuSeparator />
           <DropdownMenuItem className="font-bold gap-2 focus:bg-blue-50 focus:text-blue-600 py-2" onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'contacted' })}>
            <Mail className="h-4 w-4" /> Mark Contacted
           </DropdownMenuItem>
           <DropdownMenuItem className="font-bold gap-2 focus:bg-purple-50 focus:text-purple-600 py-2" onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'scheduled' })}>
            <Clock className="h-4 w-4" /> Schedule Demo
           </DropdownMenuItem>
           <DropdownMenuItem className="font-bold gap-2 focus:bg-emerald-50 focus:text-emerald-600 py-2" onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'completed' })}>
            <CheckCircle2 className="h-4 w-4" /> Mark Completed
           </DropdownMenuItem>
           <DropdownMenuSeparator />
           <DropdownMenuItem className="font-bold gap-2 text-destructive focus:bg-destructive/5 focus:text-destructive py-2" onClick={() => deleteMutation.mutate(request.id)}>
            <Trash2 className="h-4 w-4" /> Delete Request
           </DropdownMenuItem>
          </DropdownMenuContent>
         </DropdownMenu>
        </TableCell>
       </TableRow>
      ))}
      {filteredRequests?.length === 0 && (
       <TableRow>
        <TableCell colSpan={6} className="h-40 text-center">
          <div className="flex flex-col items-center gap-2 opacity-30">
           <Search className="h-8 w-8" />
           <span className="font-black uppercase tracking-widest text-xs">No leads found</span>
          </div>
        </TableCell>
       </TableRow>
      )}
     </TableBody>
    </Table>
   </Card>
     </TabsContent>

     <TabsContent value="bookings" className="outline-none">
      <SaaSBookings />
     </TabsContent>
   </Tabs>

   {/* Details Dialog */}
   <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
     <DialogContent className="max-w-2xl rounded-2xl p-0 overflow-hidden border border-border shadow-2xl">
      <div className="bg-indigo-600 p-8 text-white">
        <div className="flex justify-between items-start mb-6">
         <div className="space-y-1">
           <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">New Demo Request</div>
           <DialogTitle className="text-3xl font-black leading-tight">
            {selectedRequest?.full_name}
           </DialogTitle>
         </div>
         {selectedRequest && getStatusBadge(selectedRequest.status)}
        </div>
        <div className="flex flex-wrap gap-6">
         <div className="flex items-center gap-2 text-sm font-bold bg-white px-4 py-2 rounded-xl ">
           <Building2 className="w-4 h-4" /> {selectedRequest?.school_name}
         </div>
         <div className="flex items-center gap-2 text-sm font-bold bg-white px-4 py-2 rounded-xl ">
           <Users className="w-4 h-4" /> {selectedRequest?.student_count} Students
         </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-2 gap-8">
         <div className="space-y-4">
           <div>
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</Label>
            <div className="font-bold text-slate-800 flex items-center gap-2 mt-1">
              <Mail className="w-4 h-4 text-indigo-500" /> {selectedRequest?.email}
            </div>
           </div>
           <div>
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phone Number</Label>
            <div className="font-bold text-slate-800 flex items-center gap-2 mt-1">
              <Phone className="w-4 h-4 text-indigo-500" /> {selectedRequest?.phone_number || "Not provided"}
            </div>
           </div>
         </div>
         <div className="space-y-4">
           <div>
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Requester Role</Label>
            <div className="font-bold text-slate-800 mt-1">{selectedRequest?.role}</div>
           </div>
           <div>
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Submitted On</Label>
            <div className="font-bold text-slate-800 mt-1">
              {selectedRequest && format(new Date(selectedRequest.created_at), 'MMMM dd, yyyy @ HH:mm')}
            </div>
           </div>
         </div>
        </div>

        <div>
         <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Message / Goals</Label>
         <div className="mt-2 p-4 rounded-2xl bg-slate-50 text-slate-700 font-medium italic border border-slate-100">
           "{selectedRequest?.message || "No message provided."}"
         </div>
        </div>

        <div className="space-y-3">
         <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Internal Admin Notes</Label>
         <Textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          placeholder="Add notes about conversations, follow-ups, etc..."
          className="min-h-[100px] rounded-2xl bg-slate-50 border-slate-200 focus:bg-white transition-all resize-none font-medium"
         />
        </div>
      </div>

      <DialogFooter className="p-8 pt-0 gap-3">
        <Button variant="ghost" onClick={() => setIsDetailsOpen(false)} className="rounded-xl font-bold px-6 h-12">Close</Button>
        <Button
         onClick={() => updateStatusMutation.mutate({
          id: selectedRequest.id,
          status: selectedRequest.status,
          notes: adminNotes
         })}
         disabled={updateStatusMutation.isPending}
         className="rounded-xl font-bold px-8 h-12 bg-indigo-600 hover:bg-indigo-700 text-white"
        >
         {updateStatusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <SaveIcon className="w-4 h-4 mr-2" />}
         Save Changes
        </Button>
      </DialogFooter>
     </DialogContent>
   </Dialog>
  </div>
 );
};

const SaveIcon = ({ className }: { className?: string }) => (
 <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
  <polyline points="17 21 17 13 7 13 7 21"/>
  <polyline points="7 3 7 8 15 8"/>
 </svg>
);

export default DemoRequests;
