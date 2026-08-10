import AdminCrud from './AdminCrud';
import { Badge } from '../../components/ui';

const fields = [
  { key: 'title', label: 'Title', required: true, col: 'sm:col-span-2' },
  { key: 'description', label: 'Description', type: 'textarea' as const, required: true, col: 'sm:col-span-2' },
  { key: 'categoryId', label: 'Category', type: 'select' as const, options: [{ value: 8, label: 'Quantitative Aptitude' }, { value: 9, label: 'Reasoning' }, { value: 10, label: 'English' }, { value: 11, label: 'General Awareness' }] },
  { key: 'exam', label: 'Exam', required: true },
  { key: 'pages', label: 'Pages', type: 'number' as const },
  { key: 'fileUrl', label: 'File', type: 'file' as const, uploadKind: 'material', col: 'sm:col-span-2' },
  { key: 'fileSize', label: 'File size (bytes)', type: 'number' as const },
  { key: 'fileType', label: 'File type', type: 'select' as const, options: [{ value: 'pdf', label: 'PDF' }, { value: 'doc', label: 'DOC' }, { value: 'image', label: 'Image' }] },
  { key: 'tags', label: 'Tags (comma separated)' },
  { key: 'isPublished', label: 'Published', type: 'checkbox' as const },
];

const columns = [
  { key: 'title', label: 'Material', render: (r: any) => <div><p className="font-semibold text-ink-800 max-w-72 truncate">{r.title}</p><p className="text-xs text-ink-400">{r.exam}</p></div> },
  { key: 'downloads', label: 'Downloads', render: (r: any) => <span className="font-bold">{r.downloads.toLocaleString('en-IN')}</span> },
  { key: 'rating', label: 'Rating', render: (r: any) => <Badge tone="amber">★ {r.rating}</Badge> },
  { key: 'isPublished', label: 'Status', render: (r: any) => <Badge tone={r.is_published ? 'green' : 'slate'}>{r.is_published ? 'Published' : 'Draft'}</Badge> },
];

export default function AdminMaterials() {
  return (
    <AdminCrud
      title="Materials Management"
      description="Upload and manage study materials."
      endpoint="/materials"
      fields={fields as any}
      columns={columns}
      transform={(r) => ({
        ...r,
        categoryId: r.category_id, fileUrl: r.file_url, fileSize: r.file_size,
        fileType: r.file_type, isPublished: !!r.is_published, tags: (r.tags || []).join(', '),
      })}
      emptyIcon="📚"
      emptyText="No materials yet."
    />
  );
}
