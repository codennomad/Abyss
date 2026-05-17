import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './Auth.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neural link failed')
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
          <p className="auth-sub">Initiate Neural Link</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field">
            <label className="field__label">Username</label>
            <input
              className="input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="operative_name"
              required
            />
          </div>

          <div className="field">
            <label className="field__label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button className="btn btn-solid btn-lg" type="submit" disabled={loading}>
            {loading ? 'CONNECTING...' : 'ENTER THE ABYSS'}
          </button>
        </form>

        <p className="auth-alt">
          No identity? <Link to="/register">FORGE ONE</Link>
        </p>
      </div>
    </div>
  )
}
