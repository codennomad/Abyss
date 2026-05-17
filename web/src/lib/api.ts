const BASE = '/api'

export type ProtocolCategory = 'mind' | 'body' | 'discipline' | 'social' | 'creative'
export type LogStatus = 'done' | 'failed' | 'skipped'

export interface User {
  id: string
  username: string
  email: string
  heat: number
  created_at: string
}

export interface Protocol {
  id: string
  name: string
  description: string | null
  category: ProtocolCategory
  frequency_days: number
  xp_reward: number
  is_active: boolean
  created_at: string
  is_due: boolean
  last_logged_at: string | null
}

export interface ProtocolLog {
  id: string
  protocol_id: string
  protocol_name: string
  status: LogStatus
  note: string | null
  xp_earned: number
  logged_at: string
}

export interface Metrics {
  total_xp: number
  heat: number
  streak_days: number
  completion_rate: number
  logs_by_category: Record<ProtocolCategory, number>
}

export interface ActivityDay {
  date: string
  count: number
}

function getToken(): string | null {
  return localStorage.getItem('abyss_token')
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...init, headers })

  if (res.status === 401) {
    localStorage.removeItem('abyss_token')
    window.location.href = '/login'
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'Request failed')
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  auth: {
    register: (body: { username: string; email: string; password: string }) =>
      request<User>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: { username: string; password: string }) =>
      request<{ access_token: string; token_type: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },
  metrics: {
    me: () => request<User>('/metrics/me'),
    get: () => request<Metrics>('/metrics'),
    activity: () => request<ActivityDay[]>('/metrics/activity'),
  },
  protocols: {
    list: () => request<Protocol[]>('/protocols'),
    create: (body: { name: string; description: string | null; category: ProtocolCategory; frequency_days: number; xp_reward: number }) =>
      request<Protocol>('/protocols', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Pick<Protocol, 'name' | 'description' | 'category' | 'frequency_days' | 'xp_reward' | 'is_active'>>) =>
      request<Protocol>(`/protocols/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) => request<void>(`/protocols/${id}`, { method: 'DELETE' }),
    createLog: (body: { protocol_id: string; status: LogStatus; note?: string }) =>
      request<ProtocolLog>('/protocols/logs', { method: 'POST', body: JSON.stringify(body) }),
    logs: (limit = 100) => request<ProtocolLog[]>(`/protocols/logs?limit=${limit}`),
  },
  users: {
    updateAccount: (body: { email?: string; current_password: string; new_password?: string }) =>
      request<User>('/users/me', { method: 'PATCH', body: JSON.stringify(body) }),
  },
}
