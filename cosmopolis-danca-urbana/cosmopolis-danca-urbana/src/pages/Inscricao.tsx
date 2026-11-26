import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useEventSettings } from '../hooks/useEventSettings'
import { useAvailability } from '../hooks/useAvailability'
import { usePublicList } from '../hooks/usePublicList'
import type { RegisterResult, WorkshopPublic } from '../types'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { battleSignupText } from '../components/BattleCard'
import {
  formatCPF, formatPhone, isValidCPF, isValidEmail, isValidBirthDate, computeAge,
  formatWeekdayDate, formatHourRange,
} from '../utils/format'

const ERROR_MESSAGES: Record<string, string> = {
  CPF_INVALIDO: 'O CPF informado não é válido.',
  EMAIL_INVALIDO: 'O e-mail informado não é válido.',
  NOME_INVALIDO: 'Informe o nome completo.',
  TELEFONE_INVALIDO: 'Informe um telefone/WhatsApp válido, com DDD.',
  CONSENTIMENTO_OBRIGATORIO: 'É necessário aceitar o uso dos dados para concluir a inscrição.',
  CONSENTIMENTO_IMAGEM_OBRIGATORIO: 'É necessário autorizar o uso de imagem para concluir a inscrição.',
  CIENCIA_RESPONSAVEL_OBRIGATORIA: 'É necessário confirmar a ciência sobre a autorização do responsável.',
  DATA_NASCIMENTO_INVALIDA: 'Informe uma data de nascimento válida.',
  INSCRICOES_FECHADAS: 'As inscrições não estão abertas no momento.',
  JA_INSCRITO: 'Já existe uma inscrição com este CPF. Se precisar corrigir algum dado, fale com a organização.',
  WORKSHOP_INVALIDO: 'Um dos workshops escolhidos não está mais disponível. Atualize a página.',
  WORKSHOP_ESGOTADO: 'Um dos workshops escolhidos lotou. Atualize a página e escolha outro.',
}

