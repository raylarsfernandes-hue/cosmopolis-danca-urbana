import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useEventSettings } from '../../hooks/useEventSettings'
import type { Battle, GuardianStatus, RegistrationRow, Workshop } from '../../types'
import { downloadCSV } from '../../utils/csv'
import { computeAge, guardianStatusLabel } from '../../utils/format'

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmada',
  waitlisted: 'Lista de espera',
  cancelled: 'Cancelada',
}

export default function Inscritos() {
  const { settings } = useEventSettings()
  const [rows, setRows] = useState<RegistrationRow[]>([])
  const [picks, setPicks] = useState<Record<string, string[]>>({})
  const [battlePicks, setBattlePicks] = useState<Record<string, string[]>>({})
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [battles, setBattles] = useState<Battle[]>([])
  const [filterActivity, setFilterActivity] = useState('')
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMinors, setFilterMinors] = useState(false)
  const [filterCheckin, setFilterCheckin] = useState('')

  async function load() {
    const [{ data: r }, { data: rw }, { data: w }, { data: rb }, { data: b }] = await Promise.all([
      supabase.from('registrations').select('*').order('created_at', { ascending: true }),
      supabase.from('registration_workshops').select('registration_id, workshop_id'),
      supabase.from('workshops').select('*').order('order_index'),
      supabase.from('registration_battles').select('registration_id, battle_id'),
      supabase.from('battles').select('*').order('order_index'),
    ])
    const bmap: Record<string, string[]> = {}
    ;((rb ?? []) as { registration_id: string; battle_id: string }[]).forEach((x) => {
      ;(bmap[x.registration_id] ||= []).push(x.battle_id)
    })
    setBattlePicks(bmap)
    setBattles((b ?? []) as Battle[])
    setRows((r ?? []) as RegistrationRow[])
    const map: Record<string, string[]> = {}
    ;((rw ?? []) as { registration_id: string; workshop_id: string }[]).forEach((x) => {
      ;(map[x.registration_id] ||= []).push(x.workshop_id)
    })
    setPicks(map)
    setWorkshops((w ?? []) as Workshop[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const eventDate = settings?.event_date ?? ''
  const ageOf = (r: RegistrationRow) => (eventDate ? computeAge(r.birth_date, eventDate) : null)
  const isMinor = (r: RegistrationRow) => {
    const a = ageOf(r)
    return a !== null && a < 18
  }
  const workshopLabel = (id: string) => {
    const w = workshops.find((x) => x.id === id)
    return w ? (w.modality ? `${w.modality} (${w.teacher_name})` : w.teacher_name) : '?'
  }
  const battleLabel = (id: string) => battles.find((x) => x.id === id)?.name ?? '?'

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const digits = term.replace(/\D/g, '')
    return rows.filter((r) => {
      if (filterStatus && r.status !== filterStatus) return false
      if (filterMinors && !isMinor(r)) return false
      if (filterCheckin === 'sim' && !r.checked_in) return false
      if (filterCheckin === 'nao' && (r.checked_in || r.status !== 'confirmed')) return false
      if (filterActivity.startsWith('w:') && !(picks[r.id] ?? []).includes(filterActivity.slice(2))) return false
      if (filterActivity.startsWith('b:') && !(battlePicks[r.id] ?? []).includes(filterActivity.slice(2))) return false
      if (term) {
        const text = `${r.full_name} ${r.artistic_name ?? ''} ${r.email} ${r.code}`.toLowerCase()
        const nums = `${r.cpf} ${r.phone.replace(/\D/g, '')}`
        if (!text.includes(term) && !(digits.length >= 3 && nums.includes(digits))) return false
      }
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, filterStatus, filterMinors, filterCheckin, filterActivity, picks, battlePicks, eventDate])

  async function rpc(name: string, args: Record<string, unknown>, errorMsg?: string) {
    const { error } = await supabase.rpc(name, args)
    if (error) alert(errorMsg ?? 'Não foi possível concluir: ' + error.message)
    load()
  }

  function handleCancel(r: RegistrationRow) {
    if (!confirm(`Cancelar a inscrição de ${r.full_name}? A vaga fica livre.`)) return
    rpc('admin_cancel_registration', { p_id: r.id })
  }
  function handleReactivate(r: RegistrationRow) {
    rpc('admin_reactivate_registration', { p_id: r.id }, 'Não foi possível: não há vaga livre ou o CPF já tem outra inscrição ativa.')
  }
  function handlePromote(r: RegistrationRow) {
    rpc('admin_promote_waitlist', { p_id: r.id }, 'Não foi possível promover: todas as vagas estão ocupadas.')
  }
  function handleCheckin(r: RegistrationRow, checked: boolean) {
    setRows((cur) => cur.map((x) => (x.id === r.id ? { ...x, checked_in: checked } : x)))
    rpc('admin_set_checkin', { p_id: r.id, p_checked: checked })
  }
  function handleGuardian(r: RegistrationRow, status: GuardianStatus) {
    rpc('admin_set_guardian_status', { p_id: r.id, p_status: status })
  }

  function exportCSV(list: RegistrationRow[], name: string) {
    downloadCSV(name, list.map((r) => {
      const age = ageOf(r)
      return {
        Codigo: r.code,
        Nome: r.full_name,
        NomeArtistico: r.artistic_name ?? '',
        CPF: r.cpf,
        Telefone: r.phone,
        Email: r.email,
        Instagram: r.instagram ?? '',
        DataNascimento: r.birth_date.split('-').reverse().join('/'),
        IdadeNoEvento: age ?? '',
        MenorDeIdade: age !== null && age < 18 ? 'Sim' : 'Não',
        AutorizacaoResponsavel: guardianStatusLabel(r.guardian_authorization_status),
        Status: STATUS_LABEL[r.status],
        PosicaoEspera: r.waitlist_position ?? '',
        CheckIn: r.checked_in ? 'Compareceu' : '',
        Workshops: (picks[r.id] ?? []).map(workshopLabel).join(' / '),
        Batalhas: (battlePicks[r.id] ?? []).map(battleLabel).join(' / '),
        AutorizacaoImagem: r.image_consent ? 'Sim' : 'Não',
        AceitaComunicacao: r.consent_marketing ? 'Sim' : 'Não',
        InscritoEm: new Date(r.created_at).toLocaleString('pt-BR'),
      }
    }))
  }

  if (loading) return <p>Carregando inscritos...</p>

  const active = rows.filter((r) => r.status === 'confirmed').length

  return (
    <div>
      <h2>Inscritos</h2>
      <p className="admin-help">
        {active} confirmadas · {rows.filter((r) => r.status === 'waitlisted').length} na lista de espera ·
        mostrando {filtered.length} de {rows.length}
      </p>

      <div className="toolbar">
        <input type="search" placeholder="Buscar por nome, CPF, telefone, e-mail ou código" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} aria-label="Status">
          <option value="">Todos os status</option>
          <option value="confirmed">Confirmadas</option>
          <option value="waitlisted">Lista de espera</option>
          <option value="cancelled">Canceladas</option>
        </select>
        <select value={filterCheckin} onChange={(e) => setFilterCheckin(e.target.value)} aria-label="Check-in">
          <option value="">Check-in: todos</option>
          <option value="sim">Já fizeram check-in</option>
          <option value="nao">Ainda não chegaram</option>
        </select>
        <select value={filterActivity} onChange={(e) => setFilterActivity(e.target.value)} aria-label="Workshop ou batalha">
          <option value="">Todas as atividades</option>
          <optgroup label="Workshops">
            {workshops.map((w) => <option key={w.id} value={`w:${w.id}`}>{workshopLabel(w.id)}</option>)}
          </optgroup>
          <optgroup label="Batalhas">
            {battles.map((b) => <option key={b.id} value={`b:${b.id}`}>{b.name}</option>)}
          </optgroup>
        </select>
        <label className="checkbox-field" style={{ margin: 0, fontSize: 14 }}>
          <input type="checkbox" checked={filterMinors} onChange={(e) => setFilterMinors(e.target.checked)} />
          <span>Só menores</span>
        </label>
      </div>

      <div className="toolbar">
        <button className="btn-sm ok" onClick={() => exportCSV(rows, 'inscritos-todos.csv')}>Exportar todos (CSV)</button>
        <button className="btn-sm" onClick={() => exportCSV(filtered, 'inscritos-filtrados.csv')}>Exportar o que está filtrado</button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Check-in</th>
              <th>Participante</th>
              <th>Status</th>
              <th>Idade</th>
              <th>Autorização resp.</th>
              <th>CPF / Telefone</th>
              <th>Workshops / batalhas</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const minor = isMinor(r)
              return (
                <tr key={r.id}>
                  <td>
                    <input
                      type="checkbox"
                      style={{ width: 24, height: 24, accentColor: 'var(--yellow)' }}
                      checked={r.checked_in}
                      disabled={r.status !== 'confirmed'}
                      onChange={(e) => handleCheckin(r, e.target.checked)}
                      aria-label={`Check-in de ${r.full_name}`}
                    />
                  </td>
                  <td>
                    <strong>{r.full_name}</strong>
                    {r.artistic_name && <div className="small-label">Nome artístico: {r.artistic_name}</div>}
                    <div className="small-label">{r.code} · {r.email}</div>
                  </td>
                  <td>
                    <span className={`status-tag ${r.status}`}>{STATUS_LABEL[r.status]}</span>
                    {r.status === 'waitlisted' && r.waitlist_position && <div className="small-label">posição {r.waitlist_position}</div>}
                  </td>
                  <td>
                    {ageOf(r) ?? '—'} {minor && <span className="status-tag minor">Menor</span>}
                  </td>
                  <td>
                    {minor ? (
                      <select
                        value={r.guardian_authorization_status}
                        onChange={(e) => handleGuardian(r, e.target.value as GuardianStatus)}
                        className="btn-sm"
                        style={{ background: 'var(--navy)' }}
                      >
                        <option value="pendente">Pendente</option>
                        <option value="confirmada">Confirmada</option>
                      </select>
                    ) : (
                      <span className="small-label">Não necessária</span>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {r.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                    <div className="small-label">{r.phone}</div>
                  </td>
                  <td style={{ minWidth: 180 }}>
                    {(picks[r.id] ?? []).map((id) => <div key={id}>{workshopLabel(id)}</div>)}
                    {(battlePicks[r.id] ?? []).map((id) => <div key={id} style={{ color: 'var(--yellow)' }}>{battleLabel(id)}</div>)}
                    {!(picks[r.id]?.length || battlePicks[r.id]?.length) && <span className="muted">—</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {r.status === 'confirmed' && <button className="btn-sm danger" onClick={() => handleCancel(r)}>Cancelar</button>}
                      {r.status === 'waitlisted' && (
                        <>
                          <button className="btn-sm ok" onClick={() => handlePromote(r)}>Promover</button>
                          <button className="btn-sm danger" onClick={() => handleCancel(r)}>Cancelar</button>
                        </>
                      )}
                      {r.status === 'cancelled' && <button className="btn-sm ok" onClick={() => handleReactivate(r)}>Reativar</button>}
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20 }} className="muted">Nenhuma inscrição encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
