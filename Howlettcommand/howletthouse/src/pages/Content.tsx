import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, X, Loader2, Video } from 'lucide-react'
import { format, parseISO } from 'date-fns'

type ContentItem = {
  id: string
  title: string
  platform: 'tiktok' | 'youtube' | 'instagram' | 'other'
  status: 'ideas' | 'scripting' | 'filming' | 'editing' | 'ready' | 'posted'
  post_date: string | null
  assigned_to: string | null
  notes: string | null
  created_at: string
}

const PLATFORM_STYLES: Record<ContentItem['platform'], { bg: string; color: string; label: string }> = {
  tiktok:    { bg: '#1D9E75', color: 'white', label: 'TikTok' },
  youtube:   { bg: '#E6F1FB', color: '#185FA5', label: 'YouTube' },
  instagram: { bg: '#FBEAF0', color: '#723850', label: 'Instagram' },
  other:     { bg: '#F3F4F6', color: '#6B7280', label: 'Other' },
}


const STATUS_LABELS: Record<ContentItem['status'], string> = {
  ideas: 'Ideas', scripting: 'Scripting', filming: 'Filming',
  editing: 'Editing', ready: 'Ready to post', posted: 'Posted',
}

const emptyForm = { title: '', platform: 'tiktok' as ContentItem['platform'], status: 'ideas' as ContentItem['status'], post_date: '', assigned_to: '', notes: '' }

export default function Content() {
  const [items, setItems] = useState<ContentItem[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchItems = async () => {
    const { data } = await supabase.from('content_calendar').select('*').order('post_date', { nullsFirst: false }).order('created_at', { ascending: false })
    setItems((data as ContentItem[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchItems()
    const sub = supabase.channel('content-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'content_calendar' }, fetchItems)
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [])

  const saveItem = async () => {
    if (!form.title) return
    setSaving(true)
    await supabase.from('content_calendar').insert({
      title: form.title, platform: form.platform, status: form.status,
      post_date: form.post_date || null, assigned_to: form.assigned_to || null,
      notes: form.notes || null,
    })
    setSaving(false)
    setShowAdd(false)
    setForm(emptyForm)
  }

  const updateStatus = async (id: string, status: ContentItem['status']) => {
    await supabase.from('content_calendar').update({ status }).eq('id', id)
  }

  const deleteItem = async (id: string) => {
    await supabase.from('content_calendar').delete().eq('id', id)
  }

  const grouped = {
    active: items.filter(i => ['ideas', 'scripting', 'filming', 'editing', 'ready'].includes(i.status)),
    posted: items.filter(i => i.status === 'posted'),
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-6 h-6 border-2 border-hh-green border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Content calendar</h1>
          <p className="text-sm text-gray-500">What's in the pipeline across all platforms</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Add content
        </button>
      </div>

      {showAdd && (
        <div className="card mb-5">
          <div className="card-header">
            <span className="card-title">New content</span>
            <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="card-body space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Title / concept *</label>
              <input className="input" placeholder="What's this piece about..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Platform</label>
                <select className="select" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value as ContentItem['platform'] }))}>
                  <option value="tiktok">TikTok</option>
                  <option value="youtube">YouTube</option>
                  <option value="instagram">Instagram</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <select className="select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ContentItem['status'] }))}>
                  {(Object.keys(STATUS_LABELS) as ContentItem['status'][]).map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Post date</label>
                <input type="date" className="input" value={form.post_date} onChange={e => setForm(f => ({ ...f, post_date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Assigned to</label>
                <input className="input" placeholder="Jordan, Dev, Marcus..." value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
              <textarea className="textarea" rows={2} placeholder="Ideas, references, links..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="btn">Cancel</button>
              <button onClick={saveItem} disabled={saving} className="btn btn-primary disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Add to calendar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {grouped.active.length > 0 ? (
        <div className="card">
          <div className="divide-y divide-gray-50">
            {grouped.active.map(item => {
              const plat = PLATFORM_STYLES[item.platform]
              return (
                <div key={item.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-semibold"
                    style={{ backgroundColor: plat.bg, color: plat.color }}>
                    {plat.label.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{item.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {plat.label}
                      {item.post_date ? ` · ${format(parseISO(item.post_date), 'MMM d')}` : ''}
                      {item.assigned_to ? ` · ${item.assigned_to}` : ''}
                    </div>
                    {item.notes && <div className="text-xs text-gray-400 italic mt-0.5 truncate">{item.notes}</div>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-white"
                      value={item.status}
                      onChange={e => updateStatus(item.id, e.target.value as ContentItem['status'])}
                    >
                      {(Object.keys(STATUS_LABELS) as ContentItem['status'][]).map(s => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                    <button onClick={() => deleteItem(item.id)} className="text-gray-300 hover:text-red-400">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Video className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Nothing in the pipeline yet. Add the first piece!</p>
        </div>
      )}

      {grouped.posted.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Posted</h2>
          <div className="card opacity-60">
            <div className="divide-y divide-gray-50">
              {grouped.posted.map(item => {
                const plat = PLATFORM_STYLES[item.platform]
                return (
                  <div key={item.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-semibold"
                      style={{ backgroundColor: plat.bg, color: plat.color }}>
                      {plat.label.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 text-sm text-gray-500 line-through">{item.title}</div>
                    <button onClick={() => deleteItem(item.id)} className="text-gray-300 hover:text-red-400">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
