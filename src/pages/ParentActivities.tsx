import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Camera, Paintbrush, Star, Video } from "lucide-react";
import { useState } from "react";

type Activity = Tables<'activities'>;

export default function ParentActivities() {
  const { user } = useAuth();

  if (!user?.student_id) {
    return <div className="p-6 text-center text-muted-foreground">Please log in as a parent to view activities.</div>;
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
    enabled: !!user.student_id,
  });

  const getRatingStars = (rating: number | null) => {
    if (rating === null) return "N/A";
    return Array(rating).fill("⭐").join("");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Activity Gallery</h1>
          <p className="text-muted-foreground text-lg">Visual memories of your child's creative journey and engagement.</p>
        </div>
      </div>

      <Card className="border-none shadow-soft overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <Paintbrush className="h-5 w-5 text-primary" /> Visual Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading activities...</p>
          ) : activities.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No activities logged yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activities.map((sa: any) => {
                const activity = sa.activities;
                if (!activity) return null;
                return (
                  <Card key={sa.id} className="overflow-hidden">
                    {activity.photo_url && (
                      <img
                        src={supabase.storage.from("activity-photos").getPublicUrl(activity.photo_url).data.publicUrl}
                        alt={activity.description || 'Activity'}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    {activity.video_url && !activity.photo_url && (
                      <video controls className="w-full h-48 object-cover">
                        <source src={supabase.storage.from("activity-videos").getPublicUrl(activity.video_url).data.publicUrl} />
                        Your browser does not support the video tag.
                      </video>
                    )}
                    <CardContent className="p-4 space-y-2">
                      <h3 className="font-semibold text-lg">{activity.title}</h3>
                      <p className="text-sm text-muted-foreground">{format(new Date(activity.activity_date), "PPP")}</p>
                      <p className="text-sm">{activity.description || 'No description'}</p>
                      {sa.involvement_score && (
                        <p className="text-sm flex items-center gap-1">
                          Involvement: {getRatingStars(sa.involvement_score)}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2">
                        {activity.photo_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={supabase.storage.from("activity-photos").getPublicUrl(activity.photo_url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                              <Camera className="h-4 w-4 mr-1" /> Photo
                            </a>
                          </Button>
                        )}
                        {activity.video_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={supabase.storage.from("activity-videos").getPublicUrl(activity.video_url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                              <Video className="h-4 w-4 mr-1" /> Video
                            </a>
                          </Button>
                        )}
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