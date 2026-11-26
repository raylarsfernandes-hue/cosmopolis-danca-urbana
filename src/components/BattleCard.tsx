import type { BattlePublic, EventSettings } from '../types'
import { formatDayMonthShort, formatHour, formatMoney } from '../utils/format'
import { resolveImageUrl } from '../utils/image'

// Texto padrão das batalhas: inscrição só no local, no dia do evento.
// O horário-limite aparece sozinho quando for preenchido no admin.
export function battleSignupText(settings: EventSettings | null): string {
  if (!settings) return 'Inscrição no local'
  const base = `Inscrição no local, no dia ${formatDayMonthShort(settings.event_date)}`
  return settings.battle_signup_deadline
    ? `${base}, até as ${formatHour(settings.battle_signup_deadline)}`
    : base
}

export default function BattleCard({ battle, settings }: { battle: BattlePublic; settings: EventSettings | null }) {
  const photo = resolveImageUrl(battle.judge_photo_url)
  // "Batalha de breaking" -> kicker "Batalha de" + título "breaking"
  const m = battle.name.match(/^(batalha(?:\s+de)?)\s+(.+)$/i)
  const kicker = m ? m[1] : 'Batalha'
  const title = m ? m[2] : battle.name
  return (
    <article className="battle-card">
      <header className="battle-head">
        <span className="battle-kicker">{kicker}</span>
        <h3>{title}</h3>
        {battle.audience && <p className="battle-audience">{battle.audience}</p>}
        {battle.start_time && <p className="battle-time">{formatHour(battle.start_time)}</p>}
      </header>

      <dl className="battle-prizes">
        {battle.prize_first !== null && (
          <div><dt>1º lugar</dt><dd>{formatMoney(battle.prize_first)}</dd></div>
        )}
        {battle.prize_second !== null && (
          <div><dt>2º lugar</dt><dd>{formatMoney(battle.prize_second)}</dd></div>
        )}
      </dl>

      {battle.judge_name && (
        <div className="battle-judge">
          {photo && <img src={photo} alt="" loading="lazy" />}
          <div>
            <span className="battle-judge-label">Júri</span>
            <strong>{battle.judge_name}</strong>
          </div>
        </div>
      )}

      <p className="battle-signup">{battleSignupText(settings)}</p>
    </article>
  )
}
