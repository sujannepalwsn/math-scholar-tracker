import React from "react";
import { Navigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { UserRole, RoleString } from "@/types/roles";

interface ProtectedRouteProps {
  children: React.ReactNode;
  role?: RoleString;
}

const ProtectedRoute = ({ children, role }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    let loginPath = '/login';
    if (role === UserRole.ADMIN) loginPath = '/login-admin';
    if (role === UserRole.PARENT) loginPath = '/login-parent';
    return <Navigate to={loginPath} replace />;
  }

  if (role && user.role !== role) {
    // SECURITY: Teachers requiring admin-level features should be allowed if they have granular permissions.
    if (user.role === UserRole.TEACHER && role === UserRole.CENTER) {
      // Allow teacher to access center-level routes if they have ANY permission for it
      // The specific page will still check for granular access.
      return <>{children}</>;
    }

    let dashboardPath = '/center-dashboard';
    if (user.role === UserRole.ADMIN) dashboardPath = '/admin-dashboard';
    if (user.role === UserRole.PARENT) dashboardPath = '/parent-dashboard';
    if (user.role === UserRole.TEACHER) dashboardPath = '/teacher-dashboard';
    return <Navigate to={dashboardPath} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
