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
      // Fetch counts while ensuring we only count active records from active centers
      const [studentsCount, teachersCount, centersCount] = await Promise.all([
        supabase
          .from("students").select("id, name, grade, roll_number, status, center_id, photo_url, centers!inner(is_active)", { count: 'exact', head: true })
          .eq('is_active', true)
          .eq('centers.is_active', true),
        supabase
          .from("teachers").select("id, name, email, department, subject, grade, status, user_id, centers!inner(is_active)", { count: 'exact', head: true })
          .eq('is_active', true)
          .eq('centers.is_active', true),
        supabase
          .from("centers").select("id, name, logo_url, address, phone, email", { count: 'exact', head: true })
          .eq('is_active', true),
      ]);

      return {
        students: studentsCount.count || 0,
        teachers: teachersCount.count || 0,
        centers: centersCount.count || 0,
      };
    },
    staleTime: 30 * 60 * 1000, // Stats don't need to be perfectly real-time for landing page
  });
};
