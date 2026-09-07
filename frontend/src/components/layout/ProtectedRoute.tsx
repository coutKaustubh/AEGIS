import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-bg-primary text-text-dim text-xs font-mono">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-accent-primary animate-pulse" />
          <span>Verifying Enclave Clearance...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="h-12 w-12 rounded-xl bg-status-danger/10 border border-status-danger/20 flex items-center justify-center text-status-danger">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div className="space-y-1.5 max-w-md">
          <h2 className="text-base font-semibold text-text-primary">
            Clearance Restricted
          </h2>
          <p className="text-xs text-text-muted leading-relaxed">
            User Management and employee provisioning are restricted to Enclave Administrators. Your current role is an authenticated Employee node.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => window.history.back()}>
          Return to Previous Console
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
