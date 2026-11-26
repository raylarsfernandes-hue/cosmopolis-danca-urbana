import { usePublicList } from '../hooks/usePublicList'
import { useEventSettings } from '../hooks/useEventSettings'
import { resolveImageUrl } from '../utils/image'
import type { PartnerLogo } from '../types'

/**
 * Régua institucional. Os logos são cadastrados em /admin/regua (upload e ordem).
 * Enquanto não houver nenhum logo ativo, a régua não aparece no site.
 */
export default function PartnerBar() {
  const { items } = usePublicList<PartnerLogo>('partner_logos_public')
  const { settings } = useEventSettings()
  if (items.length === 0) return null

  return (
    <div className="partner-bar">
      <div className="container">
        {settings?.partner_bar_label && <span className="partner-label">{settings.partner_bar_label}</span>}
        <ul className="partner-logos">
          {items.map((l) => (
            <li key={l.id}>
              <img src={resolveImageUrl(l.image_url)!} alt={l.name} loading="lazy" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
