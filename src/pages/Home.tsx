import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import RegisterButton from '../components/RegisterButton'
import BattleCard from '../components/BattleCard'
import { Sunburst, Spark, Swoosh, Rays } from '../components/Graphics'
import { useEventSettings } from '../hooks/useEventSettings'
import { usePublicList } from '../hooks/usePublicList'
import { useAvailability } from '../hooks/useAvailability'
import type { BattlePublic, WorkshopPublic } from '../types'
import {
  formatWeekdayDate, formatDayMonthDot, formatHour, formatHourRange, formatMoney,
} from '../utils/format'
import { resolveImageUrl } from '../utils/image'
import logoEvento from '../assets/logo_evento.webp'

interface ProgramItem {
  key: string
  kind: 'Workshop' | 'Batalha' | 'Jam'
  title: string
  detail: string | null
  time: string | null
  duration: number | null
}

export default function Home() {
  const { settings } = useEventSettings()
  const { items: workshops, loading: loadingW } = usePublicList<WorkshopPublic>('workshops_public')
  const { items: battles, loading: loadingB } = usePublicList<BattlePublic>('battles_public')
  const { availability } = useAvailability()
  const location = useLocation()

  // rolagem até a seção quando o link chega com âncora (#programacao, #batalhas...)
  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.slice(1)
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
    return () => clearTimeout(t)
  }, [location.hash, loadingW, loadingB, settings])

  const djName = settings?.jam_dj_name?.trim() || 'DJ'
  const dateShort = settings ? formatDayMonthDot(settings.event_date) : ''

  // premiação total, calculada a partir das batalhas cadastradas
  const battleTotals = battles.map((b) => Number(b.prize_first ?? 0) + Number(b.prize_second ?? 0))
  const prizeTotal = battleTotals.reduce((a, b) => a + b, 0)
  const equalSplit = battleTotals.length > 1 && battleTotals.every((t) => t === battleTotals[0])

  // programação do dia: com horário primeiro (em ordem), depois o que ainda não tem horário
  const program: ProgramItem[] = [
    ...workshops.map((w): ProgramItem => ({
      key: `w-${w.id}`,
      kind: 'Workshop',
      title: w.modality?.trim() || w.teacher_name,
      detail: w.modality?.trim() ? `com ${w.teacher_name}` : null,
      time: w.start_time,
      duration: w.duration_minutes,
    })),
    ...battles.map((b): ProgramItem => ({
      key: `b-${b.id}`,
      kind: 'Batalha',
      title: b.name,
      detail: b.judge_name ? `Júri: ${b.judge_name}` : null,
      time: b.start_time,
      duration: null,
    })),
    ...(settings?.jam_dj_name
      ? [{
          key: 'jam', kind: 'Jam' as const, title: `Jam com ${djName}`, detail: 'Dança livre',
          time: settings.jam_start_time, duration: settings.jam_duration_minutes,
        }]
      : []),
  ]
  const timed = program.filter((p) => p.time).sort((a, b) => a.time!.localeCompare(b.time!))
  const untimed = program.filter((p) => !p.time)
  const programSorted = [...timed, ...untimed]

  const mapQuery = settings
    ? encodeURIComponent(settings.map_query?.trim() || `${settings.location_name ?? ''} ${settings.location_address}`.trim())
    : ''
  const vagas = availability && availability.max_vagas !== null && availability.registrations_open ? availability : null

  return (
    <div>
      <Header />

      {/* Abertura */}
      <section className="hero">
        <Sunburst className="hero-sun" />
        <div className="halftone halftone-tl" aria-hidden="true" />
        <div className="halftone halftone-br" aria-hidden="true" />
        <div className="container">
          <h1 className="hero-title">
            <img src={logoEvento} alt={settings?.event_name ?? 'Encontro de Danças Urbanas de Cosmópolis'} width={900} height={833} />
          </h1>

          {settings && (
            <>
              <div className="hero-date">
                <span className="hero-date-num">{dateShort}</span>
                <span className="hero-date-day">{formatWeekdayDate(settings.event_date).split(',')[0]}</span>
              </div>
              <ul className="hero-meta">
                <li className="tag">{settings.location_address}</li>
                <li className="tag tag-yellow">Gratuito</li>
              </ul>
              <p className="sub">
                Um dia inteiro de danças urbanas: workshops com professores da cena, batalhas
                valendo prêmio e jam com {djName}. Para quem já dança e para quem quer começar.
              </p>
              <div className="hero-actions">
                <RegisterButton settings={settings} showSoon />
                <Link to={{ pathname: '/', hash: '#programacao' }} className="btn-secondary">Ver programação</Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* O encontro + primeira vez */}
      <section className="section off" id="sobre">
        <div className="container split-section">
          <div className="info-block">
            <div className="section-kicker">01 · O encontro</div>
            <h2>Dança, formação<br />e roda.</h2>
            {settings?.event_objective && <p className="lead">{settings.event_objective}</p>}

            <div className="stats-row">
              <div className="stat-box"><div className="num">1</div><div className="label">dia de evento</div></div>
              <div className="stat-box"><div className="num">{loadingW ? '·' : workshops.length}</div><div className="label">workshops</div></div>
              <div className="stat-box"><div className="num">{loadingB ? '·' : battles.length}</div><div className="label">batalhas</div></div>
              {vagas ? (
                <div className="stat-box highlight">
                  <div className="num">{vagas.vagas_restantes}</div>
                  <div className="label">vagas disponíveis agora</div>
                </div>
              ) : (
                <div className="stat-box highlight"><div className="num">100%</div><div className="label">gratuito</div></div>
              )}
            </div>
          </div>

          <div className="first-time">
            <h3>Primeira vez num encontro de danças urbanas?</h3>
            <dl>
              <div>
                <dt>Workshop</dt>
                <dd>Aula com um professor convidado, para aprender ou aprofundar um estilo de dança.</dd>
              </div>
              <div>
                <dt>Batalha</dt>
                <dd>Dançarinos se enfrentam na roda e o júri escolhe quem vence. Quem assiste faz parte da energia.</dd>
              </div>
              <div>
                <dt>Jam</dt>
                <dd>Um momento de dança livre com {djName}. Entra na roda quem quiser.</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Programação */}
      <section className="section dark" id="programacao">
        <div className="container">
          <div className="section-kicker">02 · Programação</div>
          <h2>{settings ? formatWeekdayDate(settings.event_date) : 'Programação'}</h2>
          <p className="lead">Tudo acontece no mesmo dia. Uma inscrição vale para o dia inteiro.</p>

          {(loadingW || loadingB) && <p className="muted">Carregando programação...</p>}

          <ol className="program-list">
            {programSorted.map((p) => (
              <li key={p.key} className={`program-item kind-${p.kind.toLowerCase()}`}>
                {p.time && (
                  <div className="program-time">
                    <strong>{formatHour(p.time)}</strong>
                    {p.duration ? <span>até {formatHourRange(p.time, p.duration).split(' às ')[1]}</span> : null}
                  </div>
                )}
                <div className="program-body">
                  <span className="program-kind">{p.kind}</span>
                  <h3>{p.title}</h3>
                  {p.detail && <p>{p.detail}</p>}
                </div>
              </li>
            ))}
          </ol>

          {settings?.registrations_open && (
            <div className="program-foot">
              <RegisterButton settings={settings} />
            </div>
          )}
        </div>
      </section>

      {/* Professores e DJ */}
      <section className="section teal" id="professores">
        <div className="halftone halftone-tr" aria-hidden="true" />
        <div className="container">
          <div className="section-kicker">03 · Professores e DJ</div>
          <h2>Quem puxa<br />os workshops.</h2>

          <div className="teachers-row">
            {workshops.map((w) => {
              const photo = resolveImageUrl(w.photo_url)
              return (
                <figure key={w.id} className={`teacher-tile ${photo ? '' : 'no-photo'}`}>
                  <div className="teacher-photo">
                    {photo ? (
                      <img src={photo} alt={w.teacher_name} loading="lazy" />
                    ) : (
                      <>
                        <Spark className="teacher-spark" />
                        <span className="teacher-initial" aria-hidden="true">{w.teacher_name.replace(/^B-boy\s+/i, '').charAt(0)}</span>
                      </>
                    )}
                    {w.modality && <span className="teacher-modality">{w.modality}</span>}
                  </div>
                  <figcaption>
                    <span className="teacher-name">{w.teacher_name}</span>
                    {w.start_time && <span className="teacher-time">{formatHourRange(w.start_time, w.duration_minutes)}</span>}
                  </figcaption>
                </figure>
              )
            })}
          </div>

          {settings?.jam_dj_name && (
            <div className="jam-block" id="jam">
              <div className="jam-disc" aria-hidden={!settings.jam_dj_photo_url}>
                {settings.jam_dj_photo_url ? (
                  <img src={resolveImageUrl(settings.jam_dj_photo_url)!} alt={djName} loading="lazy" />
                ) : (
                  <span className="jam-disc-label">{djName}</span>
                )}
              </div>
              <div className="jam-copy">
                <div className="jam-kicker">Jam com {djName}</div>
                <h3>Vem pra roda</h3>
                <p>A roda fica aberta e o som é do {djName}. Chega junto e dança do seu jeito, em qualquer estilo.</p>
                {settings.jam_start_time && (
                  <p className="jam-time">{formatHourRange(settings.jam_start_time, settings.jam_duration_minutes)}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Batalhas */}
      <section className="section dark battles-section" id="batalhas">
        <Sunburst className="battles-sun" rays={7} />
        <div className="container">
          <div className="section-kicker">04 · Batalhas e premiação</div>
          <h2>
            {prizeTotal > 0 ? <><span className="hl">{formatMoney(prizeTotal)}</span><br />em prêmios.</> : 'Batalhas.'}
          </h2>
          {prizeTotal > 0 && equalSplit && (
            <p className="lead">
              Premiação dividida igualmente entre as {battles.length} batalhas: {formatMoney(battleTotals[0])} em cada.
            </p>
          )}
          <div className="battles-grid">
            {battles.map((b) => <BattleCard key={b.id} battle={b} settings={settings} />)}
          </div>
        </div>
      </section>

      {/* Inscrições */}
      <section className="section off" id="inscricoes">
        <div className="container cta-block">
          <div className="section-kicker">05 · Inscrições</div>
          <h2>{settings?.registrations_open ? <>Sua vaga é gratuita.<br />Garanta agora.</> : <>Inscrições<br />em breve.</>}</h2>
          <ul className="cta-points">
            <li>Uma inscrição vale para o dia inteiro: workshops, batalhas e jam.</li>
            <li>Menor de 18 anos na data do evento precisa de autorização assinada pelo responsável.</li>
            <li>Quer competir nas batalhas? A inscrição para competir é feita no local, no dia.</li>
            {vagas && (
              <li>
                {vagas.status === 'lista_espera'
                  ? 'As vagas acabaram. Quem se inscrever agora entra na lista de espera.'
                  : `Restam ${vagas.vagas_restantes} vagas.`}
              </li>
            )}
          </ul>
          {settings?.registrations_open ? (
            <>
              <RegisterButton settings={settings} label="Fazer inscrição" />
              <Swoosh className="cta-swoosh" />
            </>
          ) : (
            <p className="cta-soon">Assim que as inscrições abrirem, o botão aparece aqui. Acompanhe as redes do encontro.</p>
          )}
        </div>
      </section>

      {/* Como chegar */}
      <section className="section dark" id="como-chegar">
        <div className="container">
          <div className="section-kicker">06 · Como chegar</div>
          <h2>{settings?.location_name?.trim() || 'Como chegar'}</h2>

          {settings && (
            <div className="local-section">
              <div>
                <dl className="local-info-list">
                  <div className="row">
                    <dt className="label">Endereço</dt>
                    <dd>
                      {settings.location_address}
                      {settings.location_cep?.trim() && <><br />CEP {settings.location_cep}</>}
                    </dd>
                  </div>
                  <div className="row"><dt className="label">Data</dt><dd>{formatWeekdayDate(settings.event_date)} de {settings.event_date.slice(0, 4)}</dd></div>
                  <div className="row"><dt className="label">Entrada</dt><dd>Gratuita</dd></div>
                </dl>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary btn-map"
                >
                  Abrir no Google Maps
                </a>
              </div>
            </div>
          )}
          <Rays className="local-rays" />
        </div>
      </section>

      <Footer />
    </div>
  )
}
