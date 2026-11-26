import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { useEventSettings } from '../../hooks/useEventSettings'
import type { RegistrationRow } from '../../types'
import { computeAge, formatDateLong } from '../../utils/format'

export default function Dashboard() {
  const { settings } = useEventSettings()
  const [rows, setRows] = useState<RegistrationRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('registrations').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setRows((data ?? []) as RegistrationRow[])
      setLoading(false)
    })
  }, [])

  if (loading || !settings) return <p>Carregando indicadores...</p>

  const confirmed = rows.filter((r) => r.status === 'confirmed')
  const waitlisted = rows.filter((r) => r.status === 'waitlisted')
  const cancelled = rows.filter((r) => r.status === 'cancelled')
  const checkedIn = confirmed.filter((r) => r.checked_in)
  const minors = confirmed.filter((r) => computeAge(r.birth_date, settings.event_date) < 18)
  const pending = minors.filter((r) => r.guardian_authorization_status === 'pendente')
  const max = settings.max_vagas
  const pct = max ? Math.min(100, Math.round((confirmed.length / Math.max(max, 1)) * 100)) : null

  return (
    <div>
      <h2>Painel</h2>
      <p className="admin-help">
        {settings.event_name} · {formatDateLong(settings.event_date)} · inscrições{' '}
        <strong>{settings.registrations_open ? 'abertas' : 'fechadas'}</strong>{' '}
        (<Link to="/admin/configuracoes">mudar</Link>)
      </p>

      <div className="grid-4">
        <div className="card"><div className="big-number">{confirmed.length}</div><div className="small-label">Confirmadas</div></div>
        <div className="card"><div className="big-number alt">{waitlisted.length}</div><div className="small-label">Lista de espera</div></div>
        <div className="card"><div className="big-number alt">{checkedIn.length}</div><div className="small-label">Check-ins feitos</div></div>
        <div className="card"><div className="big-number">{minors.length}</div><div className="small-label">Menores de idade</div></div>
        <div className="card"><div className="big-number">{pending.length}</div><div className="small-label">Autorizações pendentes</div></div>
        <div className="card"><div className="big-number alt">{cancelled.length}</div><div className="small-label">Canceladas</div></div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3>Vagas do dia</h3>
        {max === null ? (
          <p className="admin-help" style={{ margin: 0 }}>
            Sem limite definido. Enquanto o campo "Limite de vagas" estiver vazio em Configurações,
            todas as inscrições entram como confirmadas e não há lista de espera.
          </p>
        ) : (
          <>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{confirmed.length} / {max} confirmadas</div>
            <div className="progress-bar" style={{ margin: '10px 0' }}><div style={{ width: `${pct}%` }} /></div>
            <div className="small-label">{Math.max(max - confirmed.length, 0)} vagas restantes · ocupação {pct}%</div>
          </>
        )}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3>Últimas inscrições</h3>
        {rows.slice(0, 8).map((r) => (
          <div key={r.id} style={{ fontSize: 14, padding: '7px 0', borderBottom: '1px solid var(--line)' }}>
            {r.full_name} <span className="muted">· {r.code}</span>{' '}
            <span className={`status-tag ${r.status}`}>
              {r.status === 'confirmed' ? 'Confirmada' : r.status === 'waitlisted' ? 'Espera' : 'Cancelada'}
            </span>
          </div>
        ))}
        {rows.length === 0 && <p className="small-label">Nenhuma inscrição ainda.</p>}
      </div>
    </div>
  )
}