export default function Inscricao() {
  const navigate = useNavigate()
  const { settings, loading } = useEventSettings()
  const { availability, reload } = useAvailability()
  const { items: workshops } = usePublicList<WorkshopPublic>('workshops_public')

  const [fullName, setFullName] = useState('')
  const [cpf, setCpf] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [instagram, setInstagram] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [selectedWorkshops, setSelectedWorkshops] = useState<string[]>([])
  const [imageConsent, setImageConsent] = useState(false)
  const [consentRequired, setConsentRequired] = useState(false)
  const [guardianAck, setGuardianAck] = useState(false)
  const [consentMarketing, setConsentMarketing] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isMinor = !!settings && !!birthDate && isValidBirthDate(birthDate)
    ? computeAge(birthDate, settings!.event_date) < 18
    : false

  const chooseWorkshops = !!settings?.workshop_selection_enabled && workshops.length > 0
  const eventName = settings?.event_name ?? ''

  function toggleWorkshop(id: string) {
    setSelectedWorkshops((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!fullName.trim() || fullName.trim().length < 3) errs.fullName = 'Informe seu nome completo.'
    if (!isValidCPF(cpf)) errs.cpf = 'CPF inválido.'
    if (phone.replace(/\D/g, '').length < 10) errs.phone = 'Informe um telefone/WhatsApp válido, com DDD.'
    if (!isValidEmail(email)) errs.email = 'E-mail inválido.'
    if (!birthDate || !isValidBirthDate(birthDate)) errs.birthDate = 'Informe uma data de nascimento válida.'
    if (chooseWorkshops && selectedWorkshops.length === 0) errs.workshops = 'Escolha pelo menos um workshop.'
    if (!imageConsent) errs.imageConsent = 'É necessário autorizar o uso de imagem.'
    if (!consentRequired) errs.consentRequired = 'É necessário aceitar para continuar.'
    if (isMinor && !guardianAck) errs.guardianAck = 'É necessário confirmar a ciência sobre a autorização do responsável.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    if (!validate()) {
      setTimeout(() => document.querySelector('.field.error, .checkbox-field.error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
      return
    }

    setSubmitting(true)
    const { data, error } = await supabase.rpc('register_participant', {
      p_full_name: fullName,
      p_cpf: cpf,
      p_phone: phone,
      p_email: email,
      p_instagram: instagram || null,
      p_birth_date: birthDate,
      p_consent_required: consentRequired,
      p_image_consent: imageConsent,
      p_guardian_ack: guardianAck,
      p_consent_marketing: consentMarketing,
      p_workshop_ids: chooseWorkshops ? selectedWorkshops : null,
    })
    setSubmitting(false)

    if (error) {
      const key = error.message?.match(/[A-Z_]{4,}/)?.[0] ?? ''
      setSubmitError(ERROR_MESSAGES[key] ?? 'Não foi possível concluir a inscrição. Tente novamente em instantes.')
      reload()
      return
    }

    const row = ((data ?? []) as RegisterResult[])[0]
    if (!row) {
      setSubmitError('Não foi possível concluir a inscrição. Tente novamente em instantes.')
      return
    }
    navigate(`/confirmacao/${row.confirmation_token}`)
  }

  const closed = !loading && settings && !settings.registrations_open
  const external = settings?.registration_form_url?.trim()

  return (
    <div>
      <Header />

      <section className="section dark page-head">
        <div className="container">
          <div className="section-kicker">Inscrição geral</div>
          <h2>{closed ? 'Inscrições em breve.' : 'Faça sua inscrição.'}</h2>
          {settings && (
            <p className="lead">
              {formatWeekdayDate(settings.event_date)}, {settings.location_address}. Gratuito.
              Uma inscrição vale para o dia inteiro.
            </p>
          )}
        </div>
      </section>

      <section className="section off">
        <div className="container">
          {loading && <p>Carregando...</p>}

          {closed && (
            <div className="form-panel">
              <h3>As inscrições ainda não abriram</h3>
              <p className="panel-text">
                Assim que abrirem, o botão de inscrição aparece aqui e na página inicial.
                Acompanhe as redes do encontro.
              </p>
              <p className="panel-text">Para competir nas batalhas: {battleSignupText(settings).toLowerCase()}.</p>
              <Link to="/" className="btn-secondary" style={{ marginTop: 18 }}>Voltar ao início</Link>
            </div>
          )}

          {!loading && settings?.registrations_open && external && (
            <div className="form-panel">
              <h3>A inscrição é feita por formulário</h3>
              <p className="panel-text">Toque no botão abaixo para abrir o formulário de inscrição.</p>
              <a href={external} target="_blank" rel="noreferrer" className="submit-btn">Abrir formulário de inscrição</a>
            </div>
          )}

          {!loading && settings?.registrations_open && !external && (
            <div className="form-panel">
              {availability?.status === 'lista_espera' && (
                <div className="minor-notice">
                  As vagas do dia acabaram. Você ainda pode se inscrever: a inscrição entra na
                  <strong> lista de espera</strong> e a organização chama por ordem de chegada se abrir vaga.
                </div>
              )}

              <h3>Seus dados</h3>
              {submitError && <div className="form-alert" role="alert">{submitError}</div>}

              <form onSubmit={handleSubmit} noValidate>
                <div className={`field ${errors.fullName ? 'error' : ''}`}>
                  <label htmlFor="f-nome">Nome completo *</label>
                  <input id="f-nome" type="text" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  {errors.fullName && <div className="error-msg">{errors.fullName}</div>}
                </div>

                <div className={`field ${errors.cpf ? 'error' : ''}`}>
                  <label htmlFor="f-cpf">CPF *</label>
                  <input id="f-cpf" type="text" inputMode="numeric" value={cpf} onChange={(e) => setCpf(formatCPF(e.target.value))} placeholder="000.000.000-00" />
                  {errors.cpf && <div className="error-msg">{errors.cpf}</div>}
                </div>

                <div className={`field ${errors.phone ? 'error' : ''}`}>
                  <label htmlFor="f-tel">Telefone / WhatsApp *</label>
                  <input id="f-tel" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(19) 90000-0000" />
                  {errors.phone && <div className="error-msg">{errors.phone}</div>}
                </div>

                <div className={`field ${errors.email ? 'error' : ''}`}>
                  <label htmlFor="f-email">E-mail *</label>
                  <input id="f-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  {errors.email && <div className="error-msg">{errors.email}</div>}
                </div>

                <div className={`field ${errors.birthDate ? 'error' : ''}`}>
                  <label htmlFor="f-nasc">Data de nascimento *</label>
                  <input id="f-nasc" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                  {errors.birthDate && <div className="error-msg">{errors.birthDate}</div>}
                </div>

                <div className="field">
                  <label htmlFor="f-insta">Instagram (opcional)</label>
                  <input id="f-insta" type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@seuusuario" />
                </div>

                {chooseWorkshops && (
                  <fieldset className={`workshop-pick ${errors.workshops ? 'error' : ''}`}>
                    <legend>Quais workshops você quer fazer? *</legend>
                    {workshops.map((w) => (
                      <label key={w.id} className="checkbox-field">
                        <input type="checkbox" checked={selectedWorkshops.includes(w.id)} onChange={() => toggleWorkshop(w.id)} />
                        <span>
                          <strong>{w.modality || 'Workshop'}</strong> com {w.teacher_name}
                          {w.start_time && <> · {formatHourRange(w.start_time, w.duration_minutes)}</>}
                        </span>
                      </label>
                    ))}
                    {errors.workshops && <div className="error-msg">{errors.workshops}</div>}
                  </fieldset>
                )}

                {isMinor && (
                  <div className="minor-notice">
                    Pela data de nascimento, você terá menos de 18 anos no dia do evento. Para
                    participar, é preciso levar a autorização assinada pelo pai, mãe ou responsável legal.
                    {settings.guardian_authorization_pdf_url ? (
                      <div>
                        <a className="pdf-link" href={settings.guardian_authorization_pdf_url} target="_blank" rel="noreferrer">
                          Baixar autorização (PDF)
                        </a>
                      </div>
                    ) : (
                      <div className="notice-sub">O modelo de autorização será disponibilizado em breve pela organização.</div>
                    )}
                  </div>
                )}

                <div className="consent-group-title">Autorizações obrigatórias</div>

                <label className={`checkbox-field ${errors.imageConsent ? 'error' : ''}`}>
                  <input type="checkbox" checked={imageConsent} onChange={(e) => setImageConsent(e.target.checked)} />
                  <span>
                    Autorizo gratuitamente o uso da minha imagem e voz em fotografias, vídeos e demais
                    registros feitos durante o {eventName}, para divulgação institucional, cultural e
                    promocional do evento e de seus realizadores. *
                  </span>
                </label>
                {errors.imageConsent && <div className="error-msg consent-error">{errors.imageConsent}</div>}

                <label className={`checkbox-field ${errors.consentRequired ? 'error' : ''}`}>
                  <input type="checkbox" checked={consentRequired} onChange={(e) => setConsentRequired(e.target.checked)} />
                  <span>
                    Declaro que as informações são verdadeiras e autorizo o uso dos meus dados para a
                    inscrição e para comunicações sobre o {eventName}. *
                  </span>
                </label>
                {errors.consentRequired && <div className="error-msg consent-error">{errors.consentRequired}</div>}

                {isMinor && (
                  <>
                    <label className={`checkbox-field ${errors.guardianAck ? 'error' : ''}`}>
                      <input type="checkbox" checked={guardianAck} onChange={(e) => setGuardianAck(e.target.checked)} />
                      <span>
                        Estou ciente de que preciso apresentar a autorização assinada pelo meu responsável
                        para participar das atividades. *
                      </span>
                    </label>
                    {errors.guardianAck && <div className="error-msg consent-error">{errors.guardianAck}</div>}
                  </>
                )}

                <div className="consent-group-title optional">Opcional</div>

                <label className="checkbox-field">
                  <input type="checkbox" checked={consentMarketing} onChange={(e) => setConsentMarketing(e.target.checked)} />
                  <span>Aceito receber informações sobre próximas ações e eventos de danças urbanas da organização.</span>
                </label>

                <button type="submit" className="submit-btn" disabled={submitting}>
                  {submitting ? 'Enviando...' : 'Confirmar inscrição'}
                </button>
                <p className="form-foot">Para competir nas batalhas: {battleSignupText(settings).toLowerCase()}.</p>
              </form>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}
