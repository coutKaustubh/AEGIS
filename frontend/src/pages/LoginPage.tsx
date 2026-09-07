import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Shield, ShieldCheck, AlertCircle } from 'lucide-react';
import { APP_NAME, APP_TAGLINE, APP_SUBTITLE } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { DEMO_CREDENTIALS } from '@/services/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fromPath = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate(fromPath, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed against sovereign node.');
    } finally {
      setLoading(false);
    }
  };

  const selectPersona = (userEmail: string, userPassword: string) => {
    setEmail(userEmail);
    setPassword(userPassword);
    setError(null);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-bg-primary px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-bg-elevated border border-border-subtle font-mono text-sm font-semibold text-text-primary mb-3">
            Æ
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-text-primary">
            {APP_NAME}
          </h1>
          <p className="text-xs text-text-muted font-mono uppercase tracking-wider">
            {APP_SUBTITLE}
          </p>
          <p className="text-xs text-text-dim max-w-xs mx-auto">
            {APP_TAGLINE}
          </p>
        </div>

        {/* Form Card */}
        <Card padding="lg" className="border-border-default shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-2.5 rounded bg-status-danger/10 border border-status-danger/20 text-status-danger text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            <Input
              label="Official Identifier"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@bharatpetro.gov.in"
              required
            />

            <Input
              label="Security Token / Passphrase"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full justify-center mt-2"
            >
              {loading ? 'Verifying Enclave Clearance...' : 'Authenticate'}
              {!loading && <ArrowRight className="h-3.5 w-3.5" />}
            </Button>
          </form>

          {/* Air-gap Policy Notification */}
          <div className="mt-3 pt-3 border-t border-border-subtle/50 text-[10px] text-text-dim text-center font-mono">
            Air-Gapped Sovereign Node: No Self-Registration Allowed
          </div>

          {/* Quick Demo Identities */}
          <div className="mt-4 pt-3 border-t border-border-subtle">
            <span className="text-[11px] text-text-dim block mb-2 font-mono uppercase tracking-wider">
              Switch Enclave Persona
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => selectPersona(DEMO_CREDENTIALS.admin.identifier, DEMO_CREDENTIALS.admin.password)}
                className={`flex-1 text-left px-2.5 py-2 rounded text-[11px] border transition-colors ${
                  email === DEMO_CREDENTIALS.admin.identifier
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-border-subtle bg-bg-subtle/40 hover:bg-bg-subtle'
                }`}
              >
                <div className="font-medium text-text-primary flex items-center justify-between">
                  <span>Rajesh Kumar</span>
                  <ShieldCheck className="h-3 w-3 text-accent-primary" />
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">Admin (Full Access)</div>
              </button>

              <button
                type="button"
                onClick={() => selectPersona(DEMO_CREDENTIALS.employee.identifier, DEMO_CREDENTIALS.employee.password)}
                className={`flex-1 text-left px-2.5 py-2 rounded text-[11px] border transition-colors ${
                  email === DEMO_CREDENTIALS.employee.identifier
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-border-subtle bg-bg-subtle/40 hover:bg-bg-subtle'
                }`}
              >
                <div className="font-medium text-text-primary truncate">
                  Priya Sharma
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">Employee (Restricted)</div>
              </button>
            </div>
          </div>
        </Card>

        {/* Footer info */}
        <div className="text-center text-[11px] text-text-dim font-mono flex items-center justify-center gap-2">
          <Shield className="h-3 w-3 text-status-success" />
          <span>Local Node Air-Gap Enforced</span>
        </div>
      </div>
    </div>
  );
}
