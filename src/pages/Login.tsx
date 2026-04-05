import React, { useState } from "react";
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { useLoginSettings } from "@/hooks/use-login-settings";
import LoginLayout from "@/components/auth/LoginLayout";
import { tracking } from "@/utils/tracking";

const CenterLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: settings } = useLoginSettings('center');

  const containerStyles = {
    '--primary': settings?.primary_color || '#4f46e5',
    '--background': settings?.background_color || '#020617',
  } as React.CSSProperties;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(username, password);

    if (result.success) {
      tracking.trackEvent('feature_action', 'login_success', { role: 'center' });
      toast({
        title: 'Login successful',
        description: 'Welcome back!' });
      navigate('/center-dashboard');
    } else {
      toast({
        title: 'Login failed',
        description: result.error || 'Invalid username or password',
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
    />
    </div>
  );
};

export default CenterLogin;
