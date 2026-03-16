import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import {
  User, Lock, Instagram, Zap, Bell,
  CheckCircle, Eye, EyeOff, Save
} from 'lucide-react'

function Section({ title, description, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function SaveButton({ loading, saved }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
    >
      {saved ? (
        <><CheckCircle className="w-4 h-4" /> Guardado!</>
      ) : loading ? (
        'A guardar...'
      ) : (
        <><Save className="w-4 h-4" /> Guardar</>
      )}
    </button>
  )
}

function ProfileSection({ user }) {
  const [form, setForm] = useState({ full_name: user?.full_name || '', email: user?.email || '' })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.patch('/api/auth/profile', { full_name: form.full_name })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Section title="Perfil" description="O teu nome e informações de conta">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
          <input type="text" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="O teu nome" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" value={form.email} disabled
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
          <p className="text-xs text-gray-400 mt-1">O email não pode ser alterado</p>
        </div>
        <div className="flex justify-end">
          <SaveButton loading={loading} saved={saved} />
        </div>
      </form>
    </Section>
  )
}

function PasswordSection() {
  const [form, setForm] = useState({ current: '', new: '', confirm: '' })
  const [showPasswords, setShowPasswords] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.new !== form.confirm) {
      setError('As passwords não coincidem')
      return
    }
    if (form.new.length < 8) {
      setError('A nova password deve ter pelo menos 8 caracteres')
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.patch('/api/auth/password', {
        current_password: form.current,
        new_password: form.new
      })
      setSaved(true)
      setForm({ current: '', new: '', confirm: '' })
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao alterar password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Section title="Segurança" description="Altera a tua password de acesso">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}
        {[
          { key: 'current', label: 'Password actual' },
          { key: 'new',     label: 'Nova password' },
          { key: 'confirm', label: 'Confirmar nova password' },
        ].map(field => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
            <div className="relative">
              <input
                type={showPasswords ? 'text' : 'password'}
                value={form[field.key]}
                onChange={e => setForm({...form, [field.key]: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))}
        <div className="flex justify-end">
          <SaveButton loading={loading} saved={saved} />
        </div>
      </form>
    </Section>
  )
}

function ApiKeySection({ title, description, settingKey, placeholder, icon: Icon, docsUrl }) {
  const [value, setValue] = useState('')
  const [configured, setConfigured] = useState(false)
  const [editing, setEditing] = useState(false)
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/api/settings/${settingKey}`).then(res => {
      if (res.data.configured) {
        setValue(res.data.value)
        setConfigured(true)
        setEditing(false)
      } else {
        setEditing(true)
      }
    }).catch(() => { setEditing(true) })
  }, [settingKey])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post(`/api/settings/${settingKey}`, { value })
      setConfigured(true)
      setEditing(false)
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao guardar')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async () => {
    try {
      await api.post(`/api/settings/${settingKey}`, { value: '' })
      setValue('')
      setConfigured(false)
      setEditing(true)
    } catch (err) {}
  }

  return (
    <Section title={title} description={description}>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">{error}</div>}

      {configured && !editing ? (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-mono font-medium text-green-900">{value}</p>
              <p className="text-xs text-green-600">API Key configurada</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setValue(''); setEditing(true) }}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors">
              Alterar
            </button>
            <button onClick={handleRemove}
              className="text-xs text-red-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors">
              Remover
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={value}
                onChange={e => setValue(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                placeholder={placeholder}
              />
              <button type="button" onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {docsUrl && (
              <p className="text-xs text-gray-400 mt-1">
                Não tens uma key?{' '}
                <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                  Obtém aqui
                </a>
              </p>
            )}
          </div>
          <div className="flex justify-between items-center">
            {configured && (
              <button type="button" onClick={() => setEditing(false)}
                className="text-sm text-gray-500 hover:text-gray-700">
                Cancelar
              </button>
            )}
            <div className="ml-auto">
              <SaveButton loading={loading} saved={false} />
            </div>
          </div>
        </form>
      )}
    </Section>
  )
}

function NotificationsSection() {
  const [email, setEmail] = useState('')
  const [savedEmail, setSavedEmail] = useState('')
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/settings/alert_email').then(res => {
      if (res.data.value) {
        setEmail(res.data.value)
        setSavedEmail(res.data.value)
        setEditing(false)
      } else {
        setEditing(true)
      }
    }).catch(() => { setEditing(true) })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/api/settings/alert_email', { value: email })
      setSavedEmail(email)
      setEditing(false)
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao guardar')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = async () => {
    try {
      await api.post('/api/settings/alert_email', { value: '' })
      setEmail('')
      setSavedEmail('')
      setEditing(true)
    } catch (err) {}
  }

  return (
    <Section title="Notificações" description="Email para receber alertas de erros">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">{error}</div>}

      {savedEmail && !editing ? (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-900">{savedEmail}</p>
              <p className="text-xs text-green-600">A receber alertas de erros</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors">
              Editar
            </button>
            <button onClick={handleClear}
              className="text-xs text-red-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors">
              Remover
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email de alertas</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="alertas@exemplo.com" />
            <p className="text-xs text-gray-400 mt-1">Receberás um email quando um post falhar</p>
          </div>
          <div className="flex justify-between items-center">
            {savedEmail && (
              <button type="button" onClick={() => { setEmail(savedEmail); setEditing(false) }}
                className="text-sm text-gray-500 hover:text-gray-700">
                Cancelar
              </button>
            )}
            <div className="ml-auto">
              <SaveButton loading={loading} saved={false} />
            </div>
          </div>
        </form>
      )}
    </Section>
  )
}

export default function Settings() {
  const { user } = useAuth()

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Definições</h1>
        <p className="text-gray-500 mt-1">Gere a tua conta e integrações</p>
      </div>

      <div className="max-w-2xl">
        <ProfileSection user={user} />
        <PasswordSection />
        <ApiKeySection
          title="Instagram — Upload-Post API"
          description="Necessário para publicar automaticamente no Instagram"
          settingKey="upload_post_api_key"
          placeholder="up_xxxxxxxxxxxxxxxx"
          icon={Instagram}
          docsUrl="https://www.upload-post.com"
        />
        <ApiKeySection
          title="Claude AI"
          description="Necessário para gerar captions automaticamente com IA"
          settingKey="anthropic_api_key"
          placeholder="sk-ant-xxxxxxxxxxxxxxxx"
          icon={Zap}
          docsUrl="https://console.anthropic.com"
        />
        <NotificationsSection />
      </div>
    </Layout>
  )
}
