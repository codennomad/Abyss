import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import './Auth.css'

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.auth.register(form)
      await login(form.username, form.password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Initialization failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page scanlines">
      <div className="bg-grid" />
      <div className="noise-overlay" />

      <div className="auth-card glass">
        <div className="auth-header">
          <h1 className="auth-logo glitch" data-text="ABYSS">ABYSS</h1>
          <p className="auth-sub">Create Neural Profile</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field">
            <label className="field__label">Username</label>
            <input
              className="input"
              type="text"
              value={form.username}
              onChange={set('username')}
              pattern="[a-zA-Z0-9_]+"
              minLength={3}
              maxLength={32}
              placeholder="operative_name"
              required
            />
          </div>

          <div className="field">
            <label className="field__label">Email</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="you@abyss.io"
              required
            />
          </div>

          <div className="field">
            <label className="field__label">Password</label>
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={set('password')}
              minLength={8}
              placeholder="min 8 characters"
              required
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button className="btn btn-solid btn-lg" type="submit" disabled={loading}>
            {loading ? 'INITIALIZING...' : 'FORGE IDENTITY'}
          </button>
        </form>

        <p className="auth-alt">
          Already inside? <Link to="/login">CONNECT</Link>
        </p>
      </div>
    </div>
  )
}
