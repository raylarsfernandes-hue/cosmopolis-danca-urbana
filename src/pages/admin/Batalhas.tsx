import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import type { Battle } from '../../types'
import ImageField from '../../components/ImageField'
import { formatHour, formatMoney } from '../../utils/format'

type Form = Omit<Battle, 'id'>
const blank: Form = {
  name: '', audience: null, judge_name: null, judge_photo_url: null,
  prize_first: null, prize_second: null, start_time: null, max_vagas: null, order_index: 0, active: true,
}
const toNull = (v: string) => (v.trim() === '' ? null : v.trim())
const toMoney = (v: string) => {
  const clean = v.replace(/[^\d,.]/g, '').replace(/\./g, '').replace(',', '.')
  return clean === '' ? null : Number(clean)
}

export default function AdminBatalhas() {
  const [items, setItems] = useState<Battle[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<Form>(blank)

  async function load() {
    const { data } = await supabase.from('battles').select('*').order('order_index')
    setItems((data ?? []) as Battle[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function startEdit(b: Battle) {
    setForm({
      name: b.name, audience: b.audience, judge_name: b.judge_name, judge_photo_url: b.judge_photo_url,
      prize_first: b.prize_first, prize_second: b.prize_second, start_time: b.start_time?.slice(0, 5) ?? null, max_vagas: b.max_vagas,
      order_index: b.order_index, active: b.active,
    })
    setEditingId(b.id)
  }

  async function handleSave() {
    if (!form.name.trim()) return alert('Informe o nome da batalha.')
    const { error } = editingId === 'new'
      ? await supabase.from('battles').insert(form)
      : await supabase.from('battles').update(form).eq('id', editingId!)
    if (error) return alert('Não foi possível salvar: ' + error.message)
    setEditingId(null)
    load()
  }

  async function toggleActive(b: Battle) {
    await supabase.from('battles').update({ active: !b.active }).eq('id', b.id)
    load()
  }

  async function handleDelete(b: Battle) {
    if (!confirm(`Excluir "${b.name}"?`)) return
    await supabase.from('battles').delete().eq('id', b.id)
    load()
  }

  const total = items.filter((b) => b.active).reduce((a, b) => a + Number(b.prize_first ?? 0) + Number(b.prize_second ?? 0), 0)

  return (
    <div>
      <h2>Batalhas</h2>
      <p className="admin-help">
        Quem quer competir se inscreve pelo formulário do site, marcando a batalha e informando o nome
        artístico. Cada card de batalha no site tem o botão "Quero competir". A lista de competidores
        fica em Inscritos (filtre pela batalha). A premiação total exibida ({formatMoney(total) || 'R$ 0'}) é a soma dos prêmios das batalhas visíveis.
      </p>

      {editingId === null && (
        <button className="btn-sm ok" onClick={() => { setForm({ ...blank, order_index: items.length + 1 }); setEditingId('new') }}>+ Nova batalha</button>
      )}

      {editingId !== null && (
        <div className="card" style={{ maxWidth: 560 }}>
          <h3>{editingId === 'new' ? 'Nova batalha' : 'Editar batalha'}</h3>
          <div className="field">
            <label>Nome *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Batalha de breaking" />
          </div>
          <div className="field">
            <label>Para quem é</label>
            <input type="text" value={form.audience ?? ''} onChange={(e) => setForm({ ...form, audience: toNull(e.target.value) })} />
          </div>
          <div className="field">
            <label>Jurados</label>
            <input type="text" value={form.judge_name ?? ''} onChange={(e) => setForm({ ...form, judge_name: toNull(e.target.value) })} placeholder="Ex.: Fulano, Ciclano e Beltrano" />
          </div>
          <ImageField label="Foto do júri (opcional)" folder="juri" value={form.judge_photo_url} onChange={(url) => setForm({ ...form, judge_photo_url: url })} />
          <div className="form-row">
            <div className="field">
              <label>Prêmio 1º lugar (R$)</label>
              <input type="text" inputMode="decimal" value={form.prize_first ?? ''} onChange={(e) => setForm({ ...form, prize_first: toMoney(e.target.value) })} />
            </div>
            <div className="field">
              <label>Prêmio 2º lugar (R$)</label>
              <input type="text" inputMode="decimal" value={form.prize_second ?? ''} onChange={(e) => setForm({ ...form, prize_second: toMoney(e.target.value) })} />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Horário da batalha</label>
              <input type="time" value={form.start_time ?? ''} onChange={(e) => setForm({ ...form, start_time: toNull(e.target.value) })} />
            </div>
            <div className="field">
              <label>Limite de competidores</label>
              <input type="text" inputMode="numeric" value={form.max_vagas ?? ''} onChange={(e) => setForm({ ...form, max_vagas: e.target.value.replace(/\D/g, '') === '' ? null : Number(e.target.value.replace(/\D/g, '')) })} placeholder="Sem limite" />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Ordem</label>
              <input type="text" inputMode="numeric" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
            </div>
          </div>
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
            <thead><tr><th>Batalha</th><th>Jurados</th><th>1º</th><th>2º</th><th>Horário</th><th>No site</th><th>Ações</th></tr></thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id}>
                  <td><strong>{b.name}</strong><div className="small-label">{b.audience}</div></td>
                  <td>{b.judge_name ?? '—'}</td>
                  <td>{formatMoney(b.prize_first) || '—'}</td>
                  <td>{formatMoney(b.prize_second) || '—'}</td>
                  <td>{b.start_time ? formatHour(b.start_time) : <span className="muted">vazio</span>}</td>
                  <td>{b.active ? 'Sim' : 'Não'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-sm" onClick={() => startEdit(b)}>Editar</button>
                      <button className="btn-sm" onClick={() => toggleActive(b)}>{b.active ? 'Ocultar' : 'Mostrar'}</button>
                      <button className="btn-sm danger" onClick={() => handleDelete(b)}>Excluir</button>
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
