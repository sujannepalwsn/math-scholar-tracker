import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLoginSettings } from "@/hooks/use-login-settings";
import LoginLayout from "@/components/auth/LoginLayout";
import { hexToHSL } from "@/lib/utils";

const TeacherLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: settings } = useLoginSettings('teacher');

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
        title: 'Login successful',
        description: 'Welcome back!'
      });
      navigate('/teacher-dashboard');
    } else {
      toast({
        title: 'Login failed',
        description: result.error || 'Invalid username or password',
        variant: 'destructive'
      });
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
        <div className="text-center mt-6">
          <Link to="/login" className="text-sm font-bold text-primary hover:underline">
            Go to Center Login
          </Link>
        </div>
      }
    />
    </div>
  );
};

export default TeacherLogin;
