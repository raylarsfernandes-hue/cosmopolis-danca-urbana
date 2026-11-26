import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { invalidateEventSettings } from '../../hooks/useEventSettings'
import type { EventSettings } from '../../types'
import ImageField from '../../components/ImageField'

const toNull = (v: string) => (v.trim() === '' ? null : v)
const toIntOrNull = (v: string) => (v.replace(/\D/g, '') === '' ? null : Number(v.replace(/\D/g, '')))

export default function Configuracoes() {
  const [form, setForm] = useState<EventSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('event_settings').select('*').limit(1).maybeSingle().then(({ data }) => {
      const s = data as EventSettings
      if (s) {
        s.battle_signup_deadline = s.battle_signup_deadline?.slice(0, 5) ?? null
        s.jam_start_time = s.jam_start_time?.slice(0, 5) ?? null
      }
      setForm(s)
    })
  }, [])

  function set<K extends keyof EventSettings>(key: K, value: EventSettings[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f))
    setSaved(false)
  }

  async function handleSave() {
    if (!form) return
    if (!form.event_name.trim() || !form.event_date || !form.location_address.trim()) {
      setError('Nome do evento, data e endereço são obrigatórios.')
      return
    }
    setSaving(true)
    setError(null)
    const { error } = await supabase
      .from('event_settings')
      .update({ ...form, updated_at: new Date().toISOString() })
      .eq('id', true)
    setSaving(false)
    if (error) {
      setError('Não foi possível salvar: ' + error.message)
      return
    }
    invalidateEventSettings()
    setSaved(true)
  }

  if (!form) return <p>Carregando configurações...</p>

  return (
    <div>
      <h2>Configurações do evento</h2>
      <p className="admin-help">
        Tudo que o site mostra sobre o evento sai daqui. Campos vazios simplesmente não aparecem no site.
      </p>

      <div className="card" style={{ maxWidth: 620 }}>
        <h3 className="form-section-title">Inscrição geral</h3>
        <label className="checkbox-field">
          <input type="checkbox" checked={form.registrations_open} onChange={(e) => set('registrations_open', e.target.checked)} />
          <span><strong>Inscrições abertas.</strong> Desligado, o site mostra "Inscrições em breve" no lugar do botão.</span>
        </label>
        <div className="field">
          <label>Limite de vagas do dia</label>
          <input type="text" inputMode="numeric" value={form.max_vagas ?? ''} onChange={(e) => set('max_vagas', toIntOrNull(e.target.value))} placeholder="Vazio = sem limite" />
          <p className="field-hint">Quando o limite é atingido, as novas inscrições entram automaticamente na lista de espera.</p>
        </div>
        <div className="field">
          <label>Link de formulário externo (opcional)</label>
          <input type="text" value={form.registration_form_url ?? ''} onChange={(e) => set('registration_form_url', toNull(e.target.value))} placeholder="https://..." />
          <p className="field-hint">Deixe vazio para usar o formulário do próprio site (recomendado: tem controle de vagas, CPF e check-in). Se preenchido, o botão "Fazer inscrição" leva para esse link.</p>
        </div>
        <div className="field">
          <label>PDF de autorização do responsável (menores)</label>
          <input type="text" value={form.guardian_authorization_pdf_url ?? ''} onChange={(e) => set('guardian_authorization_pdf_url', toNull(e.target.value))} placeholder="https://..." />
          <p className="field-hint">A idade é calculada na data do evento. Sem link, o formulário avisa que o modelo será disponibilizado em breve.</p>
        </div>
        <label className="checkbox-field">
          <input type="checkbox" checked={form.workshop_selection_enabled} onChange={(e) => set('workshop_selection_enabled', e.target.checked)} />
          <span><strong>Pedir escolha de workshops na inscrição.</strong> Desligado: a inscrição vale para o dia inteiro, sem escolha.</span>
        </label>

        <h3 className="form-section-title">Evento</h3>
        <div className="field">
          <label>Nome do evento *</label>
          <input type="text" value={form.event_name} onChange={(e) => set('event_name', e.target.value)} />
        </div>
        <div className="field">
          <label>Objetivo / apresentação</label>
          <textarea rows={3} value={form.event_objective ?? ''} onChange={(e) => set('event_objective', toNull(e.target.value))} />
        </div>
        <div className="field">
          <label>Data do evento *</label>
          <input type="date" value={form.event_date} onChange={(e) => set('event_date', e.target.value)} />
        </div>

        <h3 className="form-section-title">Local</h3>
        <div className="field">
          <label>Nome do espaço (opcional)</label>
          <input type="text" value={form.location_name ?? ''} onChange={(e) => set('location_name', toNull(e.target.value))} />
        </div>
        <div className="field">
          <label>Endereço *</label>
          <input type="text" value={form.location_address} onChange={(e) => set('location_address', e.target.value)} />
        </div>
        <div className="form-row">
          <div className="field">
            <label>CEP</label>
            <input type="text" inputMode="numeric" value={form.location_cep ?? ''} onChange={(e) => set('location_cep', toNull(e.target.value))} placeholder="00000-000" />
          </div>
        </div>
        <div className="field">
          <label>Busca do Google Maps</label>
          <input type="text" value={form.map_query ?? ''} onChange={(e) => set('map_query', toNull(e.target.value))} />
          <p className="field-hint">Texto usado no mapa e no botão "Abrir no Google Maps". Se o pin cair no lugar errado, ajuste aqui.</p>
        </div>

        <h3 className="form-section-title">Batalhas</h3>
        <div className="field">
          <label>Horário-limite da inscrição no local</label>
          <input type="time" value={form.battle_signup_deadline ?? ''} onChange={(e) => set('battle_signup_deadline', toNull(e.target.value))} />
          <p className="field-hint">Preenchido, aparece junto de "Inscrição no local" em todas as batalhas.</p>
        </div>

        <h3 className="form-section-title">Jam</h3>
        <div className="field">
          <label>Nome do DJ</label>
          <input type="text" value={form.jam_dj_name ?? ''} onChange={(e) => set('jam_dj_name', toNull(e.target.value))} />
        </div>
        <ImageField label="Foto do DJ" folder="dj" value={form.jam_dj_photo_url} onChange={(url) => set('jam_dj_photo_url', url)} />
        <div className="form-row">
          <div className="field">
            <label>Horário da jam</label>
            <input type="time" value={form.jam_start_time ?? ''} onChange={(e) => set('jam_start_time', toNull(e.target.value))} />
          </div>
          <div className="field">
            <label>Duração (min)</label>
            <input type="text" inputMode="numeric" value={form.jam_duration_minutes ?? ''} onChange={(e) => set('jam_duration_minutes', toIntOrNull(e.target.value))} />
          </div>
        </div>

        {error && <div className="form-alert">{error}</div>}
        <button className="submit-btn" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar configurações'}</button>
        {saved && <p className="save-ok">Salvo. O site já mostra os dados novos.</p>}
      </div>
    </div>
  )
}
