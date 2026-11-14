import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/base.css'
import './components/components.css'
import './features/explore/explore.css'
import App from './App.tsx'
import { MarswalkProvider } from './state/MarswalkContext'
import { DerivedProvider } from './state/DerivedProvider'
import { AuthProvider } from './state/AuthProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <MarswalkProvider>
        <DerivedProvider>
          <App />
        </DerivedProvider>
      </MarswalkProvider>
    </AuthProvider>
  </StrictMode>,
)
