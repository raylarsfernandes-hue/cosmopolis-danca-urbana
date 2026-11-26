import { Link } from 'react-router-dom'
import type { BattlePublic, EventSettings } from '../types'
import { formatHour, formatMoney } from '../utils/format'
import { resolveImageUrl } from '../utils/image'
import { registrationTarget } from '../utils/registration'

// "Step Pérez, Marcão e Wellington Rodrigues" -> "Jurados"; um nome só -> "Júri"
export function judgesLabel(names: string | null | undefined): string {
  if (!names) return 'Júri'
  return /,|\s+e\s+/.test(names) ? 'Jurados' : 'Júri'
}

export default function BattleCard({ battle, settings }: { battle: BattlePublic; settings: EventSettings | null }) {
  const photo = resolveImageUrl(battle.judge_photo_url)
  // "Batalha de breaking" -> kicker "Batalha de" + título "breaking"
  const m = battle.name.match(/^(batalha(?:\s+de)?)\s+(.+)$/i)
  const kicker = m ? m[1] : 'Batalha'
  const title = m ? m[2] : battle.name
  const reg = registrationTarget(settings)

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
            <span className="battle-judge-label">{judgesLabel(battle.judge_name)}</span>
            <strong>{battle.judge_name}</strong>
          </div>
        </div>
      )}

      {settings && (reg.open ? (
        reg.external
          ? <a className="battle-signup battle-signup-btn" href={reg.href} target="_blank" rel="noreferrer">Quero competir</a>
          : <Link className="battle-signup battle-signup-btn" to={`/inscricao?batalha=${battle.id}`}>Quero competir</Link>
      ) : (
        <p className="battle-signup">Inscrições em breve</p>
      ))}
    </article>
  )
}
