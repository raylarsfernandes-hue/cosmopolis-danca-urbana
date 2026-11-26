import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import type { PartnerLogo } from '../../types'
import { uploadImage } from '../../components/ImageField'
import { resolveImageUrl } from '../../utils/image'

export default function AdminRegua() {
  const [items, setItems] = useState<PartnerLogo[]>([])
  const [label, setLabel] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')

  async function load() {
    const [{ data }, { data: s }] = await Promise.all([
      supabase.from('partner_logos').select('*').order('order_index'),
      supabase.from('event_settings').select('partner_bar_label').limit(1).maybeSingle(),
    ])
    setItems((data ?? []) as PartnerLogo[])
    setLabel((s as { partner_bar_label: string } | null)?.partner_bar_label ?? '')
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function addLogo(imageUrl: string) {
    const name = newName.trim()
    if (!name) return alert('Informe o nome da instituição (é usado como texto alternativo do logo).')
    const next = items.length ? Math.max(...items.map((i) => i.order_index)) + 1 : 1
    const { error } = await supabase.from('partner_logos').insert({ name, image_url: imageUrl, order_index: next })
    if (error) return alert('Não foi possível adicionar: ' + error.message)
    setNewName('')
    setNewUrl('')
    load()
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!newName.trim()) return alert('Preencha o nome da instituição antes de enviar o arquivo.')
    setBusy(true)
    try {
      await addLogo(await uploadImage(file, 'logos'))
    } catch (ex) {
      alert('Não foi possível enviar: ' + (ex as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const a = items[index]
    const b = items[index + dir]
    if (!a || !b) return
    await Promise.all([
      supabase.from('partner_logos').update({ order_index: b.order_index }).eq('id', a.id),
      supabase.from('partner_logos').update({ order_index: a.order_index }).eq('id', b.id),
    ])
    load()
  }

  async function toggle(l: PartnerLogo) {
    await supabase.from('partner_logos').update({ active: !l.active }).eq('id', l.id)
    load()
  }

  async function remove(l: PartnerLogo) {
    if (!confirm(`Remover o logo "${l.name}" da régua?`)) return
    await supabase.from('partner_logos').delete().eq('id', l.id)
    load()
  }

  async function saveLabel() {
    await supabase.from('event_settings').update({ partner_bar_label: label.trim() || 'Apoio' }).eq('id', true)
    alert('Título da régua salvo.')
  }

  if (loading) return <p>Carregando...</p>
  const visible = items.filter((i) => i.active).length

  return (
    <div>
      <h2>Régua institucional</h2>
      <p className="admin-help">
        A régua aparece no fim de todas as páginas públicas. Enquanto não houver nenhum logo visível,
        ela fica oculta. Hoje: <strong>{visible === 0 ? 'oculta' : `${visible} logo(s) visível(is)`}</strong>.
        Use PNG ou SVG com fundo transparente; a régua tem fundo branco.
      </p>

      <div className="card" style={{ maxWidth: 560 }}>
        <h3>Adicionar logo</h3>
        <div className="field">
          <label>Nome da instituição *</label>
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex.: Prefeitura de ..." />
        </div>
        <div className="field">
          <label>Enviar arquivo</label>
          <input type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" onChange={handleFile} disabled={busy} />
          {busy && <p className="field-hint">Enviando...</p>}
        </div>
        <div className="field">
          <label>Ou colar um link da imagem</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://..." />
            <button className="btn-sm ok" onClick={() => newUrl.trim() && addLogo(newUrl.trim())}>Adicionar</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 560, marginTop: 16 }}>
        <div className="field" style={{ marginBottom: 8 }}>
          <label>Título da régua</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Apoio" />
            <button className="btn-sm ok" onClick={saveLabel}>Salvar</button>
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Ordem</th><th>Logo</th><th>Instituição</th><th>No site</th><th>Ações</th></tr></thead>
          <tbody>
            {items.map((l, i) => (
              <tr key={l.id}>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir">↑</button>
                    <button className="btn-sm" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Descer">↓</button>
                  </div>
                </td>
                <td><img src={resolveImageUrl(l.image_url)!} alt="" className="thumb logo" /></td>
                <td>{l.name}</td>
                <td>{l.active ? 'Sim' : 'Não'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-sm" onClick={() => toggle(l)}>{l.active ? 'Ocultar' : 'Mostrar'}</button>
                    <button className="btn-sm danger" onClick={() => remove(l)}>Remover</button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 20 }}>Nenhum logo cadastrado. A régua está oculta no site.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
