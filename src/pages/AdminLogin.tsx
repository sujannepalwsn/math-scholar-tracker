import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Shield } from 'lucide-react';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(username, password);

    if (result.success) {
      toast({
        title: 'Admin login successful',
        description: 'Welcome, administrator!' });
      navigate('/admin-dashboard');
    } else {
      toast({
        title: 'Login failed',
        description: result.error || 'Invalid admin credentials',
        variant: 'destructive' });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-destructive/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s'  } />
      </div>

      <Card className="w-full max-w-md border-none shadow-strong bg-card/80 backdrop-blur-xl animate-in zoom-in-95 duration-500">
        <CardHeader className="space-y-4 pt-8">
          <div className="mx-auto bg-destructive/10 p-4 rounded-2xl w-fit shadow-soft">
            <div className="bg-destructive text-destructive-foreground p-3 rounded-xl shadow-medium">
               <Shield className="h-8 w-8" />
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-extrabold text-center tracking-tight">Admin Portal</CardTitle>
            <CardDescription className="text-center text-base">
              Administrator access only
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Admin Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter admin username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Admin Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading} variant="destructive">
              {loading ? 'Authenticating...' : 'Admin Login'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => navigate('/login')}
            >
              Back to Center Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
