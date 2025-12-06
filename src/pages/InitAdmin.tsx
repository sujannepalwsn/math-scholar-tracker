import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Shield, CheckCircle2 } from 'lucide-react';

const InitAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleInitAdmin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('init-admin');

      if (error) throw error;

      if (data.success) {
        setSuccess(true);
        toast({
          title: 'Admin initialized',
          description: 'Admin user has been created successfully',
        });
      } else {
        toast({
          title: 'Info',
          description: data.message || 'Admin already exists',
        });
      }
    } catch (error: any) {
      console.error('Init error:', error);
      toast({
        title: 'Initialization failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-2">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Initialize Admin</CardTitle>
          <CardDescription className="text-center">
            Click the button below to create the admin user
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {success ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
              <p className="text-lg font-medium">Admin user created successfully!</p>
              <div className="bg-muted p-4 rounded-lg text-left space-y-2">
                <p className="text-sm"><strong>Username:</strong> sujan1nepal@gmail.com</p>
                <p className="text-sm"><strong>Password:</strong> precioussn</p>
              </div>
              <Button
                variant="default"
                className="w-full"
                onClick={() => window.location.href = '/login-admin'}
              >
                Go to Admin Login
              </Button>
            </div>
          ) : (
            <>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm text-muted-foreground">
                  This will create an admin user with:
                </p>
                <p className="text-sm"><strong>Username:</strong> sujan1nepal@gmail.com</p>
                <p className="text-sm"><strong>Password:</strong> precioussn</p>
              </div>
              <Button
                onClick={handleInitAdmin}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Initializing...' : 'Initialize Admin User'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InitAdmin;
