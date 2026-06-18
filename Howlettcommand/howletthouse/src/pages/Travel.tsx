import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Trip, CrewMember } from '../lib/supabase'
import { format, parseISO } from 'date-fns'
import { MapPin, Plus, X, Loader2 } from 'lucide-react'

function TripBadge({ status }: { status: Trip['status'] }) {
  const map: Record<Trip['status'], string> = {
    in_progress: 'badge badge-green',
    confirmed:   'badge badge-amber',
    planned:     'badge badge-blue',
    completed:   'badge badge-gray',
    cancelled:   'badge badge-gray',
  }
  const labels: Record<Trip['status'], string> = {
    in_progress: 'In progress',
    confirmed:   'Confirmed',
    planned:     'Planned',
    completed:   'Completed',
    cancelled:   'Cancelled',
  }
  return <span className={map[status]}>{labels[status]}</span>
}

const emptyForm = {
  crew_member_id: '',
  destination: '',
  country: '',
  purpose: '',
  status: 'planned' as Trip['status'],
  depart_date: '',
  return_date: '',
  hotel: '',
  notes: '',
}

export default function Jordan() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [crew, setCrew] = useState<CrewMember[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchTrips = async () => {
    const { data } = await supabase
      .from('trips')
      .select('*, crew_members(name, avatar_initials, avatar_color)')
      .order('depart_date')
    setTrips(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchTrips()
    supabase.from('crew_members').select('*').order('name').then(({ data }) => setCrew(data ?? []))

    const sub = supabase.channel('trips-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, fetchTrips)
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [])

  const handleSave = async () => {
    if (!form.destination || !form.depart_date || !form.purpose) return
    setSaving(true)
    await supabase.from('trips').insert({
      crew_member_id: form.crew_member_id || null,
      destination: form.destination,
      country: form.country || null,
      purpose: form.purpose,
      status: form.status,
      depart_date: form.depart_date,
      return_date: form.return_date || null,
      hotel: form.hotel || null,
      notes: form.notes || null,
    })
    setSaving(false)
    setShowForm(false)
    setForm(emptyForm)
  }

  const updateStatus = async (id: string, status: Trip['status']) => {
    await supabase.from('trips').update({ status }).eq('id', id)
  }

  const deleteTrip = async (id: string) => {
    if (!confirm('Delete this trip?')) return
    await supabase.from('trips').delete().eq('id', id)
  }

  const current = trips.filter(t => t.status === 'in_progress')
  const upcoming = trips.filter(t => t.status === 'confirmed' || t.status === 'planned')
  const past = trips.filter(t => t.status === 'completed' || t.status === 'cancelled')

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-6 h-6 border-2 border-hh-green border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Travel</h1>
          <p className="text-sm text-gray-500">Where the crew is — anywhere in the world</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Log trip
        </button>
      </div>

      {/* Add trip form */}
      {showForm && (
        <div className="card mb-5">
          <div className="card-header">
            <span className="card-title">New trip</span>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="card-body space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Who</label>
                <select className="select" value={form.crew_member_id} onChange={e => setForm(f => ({ ...f, crew_member_id: e.target.value }))}>
                  <option value="">— Select crew member —</option>
                  {crew.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <select className="select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Trip['status'] }))}>
                  <option value="planned">Planned</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in_progress">In progress (right now)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Destination *</label>
                <input className="input" placeholder="New York, NY" value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Country (if international)</label>
                <input className="input" placeholder="Japan" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Purpose / what they're doing *</label>
              <input className="input" placeholder="Brand collab, filming, event, meeting..." value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Departure date *</label>
                <input type="date" className="input" value={form.depart_date} onChange={e => setForm(f => ({ ...f, depart_date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Return date</label>
                <input type="date" className="input" value={form.return_date} onChange={e => setForm(f => ({ ...f, return_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Hotel / where they're staying</label>
              <input className="input" placeholder="The Arlo Midtown" value={form.hotel} onChange={e => setForm(f => ({ ...f, hotel: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
              <textarea className="textarea" rows={2} placeholder="Any details the crew should know..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowForm(false)} className="btn">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save trip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Currently traveling */}
      {current.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 bg-hh-green rounded-full animate-pulse inline-block" />
            Right now
          </h2>
          <div className="space-y-2">
            {current.map(trip => <TripRow key={trip.id} trip={trip} onStatusChange={updateStatus} onDelete={deleteTrip} />)}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Upcoming</h2>
          <div className="space-y-2">
            {upcoming.map(trip => <TripRow key={trip.id} trip={trip} onStatusChange={updateStatus} onDelete={deleteTrip} />)}
          </div>
        </div>
      )}

      {current.length === 0 && upcoming.length === 0 && (
        <div className="card p-10 text-center">
          <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No trips logged yet. Add the first one!</p>
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 mt-6">Past trips</h2>
          <div className="space-y-2 opacity-60">
            {past.map(trip => <TripRow key={trip.id} trip={trip} onStatusChange={updateStatus} onDelete={deleteTrip} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function TripRow({ trip, onStatusChange, onDelete }: {
  trip: Trip
  onStatusChange: (id: string, s: Trip['status']) => void
  onDelete: (id: string) => void
}) {
  const member = trip.crew_members as any
  return (
    <div className="card px-5 py-3 flex items-start gap-3">
      {member && (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0 mt-0.5"
          style={{ backgroundColor: member.avatar_color ?? '#1D9E75' }}
        >
          {member.avatar_initials}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900 text-sm">{trip.destination}{trip.country ? `, ${trip.country}` : ''}</span>
          <TripBadge status={trip.status} />
        </div>
        <div className="text-xs text-gray-500 mt-0.5">{trip.purpose}</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {format(parseISO(trip.depart_date), 'MMM d')}
          {trip.return_date ? ` → ${format(parseISO(trip.return_date), 'MMM d')}` : ''}
          {trip.hotel ? ` · 🏨 ${trip.hotel}` : ''}
        </div>
        {trip.notes && <div className="text-xs text-gray-400 mt-1 italic">{trip.notes}</div>}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <select
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-white"
          value={trip.status}
          onChange={e => onStatusChange(trip.id, e.target.value as Trip['status'])}
        >
          <option value="planned">Planned</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button onClick={() => onDelete(trip.id)} className="text-gray-300 hover:text-red-400 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
