import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { tracking } from '@/utils/tracking';

export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    tracking.trackEvent('page_view', 'view_page', {
      path: location.pathname,
      search: location.search,
      title: document.title,
    });
  }, [location]);
};
