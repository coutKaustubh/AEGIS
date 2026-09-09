import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import WorkspacePage from '@/pages/WorkspacePage';
import AgentsPage from '@/pages/AgentsPage';
import AgentExecutionDetailPage from '@/pages/AgentExecutionDetailPage';
import DocumentsPage from '@/pages/DocumentsPage';
import DocumentDetailPage from '@/pages/DocumentDetailPage';
import KnowledgePage from '@/pages/KnowledgePage';
import ApprovalsPage from '@/pages/ApprovalsPage';
import ApprovalDetailPage from '@/pages/ApprovalDetailPage';
import SovereigntyPage from '@/pages/SovereigntyPage';
import UserManagementPage from '@/pages/UserManagementPage';
import SettingsPage from '@/pages/SettingsPage';
import EngineeringPage from '@/pages/EngineeringPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Enclave Authentication Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Authenticated Sovereign Application Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="workspace" element={<WorkspacePage />} />
            <Route path="engineering" element={<EngineeringPage />} />

            {/* Automation & Agents */}
            <Route path="agents" element={<AgentsPage />} />
            <Route path="agents/:id" element={<AgentExecutionDetailPage />} />

            {/* Documents & Knowledge */}
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="documents/:id" element={<DocumentDetailPage />} />
            <Route path="knowledge" element={<KnowledgePage />} />

            {/* Governance & Approvals */}
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="approvals/:id" element={<ApprovalDetailPage />} />

            {/* Security & Sovereignty */}
            <Route path="system" element={<SovereigntyPage />} />
            <Route path="sovereignty" element={<Navigate to="/system" replace />} />

            {/* Enclave User Governance (Admin Clearance Only) */}
            <Route
              path="users"
              element={
                <ProtectedRoute requireAdmin>
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />

            {/* System Settings */}
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
