import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useEventSettings } from '../../hooks/useEventSettings'
import type { Workshop } from '../../types'
import ImageField from '../../components/ImageField'
import { formatHourRange } from '../../utils/format'
import { resolveImageUrl } from '../../utils/image'

type Form = Omit<Workshop, 'id'>
const blank: Form = {
  teacher_name: '', modality: null, start_time: null, duration_minutes: null,
  photo_url: null, bio: null, max_vagas: null, order_index: 0, active: true,
}

const toNull = (v: string) => (v.trim() === '' ? null : v.trim())
const toIntOrNull = (v: string) => (v.replace(/\D/g, '') === '' ? null : Number(v.replace(/\D/g, '')))

export default function AdminWorkshops() {
  const { settings } = useEventSettings()
  const [items, setItems] = useState<Workshop[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<Form>(blank)

  async function load() {
    const { data } = await supabase.from('workshops').select('*').order('order_index')
    setItems((data ?? []) as Workshop[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function startEdit(w: Workshop) {
    setForm({
      teacher_name: w.teacher_name, modality: w.modality, start_time: w.start_time?.slice(0, 5) ?? null,
      duration_minutes: w.duration_minutes, photo_url: w.photo_url, bio: w.bio, max_vagas: w.max_vagas,
      order_index: w.order_index, active: w.active,
    })
    setEditingId(w.id)
  }

  async function handleSave() {
    if (!form.teacher_name.trim()) return alert('Informe o nome do professor.')
    const payload = { ...form, teacher_name: form.teacher_name.trim() }
    const { error } = editingId === 'new'
      ? await supabase.from('workshops').insert(payload)
      : await supabase.from('workshops').update(payload).eq('id', editingId!)
    if (error) return alert('Não foi possível salvar: ' + error.message)
    setEditingId(null)
    load()
  }

  async function handleDelete(w: Workshop) {
    if (!confirm(`Excluir o workshop de ${w.teacher_name}? Prefira "Ocultar" se for só temporário.`)) return
    const { error } = await supabase.from('workshops').delete().eq('id', w.id)
    if (error) alert('Não foi possível excluir: ' + error.message)
    load()
  }

  async function toggleActive(w: Workshop) {
    await supabase.from('workshops').update({ active: !w.active }).eq('id', w.id)
    load()
  }

  return (
    <div>
      <h2>Workshops</h2>
      <p className="admin-help">
        Cada card é professor + modalidade + horário. Enquanto modalidade ou horário estiverem
        vazios, o site mostra só a foto e o nome, sem nenhum texto de "a definir".
      </p>

      {editingId === null && (
        <button className="btn-sm ok" onClick={() => { setForm({ ...blank, order_index: items.length + 1 }); setEditingId('new') }}>
          + Novo workshop
        </button>
      )}

      {editingId !== null && (
        <div className="card" style={{ maxWidth: 560 }}>
          <h3>{editingId === 'new' ? 'Novo workshop' : 'Editar workshop'}</h3>
          <div className="field">
            <label>Professor(a) *</label>
            <input type="text" value={form.teacher_name} onChange={(e) => setForm({ ...form, teacher_name: e.target.value })} />
          </div>
          <div className="field">
            <label>Modalidade</label>
            <input type="text" value={form.modality ?? ''} onChange={(e) => setForm({ ...form, modality: toNull(e.target.value) })} placeholder="Ex.: House" />
          </div>
          <div className="form-row">
            <div className="field">
              <label>Horário de início</label>
              <input type="time" value={form.start_time ?? ''} onChange={(e) => setForm({ ...form, start_time: toNull(e.target.value) })} />
            </div>
            <div className="field">
              <label>Duração (min)</label>
              <input type="text" inputMode="numeric" value={form.duration_minutes ?? ''} onChange={(e) => setForm({ ...form, duration_minutes: toIntOrNull(e.target.value) })} />
            </div>
          </div>
          <ImageField label="Foto do professor" folder="professores" value={form.photo_url} onChange={(url) => setForm({ ...form, photo_url: url })} />
          <div className="field">
            <label>Apresentação (uso interno, não aparece no site)</label>
            <textarea rows={4} value={form.bio ?? ''} onChange={(e) => setForm({ ...form, bio: toNull(e.target.value) })} />
          </div>
          <div className="form-row">
            <div className="field">
              <label>Ordem na página</label>
              <input type="text" inputMode="numeric" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
            </div>
            <div className="field">
              <label>Vagas neste workshop</label>
              <input type="text" inputMode="numeric" value={form.max_vagas ?? ''} onChange={(e) => setForm({ ...form, max_vagas: toIntOrNull(e.target.value) })} placeholder="Sem limite" />
            </div>
          </div>
          <p className="field-hint" style={{ marginTop: -8, marginBottom: 14 }}>
            As vagas por workshop só contam se a escolha de workshops estiver ligada em Configurações
            {settings?.workshop_selection_enabled ? ' (está ligada).' : ' (hoje está desligada).'}
          </p>
          <label className="checkbox-field">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            <span>Mostrar no site</span>
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="submit-btn" style={{ flex: 1 }} onClick={handleSave}>Salvar</button>
            <button className="btn-sm" onClick={() => setEditingId(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {loading ? <p>Carregando...</p> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th></th><th>Professor</th><th>Modalidade</th><th>Horário</th><th>No site</th><th>Ações</th></tr></thead>
            <tbody>
              {items.map((w) => (
                <tr key={w.id}>
                  <td>{w.photo_url ? <img src={resolveImageUrl(w.photo_url)!} alt="" className="thumb" /> : <span className="thumb" />}</td>
                  <td><strong>{w.teacher_name}</strong></td>
                  <td>{w.modality ?? <span className="muted">vazio</span>}</td>
                  <td>{w.start_time ? formatHourRange(w.start_time, w.duration_minutes) : <span className="muted">vazio</span>}</td>
                  <td>{w.active ? 'Sim' : 'Não'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-sm" onClick={() => startEdit(w)}>Editar</button>
                      <button className="btn-sm" onClick={() => toggleActive(w)}>{w.active ? 'Ocultar' : 'Mostrar'}</button>
                      <button className="btn-sm danger" onClick={() => handleDelete(w)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
