import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HeroSlide {
  id: string;
  title: string | null;
  subtitle: string | null;
  media_url: string;
  mobile_media_url: string | null;
  media_type: 'image' | 'video';
  cta_text: string | null;
  cta_link: string | null;
  order_index: number;
  is_active: boolean;
  overlay_opacity: number;
  text_align: 'left' | 'center' | 'right';
}

export const useHeroSlides = (includeInactive = false) => {
  return useQuery({
    queryKey: ['hero-slides', includeInactive],
    queryFn: async () => {
      let query = supabase
        .from('hero_slides').select('id, title, image_url')
        .order('order_index', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as HeroSlide[];
    },
  });
};
