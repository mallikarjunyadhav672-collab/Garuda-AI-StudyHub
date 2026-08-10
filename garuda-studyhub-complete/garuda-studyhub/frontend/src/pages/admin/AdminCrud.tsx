import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Pencil, Plus, Trash2, UploadCloud, X } from 'lucide-react';
import { api, handleError } from '../../lib/api';
import { Alert, Button, Card, EmptyState, ErrorState, Field, Input, Select, Spinner } from '../../components/ui';

export interface FieldConfig {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'number' | 'select' | 'date' | 'checkbox' | 'file';
  options?: { value: string | number; label: string }[];
  required?: boolean;
  placeholder?: string;
  col?: string;
  /** for type 'file' — upload kind passed to /api/upload (material | notice | thumbnail | avatar) */
  uploadKind?: string;
}

export interface AdminCrudProps {
  title: string;
  description?: string;
  endpoint: string;
  fields: FieldConfig[];
  columns: { key: string; label: string; render?: (row: any) => ReactNode }[];
  transform?: (row: any) => any;
  emptyIcon?: string;
  emptyText?: string;
  onSaved?: () => void;
}

export default function AdminCrud({
  title, description, endpoint, fields, columns, transform, emptyIcon = '📦', emptyText = 'No records yet.', onSaved,
}: AdminCrudProps) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(endpoint);
      setRows(Array.isArray(data.data) ? data.data : (data.data[Object.keys(data.data)[0]] || []));
    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    const init: Record<string, any> = {};
    fields.forEach((f) => (init[f.key] = f.type === 'checkbox' ? false : f.type === 'number' ? 0 : ''));
    setForm(init);
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (row: any) => {
    const init: Record<string, any> = {};
    fields.forEach((f) => {
      const source = transform ? transform(row) : row;
      init[f.key] = source[f.key] ?? source[f.key.replace(/([A-Z])/g, '_$1').toLowerCase()] ?? (f.type === 'checkbox' ? false : '');
    });
    setForm(init);
    setEditing(row);
    setModalOpen(true);
  };

  const uploadFile = async (f: FieldConfig, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await api.post(`/upload?type=${f.uploadKind || 'material'}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm((prev) => ({ ...prev, [f.key]: data.data.url }));
      setNotice(`Uploaded: ${data.data.originalName} ✓`);
      setTimeout(() => setNotice(''), 2500);
    } catch (err) {
      setError(handleError(err));
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');
    try {
      const url = editing ? `${endpoint}/${editing.id}` : endpoint;
      await (editing ? api.put(url, form) : api.post(url, form));
      setModalOpen(false);
      setNotice(editing ? 'Record updated ✓' : 'Record created ✓');
      load();
      onSaved?.();
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      setError(handleError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: any) => {
    if (!window.confirm('Delete this record? This cannot be undone.')) return;
    try {
      await api.delete(`${endpoint}/${row.id}`);
      setNotice('Deleted ✓');
      load();
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      setError(handleError(err));
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">{title}</h1>
          {description && <p className="text-sm text-ink-500 mt-0.5">{description}</p>}
        </div>
        <Button onClick={openNew}><Plus size={16} /> Add new</Button>
      </div>

      {notice && <div className="mb-4"><Alert tone="green">{notice}</Alert></div>}

      {loading ? <Spinner /> : error ? <ErrorState message={error} retry={load} /> : rows.length === 0 ? (
        <Card><EmptyState icon={emptyIcon} title={emptyText} action={<Button onClick={openNew}><Plus size={15} /> Add the first record</Button>} /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {columns.map((c) => <th key={c.key} className="table-head">{c.label}</th>)}
                  <th className="table-head text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-ink-50/50">
                    {columns.map((c) => (
                      <td key={c.key} className="table-cell">{c.render ? c.render(row) : String(row[c.key] ?? '—')}</td>
                    ))}
                    <td className="table-cell text-right whitespace-nowrap">
                      <div className="inline-flex gap-1.5">
                        <button onClick={() => openEdit(row)} className="p-2 rounded-lg text-ink-400 hover:text-brand-600 hover:bg-brand-50"><Pencil size={15} /></button>
                        <button onClick={() => remove(row)} className="p-2 rounded-lg text-ink-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
              <h3 className="font-extrabold text-ink-900">{editing ? `Edit ${title}` : `Add ${title}`}</h3>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg hover:bg-ink-100"><X size={18} /></button>
            </div>
            <form onSubmit={save} className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
              {error && <div className="mb-4"><Alert>{error}</Alert></div>}
              <div className="grid sm:grid-cols-2 gap-4">
                {fields.map((f) => (
                  <div key={f.key} className={f.col || ''}>
                    <Field label={f.label}>
                      {f.type === 'textarea' ? (
                        <textarea className="input min-h-24" required={f.required} placeholder={f.placeholder} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                      ) : f.type === 'select' ? (
                        <Select required={f.required} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                          <option value="">Select…</option>
                          {f.options?.map((o) => <option key={String(o.value)} value={o.value}>{o.label}</option>)}
                        </Select>
                      ) : f.type === 'number' ? (
                        <Input type="number" required={f.required} placeholder={f.placeholder} value={form[f.key] ?? 0} onChange={(e) => setForm({ ...form, [f.key]: Number(e.target.value) })} />
                      ) : f.type === 'file' ? (
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 rounded-xl border-2 border-dashed border-ink-300 hover:border-brand-400 bg-ink-50/50 px-4 py-2.5 cursor-pointer text-sm font-semibold text-ink-600 transition">
                            <UploadCloud size={16} /> Upload file
                            <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(f, e.target.files[0])} />
                          </label>
                          {form[f.key] && <p className="text-xs text-emerald-600 font-medium truncate">✓ {form[f.key]}</p>}
                        </div>
                      ) : f.type === 'checkbox' ? (
                        <label className="flex items-center gap-2 pt-2 cursor-pointer">
                          <input type="checkbox" checked={!!form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })} className="h-5 w-5 rounded accent-brand-600" />
                          <span className="text-sm text-ink-600">Yes / enabled</span>
                        </label>
                      ) : (
                        <Input required={f.required} placeholder={f.placeholder} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                      )}
                    </Field>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-6 justify-end">
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="submit" loading={saving}>{editing ? 'Save changes' : 'Create record'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
