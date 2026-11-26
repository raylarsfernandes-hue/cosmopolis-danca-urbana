import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Inscricao from './pages/Inscricao'
import Confirmacao from './pages/Confirmacao'
import AdminLogin from './pages/admin/Login'
import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Inscritos from './pages/admin/Inscritos'
import AdminWorkshops from './pages/admin/Workshops'
import AdminBatalhas from './pages/admin/Batalhas'
import AdminRegua from './pages/admin/Regua'
import Configuracoes from './pages/admin/Configuracoes'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/programacao" element={<Navigate to="/#programacao" replace />} />
      <Route path="/batalhas" element={<Navigate to="/#batalhas" replace />} />
      <Route path="/como-chegar" element={<Navigate to="/#como-chegar" replace />} />
      <Route path="/inscricao" element={<Inscricao />} />
      <Route path="/confirmacao/:token" element={<Confirmacao />} />

      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="inscritos" element={<Inscritos />} />
        <Route path="workshops" element={<AdminWorkshops />} />
        <Route path="batalhas" element={<AdminBatalhas />} />
        <Route path="regua" element={<AdminRegua />} />
        <Route path="configuracoes" element={<Configuracoes />} />
      </Route>

      <Route path="*" element={<Home />} />
    </Routes>
  )
}
