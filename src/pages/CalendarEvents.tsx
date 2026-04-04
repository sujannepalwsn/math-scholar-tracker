import React, { useState } from "react";
import { UserRole } from "@/types/roles";
import { CalendarDays, Edit, GraduationCap, PartyPopper, Plus, Trash2, Users, ShieldCheck, ShieldAlert, Loader2, Filter } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { format, isSameDay, parseISO, startOfMonth, endOfMonth } from "date-fns"
import { hasActionPermission } from "@/utils/permissions";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AcademicYearManagement from "@/components/center/AcademicYearManagement";

const EVENT_TYPES = [
 { value: "holiday", label: "Holiday", icon: PartyPopper, color: "bg-red-100 text-red-800" },
 { value: "event", label: "Special Event", icon: CalendarDays, color: "bg-blue-100 text-blue-800" },
 { value: "exam", label: "Examination", icon: GraduationCap, color: "bg-yellow-100 text-yellow-800" },
 { value: "meeting", label: "Meeting", icon: Users, color: "bg-green-100 text-green-800" },
];

export default function CalendarEvents() {
 const { user } = useAuth();
 const canEdit = hasActionPermission(user, 'calendar_events', 'edit');
 const queryClient = useQueryClient();
 const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
 const [showEventDialog, setShowEventDialog] = useState(false);
 const [editingEvent, setEditingEvent] = useState<any>(null);
 const [activeTab, setActiveTab] = useState("calendar");
 const [typeFilter, setTypeFilter] = useState("all");

 // Form state
 const [title, setTitle] = useState("");
 const [description, setDescription] = useState("");
 const [eventDate, setEventDate] = useState(format(new Date(), "yyyy-MM-dd"));
 const [eventType, setEventType] = useState("holiday");
 const [isSchoolDay, setIsSchoolDay] = useState(true);

 const isParent = user?.role === UserRole.PARENT;

 // For parents, fetch student's center_id
 const { data: student } = useQuery({
  queryKey: ['student-for-calendar', user?.student_id || user?.linked_students?.[0]?.id],
  queryFn: async () => {
   if (!isParent) return null;
   const studentId = user?.student_id || user?.linked_students?.[0]?.id;
   if (!studentId) return null;
   const { data, error } = await supabase.from('students').select('center_id').eq('id', studentId).single();
   if (error) throw error;
   return data;
  },
  enabled: isParent && !!(user?.student_id || user?.linked_students?.[0]?.id) });

 const centerId = isParent ? student?.center_id : user?.center_id;
 const isRestricted = user?.role === UserRole.TEACHER && user?.teacher_scope_mode !== 'full';

 // Fetch events
 const { data: events = [], isLoading } = useQuery({
  queryKey: ["calendar-events", centerId, typeFilter],
  queryFn: async () => {
   if (!centerId) return [];
   let query = supabase
    .from("calendar_events")
    .select("*")
    .eq("center_id", centerId);

   if (typeFilter !== "all") {
     query = query.eq("type", typeFilter);
   }

   const { data, error } = await query.order("date");
   if (error) throw error;
   return data;
  },
  enabled: !!centerId });

 const resetForm = () => {
  setTitle("");
  setDescription("");
  setEventDate(format(new Date(), "yyyy-MM-dd"));
  setEventType("holiday");
  setIsSchoolDay(true);
  setEditingEvent(null);
 };

 const createEventMutation = useMutation({
  mutationFn: async () => {
   if (!user?.center_id) throw new Error("Center ID not found");
   const { error } = await supabase.from("calendar_events").insert({
    center_id: user.center_id,
    title,
    description: description || null,
    date: eventDate,
    type: eventType,
    is_school_day: isSchoolDay,
    created_by: user.id });
   if (error) throw error;
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
   toast.success("Event created successfully!");
   resetForm();
   setShowEventDialog(false);
  },
  onError: (error: any) => toast.error(error.message || "Failed to create event")
 });

 const updateEventMutation = useMutation({
  mutationFn: async () => {
   if (!editingEvent?.id) throw new Error("Event ID not found");
   const { error } = await supabase.from("calendar_events").update({
    title,
    description: description || null,
    date: eventDate,
    type: eventType,
    is_school_day: isSchoolDay }).eq("id", editingEvent.id);
   if (error) throw error;
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
   toast.success("Event updated successfully!");
   resetForm();
   setShowEventDialog(false);
  },
  onError: (error: any) => toast.error(error.message || "Failed to update event")
 });

 const deleteEventMutation = useMutation({
  mutationFn: async (id: string) => {
   const { error } = await supabase.from("calendar_events").delete().eq("id", id);
   if (error) throw error;
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
   toast.success("Event deleted successfully!");
  },
  onError: (error: any) => toast.error(error.message || "Failed to delete event")
 });

 const handleEditEvent = (event: any) => {
  setEditingEvent(event);
  setTitle(event.title);
  setDescription(event.description || "");
  setEventDate(event.date);
  setEventType(event.type);
  setIsSchoolDay(event.is_school_day);
  setShowEventDialog(true);
 };

 const eventsOnSelectedDate = events.filter((event: any) =>
  selectedDate && isSameDay(parseISO(event.date), selectedDate)
 );

 const eventDates = events.map((event: any) => parseISO(event.date));

 const getEventTypeInfo = (type: string) => {
  return EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[0];
 };

 return (
  <div className="space-y-8 animate-in fade-in duration-1000 page-enter">
   <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
    <div className="space-y-2">
     <div className="flex items-center gap-3">
      <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
       <CalendarDays className="h-8 w-8 text-primary animate-pulse" />
      </div>
      <div>
       <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
        School Calendar
       </h1>
       <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Unified Academic & Operational Schedule</p>
      </div>
     </div>
    </div>
    {!isParent && canEdit && (
     <Button onClick={() => setShowEventDialog(true)} size="lg" className="rounded-2xl shadow-sm h-12 px-6 text-sm font-black tracking-tight bg-gradient-to-r from-primary to-violet-600">
      <Plus className="h-5 w-5 mr-2" /> ADD EVENT
     </Button>
    )}
   </div>

   <Tabs defaultValue="calendar" className="space-y-8" value={activeTab} onValueChange={setActiveTab}>
    <TabsList className="bg-white border border-border/40 p-1.5 rounded-2xl h-14 shadow-sm w-full justify-start">
     <TabsTrigger value="calendar" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:shadow-sm">Calendar View</TabsTrigger>
     <TabsTrigger value="list" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:shadow-sm">Event List</TabsTrigger>
     {!isParent && <TabsTrigger value="years" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:shadow-sm">Academic Years</TabsTrigger>}
    </TabsList>

    <TabsContent value="calendar" className="space-y-8 outline-none">
     <div className="grid gap-8 lg:grid-cols-2">
      <Card className="border border-border shadow-sm overflow-hidden rounded-2xl bg-white border border-border/20">
       <CardContent className="p-6">
        <Calendar
         mode="single"
         selected={selectedDate}
         onSelect={(date) => date && setSelectedDate(date)}
         className="rounded-2xl border border-border/40 bg-white p-4 shadow-sm mx-auto"
         modifiers={{ hasEvent: eventDates }}
         modifiersStyles={{ hasEvent: { backgroundColor: 'hsl(var(--primary) / 0.2)', fontWeight: 'bold' } }}
        />
       </CardContent>
      </Card>

      <Card className="border border-border shadow-sm overflow-hidden rounded-2xl bg-white border border-border/20 h-fit">
       <CardHeader className="bg-gradient-to-r from-primary to-violet-600 text-primary-foreground py-6 shadow-sm">
        <CardTitle className="text-xl font-black flex items-center gap-3">
         <div className="p-2 rounded-xl bg-white ">
          <PartyPopper className="h-6 w-6 text-white" />
         </div>
         {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Selected Date"}
        </CardTitle>
       </CardHeader>
       <CardContent className="p-6">
        {eventsOnSelectedDate.length === 0 ? (
         <div className="text-center py-12">
           <p className="text-muted-foreground font-medium italic">No events or closures scheduled for this date.</p>
           <p className="text-[10px] font-black text-emerald-600 uppercase mt-2">Operational Day</p>
         </div>
        ) : (
         <div className="space-y-4">
          {eventsOnSelectedDate.map((event: any) => {
           const typeInfo = getEventTypeInfo(event.type);
           const Icon = typeInfo.icon;
           return (
            <div key={event.id} className="flex items-start justify-between p-4 rounded-2xl border bg-white group transition-all">
             <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${typeInfo.color}`}>
               <Icon className="h-5 w-5" />
              </div>
              <div className="space-y-1">
               <p className="font-bold text-slate-800">{event.title}</p>
               {event.description && <p className="text-xs text-muted-foreground">{event.description}</p>}
               <div className="flex gap-2 pt-1">
                <Badge variant="outline" className="text-[9px] uppercase font-black">{typeInfo.label}</Badge>
                {!event.is_school_day && <Badge variant="destructive" className="text-[9px] uppercase font-black">Closed</Badge>}
               </div>
              </div>
             </div>
             {!isParent && canEdit && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
               <Button variant="ghost" size="icon" onClick={() => handleEditEvent(event)} className="h-8 w-8 rounded-lg"><Edit className="h-4 w-4" /></Button>
               <Button variant="ghost" size="icon" onClick={() => deleteEventMutation.mutate(event.id)} className="h-8 w-8 rounded-lg text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </div>
             )}
            </div>
           );
          })}
         </div>
        )}
       </CardContent>
      </Card>
     </div>
    </TabsContent>

    <TabsContent value="list" className="space-y-6">
      <Card className="border border-border shadow-sm rounded-2xl bg-white border border-border/20 overflow-hidden">
       <CardHeader className="border-b border-border/10 bg-primary/5 py-6 flex flex-row items-center justify-between">
         <CardTitle className="text-lg font-black uppercase tracking-widest">Master Event Registry</CardTitle>
         <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px] h-10 rounded-xl bg-white border border-border shadow-sm">
            <Filter className="h-3 w-3 mr-2 text-primary" />
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
         </Select>
       </CardHeader>
       <CardContent className="p-0">
         <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/10">
             <tr>
               <th className="px-6 py-4">Event Details</th>
               <th className="px-6 py-4">Date</th>
               <th className="px-6 py-4">Status</th>
               {!isParent && <th className="px-6 py-4 text-right">Actions</th>}
             </tr>
            </thead>
            <tbody className="divide-y divide-border/5">
             {events.map((event: any) => {
               const typeInfo = getEventTypeInfo(event.type);
               return (
                <tr key={event.id} className="hover:bg-primary/5 transition-colors group">
                  <td className="px-6 py-4">
                   <div className="flex items-center gap-3">
                     <div className={cn("p-2 rounded-lg", typeInfo.color)}><typeInfo.icon className="h-4 w-4" /></div>
                     <div>
                      <p className="font-bold text-slate-700">{event.title}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{typeInfo.label}</p>
                     </div>
                   </div>
                  </td>
                  <td className="px-6 py-4 font-medium">{format(parseISO(event.date), "PPP")}</td>
                  <td className="px-6 py-4">
                   {event.is_school_day ?
                     <Badge className="bg-emerald-50 text-emerald-600 border border-border text-[9px] font-black uppercase">Open</Badge> :
                     <Badge className="bg-rose-50 text-rose-600 border border-border text-[9px] font-black uppercase">Closed</Badge>
                   }
                  </td>
                  {!isParent && (
                   <td className="px-6 py-4 text-right">
                     <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => handleEditEvent(event)} className="h-8 w-8 rounded-lg"><Edit className="h-4 w-4 text-primary" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteEventMutation.mutate(event.id)} className="h-8 w-8 rounded-lg text-destructive"><Trash2 className="h-4 w-4" /></Button>
                     </div>
                   </td>
                  )}
                </tr>
               );
             })}
            </tbody>
          </table>
         </div>
       </CardContent>
      </Card>
    </TabsContent>

    {!isParent && (
      <TabsContent value="years" className="outline-none">
       <AcademicYearManagement centerId={centerId || ""} />
      </TabsContent>
    )}
   </Tabs>

   {/* Add/Edit Event Dialog */}
   <Dialog open={showEventDialog} onOpenChange={(open) => { setShowEventDialog(open); if (!open) resetForm(); }}>
     <DialogContent className="rounded-2xl">
      <DialogHeader>
       <DialogTitle className="text-xl font-black uppercase tracking-tight">{editingEvent ? "Refine Event Parameters" : "Initiate New Event"}</DialogTitle>
       <DialogDescription className="font-medium">Define institutional calendar markers and operational status.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
       <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Event Designation *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Annual Sports Meet" className="h-11 rounded-xl" />
       </div>

       <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
         <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Date *</Label>
         <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="h-11 rounded-xl" />
        </div>
        <div className="space-y-2">
         <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Category</Label>
         <Select value={eventType} onValueChange={setEventType}>
          <SelectTrigger className="h-11 rounded-xl">
           <SelectValue />
          </SelectTrigger>
          <SelectContent>
           {EVENT_TYPES.map(type => (
            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
           ))}
          </SelectContent>
         </Select>
        </div>
       </div>

       <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Contextual details..." rows={2} className="rounded-xl" />
       </div>

       <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
        <div className="space-y-0.5">
         <Label className="text-[10px] font-black uppercase tracking-widest">Operational Day</Label>
         <p className="text-[9px] text-muted-foreground font-medium uppercase italic">Disable to mark institution as closed</p>
        </div>
        <Switch checked={isSchoolDay} onCheckedChange={setIsSchoolDay} />
       </div>

       <div className="flex gap-3 pt-4">
        <Button variant="ghost" onClick={() => setShowEventDialog(false)} className="flex-1 rounded-xl uppercase font-black text-[10px]">Cancel</Button>
        <Button
         onClick={() => editingEvent ? updateEventMutation.mutate() : createEventMutation.mutate()}
         disabled={!title || !eventDate || createEventMutation.isPending || updateEventMutation.isPending}
         className="flex-1 h-12 rounded-xl bg-slate-900 text-white uppercase font-black text-[10px]"
        >
         {createEventMutation.isPending || updateEventMutation.isPending ? "Syncing..." : (editingEvent ? "Commit Changes" : "Register Event")}
        </Button>
       </div>
      </div>
     </DialogContent>
    </Dialog>
  </div>
 );
}
