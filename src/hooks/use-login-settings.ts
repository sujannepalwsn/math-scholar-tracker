import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useLoginSettings = (pageType: 'center' | 'admin' | 'parent' | 'teacher' | 'contact-sales') => {
  return useQuery({
    queryKey: ['login_page_settings', pageType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('login_page_settings').select('id')
        .eq('page_type', pageType)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    // Keep data fresh, but it's not changing constantly for end users
    staleTime: 5 * 60 * 1000,
  });
};
