import AdminCrud from './AdminCrud';
import { Badge } from '../../components/ui';
import { formatDate } from '../../lib/format';

const fields = [
  { key: 'title', label: 'Headline', required: true, col: 'sm:col-span-2' },
  { key: 'summary', label: 'Summary', type: 'textarea' as const, required: true, col: 'sm:col-span-2' },
  { key: 'content', label: 'Full content', type: 'textarea' as const, required: true, col: 'sm:col-span-2' },
  { key: 'categoryId', label: 'Category', type: 'select' as const, options: [{ value: 15, label: 'National' }, { value: 16, label: 'International' }, { value: 17, label: 'Economy' }, { value: 18, label: 'Sports' }, { value: 19, label: 'Science & Tech' }] },
  { key: 'date', label: 'Date', type: 'date' as const },
  { key: 'imageColor', label: 'Accent color (hex)' },
  { key: 'source', label: 'Source' },
  { key: 'sourceUrl', label: 'Source URL' },
  { key: 'tags', label: 'Tags (comma separated)', col: 'sm:col-span-2' },
  { key: 'isFeatured', label: 'Featured', type: 'checkbox' as const },
];

const columns = [
  { key: 'title', label: 'Headline', render: (r: any) => <div><p className="font-semibold text-ink-800 max-w-80 truncate">{r.title}</p><p className="text-xs text-ink-400 max-w-80 truncate">{r.summary}</p></div> },
  { key: 'date', label: 'Date', render: (r: any) => formatDate(r.date) },
  { key: 'category', label: 'Category', render: (r: any) => <Badge tone="slate">{r.category}</Badge> },
  { key: 'isFeatured', label: 'Featured', render: (r: any) => (r.is_featured ? <Badge tone="red">★ Featured</Badge> : <span className="text-ink-300">—</span>) },
];

export default function AdminAffairs() {
  return (
    <AdminCrud
      title="Current Affairs"
      description="Publish daily news updates for aspirants."
      endpoint="/affairs"
      fields={fields as any}
      columns={columns}
      transform={(r) => ({
        ...r,
        categoryId: r.category_id, imageColor: r.image_color, sourceUrl: r.source_url,
        isFeatured: !!r.is_featured, tags: (r.tags || []).join(', '), date: (r.date || '').slice(0, 10),
      })}
      emptyIcon="📰"
      emptyText="No news published yet."
    />
  );
}
