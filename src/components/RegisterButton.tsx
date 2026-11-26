import { Link } from 'react-router-dom'
import type { EventSettings } from '../types'
import { registrationTarget } from '../utils/registration'

interface Props {
  settings: EventSettings | null
  className?: string
  label?: string
  /** mostra "Inscrições em breve" quando a inscrição está fechada */
  showSoon?: boolean
}

// Botão de inscrição geral. Só aparece com a inscrição aberta no admin.
export default function RegisterButton({ settings, className = 'btn-primary', label = 'Fazer inscrição', showSoon = false }: Props) {
  if (!settings) return null
  const reg = registrationTarget(settings)
  if (!reg.open) {
    return showSoon ? <span className="soon-tag">Inscrições em breve</span> : null
  }
  if (reg.external) {
    return <a href={reg.href} className={className} target="_blank" rel="noreferrer">{label}</a>
  }
  return <Link to={reg.href} className={className}>{label}</Link>
}
