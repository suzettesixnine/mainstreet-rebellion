import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Message } from '../lib/supabase'
import { Send, Pin, X, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'

export default function Messages() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchMessages = async () => {
    const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: false })
    setMessages(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchMessages()
    const sub = supabase.channel('messages-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchMessages)
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [])

  const sendMessage = async () => {
    if (!body.trim()) return
    setSending(true)
    const fromName = user?.email?.split('@')[0] ?? 'Crew'
    await supabase.from('messages').insert({ from_name: fromName, body: body.trim(), pinned: false })
    setBody('')
    setSending(false)
  }

  const togglePin = async (msg: Message) => {
    await supabase.from('messages').update({ pinned: !msg.pinned }).eq('id', msg.id)
  }

  const deleteMessage = async (id: string) => {
    await supabase.from('messages').delete().eq('id', id)
  }

  const pinned = messages.filter(m => m.pinned)
  const unpinned = messages.filter(m => !m.pinned)

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-6 h-6 border-2 border-hh-green border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-500">Quick updates from anywhere in the world — real time</p>
      </div>

      {/* Compose */}
      <div className="card mb-5">
        <div className="card-body">
          <textarea
            className="textarea mb-3"
            rows={3}
            placeholder="Post an update for the crew..."
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) sendMessage() }}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">⌘ + Enter to send</span>
            <button onClick={sendMessage} disabled={sending || !body.trim()} className="btn btn-primary disabled:opacity-50">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Sending...' : 'Post update'}
            </button>
          </div>
        </div>
      </div>

      {/* Pinned */}
      {pinned.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-1.5 mb-2">
            <Pin className="w-3.5 h-3.5 text-hh-amber" />
            <span className="text-xs font-semibold text-hh-amber uppercase tracking-wider">Pinned</span>
          </div>
          <div className="space-y-2">
            {pinned.map(msg => <MessageCard key={msg.id} msg={msg} onPin={togglePin} onDelete={deleteMessage} />)}
          </div>
        </div>
      )}

      {/* All messages */}
      <div className="space-y-2">
        {unpinned.map(msg => <MessageCard key={msg.id} msg={msg} onPin={togglePin} onDelete={deleteMessage} />)}
        {messages.length === 0 && (
          <div className="card p-10 text-center">
            <Send className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No messages yet. Post the first update!</p>
          </div>
        )}
      </div>
    </div>
  )
}

function MessageCard({ msg, onPin, onDelete }: { msg: Message; onPin: (m: Message) => void; onDelete: (id: string) => void }) {
  const initials = msg.from_name.slice(0, 2).toUpperCase()
  return (
    <div className={`card px-5 py-3 ${msg.pinned ? 'border-hh-amber border' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-hh-green text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900">{msg.from_name}</span>
            <span className="text-xs text-gray-400">{format(new Date(msg.created_at), 'MMM d · h:mm a')}</span>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.body}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onPin(msg)} className={`p-1 rounded hover:bg-gray-100 transition-colors ${msg.pinned ? 'text-hh-amber' : 'text-gray-300 hover:text-gray-500'}`}>
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(msg.id)} className="p-1 rounded hover:bg-gray-100 text-gray-300 hover:text-red-400 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
