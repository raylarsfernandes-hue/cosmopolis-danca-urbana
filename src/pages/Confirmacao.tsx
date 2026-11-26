import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useEventSettings } from '../hooks/useEventSettings'
import type { ConfirmationRow } from '../types'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { formatWeekdayDate } from '../utils/format'

export default function Confirmacao() {
  const { token } = useParams()
  const { settings } = useEventSettings()
  const [row, setRow] = useState<ConfirmationRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    supabase.rpc('get_registration_by_token', { p_token: token }).then(({ data }) => {
      setRow(((data ?? []) as ConfirmationRow[])[0] ?? null)
      setLoading(false)
    })
  }, [token])

  const waitlisted = row?.status === 'waitlisted'
  const cancelled = row?.status === 'cancelled'

  return (
    <div>
      <Header />

      <div className="confirm-box">
        {loading && <p>Carregando...</p>}

        {!loading && !row && (
          <>
            <h2>Inscrição não encontrada</h2>
            <p className="confirm-text">Não localizamos essa inscrição. Confira o link ou faça uma nova inscrição.</p>
            <Link to="/inscricao" className="btn-primary">Ir para a inscrição</Link>
          </>
        )}

        {!loading && row && (
          <>
            <div className={`confirm-check ${waitlisted ? 'wait' : ''}`} aria-hidden="true">{waitlisted ? '…' : '✓'}</div>
            <h2>
              {cancelled ? 'Inscrição cancelada' : waitlisted ? 'Você está na lista de espera' : 'Inscrição confirmada!'}
            </h2>
            <p className="confirm-text">
              {cancelled
                ? 'Esta inscrição foi cancelada. Em caso de dúvida, fale com a organização.'
                : waitlisted
                  ? `${row.full_name}, as vagas do dia acabaram e sua inscrição entrou na lista de espera${row.waitlist_position ? ` (posição ${row.waitlist_position})` : ''}. Se abrir vaga, a organização entra em contato.`
                  : `${row.full_name}, você está inscrito(a) no ${settings?.event_name ?? 'encontro'}. Guarde o código abaixo: ele é usado no check-in.`}
            </p>

            {!cancelled && settings && (
              <div className="confirm-card">
                <div className="row"><span>Data</span><strong>{formatWeekdayDate(settings.event_date)}</strong></div>
                <div className="row">
                  <span>Endereço</span>
                  <strong className="right">
                    {settings.location_name?.trim() && <>{settings.location_name}<br /></>}
                    {settings.location_address}
                  </strong>
                </div>
                <div className="row"><span>Entrada</span><strong>Gratuita</strong></div>
                {row.workshops?.length > 0 && (
                  <>
                    <div className="confirm-list-label">Workshops</div>
                    <ul className="confirm-list">{row.workshops.map((w) => <li key={w}>{w}</li>)}</ul>
                  </>
                )}
                {row.battles?.length > 0 && (
                  <>
                    <div className="confirm-list-label">Batalhas{row.artistic_name ? ` · como ${row.artistic_name}` : ''}</div>
                    <ul className="confirm-list">{row.battles.map((b) => <li key={b}>{b}</li>)}</ul>
                  </>
                )}
                <div className="confirm-code-label">Código de inscrição</div>
                <div className="confirm-code">{row.code}</div>
              </div>
            )}

            {!cancelled && row.is_minor && (
              <div className="minor-notice">
                Lembre-se de levar a autorização assinada pelo seu responsável no dia.
                {settings?.guardian_authorization_pdf_url && (
                  <div>
                    <a className="pdf-link" href={settings.guardian_authorization_pdf_url} target="_blank" rel="noreferrer">
                      Baixar autorização (PDF)
                    </a>
                  </div>
                )}
              </div>
            )}


            <div className="confirm-actions">
              <Link to={{ pathname: '/', hash: '#programacao' }} className="btn-secondary">Ver programação</Link>
              <Link to="/" className="btn-primary">Voltar ao início</Link>
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}
