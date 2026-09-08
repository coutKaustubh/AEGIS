import { useEffect, useState } from 'react';
import {
  UserPlus,
  Search,
  KeyRound,
  Power,
  Trash2,
  Lock,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatusDot } from '@/components/ui/StatusDot';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { DEPARTMENTS } from '@/lib/constants';
import type { User } from '@/types/system';
import {
  getManagedUsers,
  addEmployee,
  updateEmployeeStatus,
  deleteEmployee,
  listEmployees,
} from '@/services/auth';

function generateTempPassphrase() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `AEGIS-${code}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>(getManagedUsers());
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    employeeId: string;
    email: string;
    password: string;
  } | null>(null);

  // Form state for provisioning
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [tempPassword, setTempPassword] = useState(() => generateTempPassphrase());
  const [formError, setFormError] = useState('');

  useEffect(() => {
    void listEmployees().then(setUsers).catch(() => undefined);
  }, []);

  const handleOpenModal = () => {
    setName('');
    setEmail('');
    setDepartment(DEPARTMENTS[0]);
    setTempPassword(generateTempPassphrase());
    setFormError('');
    setIsModalOpen(true);
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setFormError('Please complete all required identity fields.');
      return;
    }

    if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
      setFormError('An enclave member with this official email already exists.');
      return;
    }

    const provisionedEmployee = await addEmployee({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      department,
      role: 'employee',
      status: 'active',
      temporaryPassword: tempPassword,
    });

    setUsers([provisionedEmployee, ...users.filter((u) => u.id !== provisionedEmployee.id)]);
    setCreatedCredentials({
      employeeId: provisionedEmployee.id,
      email: provisionedEmployee.email,
      password: provisionedEmployee.temporaryPassword,
    });
    setIsModalOpen(false);
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    await updateEmployeeStatus(user.id, newStatus);
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
    );
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('Are you sure you want to revoke and delete this enclave account?')) {
      await deleteEmployee(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.department.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter === 'ALL' || u.department.includes(deptFilter);
    return matchesSearch && matchesDept;
  });

  const activeCount = users.filter((u) => u.status === 'active').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="User Management"
        description="Air-gapped employee access governance, credential provisioning & role security."
        actions={
          <Button variant="primary" size="sm" onClick={handleOpenModal} className="gap-1.5">
            <UserPlus className="h-3.5 w-3.5" />
            <span>Provision Employee</span>
          </Button>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border-subtle bg-bg-surface p-3 space-y-1">
          <span className="text-[10px] uppercase font-mono text-text-dim">Total Enclave Members</span>
          <div className="text-xl font-semibold text-text-primary">{users.length}</div>
        </div>
        <div className="rounded-lg border border-border-subtle bg-bg-surface p-3 space-y-1">
          <span className="text-[10px] uppercase font-mono text-text-dim">Active Nodes</span>
          <div className="text-xl font-semibold text-status-success">{activeCount}</div>
        </div>
        <div className="rounded-lg border border-border-subtle bg-bg-surface p-3 space-y-1">
          <span className="text-[10px] uppercase font-mono text-text-dim">Administrators</span>
          <div className="text-xl font-semibold text-accent-primary">{adminCount}</div>
        </div>
        <div className="rounded-lg border border-border-subtle bg-bg-surface p-3 space-y-1">
          <span className="text-[10px] uppercase font-mono text-text-dim">Air-Gapped Policy</span>
          <div className="text-xs font-mono text-text-muted mt-1">NO SELF-REGISTRATION</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-dim" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees by name, email or department..."
            className="w-full rounded-md border border-border-subtle bg-bg-surface pl-9 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-dim focus:border-border-hover focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-md border border-border-subtle bg-bg-surface px-2.5 py-1.5 text-xs text-text-secondary focus:outline-none"
          >
            <option value="ALL">All Departments</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-lg border border-border-subtle bg-bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-subtle/40 text-[10px] font-mono text-text-dim uppercase tracking-wider">
                <th className="py-2.5 px-4">Member Identity</th>
                <th className="py-2.5 px-4">Department</th>
                <th className="py-2.5 px-4">Role</th>
                <th className="py-2.5 px-4">Enclave Status</th>
                <th className="py-2.5 px-4">Credentials</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/50 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-dim text-xs">
                    No enclave members matched your query.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((member) => {
                  const isAdminMember = member.role === 'admin';
                  const isActive = member.status === 'active';

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-bg-subtle/30 transition-colors group"
                    >
                      {/* Identity */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-md bg-bg-elevated border border-border-subtle flex items-center justify-center font-mono text-xs font-semibold text-text-secondary">
                            {member.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-text-primary truncate">
                              {member.name}
                            </div>
                            <div className="text-[11px] text-text-dim font-mono truncate">
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4 text-text-secondary">
                        <span className="truncate max-w-[180px] block">
                          {member.department}
                        </span>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4">
                        <Badge
                          variant={isAdminMember ? 'warning' : 'default'}
                          className="font-mono text-[10px] uppercase"
                        >
                          {member.role}
                        </Badge>
                      </td>

                      {/* Enclave Status */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <StatusDot color={isActive ? 'success' : 'neutral'} />
                          <span className={isActive ? 'text-text-secondary' : 'text-text-dim'}>
                            {isActive ? 'Operational' : 'Disabled'}
                          </span>
                        </div>
                      </td>

                      {/* Credentials */}
                      <td className="py-3 px-4">
                        <span className="text-[11px] text-text-dim font-mono flex items-center gap-1">
                          <Lock className="h-2.5 w-2.5" /> Never exposed
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(member)}
                            title={isActive ? 'Deactivate Access' : 'Activate Access'}
                            className="p-1.5 rounded text-text-dim hover:text-text-secondary hover:bg-bg-subtle transition-colors"
                          >
                            <Power className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(member.id)}
                            title="Revoke & Delete Identity"
                            className="p-1.5 rounded text-text-dim hover:text-status-danger hover:bg-status-danger/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision Employee Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Provision Enclave Employee"
      >
        <form onSubmit={handleCreateEmployee} className="space-y-4 text-xs">
          <p className="text-text-muted leading-relaxed">
            In accordance with sovereign air-gap operational protocol, self-registration is strictly disallowed. Administrators manually provision credentials for authorized personnel.
          </p>

          {formError && (
            <div className="p-2 rounded bg-status-danger/10 border border-status-danger/20 text-status-danger text-[11px]">
              {formError}
            </div>
          )}

          <Input
            label="Full Legal Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Arun Sharma"
            required
          />

          <Input
            label="Official Corporate / Ministry Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. a.sharma@bharatpetro.gov.in"
            required
          />

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-text-secondary">
              Department / Operational Division
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-xs text-text-primary focus:border-border-hover focus:outline-none"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-text-secondary">
              Role Clearance
            </label>
            <div className="rounded-md border border-accent-primary bg-accent-primary/10 px-3 py-2 text-text-primary">
              <div className="font-medium text-xs">Employee</div>
              <div className="text-[10px] text-text-dim">Standard workspace operator</div>
            </div>
          </div>

          {/* Generated Passphrase */}
          <div className="space-y-1.5 pt-2">
            <label className="text-[11px] font-medium text-text-secondary flex items-center gap-1">
              <KeyRound className="h-3 w-3 text-status-warning" />
              <span>Generated Air-Gapped Temporary Passphrase</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={tempPassword}
                className="flex-1 rounded-md border border-border-default bg-bg-elevated px-3 py-2 text-xs font-mono text-text-primary focus:outline-none select-all"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(tempPassword);
                  alert('Passphrase copied to clipboard.');
                }}
              >
                Copy
              </Button>
            </div>
            <p className="text-[10px] text-text-dim font-mono">
              Provide this one-time security token to the employee through a secure enterprise channel.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Provision Enclave Access
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={createdCredentials !== null}
        onClose={() => setCreatedCredentials(null)}
        title="Employee credentials provisioned"
      >
        {createdCredentials && (
          <div className="space-y-4 text-xs">
            <p className="text-text-muted leading-relaxed">
              Share these temporary credentials through an approved secure channel. They are not stored in the employee directory and will not be shown again after this confirmation is closed.
            </p>
            <div className="space-y-2 rounded-md border border-border-subtle bg-bg-subtle/40 p-3 font-mono">
              <div className="flex justify-between gap-4">
                <span className="text-text-dim">Employee ID</span>
                <span className="text-text-primary">{createdCredentials.employeeId}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-dim">Identifier</span>
                <span className="text-text-primary">{createdCredentials.email}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-dim">Temporary password</span>
                <span className="text-text-primary">{createdCredentials.password}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border-subtle pt-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${createdCredentials.employeeId}\n${createdCredentials.email}\n${createdCredentials.password}`,
                  );
                  setCopiedKeyId(createdCredentials.employeeId);
                  setTimeout(() => setCopiedKeyId(null), 2000);
                }}
              >
                {copiedKeyId === createdCredentials.employeeId ? 'Copied' : 'Copy credentials'}
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={() => setCreatedCredentials(null)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
