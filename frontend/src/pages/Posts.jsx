import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import api from '../lib/api'
import {
  Clock, CheckCircle, AlertCircle, XCircle,
  RefreshCw, Image, Images, Calendar, Pencil,
  Trash2, Eye, ChevronDown, ChevronUp, Check, X
} from 'lucide-react'

const STATUS_CONFIG = {
  draft:            { label: 'Rascunho',        color: 'bg-gray-100 text-gray-600',     icon: Clock },
  pending_review:   { label: 'Ag. revisão',     color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  scheduled:        { label: 'Agendado',         color: 'bg-blue-100 text-blue-700',     icon: Calendar },
  publishing:       { label: 'A publicar',       color: 'bg-purple-100 text-purple-700', icon: RefreshCw },
  published:        { label: 'Publicado',        color: 'bg-green-100 text-green-700',   icon: CheckCircle },
  error:            { label: 'Erro',             color: 'bg-red-100 text-red-700',       icon: AlertCircle },
  pending_decision: { label: 'Ag. decisão',      color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
  cancelled:        { label: 'Cancelado',        color: 'bg-gray-100 text-gray-500',     icon: XCircle },
}

function ReviewModal({ post, onClose, onSaved }) {
  const [draft, setDraft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [caption, setCaption] = useState(post.caption || '')
  const [hashtags, setHashtags] = useState(post.hashtags ? post.hashtags.map(h => '#' + h).join(' ') : '')
  const [chosenVersion, setChosenVersion] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get(`/api/ai/draft/${post.id}`)
      .then(res => { setDraft(res.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [post.id])

  const handleChooseVersion = (version, cap, tags) => {
    setChosenVersion(version)
    setCaption(cap || '')
    setHashtags(tags ? tags.map(h => '#' + h).join(' ') : '')
  }

  const handleApprove = async () => {
    setSaving(true)
    try {
      if (draft && chosenVersion) {
        await api.post(`/api/ai/draft/${post.id}/choose`, {
          chosen_version: chosenVersion,
          chosen_caption: caption,
          chosen_hashtags: hashtags.split(' ').filter(h => h.startsWith('#')).map(h => h.slice(1))
        })
      } else {
        await api.patch(`/api/posts/${post.id}`, {
          caption,
          hashtags: hashtags.split(' ').filter(h => h.startsWith('#')).map(h => h.slice(1))
        })
      }
      await api.patch(`/api/posts/${post.id}/approve`)
      onSaved()
      onClose()
    } catch (err) {
      console.error('Erro ao aprovar:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Rever Post</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          </div>
        ) : draft ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Escolhe uma variação de caption:</p>
            {[
              { v: 1, label: 'Tom Casual',       cap: draft.caption_v1, tags: draft.hashtags_v1 },
              { v: 2, label: 'Tom Profissional',  cap: draft.caption_v2, tags: draft.hashtags_v2 },
              { v: 3, label: 'Tom Engagement',    cap: draft.caption_v3, tags: draft.hashtags_v3 },
            ].map(opt => (
              <div
                key={opt.v}
                onClick={() => handleChooseVersion(opt.v, opt.cap, opt.tags)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  chosenVersion === opt.v
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-500">{opt.label}</span>
                  {chosenVersion === opt.v && <Check className="w-4 h-4 text-primary-600" />}
                </div>
                <p className="text-sm text-gray-700">{opt.cap || 'Sem caption'}</p>
                {opt.tags && opt.tags.length > 0 && (
                  <p className="text-xs text-primary-600 mt-1">{opt.tags.map(t => '#' + t).join(' ')}</p>
                )}
              </div>
            ))}
          </div>
        ) : null}

        <div className="space-y-3 pt-2 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-700">
            {draft ? 'Ou edita manualmente:' : 'Caption:'}
          </p>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={3}
            placeholder="Caption do post..."
          />
          <input
            type="text"
            value={hashtags}
            onChange={e => setHashtags(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="#hashtag1 #hashtag2"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={handleApprove} disabled={saving}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
            {saving ? 'A aprovar...' : '✓ Aprovar e agendar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PostCard({ post, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const config = STATUS_CONFIG[post.status] || { label: post.status, color: 'bg-gray-100 text-gray-600', icon: Clock }
  const Icon = config.icon
  const date = post.scheduled_at
    ? new Date(post.scheduled_at).toLocaleString('pt-PT')
    : post.published_at
    ? new Date(post.published_at).toLocaleString('pt-PT')
    : null

  const handleDelete = async () => {
    if (!confirm('Tens a certeza que queres apagar este post?')) return
    await api.delete(`/api/posts/${post.id}`)
    onRefresh()
  }

  const handleCancel = async () => {
    if (!confirm('Tens a certeza que queres cancelar este post?')) return
    await api.patch(`/api/posts/${post.id}/cancel`)
    onRefresh()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:shadow-sm transition-shadow">
      <div className="p-4 flex items-center gap-4">
        {/* Tipo */}
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
          {post.type === 'carousel'
            ? <Images className="w-5 h-5 text-gray-500" />
            : <Image className="w-5 h-5 text-gray-500" />
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.color}`}>
              {config.label}
            </span>
            <span className="text-xs text-gray-400 capitalize">{post.type}</span>
            {date && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />{date}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 truncate">
            {post.caption || <span className="text-gray-400 italic">Sem caption</span>}
          </p>
          {post.hashtags && post.hashtags.length > 0 && (
            <p className="text-xs text-primary-600 mt-0.5 truncate">
              {post.hashtags.slice(0, 4).map(t => '#' + t).join(' ')}
              {post.hashtags.length > 4 && ` +${post.hashtags.length - 4}`}
            </p>
          )}
        </div>

        {/* Acções */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {post.status === 'pending_review' && (
            <button
              onClick={() => setShowReview(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Rever
            </button>
          )}
          {['scheduled', 'pending_review', 'draft'].includes(post.status) && (
            <button
              onClick={handleCancel}
              className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
              title="Cancelar"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleDelete}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Apagar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100 mt-0">
          <div className="pt-3 space-y-2">
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
              <div><span className="font-medium">ID:</span> <span className="font-mono">{post.id.slice(0, 8)}...</span></div>
              <div><span className="font-medium">Tentativas:</span> {post.retry_count}/{post.max_retries}</div>
              {post.platform_post_id && (
                <div><span className="font-medium">ID Instagram:</span> {post.platform_post_id}</div>
              )}
            </div>
            {post.caption && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Caption completa:</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-2">{post.caption}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showReview && (
        <ReviewModal
          post={post}
          onClose={() => setShowReview(false)}
          onSaved={onRefresh}
        />
      )}
    </div>
  )
}

export default function Posts() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [queues, setQueues] = useState([])
  const [selectedQueue, setSelectedQueue] = useState('')

  const statusFilter = searchParams.get('status') || 'all'

  const fetchPosts = async () => {
    setLoading(true)
    try {
      let url = '/api/posts/'
      const params = []
      if (statusFilter !== 'all') params.push(`status=${statusFilter}`)
      if (selectedQueue) params.push(`queue_id=${selectedQueue}`)
      if (params.length > 0) url += '?' + params.join('&')

      const [postsRes, queuesRes] = await Promise.all([
        api.get(url),
        api.get('/api/queues/')
      ])
      setPosts(postsRes.data)
      setQueues(queuesRes.data)
    } catch (err) {
      console.error('Erro ao carregar posts:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPosts() }, [statusFilter, selectedQueue])

  const filters = [
    { v: 'all',            l: 'Todos' },
    { v: 'pending_review', l: 'Ag. revisão' },
    { v: 'scheduled',      l: 'Agendados' },
    { v: 'published',      l: 'Publicados' },
    { v: 'error',          l: 'Com erro' },
    { v: 'cancelled',      l: 'Cancelados' },
  ]

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
          <p className="text-gray-500 mt-1">{posts.length} post{posts.length !== 1 ? 's' : ''} encontrado{posts.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchPosts} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
          <Link to="/upload" className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            + Novo Post
          </Link>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {filters.map(f => (
          <button key={f.v}
            onClick={() => setSearchParams(f.v === 'all' ? {} : { status: f.v })}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === f.v || (f.v === 'all' && !searchParams.get('status'))
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}>
            {f.l}
          </button>
        ))}
      </div>

      {queues.length > 0 && (
        <div className="mb-6">
          <select value={selectedQueue} onChange={e => setSelectedQueue(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">Todas as filas</option>
            {queues.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <Image className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900 mb-2">Nenhum post encontrado</h3>
          <p className="text-sm text-gray-500 mb-4">
            {statusFilter === 'all' ? 'Ainda não criaste nenhum post.' : `Não há posts com este estado.`}
          </p>
          <Link to="/upload" className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
            Criar primeiro post
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => <PostCard key={post.id} post={post} onRefresh={fetchPosts} />)}
        </div>
      )}
    </Layout>
  )
}
