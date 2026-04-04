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
 CreditCard,
 MapPin,
 ExternalLink,
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

const SaaSBookings = () => {
 const [searchTerm, setSearchTerm] = useState("");
 const [selectedBooking, setSelectedBooking] = useState<any>(null);
 const [isDetailsOpen, setIsDetailsOpen] = useState(false);
 const queryClient = useQueryClient();

 const { data: bookings, isLoading } = useQuery({
  queryKey: ['saas_bookings'],
  queryFn: async () => {
   const { data, error } = await supabase
    .from('saas_bookings')
    .select('*')
    .order('created_at', { ascending: false });

   if (error) throw error;
   return data;
  }
 });

 const updateStatusMutation = useMutation({
  mutationFn: async ({ id, status }: { id: string, status: string }) => {
   const { error } = await supabase
    .from('saas_bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

   if (error) throw error;
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ['saas_bookings'] });
   toast.success("Booking updated successfully");
   setIsDetailsOpen(false);
  },
  onError: (error: any) => {
   toast.error(error.message || "Failed to update booking");
  }
 });

 const deleteMutation = useMutation({
  mutationFn: async (id: string) => {
   const { error } = await supabase
    .from('saas_bookings')
    .delete()
    .eq('id', id);

   if (error) throw error;
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ['saas_bookings'] });
   toast.success("Booking record deleted");
  }
 });

 const filteredBookings = bookings?.filter(b =>
  b.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  b.institution_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  b.email.toLowerCase().includes(searchTerm.toLowerCase())
 );

 const getStatusBadge = (status: string) => {
  switch (status) {
   case 'pending': return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 font-bold uppercase text-[10px]">Pending</Badge>;
   case 'verified': return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 font-bold uppercase text-[10px]">Verified</Badge>;
   case 'rejected': return <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200 font-bold uppercase text-[10px]">Rejected</Badge>;
   default: return <Badge variant="outline">{status}</Badge>;
  }
 };

 const handleOpenDetails = (booking: any) => {
  setSelectedBooking(booking);
  setIsDetailsOpen(true);
 };

 if (isLoading) {
  return (
   <div className="flex items-center justify-center py-20">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
   </div>
  );
 }

 return (
  <div className="space-y-6">
   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div className="relative w-full md:w-96">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
       placeholder="Search bookings..."
       value={searchTerm}
       onChange={(e) => setSearchTerm(e.target.value)}
       className="pl-10 h-11 rounded-xl bg-muted/50 border border-border focus-visible:ring-1"
      />
    </div>
   </div>

   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
     <Card className="border border-border shadow-sm rounded-2xl bg-indigo-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-black uppercase tracking-widest text-indigo-600/60">Total Bookings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-black text-indigo-600">{bookings?.length || 0}</div>
      </CardContent>
     </Card>
     <Card className="border border-border shadow-sm rounded-2xl bg-amber-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-black uppercase tracking-widest text-amber-600/60">New Payments</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-black text-amber-600">
         {bookings?.filter(r => r.status === 'pending').length || 0}
        </div>
      </CardContent>
     </Card>
     <Card className="border border-border shadow-sm rounded-2xl bg-emerald-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-black uppercase tracking-widest text-emerald-600/60">Verified</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-black text-emerald-600">
         {bookings?.filter(r => r.status === 'verified').length || 0}
        </div>
      </CardContent>
     </Card>
   </div>

   <Card className="border border-border shadow-sm rounded-2xl overflow-hidden bg-white ">
    <Table>
     <TableHeader className="bg-muted/50">
      <TableRow className="hover:bg-transparent border border-border">
       <TableHead className="font-black uppercase text-[10px] tracking-widest py-5 px-6">Requester</TableHead>
       <TableHead className="font-black uppercase text-[10px] tracking-widest">Institution</TableHead>
       <TableHead className="font-black uppercase text-[10px] tracking-widest">Plan</TableHead>
       <TableHead className="font-black uppercase text-[10px] tracking-widest">Method</TableHead>
       <TableHead className="font-black uppercase text-[10px] tracking-widest">Status</TableHead>
       <TableHead className="w-[80px]"></TableHead>
      </TableRow>
     </TableHeader>
     <TableBody>
      {filteredBookings?.map((booking) => (
       <TableRow key={booking.id} className="hover:bg-white transition-colors border-b border-muted/20 cursor-pointer" onClick={() => handleOpenDetails(booking)}>
        <TableCell className="py-4 px-6">
         <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
           {booking.full_name.charAt(0)}
          </div>
          <div>
           <div className="font-bold text-slate-900">{booking.full_name}</div>
           <div className="text-xs text-slate-500 font-medium">{booking.email}</div>
          </div>
         </div>
        </TableCell>
        <TableCell>
          <div className="font-bold text-slate-700">{booking.institution_name}</div>
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className="rounded-lg font-bold">{booking.plan_name}</Badge>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-500">
           <CreditCard className="h-3 w-3" /> {booking.payment_method}
          </div>
        </TableCell>
        <TableCell>
         {getStatusBadge(booking.status)}
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
         <DropdownMenu>
          <DropdownMenuTrigger asChild>
           <Button variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-white">
            <MoreHorizontal className="h-4 w-4" />
           </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl border-slate-200">
           <DropdownMenuItem className="font-bold gap-2 focus:bg-indigo-50 focus:text-indigo-600 py-2" onClick={() => handleOpenDetails(booking)}>
            <ExternalLink className="h-4 w-4" /> View Evidence
           </DropdownMenuItem>
           <DropdownMenuSeparator />
           <DropdownMenuItem className="font-bold gap-2 focus:bg-emerald-50 focus:text-emerald-600 py-2" onClick={() => updateStatusMutation.mutate({ id: booking.id, status: 'verified' })}>
            <CheckCircle2 className="h-4 w-4" /> Verify Payment
           </DropdownMenuItem>
           <DropdownMenuItem className="font-bold gap-2 text-destructive focus:bg-destructive/5 focus:text-destructive py-2" onClick={() => deleteMutation.mutate(booking.id)}>
            <Trash2 className="h-4 w-4" /> Delete Record
           </DropdownMenuItem>
          </DropdownMenuContent>
         </DropdownMenu>
        </TableCell>
       </TableRow>
      ))}
     </TableBody>
    </Table>
   </Card>

   <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
     <DialogContent className="max-w-2xl rounded-2xl p-0 overflow-hidden border border-border shadow-2xl">
      <div className="bg-emerald-600 p-8 text-white">
        <div className="flex justify-between items-start mb-6">
         <div className="space-y-1">
           <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Institutional Booking</div>
           <DialogTitle className="text-3xl font-black leading-tight">
            {selectedBooking?.institution_name}
           </DialogTitle>
         </div>
         {selectedBooking && getStatusBadge(selectedBooking.status)}
        </div>
        <div className="flex flex-wrap gap-6">
         <div className="flex items-center gap-2 text-sm font-bold bg-white px-4 py-2 rounded-xl ">
           <Users className="w-4 h-4" /> {selectedBooking?.full_name}
         </div>
         <div className="flex items-center gap-2 text-sm font-bold bg-white px-4 py-2 rounded-xl ">
           <CreditCard className="w-4 h-4" /> {selectedBooking?.plan_name} Plan
         </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-2 gap-8">
         <div className="space-y-4">
           <div>
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contact Protocol</Label>
            <div className="font-bold text-slate-800 flex flex-col gap-1 mt-1">
              <div className="flex items-center gap-2 text-sm"><Mail className="w-3 h-3" /> {selectedBooking?.email}</div>
              <div className="flex items-center gap-2 text-sm"><Phone className="w-3 h-3" /> {selectedBooking?.phone}</div>
            </div>
           </div>
           <div>
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Evidence</Label>
            <div className="mt-2">
              {selectedBooking?.payment_proof_url ? (
               <a href={selectedBooking.payment_proof_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-black text-indigo-600 hover:underline">
                 <ExternalLink className="h-3 w-3" /> VIEW ATTACHED SCREENSHOT
               </a>
              ) : (
               <span className="text-xs text-slate-400 italic">No proof uploaded.</span>
              )}
            </div>
           </div>
         </div>
         <div className="space-y-4">
           <div>
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location Registry</Label>
            <div className="font-bold text-slate-800 flex items-start gap-2 mt-1 text-sm">
              <MapPin className="w-3 h-3 mt-1 shrink-0" /> {selectedBooking?.address || "No address provided"}
            </div>
           </div>
           <div>
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Financial Vector</Label>
            <div className="font-black text-indigo-600 mt-1 uppercase text-sm">
              {selectedBooking?.payment_method}
            </div>
           </div>
         </div>
        </div>
      </div>

      <DialogFooter className="p-8 pt-0 gap-3">
        <Button variant="ghost" onClick={() => setIsDetailsOpen(false)} className="rounded-xl font-bold px-6 h-12">Close</Button>
        {selectedBooking?.status === 'pending' && (
         <Button
           onClick={() => updateStatusMutation.mutate({
            id: selectedBooking.id,
            status: 'verified'
           })}
           disabled={updateStatusMutation.isPending}
           className="rounded-xl font-black px-8 h-12 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
         >
           {updateStatusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
           VERIFY & ACTIVATE
         </Button>
        )}
      </DialogFooter>
     </DialogContent>
   </Dialog>
  </div>
 );
};

export default SaaSBookings;
