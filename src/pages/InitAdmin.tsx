import React from 'react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Shield } from 'lucide-react';

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
          description: 'Admin user has been created successfully' });
      } else {
        toast({
          title: 'Info',
          description: data.message || 'Admin already exists' });
      }
    } catch (error: any) {
      console.error('Init error:', error);
      toast({
        title: 'Initialization failed',
        description: error.message,
        variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s'  } />
      </div>

      <Card className="w-full max-w-md border-none shadow-strong bg-card/80 backdrop-blur-xl animate-in zoom-in-95 duration-500">
        <CardHeader className="space-y-4 pt-8">
          <div className="mx-auto bg-primary/10 p-4 rounded-2xl w-fit shadow-soft">
            <div className="bg-primary text-primary-foreground p-3 rounded-xl shadow-medium">
               <Shield className="h-8 w-8" />
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-extrabold text-center tracking-tight">Setup Admin</CardTitle>
            <CardDescription className="text-center text-base">
              Create the initial administrator account
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pb-8">
          {success ? (
            <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mx-auto bg-green-500/10 p-4 rounded-full w-fit">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <p className="text-xl font-bold">Admin account ready!</p>
              <div className="bg-secondary/50 p-6 rounded-2xl text-left space-y-3 border border-primary/5 shadow-inner">
                <div className="flex justify-between items-center border-b border-primary/10 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Username</span>
                  <span className="text-sm font-medium">sujan1nepal@gmail.com</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</span>
                  <span className="text-sm font-medium">precioussn</span>
                </div>
              </div>
              <Button
                variant="default"
                className="w-full h-12 text-base font-semibold"
                onClick={() => window.location.href = '/login-admin'}
              >
                Go to Admin Login
              </Button>
            </div>
          ) : (
            <>
              <div className="bg-secondary/50 p-6 rounded-2xl space-y-4 border border-primary/5">
                <p className="text-sm text-muted-foreground font-medium">
                  The system will generate a secure administrator account:
                </p>
                <div className="space-y-2">
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Username:</span>
                      <span className="font-semibold">sujan1nepal@gmail.com</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Password:</span>
                      <span className="font-semibold text-primary">precioussn</span>
                   </div>
                </div>
              </div>
              <Button
                onClick={handleInitAdmin}
                disabled={loading}
                className="w-full h-12 text-base font-semibold"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Initializing...
                  </span>
                ) : 'Confirm and Initialize'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InitAdmin;
