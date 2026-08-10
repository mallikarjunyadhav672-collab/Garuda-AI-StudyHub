import AdminCrud from './AdminCrud';
import { Badge } from '../../components/ui';
import { formatDuration } from '../../lib/format';

const fields = [
  { key: 'title', label: 'Title', required: true, col: 'sm:col-span-2' },
  { key: 'description', label: 'Description', type: 'textarea' as const, col: 'sm:col-span-2' },
  { key: 'categoryId', label: 'Category', type: 'select' as const, options: [{ value: 20, label: 'Concept Lectures' }, { value: 21, label: 'Current Affairs' }, { value: 22, label: 'Mock Analysis' }] },
  { key: 'educator', label: 'Educator' },
  { key: 'exam', label: 'Exam' },
  { key: 'duration', label: 'Duration (seconds)', type: 'number' as const },
  { key: 'playlist', label: 'Playlist' },
  { key: 'videoUrl', label: 'Video URL', col: 'sm:col-span-2' },
  { key: 'thumbnailColor', label: 'Thumbnail color (hex)' },
  { key: 'tags', label: 'Tags (comma separated)' },
  { key: 'isPublished', label: 'Published', type: 'checkbox' as const },
];

const columns = [
  { key: 'title', label: 'Video', render: (r: any) => <div><p className="font-semibold text-ink-800 max-w-72 truncate">{r.title}</p><p className="text-xs text-ink-400">{r.educator}</p></div> },
  { key: 'duration', label: 'Duration', render: (r: any) => formatDuration(r.duration) },
  { key: 'views', label: 'Views', render: (r: any) => r.views.toLocaleString('en-IN') },
  { key: 'isPublished', label: 'Status', render: (r: any) => <Badge tone={r.is_published ? 'green' : 'slate'}>{r.is_published ? 'Live' : 'Draft'}</Badge> },
];

export default function AdminVideos() {
  return (
    <AdminCrud
      title="Video Management"
      description="Manage the video lecture library."
      endpoint="/videos"
      fields={fields as any}
      columns={columns}
      transform={(r) => ({
        ...r,
        categoryId: r.category_id, videoUrl: r.video_url, thumbnailColor: r.thumbnail_color,
        isPublished: !!r.is_published, tags: (r.tags || []).join(', '),
      })}
      emptyIcon="🎬"
      emptyText="No videos yet."
    />
  );
}
