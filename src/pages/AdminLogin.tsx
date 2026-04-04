import React, { useState } from "react";
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useLoginSettings } from "@/hooks/use-login-settings";
import LoginLayout from "@/components/auth/LoginLayout";
import { hexToHSL } from "@/lib/utils";

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: settings } = useLoginSettings('admin');

  const containerStyles = {
    '--primary': hexToHSL(settings?.primary_color || '#4f46e5'),
    '--background': hexToHSL(settings?.background_color || '#F8FAFC'),
  } as React.CSSProperties;

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
    <div style={containerStyles}>
    <LoginLayout
      settings={settings || null}
      username={username}
      setUsername={setUsername}
      password={password}
      setPassword={setPassword}
      loading={loading}
      onSubmit={handleSubmit}
      extraFooter={
        <Button
          type="button"
          variant="ghost"
          className="w-full h-12 rounded-xl text-sm font-medium"
          onClick={() => navigate('/login')}
        >
          Back to Center Login
        </Button>
      }
    />
    </div>
  );
};

export default AdminLogin;
