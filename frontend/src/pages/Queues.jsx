import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import api from '../lib/api'
import {
  Plus, Play, Pause, Trash2, Pencil,
  ListVideo, Clock, Calendar
} from 'lucide-react'

const DAYS = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom']

function QueueCard({ queue, onPause, onResume, onDelete, onEdit }) {
  const rules = queue.rules || {}
  const days = (rules.allowed_days || []).map(d => DAYS[d]).join(', ')
  const times = (rules.publish_times || []).join(', ')

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            queue.is_active ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            <ListVideo className={`w-5 h-5 ${
              queue.is_active ? 'text-green-600' : 'text-gray-400'
            }`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{queue.name}</h3>
            {queue.description && (
              <p className="text-sm text-gray-500">{queue.description}</p>
            )}
          </div>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          queue.is_active
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-500'
        }`}>
          {queue.is_active ? 'Activa' : 'Pausada'}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span>{days || 'Todos os dias'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4 text-gray-400" />
          <span>{times || '18:00'}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
        {queue.is_active ? (
          <button
            onClick={() => onPause(queue.id)}
            className="flex items-center gap-1 text-sm text-yellow-600 hover:text-yellow-700 px-3 py-1.5 rounded-lg hover:bg-yellow-50 transition-colors"
          >
            <Pause className="w-4 h-4" />
            Pausar
          </button>
        ) : (
          <button
            onClick={() => onResume(queue.id)}
            className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
          >
            <Play className="w-4 h-4" />
            Activar
          </button>
        )}
        <button
          onClick={() => onEdit(queue)}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <Pencil className="w-4 h-4" />
          Editar
        </button>
        <button
          onClick={() => onDelete(queue.id)}
          className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors ml-auto"
        >
          <Trash2 className="w-4 h-4" />
          Apagar
        </button>
      </div>
    </div>
  )
}

function QueueModal({ queue, onClose, onSaved, platformId }) {
  const isEdit = !!queue
  const [form, setForm] = useState({
    name: queue?.name || '',
    description: queue?.description || '',
    publish_times: queue?.rules?.publish_times?.[0] || '18:00',
    allowed_days: queue?.rules?.allowed_days || [1, 2, 3, 4, 5],
    min_interval_hours: queue?.rules?.min_interval_hours || 24,
    auto_story: queue?.auto_story ?? true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const toggleDay = (day) => {
    setForm(f => ({
      ...f,
      allowed_days: f.allowed_days.includes(day)
        ? f.allowed_days.filter(d => d !== day)
        : [...f.allowed_days, day].sort()
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = {
        name: form.name,
        description: form.description,
        auto_story: form.auto_story,
        rules: {
          allowed_days: form.allowed_days,
          publish_times: [form.publish_times],
          min_interval_hours: form.min_interval_hours,
          max_posts_per_day: 1
        }
      }

      if (isEdit) {
        await api.patch(`/api/queues/${queue.id}`, payload)
      } else {
        await api.post('/api/queues/', {
          ...payload,
          platform_id: platformId,
        })
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao guardar fila')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">
          {isEdit ? 'Editar Fila' : 'Nova Fila'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ex: Posts diários"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Descrição da fila"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Dias de publicação</label>
            <div className="flex gap-2 flex-wrap">
              {[1,2,3,4,5,6,7].map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    form.allowed_days.includes(day)
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {DAYS[day]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hora de publicação</label>
            <input
              type="time"
              value={form.publish_times}
              onChange={e => setForm({...form, publish_times: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Intervalo mínimo entre posts (horas)
            </label>
            <input
              type="number"
              value={form.min_interval_hours}
              onChange={e => setForm({...form, min_interval_hours: parseInt(e.target.value)})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              min="1"
              max="168"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="auto_story"
              checked={form.auto_story}
              onChange={e => setForm({...form, auto_story: e.target.checked})}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <label htmlFor="auto_story" className="text-sm text-gray-700">
              Criar story automaticamente para cada post
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'A guardar...' : isEdit ? 'Guardar alterações' : 'Criar Fila'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Queues() {
  const [queues, setQueues] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingQueue, setEditingQueue] = useState(null)
  const [platformId, setPlatformId] = useState(null)

  const fetchQueues = async () => {
    try {
      const [queuesRes, platformsRes] = await Promise.all([
        api.get('/api/queues/'),
        api.get('/api/platforms/')
      ])
      setQueues(queuesRes.data)
      const instagram = platformsRes.data.find(p => p.name === 'instagram')
      if (instagram) setPlatformId(instagram.id)
    } catch (err) {
      console.error('Erro ao carregar filas:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchQueues() }, [])

  const handlePause  = async (id) => { await api.patch(`/api/queues/${id}/pause`);  fetchQueues() }
  const handleResume = async (id) => { await api.patch(`/api/queues/${id}/resume`); fetchQueues() }
  const handleDelete = async (id) => {
    if (!confirm('Tens a certeza que queres apagar esta fila?')) return
    await api.delete(`/api/queues/${id}`)
    fetchQueues()
  }
  const handleEdit = (queue) => { setEditingQueue(queue); setShowModal(true) }
  const handleNew  = () => { setEditingQueue(null); setShowModal(true) }
  const handleSaved = () => { setShowModal(false); setEditingQueue(null); fetchQueues() }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Filas</h1>
          <p className="text-gray-500 mt-1">Gere as tuas filas de publicação</p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Fila
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : queues.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <ListVideo className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900 mb-2">Nenhuma fila criada</h3>
          <p className="text-sm text-gray-500 mb-4">
            Cria a tua primeira fila para começar a agendar posts
          </p>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Criar primeira fila
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {queues.map(queue => (
            <QueueCard
              key={queue.id}
              queue={queue}
              onPause={handlePause}
              onResume={handleResume}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {showModal && (
        <QueueModal
          queue={editingQueue}
          platformId={platformId}
          onClose={() => { setShowModal(false); setEditingQueue(null) }}
          onSaved={handleSaved}
        />
      )}
    </Layout>
  )
}
