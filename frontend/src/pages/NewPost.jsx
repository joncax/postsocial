import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import api from '../lib/api'
import { Upload, Images, ShoppingCart, ArrowLeft, Pencil } from 'lucide-react'
import { useCart } from '../context/CartContext'

export default function NewPost() {
  const [step, setStep] = useState('choose')
  const { cart, addToCart: addToCartContext, removeFromCart, updateCartItem, clearCart } = useCart()

  const addToCart = (item) => {
    addToCartContext(item)
    setStep('choose')
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Novo Post</h1>
          <p className="text-gray-500 mt-1">Adiciona fotos e agenda os teus posts</p>
        </div>
        {cart.length > 0 && step === 'choose' && (
          <button
            onClick={() => setStep('cart')}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium relative"
          >
            <ShoppingCart className="w-4 h-4" />
            Ver carrinho ({cart.length})
          </button>
        )}
      </div>

      {step === 'choose' && (
        <ChooseType onChoose={setStep} cartCount={cart.length} onViewCart={() => setStep('cart')} />
      )}
      {step === 'simple' && (
        <SimplePostForm onBack={() => setStep('choose')} onAdd={addToCart} />
      )}
      {step === 'carousel' && (
        <CarouselForm onBack={() => setStep('choose')} onAdd={addToCart} />
      )}
      {step === 'cart' && (
        <Cart
          cart={cart}
          onRemove={removeFromCart}
          onUpdate={updateCartItem}
          onBack={() => setStep('choose')}
          onAddMore={() => setStep('choose')}
          onClear={clearCart}
        />
      )}
    </Layout>
  )
}

function ChooseType({ onChoose, cartCount, onViewCart }) {
  return (
    <div className="max-w-2xl mx-auto">
      {cartCount > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <span className="text-sm font-medium text-primary-700">
            {cartCount} post{cartCount > 1 ? 's' : ''} no carrinho
          </span>
          <button onClick={onViewCart} className="text-sm font-medium text-primary-600">
            Ver carrinho
          </button>
        </div>
      )}
      <h2 className="text-lg font-semibold text-gray-900 mb-6 text-center">O que queres criar?</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => onChoose('simple')}
          className="bg-white border-2 border-gray-200 hover:border-primary-400 rounded-2xl p-8 text-left transition-all hover:shadow-md"
        >
          <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
            <Upload className="w-6 h-6 text-primary-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Post Simples</h3>
          <p className="text-sm text-gray-500">Uma foto por post. Cada foto vai para o carrinho como post independente.</p>
        </button>
        <button
          onClick={() => onChoose('carousel')}
          className="bg-white border-2 border-gray-200 hover:border-primary-400 rounded-2xl p-8 text-left transition-all hover:shadow-md"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
            <Images className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Carrossel</h3>
          <p className="text-sm text-gray-500">Várias fotos num único post. Agrupa 2 a 10 fotos.</p>
        </button>
      </div>
    </div>
  )
}

