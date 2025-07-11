
import { useAuth } from '@/hooks/useAuth';
import DashboardOverview from '@/components/dashboard/DashboardOverview';

const Index = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {profile?.full_name || 'User'}!
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening with your {profile?.role === 'admin' ? 'system' : 'progress'} today.
        </p>
      </div>
      
      <DashboardOverview />
    </div>
  );
};

export default Index;
