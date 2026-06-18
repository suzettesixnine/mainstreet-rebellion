import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { CrewMember, CheckIn } from '../lib/supabase'
import { Plus, X, MapPin, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '../context/AuthContext'

const TYPE_LABELS: Record<CrewMember['type'], string> = {
  family: 'Family', production: 'Production', management: 'Management'
}

const AVATAR_COLORS = [
  '#1D9E75', '#378ADD', '#D4537E', '#EF9F27', '#9B59B6', '#E74C3C',
  '#16A085', '#2980B9', '#8E44AD', '#D35400', '#27AE60', '#2C3E50'
]



const emptyMember = { name: '', role: '', type: 'production' as CrewMember['type'], email: '', avatar_initials: '', avatar_color: AVATAR_COLORS[0] }
const emptyCheckin = { location: '', message: '' }

export default function Crew() {
  const { user } = useAuth()
  const [crew, setCrew] = useState<CrewMember[]>([])
  const [checkins, setCheckins] = useState<CheckIn[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [showCheckin, setShowCheckin] = useState(false)
  const [form, setForm] = useState(emptyMember)
  const [checkinForm, setCheckinForm] = useState(emptyCheckin)
  const [saving, setSaving] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchAll = async () => {
    const [crewRes, checkinsRes] = await Promise.all([
      supabase.from('crew_members').select('*').order('type').order('name'),
      supabase.from('checkins').select('*, crew_members(name, avatar_initials, avatar_color)').order('created_at', { ascending: false }).limit(20),
    ])
    setCrew(crewRes.data ?? [])
    setCheckins(checkinsRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
    const sub = supabase.channel('crew-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crew_members' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checkins' }, fetchAll)
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [])

  const saveMember = async () => {
    if (!form.name || !form.role) return
    setSaving(true)
    const initials = form.avatar_initials || form.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    await supabase.from('crew_members').insert({
      name: form.name, role: form.role, type: form.type,
      email: form.email || null, avatar_initials: initials,
      avatar_color: form.avatar_color, current_location: null, status: 'available',
    })
    setSaving(false)
    setShowAdd(false)
    setForm(emptyMember)
  }

  const updateMemberStatus = async (id: string, status: CrewMember['status']) => {
    await supabase.from('crew_members').update({ status }).eq('id', id)
  }

  const updateLocation = async (id: string, location: string) => {
    await supabase.from('crew_members').update({ current_location: location || null }).eq('id', id)
  }

  const deleteMember = async (id: string) => {
    if (!confirm('Remove this crew member?')) return
    await supabase.from('crew_members').delete().eq('id', id)
  }

  const submitCheckin = async () => {
    if (!checkinForm.location) return
    setCheckingIn(true)
    const displayName = user?.email?.split('@')[0] ?? 'Someone'
    await supabase.from('checkins').insert({
      author_name: displayName,
      location: checkinForm.location,
      message: checkinForm.message || null,
      crew_member_id: null,
    })
    setCheckingIn(false)
    setShowCheckin(false)
    setCheckinForm(emptyCheckin)
  }

  const grouped = {
    family: crew.filter(c => c.type === 'family'),
    production: crew.filter(c => c.type === 'production'),
    management: crew.filter(c => c.type === 'management'),
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-6 h-6 border-2 border-hh-green border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Crew</h1>
          <p className="text-sm text-gray-500">Family, production team, and management</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCheckin(true)} className="btn">
            <MapPin className="w-4 h-4" /> Check in
          </button>
          <button onClick={() => setShowAdd(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" /> Add member
          </button>
        </div>
      </div>

      {/* Check-in form */}
      {showCheckin && (
        <div className="card mb-5">
          <div className="card-header">
            <span className="card-title">Check in — let the crew know where you are</span>
            <button onClick={() => setShowCheckin(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="card-body space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Where are you? *</label>
              <input className="input" placeholder="Tokyo, Japan / Back home in SD / Hotel Arlo NYC..." value={checkinForm.location} onChange={e => setCheckinForm(f => ({ ...f, location: e.target.value }))} autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Message (optional)</label>
              <textarea className="textarea" rows={2} placeholder="Any updates for the crew..." value={checkinForm.message} onChange={e => setCheckinForm(f => ({ ...f, message: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCheckin(false)} className="btn">Cancel</button>
              <button onClick={submitCheckin} disabled={checkingIn || !checkinForm.location} className="btn btn-primary disabled:opacity-50">
                {checkingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                {checkingIn ? 'Checking in...' : 'Check in'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add member form */}
      {showAdd && (
        <div className="card mb-5">
          <div className="card-header">
            <span className="card-title">Add crew member</span>
            <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="card-body space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Name *</label>
                <input className="input" placeholder="Jordan" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Role *</label>
                <input className="input" placeholder="Director of Photography" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                <select className="select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as CrewMember['type'] }))}>
                  <option value="family">Family</option>
                  <option value="production">Production</option>
                  <option value="management">Management</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email (for magic link)</label>
                <input type="email" className="input" placeholder="crew@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Avatar color</label>
              <div className="flex gap-2 flex-wrap">
                {AVATAR_COLORS.map(color => (
                  <button key={color} onClick={() => setForm(f => ({ ...f, avatar_color: color }))}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${form.avatar_color === color ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color }} />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="btn">Cancel</button>
              <button onClick={saveMember} disabled={saving} className="btn btn-primary disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Add to crew'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Crew list */}
        <div className="lg:col-span-2 space-y-5">
          {(Object.entries(grouped) as [CrewMember['type'], CrewMember[]][]).map(([type, members]) => (
            members.length > 0 && (
              <div key={type} className="card">
                <div className="card-header">
                  <span className="card-title">{TYPE_LABELS[type]}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {members.map(member => (
                    <div key={member.id} className="px-5 py-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
                        style={{ backgroundColor: member.avatar_color }}>
                        {member.avatar_initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{member.name}</div>
                        <div className="text-xs text-gray-400">{member.role}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 w-28 text-gray-600"
                          placeholder="Location..."
                          defaultValue={member.current_location ?? ''}
                          onBlur={e => updateLocation(member.id, e.target.value)}
                        />
                        <select
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-white"
                          value={member.status}
                          onChange={e => updateMemberStatus(member.id, e.target.value as CrewMember['status'])}
                        >
                          <option value="available">Available</option>
                          <option value="traveling">Traveling</option>
                          <option value="offline">Offline</option>
                        </select>
                        <button onClick={() => deleteMember(member.id)} className="text-gray-300 hover:text-red-400">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>

        {/* Check-in feed */}
        <div className="card h-fit">
          <div className="card-header">
            <span className="card-title flex items-center gap-1.5">
              <span className="w-2 h-2 bg-hh-green rounded-full animate-pulse inline-block" />
              Check-in feed
            </span>
          </div>
          <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
            {checkins.map(ci => {
              const m = ci.crew_members as any
              return (
                <div key={ci.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                      style={{ backgroundColor: m?.avatar_color ?? '#1D9E75' }}>
                      {m?.avatar_initials ?? ci.author_name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-gray-900">{ci.author_name}</span>
                    <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
                      {formatDistanceToNow(new Date(ci.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 ml-8">
                    <MapPin className="w-3 h-3 text-hh-green flex-shrink-0" />
                    <span className="text-xs text-gray-700">{ci.location}</span>
                  </div>
                  {ci.message && <p className="text-xs text-gray-500 mt-1 ml-8">{ci.message}</p>}
                </div>
              )
            })}
            {checkins.length === 0 && (
              <div className="px-4 py-8 text-xs text-gray-400 text-center">
                Check-ins will appear here in real time
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
