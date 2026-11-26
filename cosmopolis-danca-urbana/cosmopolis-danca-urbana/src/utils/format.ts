export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

export function isValidCPF(cpfRaw: string): boolean {
  const cpf = cpfRaw.replace(/\D/g, '')
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i)
  let rest = (sum * 10) % 11
  if (rest === 10 || rest === 11) rest = 0
  if (rest !== parseInt(cpf[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i)
  rest = (sum * 10) % 11
  if (rest === 10 || rest === 11) rest = 0
  if (rest !== parseInt(cpf[10])) return false

  return true
}

export function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
}

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

const WEEKDAYS_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

/** Idade que a pessoa terá NA DATA DE REFERÊNCIA (ex: início do evento), não hoje. */
export function computeAge(birthDateISO: string, referenceDateISO: string): number {
  const birth = new Date(birthDateISO + 'T00:00:00')
  const ref = new Date(referenceDateISO + 'T00:00:00')
  let age = ref.getFullYear() - birth.getFullYear()
  const m = ref.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--
  return age
}

export function isValidBirthDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T00:00:00')
  if (Number.isNaN(date.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (date > today) return false
  if (date.getFullYear() < 1900) return false
  return true
}

export function guardianStatusLabel(status: string): string {
  switch (status) {
    case 'nao_necessaria':
      return 'Não necessária'
    case 'pendente':
      return 'Pendente'
    case 'confirmada':
      return 'Confirmada'
    default:
      return status
  }
}

// ---------- Evento de um dia ----------

// "5 de dezembro de 2026"
export function formatDateLong(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return `${d} de ${MONTHS[m - 1]} de ${y}`
}

// "Sábado, 5 de dezembro"
export function formatWeekdayDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${WEEKDAYS_LONG[date.getDay()]}, ${d} de ${MONTHS[m - 1]}`
}

// "5/12"
export function formatDayMonthShort(isoDate: string): string {
  const [, m, d] = isoDate.split('-').map(Number)
  return `${d}/${m}`
}

// "05.12"
export function formatDayMonthDot(isoDate: string): string {
  const [, m, d] = isoDate.split('-').map(Number)
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}`
}

// "14:00:00" -> "14h" | "14:30" -> "14h30"
export function formatHour(time: string | null | undefined): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

// "14h às 15h10" (sem duração, só "14h")
export function formatHourRange(time: string | null | undefined, durationMinutes: number | null | undefined): string {
  if (!time) return ''
  if (!durationMinutes) return formatHour(time)
  const [h, m] = time.split(':').map(Number)
  const end = h * 60 + m + durationMinutes
  const endStr = `${Math.floor(end / 60) % 24}:${String(end % 60).padStart(2, '0')}`
  return `${formatHour(time)} às ${formatHour(endStr)}`
}

// 800 -> "R$ 800" | 1250.5 -> "R$ 1.250,50"
export function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const n = Number(value)
  const hasCents = Math.round(n * 100) % 100 !== 0
  return n.toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: hasCents ? 2 : 0, maximumFractionDigits: 2,
  }).replace(/\u00a0/g, ' ')
}
