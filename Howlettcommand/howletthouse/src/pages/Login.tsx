import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Mail, Loader2 } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-hh-green text-white text-xl font-semibold mb-4">
            HH
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Howlett House</h1>
          <p className="text-sm text-gray-500 mt-1">The motherboard</p>
        </div>

        {sent ? (
          <div className="card p-8 text-center">
            <div className="w-12 h-12 bg-hh-green-lt rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-5 h-5 text-hh-green" />
            </div>
            <h2 className="font-semibold text-gray-900 mb-2">Check your email</h2>
            <p className="text-sm text-gray-500 mb-1">
              We sent a magic link to
            </p>
            <p className="text-sm font-medium text-gray-900 mb-4">{email}</p>
            <p className="text-xs text-gray-400">
              Click the link in the email to sign in. No password needed.
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="mt-6 text-sm text-hh-green hover:underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <div className="card p-8">
            <h2 className="font-semibold text-gray-900 mb-1">Sign in</h2>
            <p className="text-sm text-gray-500 mb-6">
              Enter your email and we'll send you a link — no password needed.
            </p>

            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input"
                  required
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="btn btn-primary w-full justify-center py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                {loading ? 'Sending...' : 'Send magic link'}
              </button>
            </form>

            <p className="text-xs text-gray-400 text-center mt-6">
              Only crew members with approved emails can access Howlett House.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
