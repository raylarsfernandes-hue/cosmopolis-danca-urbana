import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// fontes servidas pelo próprio site (sem requisição ao Google a cada visita)
import '@fontsource/barlow-condensed/latin-700-italic.css'
import '@fontsource/barlow-condensed/latin-800-italic.css'
import '@fontsource/barlow-condensed/latin-900-italic.css'
import '@fontsource/dm-sans/latin-400.css'
import '@fontsource/dm-sans/latin-500.css'
import '@fontsource/dm-sans/latin-700.css'
import App from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
