import type { EventSettings } from '../types'

// Para onde leva o botão "Fazer inscrição".
// Se a produção cadastrar um link de formulário externo no admin, ele tem prioridade.
export function registrationTarget(settings: EventSettings | null) {
  const open = !!settings?.registrations_open
  const url = settings?.registration_form_url?.trim() || ''
  return { open, external: !!url, href: url || '/inscricao' }
}
