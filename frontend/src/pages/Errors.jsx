import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import api from '../lib/api'
import {
  AlertCircle, CheckCircle, Clock, RefreshCw,
  Trash2, Calendar, ChevronDown, ChevronUp
} from 'lucide-react'

const CATEGORY_LABELS = {
  auto_recoverable: { label: 'Auto-recuperável', color: 'bg-blue-100 text-blue-700' },
  user_decision:    { label: 'Requer decisão',   color: 'bg-yellow-100 text-yellow-700' },
  critical:         { label: 'Crítico',           color: 'bg-red-100 text-red-700' },
}

const STATUS_LABELS = {
  open:     { label: 'Por resolver', color: 'bg-red-100 text-red-700' },
  retrying: { label: 'A retentar',   color: 'bg-blue-100 text-blue-700' },
  resolved: { label: 'Resolvido',    color: 'bg-green-100 text-green-700' },
  cancelled:{ label: 'Cancelado',    color: 'bg-gray-100 text-gray-600' },
}

function ResolveModal({ error, onClose, onResolved }) {
  const [action, setAction] = useState('fix')
  const [note, setNote] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [loading, setLoading] = useState(false)

  const handleResolve = async () => {
    setLoading(true)
    try {
      await api.patch(`/api/errors/${error.id}/resolve`, {
        action,
        resolution_note: note || null,
        scheduled_at: action === 'reschedule' && scheduledAt ? scheduledAt : null
      })
      onResolved()
      onClose()
    } catch (err) {
      console.error('Erro ao resolver:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Resolver Erro</h2>

        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700 font-medium">{error.message}</p>
          {error.error_code && (
            <p className="text-xs text-red-500 mt-1">Código: {error.error_code}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Acção</label>
          <div className="space-y-2">
            {[
              { v: 'fix',        l: '🔧 Corrigir e rever',      d: 'O post volta a estado de revisão' },
              { v: 'reschedule', l: '📅 Reagendar',              d: 'Agenda o post para uma nova data' },
              { v: 'cancel',     l: '🗑️ Cancelar post',          d: 'Cancela o post definitivamente' },
            ].map(opt => (
              <label key={opt.v} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${action === opt.v ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" name="action" value={opt.v} checked={action === opt.v} onChange={e => setAction(e.target.value)} className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{opt.l}</p>
                  <p className="text-xs text-gray-500">{opt.d}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {action === 'reschedule' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova data e hora</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nota (opcional)</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={2}
            placeholder="Notas sobre a resolução..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={handleResolve} disabled={loading}
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
            {loading ? 'A resolver...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ErrorCard({ error, onResolved }) {
  const [expanded, setExpanded] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const category = CATEGORY_LABELS[error.category] || { label: error.category, color: 'bg-gray-100 text-gray-600' }
  const status = STATUS_LABELS[error.status] || { label: error.status, color: 'bg-gray-100 text-gray-600' }
  const date = new Date(error.occurred_at).toLocaleString('pt-PT')

  return (
    <div className={`bg-white rounded-xl border p-5 transition-all ${error.status === 'open' ? 'border-red-200' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`mt-0.5 flex-shrink-0 ${error.status === 'open' ? 'text-red-500' : 'text-gray-400'}`}>
            {error.status === 'resolved'
              ? <CheckCircle className="w-5 h-5 text-green-500" />
              : error.status === 'retrying'
              ? <RefreshCw className="w-5 h-5 text-blue-500" />
              : <AlertCircle className="w-5 h-5 text-red-500" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
                {status.label}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${category.color}`}>
                {category.label}
              </span>
              {error.error_code && (
                <span className="text-xs text-gray-400 font-mono">{error.error_code}</span>
              )}
            </div>
            <p className="text-sm text-gray-900 font-medium truncate">{error.message}</p>
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              {date}
              {error.retry_count > 0 && (
                <span className="ml-2">· {error.retry_count} tentativa{error.retry_count > 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {error.status === 'open' && (
            <button
              onClick={() => setShowModal(true)}
              className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-medium transition-colors"
            >
              Resolver
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
          {error.post_id && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">ID do Post</p>
              <p className="text-xs font-mono text-gray-700 bg-gray-50 rounded p-2">{error.post_id}</p>
            </div>
          )}
          {error.stack_trace && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Stack Trace</p>
              <pre className="text-xs text-gray-700 bg-gray-50 rounded p-2 overflow-x-auto whitespace-pre-wrap">{error.stack_trace}</pre>
            </div>
          )}
          {error.resolution_note && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Nota de resolução</p>
              <p className="text-xs text-gray-700 bg-green-50 rounded p-2">{error.resolution_note}</p>
            </div>
          )}
          {error.resolved_at && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle className="w-3 h-3" />
              Resolvido em {new Date(error.resolved_at).toLocaleString('pt-PT')}
              {error.resolved_by && <span>· por {error.resolved_by}</span>}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <ResolveModal
          error={error}
          onClose={() => setShowModal(false)}
          onResolved={onResolved}
        />
      )}
    </div>
  )
}

export default function Errors() {
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('open')

  const fetchErrors = async () => {
    setLoading(true)
    try {
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const res = await api.get(`/api/errors/${params}`)
      setErrors(res.data)
    } catch (err) {
      console.error('Erro ao carregar erros:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchErrors() }, [filter])

  const openCount = errors.filter(e => e.status === 'open').length

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Erros</h1>
          <p className="text-gray-500 mt-1">
            {openCount > 0
              ? `${openCount} erro${openCount > 1 ? 's' : ''} por resolver`
              : 'Nenhum erro por resolver'
            }
          </p>
        </div>
        <button
          onClick={fetchErrors}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        {[
          { v: 'open',     l: 'Por resolver' },
          { v: 'resolved', l: 'Resolvidos' },
          { v: 'all',      l: 'Todos' },
        ].map(f => (
          <button
            key={f.v}
            onClick={() => setFilter(f.v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.v
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {f.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : errors.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900 mb-2">
            {filter === 'open' ? 'Nenhum erro por resolver' : 'Nenhum erro encontrado'}
          </h3>
          <p className="text-sm text-gray-500">
            {filter === 'open' ? 'Tudo a funcionar correctamente!' : 'Não há erros com este filtro.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {errors.map(error => (
            <ErrorCard
              key={error.id}
              error={error}
              onResolved={fetchErrors}
            />
          ))}
        </div>
      )}
    </Layout>
  )
}
