import { useState, type FormEvent } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import './Settings.css'

export default function Settings() {
  const { user, setUser } = useAuth()

  // Email form
  const [emailForm, setEmailForm] = useState({ email: user?.email ?? '', current_password: '' })
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [emailSuccess, setEmailSuccess] = useState(false)

  // Password form
  const [passForm, setPassForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [passLoading, setPassLoading] = useState(false)
  const [passError, setPassError] = useState('')
  const [passSuccess, setPassSuccess] = useState(false)

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault()
    setEmailError('')
    setEmailSuccess(false)
    if (emailForm.email === user?.email) { setEmailError('Same as current email'); return }
    setEmailLoading(true)
    try {
      const updated = await api.users.updateAccount({
        email: emailForm.email,
        current_password: emailForm.current_password,
      })
      setUser(updated)
      setEmailSuccess(true)
      setEmailForm(f => ({ ...f, current_password: '' }))
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setEmailLoading(false)
    }
  }

  async function handlePassSubmit(e: FormEvent) {
    e.preventDefault()
    setPassError('')
    setPassSuccess(false)
    if (passForm.new_password !== passForm.confirm) {
      setPassError('Passwords do not match')
      return
    }
    if (passForm.new_password.length < 8) {
      setPassError('New password must be at least 8 characters')
      return
    }
    setPassLoading(true)
    try {
      await api.users.updateAccount({
        current_password: passForm.current_password,
        new_password: passForm.new_password,
      })
      setPassSuccess(true)
      setPassForm({ current_password: '', new_password: '', confirm: '' })
    } catch (err) {
      setPassError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setPassLoading(false)
    }
  }

  return (
    <div className="settings-page">
      <div>
        <div className="section-marker">SETTINGS</div>
        <p className="t-body" style={{ marginTop: 4, color: 'var(--text-3)' }}>
          Manage your operative identity.
        </p>
      </div>

      {/* ── Profile info (read-only) ──────────────────────────────────── */}
      <div className="glass card settings-profile">
        <div className="settings-profile__avatar mono">
          {user?.username?.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="t-h3">{user?.username}</div>
          <div className="t-sm" style={{ color: 'var(--text-4)', marginTop: 2 }}>{user?.email}</div>
          <div className="t-micro" style={{ marginTop: 6, color: 'var(--acid)' }}>
            HEAT {user?.heat.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* ── Change email ─────────────────────────────────────────────── */}
      <div className="glass card settings-section">
        <h3 className="settings-section__title">Change Email</h3>

        <form className="settings-form" onSubmit={handleEmailSubmit}>
          <div className="field">
            <label className="field__label">New Email</label>
            <input
              className="input"
              type="email"
              value={emailForm.email}
              onChange={e => setEmailForm(f => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div className="field">
            <label className="field__label">Current Password</label>
            <input
              className="input"
              type="password"
              value={emailForm.current_password}
              onChange={e => setEmailForm(f => ({ ...f, current_password: e.target.value }))}
              placeholder="Required to confirm"
              required
            />
          </div>

          {emailError && <p className="settings-error">{emailError}</p>}
          {emailSuccess && <p className="settings-success">Email updated successfully.</p>}

          <button className="btn btn-solid" type="submit" disabled={emailLoading}>
            {emailLoading ? 'UPDATING...' : 'UPDATE EMAIL'}
          </button>
        </form>
      </div>

      {/* ── Change password ───────────────────────────────────────────── */}
      <div className="glass card settings-section">
        <h3 className="settings-section__title">Change Password</h3>

        <form className="settings-form" onSubmit={handlePassSubmit}>
          <div className="field">
            <label className="field__label">Current Password</label>
            <input
              className="input"
              type="password"
              value={passForm.current_password}
              onChange={e => setPassForm(f => ({ ...f, current_password: e.target.value }))}
              required
            />
          </div>
          <div className="field">
            <label className="field__label">New Password</label>
            <input
              className="input"
              type="password"
              value={passForm.new_password}
              onChange={e => setPassForm(f => ({ ...f, new_password: e.target.value }))}
              minLength={8}
              placeholder="Min 8 characters"
              required
            />
          </div>
          <div className="field">
            <label className="field__label">Confirm New Password</label>
            <input
              className="input"
              type="password"
              value={passForm.confirm}
              onChange={e => setPassForm(f => ({ ...f, confirm: e.target.value }))}
              required
            />
          </div>

          {passError && <p className="settings-error">{passError}</p>}
          {passSuccess && <p className="settings-success">Password updated successfully.</p>}

          <button className="btn btn-solid" type="submit" disabled={passLoading}>
            {passLoading ? 'UPDATING...' : 'UPDATE PASSWORD'}
          </button>
        </form>
      </div>
    </div>
  )
}
