import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { ContactUsPage } from './pages/ContactUsPage'
import { DashboardPage } from './pages/DashboardPage'
import { DamMonitorPage } from './pages/DamMonitorPage'
import { DownloadDataPage } from './pages/DownloadDataPage'
import { LoginPage } from './pages/LoginPage'
import { SystemGeneratedReportsPage } from './pages/SystemGeneratedReportsPage'
import { ProfilePage } from './pages/ProfilePage'
import { RequestAccessPage } from './pages/RequestAccessPage'
import { SystemAlarmsPage } from './pages/SystemAlarmsPage'
import { VerifyLoginPage } from './pages/VerifyLoginPage'
import { damPath, type DamViewMode } from './data/dams'
import { useAuth } from './hooks/AuthContext'
import { useDams } from './hooks/DamsContext'

function DamIndexRedirect() {
  const { damId } = useParams()
  const { defaultDamId, status, dams } = useDams()
  const resolvedId = damId || defaultDamId || dams[0]?.id

  if (status === 'loading' && !resolvedId) {
    return null
  }

  if (!resolvedId) {
    return <Navigate to="/" replace />
  }

  return <Navigate to={damPath(resolvedId, 'realtime')} replace />
}

function DefaultDamRedirect({ view }: { view: DamViewMode }) {
  const { defaultDamId, status, dams, error, refresh } = useDams()
  const resolvedId = defaultDamId || dams[0]?.id

  if (status === 'loading' && !resolvedId) {
    return (
      <div className="dam-monitor-api-banner" role="status">
        <p>Loading dams from Hydro-M…</p>
      </div>
    )
  }

  if (!resolvedId) {
    return (
      <div className="dam-monitor-api-banner error" role="status">
        <p>{error || 'No dams available from the backend.'}</p>
        <button type="button" onClick={refresh}>
          Retry
        </button>
      </div>
    )
  }

  return <Navigate to={damPath(resolvedId, view)} replace />
}

function ProtectedAppLayout() {
  const { user } = useAuth()
  const location = useLocation()

  if (!user?.verified) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <AppLayout />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="request-access" element={<RequestAccessPage />} />
        <Route path="verify-login" element={<VerifyLoginPage />} />

        <Route element={<ProtectedAppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="dams/:damId/:view" element={<DamMonitorPage />} />
          <Route path="dams/:damId" element={<DamIndexRedirect />} />
          <Route path="realtime" element={<DefaultDamRedirect view="realtime" />} />
          <Route path="gis" element={<DefaultDamRedirect view="gis" />} />
          <Route path="predictions" element={<DefaultDamRedirect view="predictions" />} />
          <Route path="system-alarms" element={<SystemAlarmsPage />} />
          <Route path="download-data" element={<DownloadDataPage />} />
          <Route path="system-generated-reports" element={<SystemGeneratedReportsPage />} />
          <Route
            path="system-navigation-guide"
            element={<Navigate to="/system-generated-reports" replace />}
          />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="about-us" element={<Navigate to="/" replace />} />
          <Route path="contact-us" element={<ContactUsPage />} />
          <Route path="help" element={<Navigate to="/system-generated-reports" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
