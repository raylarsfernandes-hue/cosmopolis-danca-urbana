export type RegistrationStatus = 'confirmed' | 'waitlisted' | 'cancelled'
export type GuardianStatus = 'nao_necessaria' | 'pendente' | 'confirmada'
export type AvailabilityStatus = 'disponivel' | 'ultimas' | 'lista_espera'

export interface EventSettings {
  event_name: string
  event_objective: string | null
  event_date: string // YYYY-MM-DD
  location_name: string | null
  location_address: string
  location_cep: string | null
  map_query: string | null
  registrations_open: boolean
  registration_form_url: string | null
  max_vagas: number | null
  guardian_authorization_pdf_url: string | null
  workshop_selection_enabled: boolean
  jam_dj_name: string | null
  jam_dj_photo_url: string | null
  jam_start_time: string | null
  jam_duration_minutes: number | null
  partner_bar_label: string
}

// Workshop = professor + modalidade + horário (os dois últimos podem estar vazios)
export interface WorkshopPublic {
  id: string
  teacher_name: string
  modality: string | null
  start_time: string | null
  duration_minutes: number | null
  photo_url: string | null
  order_index: number
}

export interface Workshop extends WorkshopPublic {
  bio: string | null
  max_vagas: number | null
  active: boolean
}

export interface BattlePublic {
  id: string
  name: string
  audience: string | null
  judge_name: string | null
  judge_photo_url: string | null
  prize_first: number | null
  prize_second: number | null
  start_time: string | null
  max_vagas: number | null
  order_index: number
}

export interface Battle extends BattlePublic {
  active: boolean
}

export interface PartnerLogo {
  id: string
  name: string
  image_url: string
  order_index: number
  active?: boolean
}

export interface Availability {
  registrations_open: boolean
  max_vagas: number | null
  taken: number
  vagas_restantes: number | null
  status: AvailabilityStatus
}

export interface RegistrationRow {
  id: string
  code: string
  full_name: string
  cpf: string
  phone: string
  email: string
  instagram: string | null
  artistic_name: string | null
  birth_date: string
  image_consent: boolean
  guardian_ack: boolean
  guardian_authorization_status: GuardianStatus
  consent_marketing: boolean
  status: RegistrationStatus
  waitlist_position: number | null
  checked_in: boolean
  created_at: string
}

export interface RegisterResult {
  code: string
  result_status: 'confirmed' | 'waitlisted'
  confirmation_token: string
  waitlist_position: number | null
}

export interface ConfirmationRow {
  code: string
  full_name: string
  status: RegistrationStatus
  waitlist_position: number | null
  is_minor: boolean
  artistic_name: string | null
  workshops: string[]
  battles: string[]
}