function SimplePostForm({ onBack, onAdd }) {
  const [files, setFiles] = useState([])
  const [caption, setCaption] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [location, setLocation] = useState('')
  const [captionMode, setCaptionMode] = useState('automatic')

  const handleFiles = (newFiles) => {
    const imgs = Array.from(newFiles).filter(f => f.type.startsWith('image/'))
    setFiles(prev => [...prev, ...imgs])
  }

  const handleAdd = () => {
    if (files.length === 0) return
    files.forEach(file => {
      onAdd({
        type: 'photo',
        files: [file],
        caption,
        hashtags: hashtags.split(' ').filter(h => h.startsWith('#')).map(h => h.slice(1)),
        location,
        captionMode,
        preview: URL.createObjectURL(file)
      })
    })
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Post Simples</h2>
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-gray-400 transition-colors">
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700 mb-4">Escolhe as fotos</p>
          <label className="cursor-pointer bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Escolher fotos
            <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
          </label>
        </div>
        {files.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {files.map((file, i) => (
              <div key={i} className="relative group">
                <img src={URL.createObjectURL(file)} alt="" className="w-full h-20 object-cover rounded-lg" />
                <button
                  onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100"
                >x</button>
              </div>
            ))}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Caption</label>
          <div className="flex gap-2 mb-3">
            {[{v:'automatic',l:'Gerar com IA'},{v:'assisted',l:'Assistido'},{v:'manual',l:'Manual'}].map(o => (
              <button key={o.v} type="button" onClick={() => setCaptionMode(o.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${captionMode === o.v ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {o.l}
              </button>
            ))}
          </div>
          {captionMode !== 'automatic' ? (
            <textarea value={caption} onChange={e => setCaption(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3} placeholder="Escreve a tua caption..." />
          ) : (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">A IA vai gerar 3 variações de caption para escolheres.</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hashtags</label>
          <input type="text" value={hashtags} onChange={e => setHashtags(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="#lisboa #portugal" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Localização</label>
          <input type="text" value={location} onChange={e => setLocation(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Ex: Lisboa, Portugal" />
        </div>
        <button onClick={handleAdd} disabled={files.length === 0}
          className="w-full bg-primary-600 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
          {files.length === 0 ? 'Adiciona pelo menos uma foto' : `Adicionar ${files.length} post${files.length > 1 ? 's' : ''} ao carrinho`}
        </button>
      </div>
    </div>
  )
}

function CarouselForm({ onBack, onAdd }) {
  const [files, setFiles] = useState([])
  const [caption, setCaption] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [location, setLocation] = useState('')
  const [captionMode, setCaptionMode] = useState('automatic')

  const handleFiles = (newFiles) => {
    const imgs = Array.from(newFiles).filter(f => f.type.startsWith('image/'))
    setFiles(prev => [...prev, ...imgs].slice(0, 10))
  }

  const handleAdd = () => {
    if (files.length < 2) return
    onAdd({
      type: 'carousel',
      files,
      caption,
      hashtags: hashtags.split(' ').filter(h => h.startsWith('#')).map(h => h.slice(1)),
      location,
      captionMode,
      preview: URL.createObjectURL(files[0])
    })
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Carrossel</h2>
          <span className="text-sm text-gray-500">{files.length}/10 fotos</span>
        </div>
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-gray-400 transition-colors">
          <Images className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700 mb-4">Adiciona 2 a 10 fotos</p>
          <label className="cursor-pointer bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Escolher fotos
            <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
          </label>
        </div>
        {files.length > 0 && (
          <div className="grid grid-cols-5 gap-2">
            {files.map((file, i) => (
              <div key={i} className="relative group">
                <img src={URL.createObjectURL(file)} alt="" className="w-full h-16 object-cover rounded-lg" />
                <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs rounded px-1">{i+1}</div>
                <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100">x</button>
              </div>
            ))}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Caption</label>
          <div className="flex gap-2 mb-3">
            {[{v:'automatic',l:'Gerar com IA'},{v:'assisted',l:'Assistido'},{v:'manual',l:'Manual'}].map(o => (
              <button key={o.v} type="button" onClick={() => setCaptionMode(o.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${captionMode === o.v ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {o.l}
              </button>
            ))}
          </div>
          {captionMode !== 'automatic' ? (
            <textarea value={caption} onChange={e => setCaption(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3} placeholder="Escreve a caption..." />
          ) : (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">A IA vai analisar as imagens e gerar 3 variações de caption.</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hashtags</label>
          <input type="text" value={hashtags} onChange={e => setHashtags(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="#lisboa #portugal" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Localização</label>
          <input type="text" value={location} onChange={e => setLocation(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Ex: Lisboa, Portugal" />
        </div>
        <button onClick={handleAdd} disabled={files.length < 2}
          className="w-full bg-primary-600 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
          {files.length < 2 ? `Adiciona mais ${2 - files.length} foto${files.length === 1 ? '' : 's'}` : `Adicionar carrossel (${files.length} fotos) ao carrinho`}
        </button>
      </div>
    </div>
  )
}

function EditCartItemModal({ item, onClose, onSave }) {
  const [caption, setCaption] = useState(item.caption || '')
  const [hashtags, setHashtags] = useState(
    item.hashtags ? item.hashtags.map(h => '#' + h).join(' ') : ''
  )
  const [location, setLocation] = useState(item.location || '')
  const [captionMode, setCaptionMode] = useState(item.captionMode || 'automatic')

  const handleSave = () => {
    onSave({
      ...item,
      caption,
      hashtags: hashtags.split(' ').filter(h => h.startsWith('#')).map(h => h.slice(1)),
      location,
      captionMode
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Editar Post</h2>
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <img src={item.preview} alt="" className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.type === 'carousel' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
            {item.type === 'carousel' ? `Carrossel (${item.files.length} fotos)` : 'Post simples'}
          </span>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Caption</label>
          <div className="flex gap-2 mb-3">
            {[{v:'automatic',l:'Gerar com IA'},{v:'assisted',l:'Assistido'},{v:'manual',l:'Manual'}].map(o => (
              <button key={o.v} type="button" onClick={() => setCaptionMode(o.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${captionMode === o.v ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {o.l}
              </button>
            ))}
          </div>
          {captionMode !== 'automatic' ? (
            <textarea value={caption} onChange={e => setCaption(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3} placeholder={captionMode === 'assisted' ? 'Escreve um rascunho...' : 'Escreve a tua caption...'} />
          ) : (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">A IA vai gerar 3 variações de caption para escolheres.</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hashtags</label>
          <input type="text" value={hashtags} onChange={e => setHashtags(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="#lisboa #portugal" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Localização</label>
          <input type="text" value={location} onChange={e => setLocation(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Ex: Lisboa, Portugal" />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave}
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

function Cart({ cart, onRemove, onUpdate, onBack, onAddMore, onClear }) {
  const [queues, setQueues] = useState([])
  const [selectedQueue, setSelectedQueue] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [editingItem, setEditingItem] = useState(null)

  useEffect(() => {
    api.get('/api/queues/').then(res => {
      const active = res.data.filter(q => q.is_active)
      setQueues(active)
      if (active.length > 0) setSelectedQueue(active[0].id)
    })
  }, [])

  const handleConfirm = async () => {
    if (!selectedQueue) return
    setLoading(true)
    setError('')
    try {
      for (const item of cart) {
        const postRes = await api.post('/api/posts/', {
          queue_id: selectedQueue,
          type: item.type,
          caption: item.caption || null,
          hashtags: item.hashtags || [],
          location_name: item.location || null,
          caption_mode: item.captionMode
        })
        const postId = postRes.data.id
        const formData = new FormData()
        item.files.forEach(file => formData.append('files', file))
        await api.post(`/api/media/upload/${postId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        if (item.captionMode !== 'manual') {
          await api.post(`/api/ai/generate/${postId}`)
        }
      }
      setSuccess(true)
      onClear()
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao agendar posts')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✅</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Posts adicionados!</h2>
        <p className="text-gray-500 mb-6">Posts adicionados à fila e a aguardar revisão.</p>
        <button onClick={onBack} className="bg-primary-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium">
          Voltar ao início
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <button onClick={onClear} className="text-sm text-red-500 hover:text-red-600">Limpar carrinho</button>
        </div>

        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Carrinho ({cart.length} {cart.length === 1 ? 'post' : 'posts'})
        </h2>

        <div className="space-y-3 mb-6">
          {cart.map((item, index) => (
            <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
              <span className="text-xs font-medium text-gray-400 w-5 flex-shrink-0">#{index + 1}</span>
              <img src={item.preview} alt="" className="w-10 h-10 object-cover rounded-md flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${item.type === 'carousel' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {item.type === 'carousel' ? `Carrossel (${item.files.length})` : 'Simples'}
                  </span>
                  <span className="text-xs text-gray-400 truncate">
                    {item.caption ? item.caption : 'Caption pela IA'}
                  </span>
                </div>
                {item.location && (
                  <p className="text-xs text-gray-400 mt-0.5">📍 {item.location}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setEditingItem(item)}
                  className="text-gray-400 hover:text-blue-500 transition-colors"
                  title="Editar"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onRemove(item.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors text-base"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>

        <button onClick={onAddMore} className="w-full border border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors mb-6">
          + Adicionar mais posts
        </button>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-medium text-gray-900 mb-4">Escolhe a fila de publicação</h3>
          {queues.length === 0 ? (
            <p className="text-sm text-gray-500 mb-4">Nenhuma fila activa.</p>
          ) : (
            <div className="space-y-2 mb-6">
              {queues.map(queue => (
                <label key={queue.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${selectedQueue === queue.id ? 'border-primary-400 bg-primary-50' : 'border-gray-200'}`}>
                  <input type="radio" name="queue" value={queue.id} checked={selectedQueue === queue.id} onChange={e => setSelectedQueue(e.target.value)} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{queue.name}</p>
                    <p className="text-xs text-gray-500">{(queue.rules?.publish_times || ['18:00']).join(', ')}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">{error}</div>
          )}
          <button onClick={handleConfirm} disabled={loading || !selectedQueue}
            className="w-full bg-primary-600 text-white py-3 rounded-lg text-sm font-medium disabled:opacity-50">
            {loading ? 'A processar...' : `Confirmar e agendar ${cart.length} post${cart.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>

      {editingItem && (
        <EditCartItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(updated) => { onUpdate(updated); setEditingItem(null) }}
        />
      )}
    </>
  )
}
