import { useEffect, useState } from 'react';
import { BadgeCheck, Shield, Trash2 } from 'lucide-react';
import { api, handleError } from '../../lib/api';
import { Alert, Avatar, Badge, Button, Card, EmptyState, ErrorState, Select, Spinner } from '../../components/ui';
import { formatDate } from '../../lib/format';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/users');
      setUsers(data.data.users);
    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setRole = async (id: number, role: string) => {
    try {
      await api.put(`/users/${id}`, { role });
      setNotice('Role updated ✓');
      load();
      setTimeout(() => setNotice(''), 2500);
    } catch (err) {
      setError(handleError(err));
    }
  };

  const togglePremium = async (id: number, isPremium: boolean) => {
    try {
      await api.put(`/users/${id}`, { isPremium });
      load();
    } catch { /* ignore */ }
  };

  const remove = async (id: number, name: string) => {
    if (!window.confirm(`Delete user "${name}"? This removes all their data.`)) return;
    try {
      await api.delete(`/users/${id}`);
      setNotice('User deleted ✓');
      load();
      setTimeout(() => setNotice(''), 2500);
    } catch (err) {
      setError(handleError(err));
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} retry={load} />;

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-ink-900 mb-1">User Management</h1>
      <p className="text-sm text-ink-500 mb-5">Manage roles, premium access and accounts.</p>
      {notice && <div className="mb-4"><Alert tone="green">{notice}</Alert></div>}
      {users.length === 0 ? (
        <Card><EmptyState icon="👥" title="No users yet" /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-head">User</th>
                  <th className="table-head">Role</th>
                  <th className="table-head">Target</th>
                  <th className="table-head">Mocks</th>
                  <th className="table-head">Joined</th>
                  <th className="table-head text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-ink-50/50">
                    <td className="table-cell">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.name} size={32} />
                        <div>
                          <p className="font-semibold text-ink-800 flex items-center gap-1.5">{u.name} {u.is_verified ? <BadgeCheck size={14} className="text-brand-500" /> : null}</p>
                          <p className="text-xs text-ink-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <Select value={u.role} onChange={(e) => setRole(u.id, e.target.value)} className="!w-32 !py-1.5 !text-xs">
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="superadmin">Superadmin</option>
                      </Select>
                    </td>
                    <td className="table-cell text-ink-600">{u.exam_target || '—'}</td>
                    <td className="table-cell font-bold text-ink-800">{u.mocks_taken}</td>
                    <td className="table-cell text-ink-500">{formatDate(u.created_at)}</td>
                    <td className="table-cell text-right whitespace-nowrap">
                      <div className="inline-flex gap-1.5 items-center">
                        <button
                          onClick={() => togglePremium(u.id, !u.is_premium)}
                          className={`chip cursor-pointer ${u.is_premium ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-ink-100 text-ink-500'}`}
                        >
                          {u.is_premium ? '⭐ Premium' : 'Free'}
                        </button>
                        <button onClick={() => remove(u.id, u.name)} className="p-2 rounded-lg text-ink-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
