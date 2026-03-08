import React, { useState } from "react";
import { Calendar, Camera, ExternalLink, Info, Paintbrush, Star, Video } from "lucide-react";
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Tables } from "@/integrations/supabase/types"
import { cn } from "@/lib/utils"

type Activity = Tables<'activities'>;

export default function ParentActivities() {
  const { user } = useAuth();

  if (!user?.student_id) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="p-4 rounded-full bg-slate-100/50 backdrop-blur-sm border border-slate-200">
          <Info className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-muted-foreground font-medium">Please log in as a parent to view activity records.</p>
      </div>
    );
  }

  // Fetch student's activities
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['parent-activities', user.student_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_activities')
        .select('*, activities(*)')
        .eq('student_id', user.student_id!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user.student_id });

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            Creative Moments
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">Visual chronicle of your child's creative journey and engagement.</p>
          </div>
        </div>
      </div>

      <Card className="border-none shadow-strong overflow-hidden rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-border/20">
        <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
          <CardTitle className="text-xl font-black flex items-center gap-3 px-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <Paintbrush className="h-6 w-6 text-primary" />
            </div>
            Institutional Visual Log
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-20 px-6">
              <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Paintbrush className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-muted-foreground font-bold italic">No creative milestones discovered in the archives yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-8">
              {activities.map((sa: any) => {
                const activity = sa.activities;
                if (!activity) return null;
                return (
                  <Card key={sa.id} className="overflow-hidden border border-border/40 bg-card/60 shadow-soft hover:shadow-strong hover:-translate-y-2 transition-all duration-500 rounded-[2rem] group">
                    <div className="relative aspect-video overflow-hidden">
                      {activity.photo_url ? (
                        <img
                          src={supabase.storage.from("activity-photos").getPublicUrl(activity.photo_url).data.publicUrl}
                          alt={activity.title || 'Activity'}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : activity.video_url ? (
                        <video className="w-full h-full object-cover" muted>
                          <source src={supabase.storage.from("activity-videos").getPublicUrl(activity.video_url).data.publicUrl} />
                        </video>
                      ) : (
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                           <Paintbrush className="h-12 w-12 text-slate-200" />
                        </div>
                      )}

                      <div className="absolute top-4 left-4">
                         <Badge className="bg-card/80 backdrop-blur-md text-foreground border-none text-[9px] font-black uppercase tracking-widest px-2.5 py-1 shadow-soft">
                            <Calendar className="h-2.5 w-2.5 mr-1.5 inline text-primary" />
                            {format(new Date(activity.activity_date), "MMM d, yyyy")}
                         </Badge>
                      </div>

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6">
                         <div className="flex items-center gap-2 text-white/90 text-[10px] font-black uppercase tracking-[0.2em]">
                            <ExternalLink className="h-3 w-3" /> INSPECTION PROTOCOL ACTIVE
                         </div>
                      </div>
                    </div>

                    <CardContent className="p-6 space-y-4">
                      <div className="space-y-1">
                        <h3 className="font-black text-xl text-foreground/90 leading-tight group-hover:text-primary transition-colors line-clamp-1">{activity.title}</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Creative Milestones</p>
                      </div>

                      <div className="h-12">
                        <p className="text-xs font-medium text-slate-500 line-clamp-2 leading-relaxed italic">
                          "{activity.description || 'Creative details pending institutional log...'}"
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        {sa.involvement_score ? (
                          <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            Engagement Lvl {sa.involvement_score}
                          </div>
                        ) : <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Awaiting Score</div>}

                        <div className="flex gap-2">
                          {activity.photo_url && (
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-white shadow-soft hover:bg-primary/5 hover:text-primary transition-all" asChild>
                              <a href={supabase.storage.from("activity-photos").getPublicUrl(activity.photo_url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                                <Camera className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          {activity.video_url && (
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-white shadow-soft hover:bg-primary/5 hover:text-primary transition-all" asChild>
                              <a href={supabase.storage.from("activity-videos").getPublicUrl(activity.video_url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                                <Video className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
