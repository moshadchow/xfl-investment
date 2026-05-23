import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import client from '../api/client'

function Login() {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const loginRes = await client.post('/auth/login', { username, password })
      setUser(loginRes.data)
      navigate(loginRes.data.role.name === 'admin' ? '/admin' : '/dashboard', { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 bg-[#274CC5] rounded-full opacity-30 filter blur-3xl animate-pulse"></div>
        <div className="absolute -right-40 -bottom-40 h-96 w-96 bg-[#2F52D0] rounded-full opacity-25 filter blur-3xl"></div>
        <div className="absolute left-1/2 top-0 h-64 w-64 bg-[#3A5FD9] rounded-full opacity-20 filter blur-2xl"></div>
      </div>
      <div className="relative w-full max-w-sm rounded-lg bg-white/90 p-8 shadow-lg backdrop-filter backdrop-blur-lg">
        <div className="flex justify-center mb-6">
          {/* Logo */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[#274CC5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 21a2 2 0 100-4 2 2 0 000 4zM8 21a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
        </div>
        <h1 className="mb-6 text-2xl font-bold text-center text-[#274CC5]">XFL Investment</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Username field with icon */}
          <div className="flex items-center mb-1">
            <svg className="h-4 w-4 mr-2 text-[#6A86E8]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.4 1.3a1 1 0 010 1.4L6 7.58a1 1 0 00-.3 1.6c.6 1 2 1 3 1s2-.4 3-1c.6-.6.6-1.5.3-2L8.4 1.3zm-1.4 2.6L11.8 5.6a1 1 0 101.4 1.2l-3.6 3.5a1 1 0 01-1.4 0l-3.6-3.5a1 1 0 00-1.2 0zM1.2 16.8a1 1 0 010-1.6l3.4-3.4a1 1 0 011.4 0c.4.3.5.9.3 1.4l-3.4 3.4a1 1 0 01-1.6 0c-.6-.5-.6-1.1.3-1.4zM18.6 13.9a1 1 0 010-1.6l-3.4-3.4a1 1 0 011.6 1.2l3.4 3.4c-.4.3-.5.7-.2 1.1zM7.1 17.2a1 1 0 01-1.4 0c-.5.2-.6.5-.2 1 .4.5 1 .7 1 1s.5-.7 1-1c.6-.5.9-.9.3-1.2z" />
            </svg>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="flex-1 rounded border border-[#6A86E8] bg-[#D9E8FF] px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Username"
            />
          </div>
          {/* Password field with icon */}
          <div className="flex items-center mb-1">
            <svg className="h-4 w-4 mr-2 text-[#6A86E8]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v2H2a2 2 0 00-2 2v2a2 2 0 002 2h2v2a2 2 0 002 2v2a2 2 0 002-2h2V6a2 2 0 00-2-2h-2V4a2 2 0 00-2-2zm3 3a1 1 0 100 2H5.34l2.18 2.18a1 1 0 001.41-1.41L6.55 5.12H8v3h1.45l2.18-2.18a1 1 0 001.41 1.41L8.41 6.55H18a1 1 0 000-2H7.41l2.18 2.18a1 1 0 001.41-1.41L9.41 5H6a1 1 0 00-.57 1.71L4.23 7.58a1 1 0 00.29 1.41c.2.2.5.2 0 .7zM14 9a3 3 0 00-6 0v6h12V9z" />
            </svg>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 rounded border border-[#6A86E8] bg-[#D9E8FF] px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Password"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
