import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import Layout from '../components/layout/Layout'
import api from '../lib/api'
import {
  Upload,
  ListVideo,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  ShoppingCart
} from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const { cart } = useCart()
  const [stats, setStats] = useState({
    queues: 0,
    review: 0,
    pending: 0,
    published: 0,
    errors: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [queuesRes, postsRes, errorsRes] = await Promise.all([
          api.get('/api/queues/'),
          api.get('/api/posts/'),
          api.get('/api/errors/?status=open')
        ])
        setStats({
          queues:    queuesRes.data.length,
          review:    postsRes.data.filter(p => p.status === "pending_review").length,
          pending:   postsRes.data.filter(p => p.status === "scheduled").length,
          published: postsRes.data.filter(p => p.status === "published").length,
          errors:    errorsRes.data.length
        })
      } catch (err) {
        console.error("Erro ao carregar stats:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const statCards = [
    { label: "Filas activas",      value: stats.queues,    icon: ListVideo,    color: "text-blue-600",   bg: "bg-blue-50",   link: "/queues" },
    { label: "Ag. revisão",        value: stats.review,    icon: Clock,        color: "text-orange-600", bg: "bg-orange-50", link: "/posts?status=pending_review" },
    { label: "Posts agendados",    value: stats.pending,   icon: Clock,        color: "text-yellow-600", bg: "bg-yellow-50", link: "/posts?status=scheduled" },
    { label: "Posts publicados",   value: stats.published, icon: CheckCircle,  color: "text-green-600",  bg: "bg-green-50",  link: "/posts?status=published" },
    { label: "Erros por resolver", value: stats.errors,    icon: AlertCircle,  color: "text-red-600",    bg: "bg-red-50",    link: "/errors" },
  ]

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Boas-vindas, {user?.full_name?.split(" ")[0] || "utilizador"}! 👋
        </h1>
        <p className="text-gray-500 mt-1">Aqui está o resumo da tua actividade</p>
      </div>

      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-200 text-sm">Plano actual</p>
            <p className="text-2xl font-bold mt-1 capitalize">Free</p>
            <p className="text-primary-200 text-sm mt-1">
              {user?.posts_this_month} / 10 posts este mês
            </p>
          </div>
          <TrendingUp className="w-12 h-12 text-primary-300" />
        </div>
        <div className="mt-4 bg-primary-500 rounded-full h-2">
          <div
            className="bg-white rounded-full h-2 transition-all"
            style={{ width: `${Math.min((user?.posts_this_month / 10) * 100, 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, bg, link }) => (
          <Link key={label} to={link} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
            <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{loading ? "—" : value}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {cart.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-amber-900">
                    Tens {cart.length} post{cart.length > 1 ? 's' : ''} no carrinho
                  </p>
                  <p className="text-sm text-amber-600">Ainda não foram agendados</p>
                </div>
              </div>
              <Link
                to="/upload"
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Ver carrinho →
              </Link>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {cart.slice(0, 6).map((item, i) => (
                <img key={i} src={item.preview} alt="" className="w-10 h-10 object-cover rounded-md flex-shrink-0" />
              ))}
              {cart.length > 6 && (
                <div className="w-10 h-10 bg-amber-200 rounded-md flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-amber-700">+{cart.length - 6}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <h2 className="font-semibold text-gray-900 mb-4">Acções rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link to="/upload" className="flex items-center gap-3 p-4 border border-dashed border-gray-300 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-colors group">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
              <Upload className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Novo Post</p>
              <p className="text-sm text-gray-500">Adicionar fotos à fila</p>
            </div>
          </Link>
          <Link to="/queues" className="flex items-center gap-3 p-4 border border-dashed border-gray-300 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-colors group">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <ListVideo className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Gerir Filas</p>
              <p className="text-sm text-gray-500">Ver e editar as tuas filas</p>
            </div>
          </Link>
        </div>
      </div>
    </Layout>
  )
}
