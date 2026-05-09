import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'
import { authAPI } from '../services/api'

export default function AuthCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const { toasts, toast } = useToast()

  useEffect(() => {
    const token = params.get('token')
    const error = params.get('error')

    if (error || !token) {
      navigate('/login?error=auth_failed')
      return
    }

    localStorage.setItem('draftly_token', token)

    authAPI.me()
      .then(user => {
        setUser(user)
        toast(`Welcome back, ${user.name || 'User'}!`, 'success')
        navigate('/dashboard')
      })
      .catch(() => navigate('/login?error=profile_failed'))
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <ToastContainer toasts={toasts} />
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Signing you in…</p>
      </div>
    </div>
  )
}
