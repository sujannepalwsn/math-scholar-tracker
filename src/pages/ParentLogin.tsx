import React, { useState } from "react";
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { useLoginSettings } from "@/hooks/use-login-settings";
import LoginLayout from "@/components/auth/LoginLayout";
import { hexToHSL } from "@/lib/utils";

const ParentLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: settings } = useLoginSettings('parent');

  const containerStyles = {
    '--primary': hexToHSL(settings?.primary_color || '#4f46e5'),
    '--background': hexToHSL(settings?.background_color || '#F8FAFC'),
  } as React.CSSProperties;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(username, password);
      
      if (result.success) {
        navigate('/parent-dashboard');
      } else {
        toast({
          title: 'Login Failed',
          description: result.error || 'Invalid credentials',
          variant: 'destructive' });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An error occurred during login',
        variant: 'destructive' });
    } finally {
      setLoading(false);
    }
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
    />
    </div>
  );
};

export default ParentLogin;
