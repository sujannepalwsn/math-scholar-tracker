import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AllCenterRequirements() {
 const { data: requirements = [], isLoading } = useQuery({
  queryKey: ["all-center-requirements"],
  queryFn: async () => {
   const { data, error } = await supabase
    .from("center_requirements")
    .select("*, centers(name)")
    .order("created_at", { ascending: false });
   if (error) throw error;
   return data;
  },
 });

 if (isLoading) return <div>Loading all requirements...</div>;

 return (
  <Card className="border border-border shadow-sm rounded-2xl bg-white border border-border/20 overflow-hidden">
   <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
    <CardTitle className="text-xl font-black flex items-center gap-3">
     <div className="p-2 rounded-xl bg-primary/10">
      <ClipboardList className="h-6 w-6 text-primary" />
     </div>
     Global Center Requirements
    </CardTitle>
    <CardDescription>View additional requirements submitted by all centers.</CardDescription>
   </CardHeader>
   <CardContent className="p-6">
    <div className="space-y-4">
     {requirements.map((req: any) => (
      <div key={req.id} className="p-4 rounded-2xl border border-border/10 bg-white space-y-2">
       <div className="flex justify-between items-start">
        <div className="space-y-1">
         <h4 className="font-bold text-lg">{req.module_name}</h4>
         <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-3 w-3" />
          <span>{req.centers?.name}</span>
         </div>
        </div>
        <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-black">
         {new Date(req.created_at).toLocaleDateString()}
        </Badge>
       </div>
       <p className="text-sm text-slate-600 leading-relaxed">{req.requirement_description}</p>
      </div>
     ))}

     {requirements.length === 0 && (
      <div className="text-center py-8">
       <p className="text-muted-foreground">No center requirements found.</p>
      </div>
     )}
    </div>
   </CardContent>
  </Card>
 );
}
