import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../supabaseClient'

const TABS = [
  { to: '/admin', label: 'Painel', end: true },
  { to: '/admin/inscritos', label: 'Inscritos' },
  { to: '/admin/workshops', label: 'Workshops' },
  { to: '/admin/batalhas', label: 'Batalhas' },
  { to: '/admin/regua', label: 'Régua' },
  { to: '/admin/configuracoes', label: 'Configurações' },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session === undefined) return
    if (session === null) {
      navigate('/admin/login')
      return
    }
    supabase.rpc('is_admin').then(({ data }) => setIsAdmin(!!data))
  }, [session, navigate])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  if (session === undefined || (session && isAdmin === null)) {
    return <div className="admin-shell"><p style={{ padding: 40 }}>Carregando...</p></div>
  }

  if (session && isAdmin === false) {
    return (
      <div className="admin-shell">
        <div className="admin-login">
          <h2>Acesso não autorizado</h2>
          <p className="admin-help">
            Sua conta entrou, mas ainda não foi liberada como administradora. Peça para alguém
            incluir seu usuário na tabela <code>admins</code> do Supabase.
          </p>
          <button className="btn-sm" onClick={handleLogout}>Sair</button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      <div className="admin-topbar">
        <nav className="tabs">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? 'active' : '')}>{t.label}</NavLink>
          ))}
        </nav>
        <button className="btn-sm" onClick={handleLogout}>Sair</button>
      </div>
      <div className="admin-body">
        <Outlet />
      </div>
    </div>
  )
}
