import AdminCrud from './AdminCrud';
import { Badge } from '../../components/ui';
import { deadlineLabel, deadlineTone } from '../../lib/format';

const fields = [
  { key: 'org', label: 'Organization', required: true },
  { key: 'role', label: 'Role / Post name', required: true, col: 'sm:col-span-2' },
  { key: 'exam', label: 'Exam', required: true },
  { key: 'posts', label: 'Number of posts', type: 'number' as const },
  { key: 'lastDate', label: 'Last date', type: 'date' as const, required: true },
  { key: 'qualification', label: 'Qualification', col: 'sm:col-span-2' },
  { key: 'location', label: 'Location' },
  { key: 'salary', label: 'Salary', col: 'sm:col-span-2' },
  { key: 'department', label: 'Department' },
  { key: 'state', label: 'State' },
  { key: 'jobType', label: 'Job type', type: 'select' as const, options: [{ value: 'Permanent', label: 'Permanent' }, { value: 'Contract', label: 'Contract' }, { value: 'Deputation', label: 'Deputation' }] },
  { key: 'status', label: 'Status', type: 'select' as const, options: [{ value: 'Active', label: 'Active' }, { value: 'Closing soon', label: 'Closing soon' }, { value: 'New', label: 'New' }, { value: 'Expired', label: 'Expired' }] },
  { key: 'ageLimit', label: 'Age limit' },
  { key: 'applicationFee', label: 'Application fee' },
  { key: 'noticeUrl', label: 'Notification URL', col: 'sm:col-span-2' },
  { key: 'description', label: 'Description', type: 'textarea' as const, col: 'sm:col-span-2' },
  { key: 'featured', label: 'Featured', type: 'checkbox' as const },
  { key: 'trend', label: 'Trending', type: 'checkbox' as const },
];

const columns = [
  { key: 'role', label: 'Post', render: (r: any) => <div><p className="font-semibold text-ink-800">{r.role}</p><p className="text-xs text-ink-400">{r.org}</p></div> },
  { key: 'posts', label: 'Posts', render: (r: any) => <span className="font-bold">{r.posts}</span> },
  { key: 'status', label: 'Status', render: (r: any) => <Badge tone={r.status === 'Active' ? 'green' : r.status === 'Expired' ? 'slate' : 'amber'}>{r.status}</Badge> },
  { key: 'lastDate', label: 'Deadline', render: (r: any) => <Badge tone={deadlineTone(r.last_date)}>{deadlineLabel(r.last_date)}</Badge> },
  { key: 'featured', label: 'Flags', render: (r: any) => <div className="flex gap-1">{r.featured ? <Badge tone="violet">★</Badge> : null}{r.trend ? <Badge tone="blue">🔥</Badge> : null}</div> },
];

export default function AdminJobs() {
  return (
    <AdminCrud
      title="Jobs Management"
      description="Create, edit and manage job notifications."
      endpoint="/jobs"
      fields={fields as any}
      columns={columns}
      transform={(r) => ({
        ...r,
        lastDate: (r.last_date || '').slice(0, 10),
        jobType: r.job_type, applicationFee: r.application_fee, ageLimit: r.age_limit,
        noticeUrl: r.notice_url, isPremium: undefined,
      })}
      emptyIcon="💼"
      emptyText="No jobs yet. Add the first notification."
    />
  );
}
