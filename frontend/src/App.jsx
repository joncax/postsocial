import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Queues from './pages/Queues'
import NewPost from './pages/NewPost'

// Páginas placeholder para as rotas que vamos construir
const PlaceholderPage = ({ title }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="text-gray-500 mt-2">Em construção...</p>
    </div>
  </div>
)

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
        <Routes>
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/queues" element={
            <ProtectedRoute><Queues /></ProtectedRoute>
          } />
          <Route path="/upload" element={
            <ProtectedRoute><NewPost /></ProtectedRoute>
          } />
          <Route path="/errors" element={
            <ProtectedRoute><PlaceholderPage title="Erros" /></ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute><PlaceholderPage title="Definições" /></ProtectedRoute>
          } />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
