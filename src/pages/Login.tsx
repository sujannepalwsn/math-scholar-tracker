import React, { useState } from "react";
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

const CenterLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Removed the 'center' role parameter to allow any role to log in here.
    // The ProtectedRoute will handle redirection based on the actual user role.
    const result = await login(username, password);

    if (result.success) {
      toast({
        title: 'Login successful',
        description: 'Welcome back!' });
      // ProtectedRoute will handle the specific dashboard redirection
      // We can navigate to a generic protected route or the root, and ProtectedRoute will take over.
      navigate('/'); 
    } else {
      toast({
        title: 'Login failed',
        description: result.error || 'Invalid username or password',
        variant: 'destructive' });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] relative overflow-hidden p-4">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-violet-500/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <Card className="w-full max-w-md border border-border/40 shadow-strong bg-white/70 backdrop-blur-3xl animate-in zoom-in-95 duration-700 rounded-[2.5rem]">
        <CardHeader className="space-y-6 pt-12">
          <div className="mx-auto relative">
             <div className="absolute -inset-1 bg-gradient-to-r from-primary to-violet-600 rounded-2xl blur opacity-25" />
             <div className="relative bg-white shadow-soft p-4 rounded-2xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
             </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-4xl font-black text-center tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-slate-900 via-primary to-violet-600 uppercase">
              Secure Auth
            </CardTitle>
            <CardDescription className="text-center text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground opacity-60">
              Institution Control Protocol
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pb-12 px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Identity Token</Label>
              <Input
                id="username"
                type="text"
                placeholder="TOKEN_ID"
                className="h-14 rounded-2xl border-border/20 bg-card/50 backdrop-blur-sm px-6 font-bold"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Access Key</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="h-14 rounded-2xl border-border/20 bg-card/50 backdrop-blur-sm px-6 font-bold"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              className="w-full h-14 text-sm font-black uppercase tracking-[0.2em] bg-gradient-to-r from-primary to-violet-600 rounded-2xl shadow-strong hover:scale-[1.02] transition-all"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-3">
                   <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                   <span>VERIFYING...</span>
                </div>
              ) : 'ESTABLISH LINK'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CenterLogin;