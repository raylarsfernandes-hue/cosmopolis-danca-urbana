import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { resolveImageUrl } from '../utils/image'

interface Props {
  label: string
  value: string | null
  onChange: (url: string | null) => void
  folder: string // pasta dentro do bucket "imagens" (ex.: logos, professores)
  logo?: boolean
}

// Campo de imagem do admin: aceita colar um link (inclusive do Google Drive)
// ou enviar o arquivo direto para o Storage do Supabase.
export async function uploadImage(file: File, folder: string): Promise<string> {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('imagens').upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (error) throw error
  return supabase.storage.from('imagens').getPublicUrl(path).data.publicUrl
}

export default function ImageField({ label, value, onChange, folder, logo = false }: Props) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const preview = resolveImageUrl(value)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setErr('Arquivo maior que 5 MB. Reduza a imagem antes de enviar.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      onChange(await uploadImage(file, folder))
    } catch (ex) {
      setErr('Não foi possível enviar: ' + (ex as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="field">
      <label>{label}</label>
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value.trim() || null)}
        placeholder="Cole um link ou envie um arquivo"
      />
      <div className="upload-row">
        {preview && <img src={preview} alt="" className={`thumb ${logo ? 'logo' : ''}`} />}
        <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleFile} disabled={busy} />
        {busy && <span className="field-hint">Enviando...</span>}
        {value && <button type="button" className="btn-sm" onClick={() => onChange(null)}>Remover</button>}
      </div>
      {err && <div className="error-msg">{err}</div>}
      <p className="field-hint">Link do Google Drive funciona se o arquivo estiver como "Qualquer pessoa com o link".</p>
    </div>
  )
}
