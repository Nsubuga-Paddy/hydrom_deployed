import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AuthProvider } from './hooks/AuthContext'
import { DamsProvider } from './hooks/DamsContext'
import { ThemeProvider } from './hooks/ThemeContext'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <DamsProvider>
          <App />
        </DamsProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
