import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Project, ProjectTask } from '../lib/supabase'
import { Plus, X, ChevronDown, ChevronRight, Loader2, CheckCircle2, Circle, Clock } from 'lucide-react'

type ProjectWithTasks = Project & { project_tasks: ProjectTask[] }

const CAT_LABELS: Record<Project['category'], string> = {
  tv_film: 'TV / film', business: 'Business', real_estate: 'Real estate', content: 'Content', other: 'Other'
}
const CAT_BADGE: Record<Project['category'], string> = {
  tv_film: 'badge badge-pink', business: 'badge badge-green',
  real_estate: 'badge badge-blue', content: 'badge badge-amber', other: 'badge badge-gray'
}

const emptyProject = { name: '', description: '', category: 'business' as Project['category'], progress: 0 }
const emptyTask = { title: '', status: 'todo' as ProjectTask['status'], assigned_to: '', due_date: '' }

export default function Projects() {
  const [projects, setProjects] = useState<ProjectWithTasks[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showAdd, setShowAdd] = useState(false)
  const [taskForms, setTaskForms] = useState<Record<string, boolean>>({})
  const [form, setForm] = useState(emptyProject)
  const [taskForm, setTaskForm] = useState<Record<string, typeof emptyTask>>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('*, project_tasks(*)')
      .order('updated_at', { ascending: false })
    setProjects((data as ProjectWithTasks[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchProjects()
    const sub = supabase.channel('projects-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, fetchProjects)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_tasks' }, fetchProjects)
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [])

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const saveProject = async () => {
    if (!form.name) return
    setSaving(true)
    await supabase.from('projects').insert({ ...form, status: 'active', description: form.description || null })
    setSaving(false)
    setShowAdd(false)
    setForm(emptyProject)
  }

  const updateProgress = async (id: string, progress: number) => {
    await supabase.from('projects').update({ progress }).eq('id', id)
  }

  const updateStatus = async (id: string, status: Project['status']) => {
    await supabase.from('projects').update({ status }).eq('id', id)
  }

  const deleteProject = async (id: string) => {
    if (!confirm('Delete this project and all its tasks?')) return
    await supabase.from('projects').delete().eq('id', id)
  }

  const saveTask = async (projectId: string) => {
    const t = taskForm[projectId]
    if (!t?.title) return
    await supabase.from('project_tasks').insert({
      project_id: projectId,
      title: t.title,
      status: t.status,
      assigned_to: t.assigned_to || null,
      due_date: t.due_date || null,
    })
    setTaskForms(prev => ({ ...prev, [projectId]: false }))
    setTaskForm(prev => ({ ...prev, [projectId]: emptyTask }))
  }

  const cycleTaskStatus = async (task: ProjectTask) => {
    const next: Record<ProjectTask['status'], ProjectTask['status']> = {
      todo: 'in_progress', in_progress: 'done', done: 'todo'
    }
    await supabase.from('project_tasks').update({ status: next[task.status] }).eq('id', task.id)
  }

  const deleteTask = async (id: string) => {
    await supabase.from('project_tasks').delete().eq('id', id)
  }

  const TaskIcon = ({ status }: { status: ProjectTask['status'] }) => {
    if (status === 'done') return <CheckCircle2 className="w-4 h-4 text-hh-green flex-shrink-0" />
    if (status === 'in_progress') return <Clock className="w-4 h-4 text-hh-amber flex-shrink-0" />
    return <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
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
          <h1 className="text-xl font-semibold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500">Track everything across the Howlett operation</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Add project
        </button>
      </div>

      {/* Add project form */}
      {showAdd && (
        <div className="card mb-5">
          <div className="card-header">
            <span className="card-title">New project</span>
            <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="card-body space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Project name *</label>
              <input className="input" placeholder="e.g. Put Down Roots — TV pitch" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                <select className="select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as Project['category'] }))}>
                  <option value="tv_film">TV / film</option>
                  <option value="business">Business</option>
                  <option value="real_estate">Real estate</option>
                  <option value="content">Content</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Starting progress (%)</label>
                <input type="number" min="0" max="100" className="input" value={form.progress} onChange={e => setForm(f => ({ ...f, progress: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Description / what's this about</label>
              <textarea className="textarea" rows={2} placeholder="Brief summary..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="btn">Cancel</button>
              <button onClick={saveProject} disabled={saving} className="btn btn-primary disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Create project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Projects list */}
      <div className="space-y-3">
        {projects.map(project => {
          const tasks = project.project_tasks ?? []
          const done = tasks.filter(t => t.status === 'done').length
          const isExpanded = expanded.has(project.id)
          return (
            <div key={project.id} className="card">
              {/* Project header */}
              <div
                className="px-5 py-4 flex items-start gap-3 cursor-pointer hover:bg-gray-50 transition-colors rounded-2xl"
                onClick={() => toggleExpand(project.id)}
              >
                <div className="mt-0.5">
                  {isExpanded
                    ? <ChevronDown className="w-4 h-4 text-gray-400" />
                    : <ChevronRight className="w-4 h-4 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="font-medium text-gray-900 text-sm">{project.name}</span>
                    <span className={CAT_BADGE[project.category]}>{CAT_LABELS[project.category]}</span>
                    {project.status !== 'active' && (
                      <span className="badge badge-gray">{project.status}</span>
                    )}
                  </div>
                  {project.description && (
                    <p className="text-xs text-gray-500 mb-2">{project.description}</p>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-hh-green rounded-full" style={{ width: `${project.progress}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{project.progress}% · {done}/{tasks.length} tasks</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <select
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-white"
                    value={project.status}
                    onChange={e => updateStatus(project.id, e.target.value as Project['status'])}
                  >
                    <option value="active">Active</option>
                    <option value="on_hold">On hold</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                  <button onClick={() => deleteProject(project.id)} className="text-gray-300 hover:text-red-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expanded tasks */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-5 py-3">
                  {/* Progress slider */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs text-gray-400 w-16">Progress</span>
                    <input
                      type="range" min="0" max="100" step="5"
                      value={project.progress}
                      onChange={e => updateProgress(project.id, parseInt(e.target.value))}
                      className="flex-1 accent-hh-green"
                    />
                    <span className="text-xs font-medium text-gray-700 w-8 text-right">{project.progress}%</span>
                  </div>

                  {/* Task list */}
                  <div className="space-y-1 mb-3">
                    {tasks.map(task => (
                      <div key={task.id} className="flex items-center gap-2.5 group py-1">
                        <button onClick={() => cycleTaskStatus(task)} className="flex-shrink-0">
                          <TaskIcon status={task.status} />
                        </button>
                        <span className={`text-sm flex-1 ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {task.title}
                        </span>
                        {task.assigned_to && (
                          <span className="text-xs text-gray-400">{task.assigned_to}</span>
                        )}
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {tasks.length === 0 && (
                      <p className="text-xs text-gray-400 py-1">No tasks yet — add the first one below</p>
                    )}
                  </div>

                  {/* Add task */}
                  {taskForms[project.id] ? (
                    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                      <input
                        className="input text-sm"
                        placeholder="Task title *"
                        value={taskForm[project.id]?.title ?? ''}
                        onChange={e => setTaskForm(prev => ({ ...prev, [project.id]: { ...prev[project.id] ?? emptyTask, title: e.target.value } }))}
                        autoFocus
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          className="select text-sm"
                          value={taskForm[project.id]?.status ?? 'todo'}
                          onChange={e => setTaskForm(prev => ({ ...prev, [project.id]: { ...prev[project.id] ?? emptyTask, status: e.target.value as ProjectTask['status'] } }))}
                        >
                          <option value="todo">To do</option>
                          <option value="in_progress">In progress</option>
                          <option value="done">Done</option>
                        </select>
                        <input
                          className="input text-sm"
                          placeholder="Assigned to"
                          value={taskForm[project.id]?.assigned_to ?? ''}
                          onChange={e => setTaskForm(prev => ({ ...prev, [project.id]: { ...prev[project.id] ?? emptyTask, assigned_to: e.target.value } }))}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveTask(project.id)} className="btn btn-sm btn-primary">
                          <Plus className="w-3 h-3" /> Add task
                        </button>
                        <button onClick={() => setTaskForms(prev => ({ ...prev, [project.id]: false }))} className="btn btn-sm">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setTaskForms(prev => ({ ...prev, [project.id]: true }))}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-hh-green transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add task
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {projects.length === 0 && (
          <div className="card p-12 text-center">
            <FolderKanban />
            <p className="text-sm text-gray-500 mt-3">No projects yet. Create the first one!</p>
          </div>
        )}
      </div>
    </div>
  )
}

function FolderKanban() {
  return (
    <svg className="w-10 h-10 text-gray-200 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h3.586a1 1 0 01.707.293L10.414 6.41A1 1 0 0011.121 6.7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  )
}
