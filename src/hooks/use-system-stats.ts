import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SystemStats {
  students: number;
  teachers: number;
  centers: number;
  loading: boolean;
}

export const useSystemStats = () => {
  return useQuery({
    queryKey: ['system_stats'],
    queryFn: async () => {
      // Fetch counts from the secure public view instead of raw tables
      const { data, error } = await supabase
        .from('global_system_stats' as any)
        .select('*')
        .single();

      if (error) {
        console.error("Error fetching system stats:", error);
        return { students: 0, teachers: 0, centers: 0 };
      }

      return {
        students: data.students_count || 0,
        teachers: data.teachers_count || 0,
        centers: data.centers_count || 0,
      };
    },
    staleTime: 30 * 60 * 1000, // Stats don't need to be perfectly real-time for landing page
  });
};
