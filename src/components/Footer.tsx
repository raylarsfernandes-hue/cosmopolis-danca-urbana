import PartnerBar from './PartnerBar'
import { useEventSettings } from '../hooks/useEventSettings'
import { formatDateLong } from '../utils/format'

export default function Footer() {
  const { settings } = useEventSettings()
  return (
    <>
      <PartnerBar />
      <footer className="site-footer">
        <div className="container">
          {settings && (
            <>
              <strong>{settings.event_name}</strong>
              <br />
              {formatDateLong(settings.event_date)} · {settings.location_address}
              <br />
              Evento gratuito.
            </>
          )}
        </div>
      </footer>
    </>
  )
}
