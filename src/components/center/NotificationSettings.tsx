import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { MessageSquare, Mail, Bell, Settings } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default function NotificationSettings({ centerId }: { centerId: string }) {
 const queryClient = useQueryClient();
 const [smsKey, setSmsKey] = useState("");
 const [emailKey, setEmailKey] = useState("");

 const { data: center } = useQuery({
  queryKey: ["center-notification-settings", centerId],
  queryFn: async () => {
   const { data, error } = await supabase.from("centers").select("notification_settings").eq("id", centerId).single();
   if (error) throw error;
   return data;
  },
  enabled: !!centerId,
 });

 const updateSettingsMutation = useMutation({
  mutationFn: async (settings: any) => {
   const { error } = await supabase
    .from("centers")
    .update({ notification_settings: settings })
    .eq("id", centerId);
   if (error) throw error;
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ["center-notification-settings"] });
   toast.success("Notification protocols updated");
  },
  onError: (error: any) => toast.error(error.message),
 });

 const settings = (center?.notification_settings as any) || {
  homework: true,
  missed_chapters: true,
  discipline: true,
  preschool_activities: true,
  attendance: true,
  fee_reminders: true,
  exam_results: true
 };

 const toggleSetting = (key: string) => {
  updateSettingsMutation.mutate({
   ...settings,
   [key]: !settings[key]
  });
 };

 const saveSettings = () => {
  updateSettingsMutation.mutate({
   ...settings,
   sms_gateway_key: smsKey,
   email_service_key: emailKey
  });
 };

 React.useEffect(() => {
  if (center?.notification_settings) {
   const s = center.notification_settings as any;
   setSmsKey(s.sms_gateway_key || "");
   setEmailKey(s.email_service_key || "");
  }
 }, [center]);

 return (
  <div className="grid md:grid-cols-2 gap-6">
   <Card className="rounded-2xl border border-border shadow-sm bg-white h-fit">
    <CardHeader>
     <CardTitle className="flex items-center gap-2">
      <Settings className="h-5 w-5 text-primary" />
      Communication Channels
     </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
     <div className="p-4 bg-blue-50 rounded-2xl space-y-3">
       <div className="flex items-center gap-2 mb-1">
        <MessageSquare className="h-4 w-4 text-blue-600" />
        <span className="font-bold text-blue-800 text-sm">SMS Gateway (Twilio)</span>
       </div>
       <div className="space-y-1">
        <Label className="text-[10px] font-black uppercase text-blue-400">Account SID</Label>
        <Input type="password" value={smsKey} onChange={(e) => setSmsKey(e.target.value)} className="h-10 rounded-xl" />
       </div>
       <Button size="sm" className="bg-blue-600 text-[10px] font-black uppercase">Test Connection</Button>
     </div>

     <div className="p-4 bg-purple-50 rounded-2xl space-y-3">
       <div className="flex items-center gap-2 mb-1">
        <Mail className="h-4 w-4 text-purple-600" />
        <span className="font-bold text-purple-800 text-sm">Email Service (SendGrid)</span>
       </div>
       <div className="space-y-1">
        <Label className="text-[10px] font-black uppercase text-purple-400">API Key</Label>
        <Input type="password" value={emailKey} onChange={(e) => setEmailKey(e.target.value)} className="h-10 rounded-xl" />
       </div>
       <Button size="sm" className="bg-purple-600 text-[10px] font-black uppercase">Verify Domain</Button>
     </div>

     <Button onClick={saveSettings} className="w-full h-11 rounded-xl font-black uppercase text-xs tracking-widest mt-2">
      Save Provider Data
     </Button>
    </CardContent>
   </Card>

   <Card className="rounded-2xl border border-border shadow-sm bg-white ">
    <CardHeader>
     <CardTitle className="flex items-center gap-2">
      <Bell className="h-5 w-5 text-primary" />
      Push Notification Protocols
     </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4 text-sm">
     <p className="text-slate-500 font-medium italic">Mobile push notifications are handled via Firebase Cloud Messaging (FCM) by default for the Nexus App environment.</p>
     <div className="space-y-4 pt-4">
       {[
        { key: 'attendance', label: 'Attendance Alerts' },
        { key: 'homework', label: 'Homework Assignments' },
        { key: 'missed_chapters', label: 'Missed Chapters' },
        { key: 'discipline', label: 'Discipline Issues' },
        { key: 'preschool_activities', label: 'Preschool Activities' },
        { key: 'fee_reminders', label: 'Fee Reminders' },
        { key: 'exam_results', label: 'Exam Results' },
        { key: 'class_routine', label: 'Routine Updates' },
        { key: 'meetings', label: 'Meeting Invites' },
        { key: 'inventory', label: 'Stock Alerts' },
       ].map((item) => (
        <div key={item.key} className="flex justify-between items-center py-2 border-b">
         <span className="font-bold">{item.label}</span>
         <Switch
          checked={settings[item.key]}
          onCheckedChange={() => toggleSetting(item.key)}
          disabled={updateSettingsMutation.isPending}
         />
        </div>
       ))}
     </div>
    </CardContent>
   </Card>
  </div>
 );
}
