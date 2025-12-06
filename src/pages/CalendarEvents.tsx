import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Edit, CalendarDays, PartyPopper, GraduationCap, Users } from "lucide-react";
import { format, isSameDay, parseISO } from "date-fns";

const EVENT_TYPES = [
  { value: "holiday", label: "Holiday", icon: PartyPopper, color: "bg-red-100 text-red-800" },
  { value: "event", label: "Special Event", icon: CalendarDays, color: "bg-blue-100 text-blue-800" },
  { value: "exam", label: "Examination", icon: GraduationCap, color: "bg-yellow-100 text-yellow-800" },
  { value: "meeting", label: "Meeting", icon: Users, color: "bg-green-100 text-green-800" },
];

export default function CalendarEvents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [eventType, setEventType] = useState("holiday");
  const [isHoliday, setIsHoliday] = useState(false);

  // Fetch events
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["center-events", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("center_events")
        .select("*")
        .eq("center_id", user.center_id)
        .order("event_date");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setEventDate(format(new Date(), "yyyy-MM-dd"));
    setEventType("holiday");
    setIsHoliday(false);
    setEditingEvent(null);
  };

  const createEventMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) throw new Error("Center ID not found");
      const { error } = await supabase.from("center_events").insert({
        center_id: user.center_id,
        title,
        description: description || null,
        event_date: eventDate,
        event_type: eventType,
        is_holiday: isHoliday,
        created_by: user.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["center-events"] });
      toast.success("Event created successfully!");
      resetForm();
      setShowEventDialog(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create event");
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async () => {
      if (!editingEvent?.id) throw new Error("Event ID not found");
      const { error } = await supabase.from("center_events").update({
        title,
        description: description || null,
        event_date: eventDate,
        event_type: eventType,
        is_holiday: isHoliday,
      } as any).eq("id", editingEvent.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["center-events"] });
      toast.success("Event updated successfully!");
      resetForm();
      setShowEventDialog(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update event");
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("center_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["center-events"] });
      toast.success("Event deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete event");
    },
  });

  const handleEditEvent = (event: any) => {
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description || "");
    setEventDate(event.event_date);
    setEventType(event.event_type);
    setIsHoliday(event.is_holiday);
    setShowEventDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEvent) {
      updateEventMutation.mutate();
    } else {
      createEventMutation.mutate();
    }
  };

  // Get events for selected date
  const eventsOnSelectedDate = events.filter((event: any) => 
    selectedDate && isSameDay(parseISO(event.event_date), selectedDate)
  );

  // Get dates with events for calendar highlighting
  const eventDates = events.map((event: any) => parseISO(event.event_date));

  const getEventTypeInfo = (type: string) => {
    return EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[0];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar & Events</h1>
          <p className="text-muted-foreground">Manage holidays and special events</p>
        </div>
        <Dialog open={showEventDialog} onOpenChange={(open) => {
          setShowEventDialog(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Event</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingEvent ? "Edit Event" : "Add Event"}</DialogTitle>
              <DialogDescription>Create a holiday or special event</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Diwali Holiday"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Event Type</Label>
                  <Select value={eventType} onValueChange={setEventType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional details about the event"
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>Mark as Holiday</Label>
                  <p className="text-xs text-muted-foreground">
                    Center will be closed on this day
                  </p>
                </div>
                <Switch
                  checked={isHoliday}
                  onCheckedChange={setIsHoliday}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowEventDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!title || !eventDate}>
                  {editingEvent ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              modifiers={{
                hasEvent: eventDates,
              }}
              modifiersStyles={{
                hasEvent: {
                  backgroundColor: 'hsl(var(--primary) / 0.2)',
                  fontWeight: 'bold',
                },
              }}
            />
          </CardContent>
        </Card>

        {/* Events for Selected Date */}
        <Card>
          <CardHeader>
            <CardTitle>
              Events on {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select a date"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventsOnSelectedDate.length === 0 ? (
              <p className="text-muted-foreground text-sm">No events on this date</p>
            ) : (
              <div className="space-y-3">
                {eventsOnSelectedDate.map((event: any) => {
                  const typeInfo = getEventTypeInfo(event.event_type);
                  const Icon = typeInfo.icon;
                  return (
                    <div key={event.id} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{event.title}</p>
                          {event.description && (
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                          )}
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{typeInfo.label}</Badge>
                            {event.is_holiday && (
                              <Badge variant="destructive" className="text-xs">Holiday</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEditEvent(event)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteEventMutation.mutate(event.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle>All Events & Holidays</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading events...</p>
          ) : events.length === 0 ? (
            <p className="text-muted-foreground">No events scheduled yet</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event: any) => {
                const typeInfo = getEventTypeInfo(event.event_type);
                const Icon = typeInfo.icon;
                return (
                  <div key={event.id} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(event.event_date), "MMM d, yyyy")}
                        </p>
                        {event.is_holiday && (
                          <Badge variant="destructive" className="text-xs mt-1">Holiday</Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteEventMutation.mutate(event.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}