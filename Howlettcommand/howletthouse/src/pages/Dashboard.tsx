import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Trip, Project, CheckIn, CrewMember } from '../lib/supabase'
import { format, parseISO, formatDistanceToNow } from 'date-fns'

function StatusDot({ status }: { status: 'available' | 'traveling' | 'offline' }) {
  const colors = {
    available: 'bg-hh-green',
    traveling: 'bg-hh-amber',
    offline: 'bg-gray-300',
  }
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${colors[status]}`} />
}

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

function CategoryBadge({ cat }: { cat: Project['category'] }) {
  const map: Record<Project['category'], string> = {
    tv_film:     'badge badge-pink',
    business:    'badge badge-green',
    real_estate: 'badge badge-blue',
    content:     'badge badge-amber',
    other:       'badge badge-gray',
  }
  const labels: Record<Project['category'], string> = {
    tv_film:     'TV / film',
    business:    'Business',
    real_estate: 'Real estate',
    content:     'Content',
    other:       'Other',
  }
  return <span className={map[cat]}>{labels[cat]}</span>
}

export default function Dashboard() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [crew, setCrew] = useState<CrewMember[]>([])
  const [checkins, setCheckins] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      const [tripsRes, projectsRes, crewRes, checkinsRes] = await Promise.all([
        supabase.from('trips').select('*, crew_members(name, avatar_initials, avatar_color)').order('depart_date'),
        supabase.from('projects').select('*, project_tasks(*)').eq('status', 'active').order('updated_at', { ascending: false }),
        supabase.from('crew_members').select('*').order('name'),
        supabase.from('checkins').select('*, crew_members(name, avatar_initials, avatar_color)').order('created_at', { ascending: false }).limit(5),
      ])
      setTrips(tripsRes.data ?? [])
      setProjects(projectsRes.data ?? [])
      setCrew(crewRes.data ?? [])
      setCheckins(checkinsRes.data ?? [])
      setLoading(false)
    }
    fetchAll()

    // Real-time subscriptions
    const sub = supabase.channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checkins' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crew_members' }, fetchAll)
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [])

  const currentTrips = trips.filter(t => t.status === 'in_progress')
  const upcomingTrips = trips.filter(t => t.status === 'confirmed' || t.status === 'planned')
  const traveling = crew.filter(c => c.status === 'traveling')
  const available = crew.filter(c => c.status === 'available')

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-6 h-6 border-2 border-hh-green border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="card p-4">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Currently traveling</div>
          <div className="text-2xl font-semibold text-gray-900">{traveling.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {traveling.length > 0 ? traveling.map(t => t.name).join(', ') : 'Everyone home'}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Upcoming trips</div>
          <div className="text-2xl font-semibold text-gray-900">{upcomingTrips.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {upcomingTrips[0]
              ? `Next: ${upcomingTrips[0].destination} · ${format(parseISO(upcomingTrips[0].depart_date), 'MMM d')}`
              : 'None scheduled'}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Active projects</div>
          <div className="text-2xl font-semibold text-gray-900">{projects.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Across all initiatives</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Crew available</div>
          <div className="text-2xl font-semibold text-gray-900">{available.length} / {crew.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">{traveling.length} on the road</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left col */}
        <div className="lg:col-span-2 space-y-5">

          {/* Current locations */}
          {currentTrips.length > 0 && (
            <div className="card">
              <div className="card-header">
                <span className="card-title flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-hh-green animate-pulse inline-block" />
                  Live — out there right now
                </span>
              </div>
              <div className="card-body space-y-3">
                {currentTrips.map(trip => (
                  <div key={trip.id} className="flex items-start gap-3 p-3 bg-hh-green-lt rounded-xl">
                    <MapPin className="w-4 h-4 text-hh-green mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm">
                        {(trip.crew_members as any)?.name ?? 'Crew'} is in {trip.destination}
                        {trip.country ? `, ${trip.country}` : ''}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{trip.purpose}</div>
                      {trip.hotel && <div className="text-xs text-gray-400 mt-0.5">🏨 {trip.hotel}</div>}
                      {trip.notes && <div className="text-xs text-gray-500 mt-1 italic">{trip.notes}</div>}
                    </div>
                    {trip.return_date && (
                      <div className="text-xs text-gray-400 flex-shrink-0">
                        Back {format(parseISO(trip.return_date), 'MMM d')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming travel */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Upcoming travel</span>
              <Link to="/jordan" className="btn btn-sm">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {upcomingTrips.slice(0, 4).map(trip => (
                <div key={trip.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="text-xs text-gray-400 w-14 flex-shrink-0">
                    {format(parseISO(trip.depart_date), 'MMM d')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{trip.destination}</div>
                    <div className="text-xs text-gray-400">{trip.purpose}</div>
                  </div>
                  <TripBadge status={trip.status} />
                </div>
              ))}
              {upcomingTrips.length === 0 && (
                <div className="px-5 py-6 text-sm text-gray-400 text-center">
                  No upcoming trips logged yet
                </div>
              )}
            </div>
          </div>

          {/* Projects */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Active projects</span>
              <Link to="/projects" className="btn btn-sm">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {projects.map(project => {
                const tasks = project.project_tasks ?? []
                const done = tasks.filter(t => t.status === 'done').length
                return (
                  <div key={project.id} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-gray-900">{project.name}</div>
                      <CategoryBadge cat={project.category} />
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                      <div
                        className="h-full bg-hh-green rounded-full transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-400">
                      {project.progress}% complete · {done}/{tasks.length} tasks done
                    </div>
                  </div>
                )
              })}
              {projects.length === 0 && (
                <div className="px-5 py-6 text-sm text-gray-400 text-center">No active projects</div>
              )}
            </div>
          </div>
        </div>

        {/* Right col */}
        <div className="space-y-5">
          {/* Check-ins */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Recent check-ins</span>
            </div>
            <div className="divide-y divide-gray-50">
              {checkins.map(ci => {
                const member = ci.crew_members as any
                const color = member?.avatar_color ?? '#1D9E75'
                const initials = member?.avatar_initials ?? ci.author_name.slice(0, 2).toUpperCase()
                return (
                  <div key={ci.id} className="px-5 py-3 flex gap-2.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-gray-900">{ci.author_name}</span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(ci.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-hh-green flex-shrink-0" />
                        <span className="text-xs text-gray-700">{ci.location}</span>
                      </div>
                      {ci.message && (
                        <p className="text-xs text-gray-500 mt-0.5">{ci.message}</p>
                      )}
                    </div>
                  </div>
                )
              })}
              {checkins.length === 0 && (
                <div className="px-5 py-6 text-sm text-gray-400 text-center">
                  No check-ins yet
                </div>
              )}
            </div>
          </div>

          {/* Crew quick status */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Crew</span>
              <Link to="/crew" className="btn btn-sm">
                Manage <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {crew.slice(0, 6).map(member => (
                <div key={member.id} className="px-5 py-2.5 flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                    style={{ backgroundColor: member.avatar_color }}
                  >
                    {member.avatar_initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{member.name}</div>
                    <div className="text-xs text-gray-400 truncate">
                      {member.current_location ?? member.role}
                    </div>
                  </div>
                  <StatusDot status={member.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
