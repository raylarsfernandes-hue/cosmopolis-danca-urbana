import { useState } from 'react'
import { Link } from 'react-router-dom'
import logo from '../assets/logo_header.webp'
import { useEventSettings } from '../hooks/useEventSettings'
import { registrationTarget } from '../utils/registration'
import RegisterButton from './RegisterButton'

const LINKS = [
  { hash: '#programacao', label: 'Programação' },
  { hash: '#professores', label: 'Professores e DJ' },
  { hash: '#batalhas', label: 'Batalhas e premiação' },
  { hash: '#inscricoes', label: 'Inscrições' },
  { hash: '#como-chegar', label: 'Como chegar' },
]

export default function Header() {
  const [open, setOpen] = useState(false)
  const { settings } = useEventSettings()
  const reg = registrationTarget(settings)

  return (
    <header className={`site-header ${open ? 'menu-open' : ''}`}>
      <div className="bar">
        <Link to="/" className="logo" aria-label={`${settings?.event_name ?? 'Encontro'}: início`} onClick={() => setOpen(false)}>
          <img src={logo} alt={settings?.event_name ?? ''} width={120} height={111} />
        </Link>
        <div className="header-right">
          {reg.open && <RegisterButton settings={settings} className="btn-inscrever" label="Inscreva-se" />}
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="site-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">{open ? 'Fechar menu' : 'Abrir menu'}</span>
            <span className="menu-icon" aria-hidden="true" />
          </button>
        </div>
        <nav id="site-nav" aria-label="Seções do site">
          {LINKS.map((l) => (
            <Link key={l.hash} to={{ pathname: '/', hash: l.hash }} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
