'use client'

import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabaseClient } from '@/lib/supabaseClient'
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  ClipboardList,
  CheckCircle,
  Edit3,
  ExternalLink,
  Filter as FilterIcon,
  Grid3X3,
  Heart,
  Home,
  Image as ImageIcon,
  Link as LinkIcon,
  Menu,
  MessageCircle,
  Package,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  Upload,
  User,
  X,
} from 'lucide-react'

type Product = {
  id: string
  title: string
  category: string
  price: number
  purchase_price?: number
  old_price?: number
  sizes: string[]
  image: string
  images?: string[]
  in_stock: boolean
  description: string
  tag: string
  created_at?: string
}

type CartItem = Product & { qty: number; size: string }
type UserType = { id?: string; name: string; email: string; role: 'admin' | 'user' }

type ProfileDraft = {
  name: string
  phone: string
  city: string
  address: string
  telegram: string
  instagram: string
}

type OrderItem = { title: string; size: string; qty: number; price: number; purchase_price?: number; product_id?: string | null }

type Order = {
  id: string
  customer_name: string
  phone: string
  address: string
  comment?: string
  total: number
  status: string
  created_at: string
  order_type?: 'site' | 'link'
  external_link?: string
  external_platform?: string
  external_details?: string
  manager_note?: string
  user_id?: string
  customer_email?: string
  order_items?: OrderItem[]
}

type Toast = { type: 'ok' | 'error' | 'info'; text: string }

type SiteSettings = {
  promo_image: string
  logo_image: string
}

const defaultSettings: SiteSettings = {
  promo_image: '/images/default-promo.png',
  logo_image: '/images/default-logo.png',
}

const emptyProfileDraft: ProfileDraft = {
  name: '',
  phone: '',
  city: '',
  address: '',
  telegram: '',
  instagram: '',
}

const fallbackProducts: Product[] = [
  {
    id: 'demo-1',
    title: "Jacket Minimal 'Grey'",
    category: 'Куртки',
    price: 120,
    sizes: ['M', 'L', 'XL'],
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1608234807905-4466023792f5?auto=format&fit=crop&w=900&q=80',
    ],
    old_price: 150,
    in_stock: true,
    description: 'Минималистичная куртка в сером оттенке, плотная посадка и чистый силуэт.',
    tag: 'NEW',
  },
  {
    id: 'demo-2',
    title: 'Boxy T-Shirt Basic',
    category: 'Футболки',
    price: 45,
    sizes: ['S', 'M', 'L'],
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
    images: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1622445275576-721325763afe?auto=format&fit=crop&w=900&q=80',
    ],
    old_price: 59,
    in_stock: true,
    description: 'Базовая футболка свободного кроя из плотного хлопка.',
    tag: 'BASIC',
  },
  {
    id: 'demo-3',
    title: "Oversized Hoodie 'Ash'",
    category: 'Худи',
    price: 98,
    sizes: ['S', 'M', 'L', 'XL'],
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80',
    in_stock: true,
    description: 'Оверсайз худи с мягкой фактурой и плотным капюшоном.',
    tag: 'HIT',
  },
  {
    id: 'demo-4',
    title: 'Cargo Pants Black',
    category: 'Брюки',
    price: 86,
    sizes: ['S', 'M', 'L'],
    image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=80',
    in_stock: true,
    description: 'Свободные брюки cargo с удобными карманами.',
    tag: 'DROP',
  },
]

const nav = [
  { id: 'home', label: 'Главная', icon: Home },
  { id: 'catalog', label: 'Каталог', icon: Grid3X3 },
  { id: 'orders', label: 'Заказ', icon: Truck },
  { id: 'profile', label: 'Профиль', icon: User },
]

const orderStatuses = [
  { value: 'new', label: 'Новый' },
  { value: 'processing', label: 'В обработке' },
  { value: 'calculation', label: 'Требует расчёта' },
  { value: 'waiting_payment', label: 'Ожидает оплаты' },
  { value: 'paid', label: 'Оплачен' },
  { value: 'ordered_supplier', label: 'Заказан у поставщика' },
  { value: 'in_transit', label: 'В пути' },
  { value: 'ready', label: 'Готов к выдаче' },
  { value: 'completed', label: 'Завершён' },
  { value: 'cancelled', label: 'Отменён' },
]

const statusLabel = (status = 'new') => orderStatuses.find((item) => item.value === status)?.label || status
const statusTone = (status = 'new') => {
  if (['completed', 'paid', 'ready'].includes(status)) return 'ok'
  if (['cancelled'].includes(status)) return 'bad'
  if (['calculation', 'waiting_payment'].includes(status)) return 'warn'
  return 'neutral'
}

const formatPrice = (price: number) => `${Number(price || 0)} BYN`
const productImages = (product: Product | null) => {
  if (!product) return []
  const list = Array.isArray(product.images) ? product.images : []
  const combined = [product.image, ...list]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
  return Array.from(new Set(combined))
}
const mainProductImage = (product: Product) => productImages(product)[0] || product.image
const hasFakeDiscount = (product: Product) => Number(product.old_price || 0) > Number(product.price || 0)
const discountPercent = (product: Product) => {
  if (!hasFakeDiscount(product)) return 0
  return Math.max(1, Math.round(((Number(product.old_price) - Number(product.price)) / Number(product.old_price)) * 100))
}

const PRODUCT_CACHE_KEY = 'cargo_products_cache_v3'
const SETTINGS_CACHE_KEY = 'cargo_settings_cache_v1'
const CACHE_TTL_MS = 1000 * 60 * 10

function readCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (!cached?.time || Date.now() - cached.time > CACHE_TTL_MS) return null
    return cached.value as T
  } catch {
    return null
  }
}

function writeCache<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify({ time: Date.now(), value }))
  } catch {}
}

const humanError = (text = '') => {
  const lower = text.toLowerCase()
  if (lower.includes('failed to fetch') || lower.includes('invalid path')) return 'Не удалось подключиться к серверу. Проверь настройки проекта и повтори попытку.'
  if (lower.includes('column') || lower.includes('schema') || lower.includes('relation')) return 'Структура базы отличается от ожидаемой. Нужно обновить таблицы в панели управления.'
  if (lower.includes('telegram')) return 'Заказ сохранён, но уведомление менеджеру не отправилось. Проверь настройки бота.'
  if (lower.includes('duplicate') || lower.includes('already') || lower.includes('registered')) return 'Пользователь с такой почтой уже зарегистрирован.'
  return text || 'Что-то пошло не так. Попробуй ещё раз.'
}

export default function HomePage() {
  const [page, setPage] = useState('home')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')
  const [filter, setFilter] = useState('Все')
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<UserType | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedSize, setSelectedSize] = useState('')
  const [toast, setToast] = useState<Toast | null>(null)
  const [adminMessage, setAdminMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [likedIds, setLikedIds] = useState<string[]>([])
  const [orderMode, setOrderMode] = useState<'cart' | 'link'>('cart')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(defaultSettings)
  const [settingsDraft, setSettingsDraft] = useState<SiteSettings>(defaultSettings)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderStatusFilter, setOrderStatusFilter] = useState('all')
  const [orderSearch, setOrderSearch] = useState('')
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(emptyProfileDraft)
  const [selectedProfileOrder, setSelectedProfileOrder] = useState<Order | null>(null)

  const [newProduct, setNewProduct] = useState({
    title: '',
    category: '',
    price: '',
    old_price: '',
    purchase_price: '',
    sizes: '',
    image: '',
    images: [] as string[],
    description: '',
    tag: 'NEW',
  })

  const [orderForm, setOrderForm] = useState({
    customerName: '',
    phone: '',
    address: '',
    comment: '',
    externalLink: '',
    externalPlatform: '',
    externalDetails: '',
  })

  useEffect(() => {
    const savedCart = localStorage.getItem('cargo_cart')
    const savedAdmin = localStorage.getItem('cargo_admin_user')
    const savedLikes = localStorage.getItem('cargo_likes')
    if (savedCart) setCart(JSON.parse(savedCart))
    if (savedAdmin) setUser(JSON.parse(savedAdmin))
    if (savedLikes) setLikedIds(JSON.parse(savedLikes))

    async function loadAuthUser() {
      const { data } = await supabaseClient.auth.getUser()
      if (!data.user) return

      setUser({
        id: data.user.id,
        name: String(data.user.user_metadata?.name || 'Пользователь'),
        email: data.user.email || '',
        role: String(data.user.user_metadata?.role || 'user') as 'user',
      })
      localStorage.removeItem('cargo_admin_user')
    }

    loadAuthUser()
    loadProducts()
    loadSettings()

    const { data: authListener } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) return
      setUser({
        id: session.user.id,
        name: String(session.user.user_metadata?.name || 'Пользователь'),
        email: session.user.email || '',
        role: String(session.user.user_metadata?.role || 'user') as 'user',
      })
      localStorage.removeItem('cargo_admin_user')
    })

    return () => authListener.subscription.unsubscribe()
  }, [])

  useEffect(() => { localStorage.setItem('cargo_cart', JSON.stringify(cart)) }, [cart])
  useEffect(() => { localStorage.setItem('cargo_likes', JSON.stringify(likedIds)) }, [likedIds])
  useEffect(() => { if (user) loadOrders() }, [user])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3600)
    return () => clearTimeout(t)
  }, [toast])


  useEffect(() => {
    if (!user || user.role === 'admin') {
      setProfileDraft(emptyProfileDraft)
      return
    }

    const key = `cargo_profile_${user.email || user.id || 'guest'}`
    const saved = localStorage.getItem(key)
    const parsed = saved ? JSON.parse(saved) : {}
    const nextProfile: ProfileDraft = {
      name: parsed.name || user.name || '',
      phone: parsed.phone || '',
      city: parsed.city || '',
      address: parsed.address || '',
      telegram: parsed.telegram || '',
      instagram: parsed.instagram || '',
    }

    setProfileDraft(nextProfile)
    setOrderForm((current) => ({
      ...current,
      customerName: current.customerName || nextProfile.name,
      phone: current.phone || nextProfile.phone || nextProfile.telegram,
      address: current.address || [nextProfile.city, nextProfile.address].filter(Boolean).join(', '),
    }))
  }, [user])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const iconHref = siteSettings.logo_image || defaultSettings.logo_image
    let icon = document.querySelector<HTMLLinkElement>("link[rel='icon']")
    if (!icon) {
      icon = document.createElement('link')
      icon.rel = 'icon'
      document.head.appendChild(icon)
    }
    icon.href = iconHref
    let appleIcon = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']")
    if (!appleIcon) {
      appleIcon = document.createElement('link')
      appleIcon.rel = 'apple-touch-icon'
      document.head.appendChild(appleIcon)
    }
    appleIcon.href = iconHref
  }, [siteSettings.logo_image])

  async function loadProducts() {
    setLoading(true)
    setApiError('')

    const cachedProducts = readCache<Product[]>(PRODUCT_CACHE_KEY)
    if (cachedProducts?.length) {
      setProducts(cachedProducts)
      setLoading(false)
    }

    try {
      const res = await fetch('/api/products', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка загрузки товаров')
      const nextProducts = data.products?.length ? data.products : fallbackProducts
      setProducts(nextProducts)
      writeCache(PRODUCT_CACHE_KEY, nextProducts)
    } catch (error: any) {
      if (!cachedProducts?.length) {
        setApiError('Каталог временно загружен в демо-режиме. Скоро всё вернётся к обычной работе.')
        setProducts(fallbackProducts)
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadOrders() {
    try {
      const res = await fetch('/api/orders', { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) setOrders(data.orders || [])
    } catch {}
  }


  async function loadSettings() {
    const cachedSettings = readCache<SiteSettings>(SETTINGS_CACHE_KEY)
    if (cachedSettings) {
      setSiteSettings(cachedSettings)
      setSettingsDraft(cachedSettings)
    }

    try {
      const res = await fetch('/api/settings', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Не удалось загрузить настройки')
      const nextSettings = {
        promo_image: data.settings?.promo_image || defaultSettings.promo_image,
        logo_image: data.settings?.logo_image || defaultSettings.logo_image,
      }
      setSiteSettings(nextSettings)
      setSettingsDraft(nextSettings)
      writeCache(SETTINGS_CACHE_KEY, nextSettings)
    } catch {
      if (!cachedSettings) {
        setSiteSettings(defaultSettings)
        setSettingsDraft(defaultSettings)
      }
    }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault()
    setAdminMessage(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsDraft),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Не удалось сохранить настройки')
      const nextSettings = {
        promo_image: data.settings?.promo_image || defaultSettings.promo_image,
        logo_image: data.settings?.logo_image || defaultSettings.logo_image,
      }
      setSiteSettings(nextSettings)
      setSettingsDraft(nextSettings)
      writeCache(SETTINGS_CACHE_KEY, nextSettings)
      setAdminMessage({ type: 'ok', text: 'Визуальные настройки сохранены' })
      notify('ok', 'Промо и логотип обновлены')
    } catch (error: any) {
      setAdminMessage({ type: 'error', text: humanError(error.message) })
      notify('error', humanError(error.message))
    }
  }

  async function uploadImageBlob(blob: Blob, folder: string, fileName: string) {
    const formData = new FormData()
    formData.append('file', blob, fileName)
    formData.append('folder', folder)

    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data.error || 'Не удалось загрузить изображение')
    }

    return String(data.url || '')
  }

  async function readImageFile(file: File, field: keyof SiteSettings) {
    try {
      if (!file) return
      if (!file.type.startsWith('image/')) {
        notify('error', 'Можно загрузить только изображение')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        notify('error', 'Файл слишком большой. Лучше загрузить изображение до 10 МБ')
        return
      }

      notify('info', field === 'promo_image' ? 'Загружаем промо в Storage...' : 'Загружаем логотип в Storage...')
      const blob = await optimizeImageFile(file, field === 'promo_image' ? 1800 : 512, field === 'promo_image' ? 0.84 : 0.88)
      const url = await uploadImageBlob(blob, field === 'promo_image' ? 'site/promo' : 'site/logo', `${field}.webp`)
      setSettingsDraft((current) => ({ ...current, [field]: url }))
      notify('ok', field === 'promo_image' ? 'Промо загружено' : 'Логотип загружен')
    } catch (error: any) {
      notify('error', humanError(error.message))
    }
  }

  function optimizeImageFile(file: File, maxSide = 1400, quality = 0.8): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('Можно загрузить только изображение'))
        return
      }

      if (file.size > 12 * 1024 * 1024) {
        reject(new Error('Файл слишком большой. Выберите изображение до 12 МБ'))
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        const img = new Image()
        img.onload = () => {
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
          const width = Math.max(1, Math.round(img.width * scale))
          const height = Math.max(1, Math.round(img.height * scale))
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Не удалось обработать изображение'))
            return
          }
          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Не удалось сжать изображение'))
              return
            }
            resolve(blob)
          }, 'image/webp', quality)
        }
        img.onerror = () => reject(new Error('Не удалось открыть изображение'))
        img.src = String(reader.result || '')
      }
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'))
      reader.readAsDataURL(file)
    })
  }

  async function readProductImageFile(file: File, target: 'new' | 'edit') {
    try {
      notify('info', 'Оптимизируем и загружаем фото в Storage...')
      const blob = await optimizeImageFile(file, 1500, 0.82)
      const value = await uploadImageBlob(blob, 'products', `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9а-яА-Я._-]+/g, '-') || 'product'}.webp`)
      if (target === 'new') {
        setNewProduct((current) => {
          const images = Array.from(new Set([...(current.images || []), value]))
          return { ...current, image: current.image || value, images }
        })
      } else {
        setEditingProduct((current) => {
          if (!current) return current
          const images = Array.from(new Set([...(current.images || []), value]))
          return { ...current, image: current.image || value, images }
        })
      }
      notify('ok', 'Фото товара загружено в Storage')
    } catch (error: any) {
      notify('error', humanError(error.message))
    }
  }

  async function readProductImageFiles(files: FileList | null, target: 'new' | 'edit') {
    if (!files?.length) return
    const selected = Array.from(files).slice(0, 8)
    for (const file of selected) {
      await readProductImageFile(file, target)
    }
  }

  function addProductImageByUrl(target: 'new' | 'edit', url: string) {
    const value = url.trim()
    if (!value) return
    if (target === 'new') {
      setNewProduct((current) => {
        const images = Array.from(new Set([...(current.images || []), value]))
        return { ...current, image: current.image || value, images }
      })
    } else {
      setEditingProduct((current) => {
        if (!current) return current
        const images = Array.from(new Set([...(current.images || []), value]))
        return { ...current, image: current.image || value, images }
      })
    }
  }

  function removeProductImage(target: 'new' | 'edit', url: string) {
    if (target === 'new') {
      setNewProduct((current) => {
        const images = (current.images || []).filter((item) => item !== url)
        return { ...current, images, image: current.image === url ? (images[0] || '') : current.image }
      })
    } else {
      setEditingProduct((current) => {
        if (!current) return current
        const images = (current.images || []).filter((item) => item !== url)
        return { ...current, images, image: current.image === url ? (images[0] || '') : current.image }
      })
    }
  }

  function makeMainProductImage(target: 'new' | 'edit', url: string) {
    if (target === 'new') {
      setNewProduct((current) => ({ ...current, image: url, images: Array.from(new Set([url, ...(current.images || []).filter((item) => item !== url)])) }))
    } else {
      setEditingProduct((current) => current ? { ...current, image: url, images: Array.from(new Set([url, ...(current.images || []).filter((item) => item !== url)])) } : current)
    }
  }

  const categories = useMemo(() => ['Все', ...Array.from(new Set(products.map((p) => p.category)))], [products])
  const filteredProducts = useMemo(() => products.filter((product) => {
    const byFilter = filter === 'Все' || product.category === filter
    const search = query.toLowerCase()
    const byQuery = !query || product.title.toLowerCase().includes(search) || product.category.toLowerCase().includes(search)
    return byFilter && byQuery
  }), [products, filter, query])

  const likedProducts = useMemo(() => products.filter((product) => likedIds.includes(product.id)), [products, likedIds])
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0)
  const inStockCount = products.filter((p) => p.in_stock).length
  const countedOrders = orders.filter((order) => order.status !== 'cancelled')
  const ordersTotal = countedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
  const completedOrders = orders.filter((order) => order.status === 'completed')
  const completedRevenue = completedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
  const completedPurchaseTotal = completedOrders.reduce((sum, order) => sum + (order.order_items || []).reduce((itemSum, item) => itemSum + Number(item.purchase_price || 0) * Number(item.qty || 1), 0), 0)
  const grossProfit = Math.max(0, completedRevenue - completedPurchaseTotal)
  const todayKey = new Date().toDateString()
  const todayOrdersList = orders.filter((order) => new Date(order.created_at).toDateString() === todayKey)
  const todayOrders = todayOrdersList.length
  const todayRevenue = todayOrdersList.filter((order) => order.status !== 'cancelled').reduce((sum, order) => sum + Number(order.total || 0), 0)
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekOrders = orders.filter((order) => new Date(order.created_at) >= weekAgo)
  const avgOrder = countedOrders.length ? Math.round(ordersTotal / countedOrders.length) : 0
  const siteOrders = orders.filter((order) => (order.order_type || (order.external_link ? 'link' : 'site')) === 'site')
  const linkOrders = orders.filter((order) => (order.order_type || (order.external_link ? 'link' : 'site')) === 'link')
  const activeOrders = orders.filter((order) => !['completed', 'cancelled'].includes(order.status || 'new'))
  const conversionRate = orders.length ? Math.round((completedOrders.length / orders.length) * 100) : 0
  const statusCounts = useMemo(() => {
    const map = new Map<string, number>()
    orders.forEach((order) => map.set(order.status || 'new', (map.get(order.status || 'new') || 0) + 1))
    return map
  }, [orders])
  const popularItems = useMemo(() => {
    const map = new Map<string, number>()
    orders.forEach((order) => order.order_items?.forEach((item) => {
      if (item.title.toLowerCase().includes('заказ по ссылке')) return
      map.set(item.title, (map.get(item.title) || 0) + Number(item.qty || 0))
    }))
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [orders])

  const userOrders = useMemo(() => {
    if (!user || user.role === 'admin') return []
    const email = (user.email || '').toLowerCase()
    const id = user.id || ''
    const phone = profileDraft.phone.replace(/\D/g, '')

    return orders.filter((order) => {
      const orderEmail = String(order.customer_email || '').toLowerCase()
      const orderUserId = String(order.user_id || '')
      const orderPhone = String(order.phone || '').replace(/\D/g, '')

      return Boolean(
        (email && orderEmail === email) ||
        (id && orderUserId === id) ||
        (phone && orderPhone && orderPhone.endsWith(phone.slice(-7)))
      )
    })
  }, [orders, user, profileDraft.phone])

  const profileStats = useMemo(() => {
    const active = userOrders.filter((order) => !['completed', 'cancelled'].includes(order.status || 'new'))
    const completed = userOrders.filter((order) => order.status === 'completed')
    const totalSpent = completed.reduce((sum, order) => sum + Number(order.total || 0), 0)
    return { active, completed, totalSpent }
  }, [userOrders])

  const filteredOrders = useMemo(() => {
    const search = orderSearch.trim().toLowerCase()
    return orders.filter((order) => {
      const byStatus = orderStatusFilter === 'all' || order.status === orderStatusFilter
      const haystack = [
        order.id,
        order.customer_name,
        order.phone,
        order.address,
        order.external_link,
        order.external_platform,
        order.order_items?.map((item) => item.title).join(' '),
      ].filter(Boolean).join(' ').toLowerCase()
      return byStatus && (!search || haystack.includes(search))
    })
  }, [orders, orderStatusFilter, orderSearch])

  function go(nextPage: string) {
    setPage(nextPage)
    setMobileMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function notify(type: Toast['type'], text: string) { setToast({ type, text }) }

  async function openProduct(product: Product) {
    setSelectedProduct(product)
    setSelectedSize(product.sizes?.[0] || '')

    if (!product.id || product.id.startsWith('demo-')) return

    try {
      const res = await fetch(`/api/products/${product.id}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok || !data.product) return
      setSelectedProduct(data.product)
      setProducts((current) => current.map((item) => item.id === data.product.id ? { ...item, ...data.product } : item))
    } catch {}
  }

  function addToCart(product: Product, size = product.sizes?.[0] || '') {
    if (!product.in_stock) return notify('info', 'Этот товар сейчас недоступен для заказа')
    setCart((current) => {
      const exists = current.find((item) => item.id === product.id && item.size === size)
      if (exists) return current.map((item) => item.id === product.id && item.size === size ? { ...item, qty: item.qty + 1 } : item)
      return [...current, { ...product, qty: 1, size }]
    })
    notify('ok', 'Товар добавлен в корзину')
    setCartOpen(true)
  }

  function toggleLike(product: Product) {
    setLikedIds((current) => current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id])
    notify('ok', likedIds.includes(product.id) ? 'Товар убран из избранного' : 'Товар добавлен в избранное')
  }

  function changeQty(id: string, size: string, diff: number) {
    setCart((current) => current.map((item) => item.id === id && item.size === size ? { ...item, qty: item.qty + diff } : item).filter((item) => item.qty > 0))
  }

  async function login(email: string, password: string, name?: string) {
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedName = String(name || '').trim()

    if (normalizedEmail === 'admin@admin.ru' && password === 'admin') {
      const adminUser: UserType = { id: 'admin', name: 'Администратор', email: normalizedEmail, role: 'admin' }
      await supabaseClient.auth.signOut()
      localStorage.setItem('cargo_admin_user', JSON.stringify(adminUser))
      setUser(adminUser)
      setAuthOpen(false)
      notify('ok', 'Вы вошли в панель управления')
      go('admin')
      return
    }

    localStorage.removeItem('cargo_admin_user')

    if (normalizedName) {
      const { data, error } = await supabaseClient.auth.signUp({
        email: normalizedEmail,
        password,
        options: { data: { name: normalizedName, role: 'user' } },
      })

      if (error) return notify('error', humanError(error.message))
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return notify('error', 'Пользователь с такой почтой уже зарегистрирован')
      if (!data.session) {
        setAuthOpen(false)
        return notify('ok', 'Аккаунт создан. Проверь почту и подтверди регистрацию, потом войди в аккаунт.')
      }

      setUser({ id: data.user?.id, name: normalizedName, email: data.user?.email || normalizedEmail, role: 'user' })
      setAuthOpen(false)
      notify('ok', 'Аккаунт создан')
      go('profile')
      return
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email: normalizedEmail, password })
    if (error || !data.user) return notify('error', 'Неверный email или пароль')

    setUser({
      id: data.user.id,
      name: String(data.user.user_metadata?.name || 'Пользователь'),
      email: data.user.email || normalizedEmail,
      role: String(data.user.user_metadata?.role || 'user') as 'user',
    })
    setAuthOpen(false)
    notify('ok', 'Вы вошли в аккаунт')
    go('profile')
  }

  async function logout() {
    localStorage.removeItem('cargo_admin_user')
    await supabaseClient.auth.signOut()
    setUser(null)
    notify('info', 'Вы вышли из аккаунта')
    go('home')
  }

  async function createProduct(e: React.FormEvent) {
    e.preventDefault()
    setAdminMessage(null)
    try {
      const res = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newProduct) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Не удалось добавить товар')
      setNewProduct({ title: '', category: '', price: '', old_price: '', purchase_price: '', sizes: '', image: '', images: [], description: '', tag: 'NEW' })
      setAdminMessage({ type: 'ok', text: 'Товар добавлен' })
      notify('ok', 'Товар добавлен')
      await loadProducts()
    } catch (error: any) {
      setAdminMessage({ type: 'error', text: humanError(error.message) })
    }
  }

  async function updateProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!editingProduct) return
    setAdminMessage(null)
    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProduct),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Не удалось сохранить изменения')
      setEditingProduct(null)
      setAdminMessage({ type: 'ok', text: 'Изменения сохранены' })
      notify('ok', 'Товар обновлён')
      await loadProducts()
    } catch (error: any) {
      setAdminMessage({ type: 'error', text: humanError(error.message) })
    }
  }

  async function toggleStock(product: Product) {
    setAdminMessage(null)
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ in_stock: !product.in_stock }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Не удалось обновить товар')
      notify('ok', product.in_stock ? 'Товар скрыт' : 'Товар возвращён')
      await loadProducts()
    } catch (error: any) {
      setAdminMessage({ type: 'error', text: humanError(error.message) })
    }
  }

  async function deleteProduct(product: Product) {
    if (!confirm(`Удалить товар «${product.title}»?`)) return
    setAdminMessage(null)
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Не удалось удалить товар')
      notify('ok', 'Товар удалён')
      await loadProducts()
    } catch (error: any) {
      setAdminMessage({ type: 'error', text: humanError(error.message) })
    }
  }


  function saveProfileDraft(e?: React.FormEvent) {
    e?.preventDefault()
    if (!user) return

    const nextProfile = {
      ...profileDraft,
      name: profileDraft.name.trim() || user.name,
      phone: profileDraft.phone.trim(),
      city: profileDraft.city.trim(),
      address: profileDraft.address.trim(),
      telegram: profileDraft.telegram.trim(),
      instagram: profileDraft.instagram.trim(),
    }

    localStorage.setItem(`cargo_profile_${user.email || user.id || 'guest'}`, JSON.stringify(nextProfile))
    setProfileDraft(nextProfile)
    setOrderForm((current) => ({
      ...current,
      customerName: current.customerName || nextProfile.name,
      phone: current.phone || nextProfile.phone || nextProfile.telegram,
      address: current.address || [nextProfile.city, nextProfile.address].filter(Boolean).join(', '),
    }))
    notify('ok', 'Данные профиля сохранены')
  }

  function fillOrderFromProfile(mode: 'cart' | 'link') {
    setOrderMode(mode)
    setOrderForm((current) => ({
      ...current,
      customerName: current.customerName || profileDraft.name || user?.name || '',
      phone: current.phone || profileDraft.phone || profileDraft.telegram || '',
      address: current.address || [profileDraft.city, profileDraft.address].filter(Boolean).join(', '),
    }))
    go('orders')
  }

  async function submitOrder(e: React.FormEvent) {
    e.preventDefault()
    const isLinkOrder = orderMode === 'link'
    const payload = isLinkOrder
      ? { ...orderForm, items: [], externalLink: orderForm.externalLink.trim(), userId: user?.id || null, userEmail: user?.email || null }
      : { ...orderForm, items: cart, externalLink: '', externalPlatform: '', externalDetails: '', userId: user?.id || null, userEmail: user?.email || null }

    try {
      if (!isLinkOrder && !cart.length) return notify('error', 'Добавь товар в корзину или выбери заказ по ссылке')
      if (isLinkOrder && !orderForm.externalLink.trim()) return notify('error', 'Вставь ссылку на товар')

      const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Не удалось оформить заказ')
      if (!isLinkOrder) setCart([])
      setCartOpen(false)
      setOrderForm({ customerName: '', phone: '', address: '', comment: '', externalLink: '', externalPlatform: '', externalDetails: '' })
      notify('ok', 'Заказ оформлен. Менеджер скоро свяжется с вами.')
      if (user) loadOrders()
    } catch (error: any) {
      notify('error', humanError(error.message))
    }
  }


  async function updateOrder(orderId: string, patch: Partial<Order>) {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Не удалось обновить заказ')
      setOrders((current) => current.map((order) => order.id === orderId ? { ...order, ...data.order } : order))
      setSelectedOrder((current) => current?.id === orderId ? { ...current, ...data.order } : current)
      notify('ok', 'Заказ обновлён')
    } catch (error: any) {
      notify('error', humanError(error.message))
    }
  }

  async function removeOrder(orderId: string) {
    if (!confirm('Удалить заказ? Это действие нельзя отменить.')) return
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Не удалось удалить заказ')
      setOrders((current) => current.filter((order) => order.id !== orderId))
      setSelectedOrder(null)
      notify('ok', 'Заказ удалён')
    } catch (error: any) {
      notify('error', humanError(error.message))
    }
  }

  function exportOrdersCsv() {
    const rows = [
      ['ID', 'Дата', 'Клиент', 'Телефон', 'Адрес', 'Тип', 'Статус', 'Сумма', 'Закуп', 'Прибыль завершённого', 'Комментарий', 'Ссылка', 'Заметка менеджера'],
      ...filteredOrders.map((order) => [
        order.id,
        new Date(order.created_at).toLocaleString('ru-RU'),
        order.customer_name,
        order.phone,
        order.address,
        (order.order_type || (order.external_link ? 'link' : 'site')) === 'link' ? 'По ссылке' : 'С сайта',
        statusLabel(order.status),
        String(order.total || 0),
        String((order.order_items || []).reduce((sum, item) => sum + Number(item.purchase_price || 0) * Number(item.qty || 1), 0)),
        String(order.status === 'completed' ? Math.max(0, Number(order.total || 0) - (order.order_items || []).reduce((sum, item) => sum + Number(item.purchase_price || 0) * Number(item.qty || 1), 0)) : 0),
        order.comment || '',
        order.external_link || '',
        order.manager_note || '',
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cargo-orders-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="app-shell">
      {toast && <ToastMessage toast={toast} onClose={() => setToast(null)} />}
      <header className="topbar">
        <div className="container nav">
          <button className="burger-btn" type="button" onClick={() => setMobileMenuOpen((v) => !v)} aria-label="Открыть меню">
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <button className="logo" type="button" onClick={() => go('home')}><img src={siteSettings.logo_image || defaultSettings.logo_image} alt="Cargo Store" /><span>CARGO STORE</span></button>

          <div className="desktop-actions">
            <button className="action-pill" type="button" onClick={() => go('catalog')} aria-label="Поиск"><Search size={18} /><span>Поиск</span></button>
            <button className="action-pill" type="button" onClick={() => user ? go(user.role === 'admin' ? 'admin' : 'profile') : setAuthOpen(true)} aria-label="Профиль"><User size={18} /><span>{user ? (user.role === 'admin' ? 'Админка' : 'Профиль') : 'Вход'}</span></button>
            <button className="action-pill" type="button" onClick={() => setCartOpen(true)} aria-label="Корзина"><ShoppingBag size={18} /><span>Корзина</span>{cartCount > 0 && <span className="badge-count">{cartCount}</span>}</button>
          </div>
        </div>

        <div className="header-actions"><div className="container header-actions-inner"><nav className="desktop-menu">{nav.map((item) => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => go(item.id)}>{item.label}</button>)}{user?.role === 'admin' && <button className={page === 'admin' ? 'active' : ''} onClick={() => go('admin')}>Админка</button>}</nav></div></div>

        <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}><div className="container mobile-menu-inner">{nav.map((item) => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => go(item.id)}>{item.label}</button>)}{user?.role === 'admin' && <button className={page === 'admin' ? 'active' : ''} onClick={() => go('admin')}>Админка</button>}</div></div>
      </header>

      <section className={`page ${page === 'home' ? 'active' : ''}`}>
        <div className="hero">
          <div className="container hero-inner">
            <img className="hero-img" src={siteSettings.promo_image || defaultSettings.promo_image} alt="CARGO STORE promo" />
            <div className="hero-content">
              <div className="hero-badges"><span>Доставка из каталога</span><span>Заказ по ссылке</span></div>
              <h1 className="hero-kicker">AW / 24</h1>
              <p className="hero-sub">Выбирайте товар на сайте или отправляйте ссылку с другой платформы — менеджер рассчитает заказ</p>
              <div className="hero-buttons"><button className="btn-primary" onClick={() => go('catalog')}>Смотреть коллекцию</button><button className="btn-secondary hero-link-btn" onClick={() => { setOrderMode('link'); go('orders') }}><LinkIcon size={18} /> Заказать по ссылке</button></div>
            </div>
          </div>
        </div>

        <section className="section feature-strip"><div className="container feature-grid"><Feature icon={<ShoppingBag />} title="С сайта" text="Добавьте вещи в корзину и оформите заказ за минуту." /><Feature icon={<LinkIcon />} title="По ссылке" text="Вставьте ссылку на 1688, Taobao или другую платформу." /><Feature icon={<MessageCircle />} title="Telegram" text="Заказ сразу уходит менеджеру для расчёта и подтверждения." /></div></section>

        <section className="section"><div className="container"><div className="section-head"><div><h2 className="section-title">Новинки</h2><p className="section-note">Чистые формы, спокойные цвета и удобная витрина для заказа.</p></div><button className="link-more" onClick={() => go('catalog')}>Все</button></div><ProductGrid products={products.slice(0, 4)} openProduct={openProduct} addToCart={addToCart} likedIds={likedIds} toggleLike={toggleLike} /></div></section>

        <section className="section steps" id="how-order"><div className="container"><h2 className="section-title" style={{ textAlign: 'center', marginBottom: 34 }}>Как заказать</h2><div className="timeline"><div className="step"><span className="step-dot" /><div><h3>1. Выберите формат</h3><p>Можно заказать товар из каталога или вставить ссылку на вещь с другой платформы.</p></div></div><div className="step"><span className="step-dot" /><div><h3>2. Оформите заявку</h3><p>Укажите контакты, адрес и детали: размер, цвет, количество или комментарий.</p></div></div><div className="step done"><span className="step-dot" /><div><h3>3. Подтверждение</h3><p>Менеджер получает заказ в Telegram, рассчитывает стоимость и связывается с вами.</p></div></div></div></div></section>
      </section>

      <section className={`page ${page === 'catalog' ? 'active' : ''}`}>
        <div className="container section"><div className="section-head"><div><h1 className="section-title">Каталог</h1><p className="section-note">Выбирайте готовые позиции или используйте заказ по ссылке для товаров с других площадок.</p></div><button className="btn-secondary" onClick={() => { setOrderMode('link'); go('orders') }}><LinkIcon size={18} /> Заказ по ссылке</button></div>{apiError && <div className="message error" style={{ marginBottom: 18 }}>{apiError}</div>}<div className="two" style={{ marginBottom: 16 }}><input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по каталогу" /><button className="btn-secondary" onClick={loadProducts}>{loading ? 'Загрузка...' : 'Обновить каталог'}</button></div><div className="filters">{categories.map((cat) => <button key={cat} className={`chip ${filter === cat ? 'active' : ''}`} onClick={() => setFilter(cat)}>{cat}</button>)}</div><ProductGrid products={filteredProducts} openProduct={openProduct} addToCart={addToCart} likedIds={likedIds} toggleLike={toggleLike} /></div>
      </section>

      <section className={`page ${page === 'orders' ? 'active' : ''}`}>
        <div className="container section"><div className="section-head"><div><h1 className="section-title">Оформить заказ</h1><p className="section-note">Два отдельных сценария: заказ из корзины или заявка по ссылке на товар.</p></div></div><div className="order-switch"><button className={orderMode === 'cart' ? 'active' : ''} onClick={() => setOrderMode('cart')}><ShoppingBag size={18} /> Из корзины</button><button className={orderMode === 'link' ? 'active' : ''} onClick={() => setOrderMode('link')}><LinkIcon size={18} /> По ссылке</button></div><div className="admin-layout"><form className="card form-grid" onSubmit={submitOrder}><input className="input" required placeholder="Ваше имя" value={orderForm.customerName} onChange={(e) => setOrderForm({ ...orderForm, customerName: e.target.value })} /><input className="input" required placeholder="Телефон / Telegram" value={orderForm.phone} onChange={(e) => setOrderForm({ ...orderForm, phone: e.target.value })} /><input className="input" required placeholder="Город и адрес доставки" value={orderForm.address} onChange={(e) => setOrderForm({ ...orderForm, address: e.target.value })} />{orderMode === 'link' && <div className="external-order-box"><div><h3>Заказ по ссылке</h3><p>Вставьте ссылку на товар — менеджер рассчитает стоимость и уточнит детали.</p></div><input className="input" required placeholder="Ссылка на товар: 1688 / Taobao / Wildberries / другой сайт" value={orderForm.externalLink} onChange={(e) => setOrderForm({ ...orderForm, externalLink: e.target.value })} /><div className="two"><input className="input" placeholder="Платформа, например 1688" value={orderForm.externalPlatform} onChange={(e) => setOrderForm({ ...orderForm, externalPlatform: e.target.value })} /><input className="input" placeholder="Размер / цвет / количество" value={orderForm.externalDetails} onChange={(e) => setOrderForm({ ...orderForm, externalDetails: e.target.value })} /></div></div>}<textarea className="input" rows={4} placeholder="Комментарий к заказу" value={orderForm.comment} onChange={(e) => setOrderForm({ ...orderForm, comment: e.target.value })} /><button className="btn-primary" disabled={orderMode === 'cart' ? !cart.length : !orderForm.externalLink.trim()}>{orderMode === 'cart' ? 'Оформить заказ из корзины' : 'Отправить ссылку менеджеру'}</button></form><div className="card"><h2 className="panel-title">{orderMode === 'cart' ? 'Корзина' : 'Как это работает'}</h2>{orderMode === 'cart' ? (cart.length ? cart.map((item) => <CartLine key={item.id + item.size} item={item} changeQty={changeQty} />) : <div className="empty">Корзина пустая. Перейдите в каталог или выберите заказ по ссылке.</div>) : <div className="link-info"><LinkIcon size={34} /><h3>Любая платформа</h3><p>Подходит ссылка на товар с маркетплейса или иностранной площадки. Менеджер получит заявку в Telegram.</p></div>}<div className="total-row"><span>Итого</span><span>{orderMode === 'cart' ? formatPrice(cartTotal) : 'расчёт менеджера'}</span></div></div></div></div>
      </section>

      <section className={`page ${page === 'profile' ? 'active' : ''}`}>
        <div className="container section">
          <div className="section-head profile-section-head">
            <div>
              <h1 className="section-title">Личный кабинет</h1>
              <p className="section-note">Заказы, данные доставки, избранное и быстрые действия в одном месте.</p>
            </div>
            {user && <button className="btn-danger" onClick={logout}>Выйти</button>}
          </div>

          {user ? (
            <ProfileDashboard
              user={user}
              profileDraft={profileDraft}
              setProfileDraft={setProfileDraft}
              saveProfileDraft={saveProfileDraft}
              likedProducts={likedProducts}
              cart={cart}
              cartCount={cartCount}
              cartTotal={cartTotal}
              userOrders={userOrders}
              activeOrders={profileStats.active}
              completedOrders={profileStats.completed}
              totalSpent={profileStats.totalSpent}
              openProduct={openProduct}
              addToCart={addToCart}
              toggleLike={toggleLike}
              clearLikes={() => { setLikedIds([]); notify('ok', 'Избранное очищено') }}
              go={go}
              fillOrderFromProfile={fillOrderFromProfile}
              setSelectedProfileOrder={setSelectedProfileOrder}
            />
          ) : (
            <div className="card profile-login-card">
              <div className="profile-login-icon"><User size={28} /></div>
              <h2 className="panel-title">Войдите в аккаунт</h2>
              <p>После входа здесь появятся ваши заказы, избранные товары, адрес доставки и быстрый заказ по ссылке.</p>
              <button className="btn-primary" onClick={() => setAuthOpen(true)}>Войти или зарегистрироваться</button>
            </div>
          )}
        </div>
      </section>

      <section className={`page ${page === 'admin' ? 'active' : ''}`}>
        <div className="container section">
          <div className="section-head">
            <div>
              <h1 className="section-title">Панель управления</h1>
              <p className="section-note">CRM заказов, товары, визуал сайта и аналитика магазина.</p>
            </div>
          </div>

          {user?.role !== 'admin' ? (
            <div className="card">
              <h2 className="panel-title">Нужен вход администратора</h2>
              <p>Войдите в аккаунт с правами администратора.</p>
              <button className="btn-primary" onClick={() => setAuthOpen(true)}>Войти</button>
            </div>
          ) : (
            <>
              <div className="analytics-grid upgraded">
                <StatCard icon={<Package />} label="Товаров" value={products.length} hint={`${inStockCount} в наличии`} />
                <StatCard icon={<ClipboardList />} label="Активных заказов" value={activeOrders.length} hint={`${todayOrders} сегодня`} />
                <StatCard icon={<BarChart3 />} label="Оборот" value={formatPrice(ordersTotal)} hint={`без отменённых · ${formatPrice(todayRevenue)} сегодня`} />
                <StatCard icon={<CheckCircle />} label="Завершённые" value={formatPrice(completedRevenue)} hint={`${completedOrders.length} заказов закрыто`} />
                <StatCard icon={<Sparkles />} label="Прибыль" value={formatPrice(grossProfit)} hint={`только завершённые · закуп: ${formatPrice(completedPurchaseTotal)}`} />
                <StatCard icon={<CalendarDays />} label="Конверсия" value={`${conversionRate}%`} hint={`${completedOrders.length} завершено`} />
              </div>

              <div className="analytics-deep-grid">
                <div className="card analytics-card">
                  <div className="panel-head compact">
                    <h2 className="panel-title">Статистика заказов</h2>
                    <button className="btn-secondary" onClick={loadOrders}><RefreshCw size={17} /> Обновить</button>
                  </div>
                  <div className="order-kpi-grid">
                    <MiniKpi label="За неделю" value={weekOrders.length} />
                    <MiniKpi label="Средний чек" value={formatPrice(avgOrder)} />
                    <MiniKpi label="Закуп завершённых" value={formatPrice(completedPurchaseTotal)} />
                    <MiniKpi label="С сайта" value={siteOrders.length} />
                    <MiniKpi label="По ссылке" value={linkOrders.length} />
                  </div>
                  <div className="status-bars">
                    {orderStatuses.map((status) => {
                      const count = statusCounts.get(status.value) || 0
                      const width = orders.length ? Math.max(4, Math.round((count / orders.length) * 100)) : 0
                      return (
                        <div className="status-bar-row" key={status.value}>
                          <div><span>{status.label}</span><b>{count}</b></div>
                          <div className="status-bar-track"><i style={{ width: `${width}%` }} /></div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="card analytics-card">
                  <h2 className="panel-title">Популярные позиции</h2>
                  {popularItems.length ? (
                    <div className="popular-list premium">
                      {popularItems.map(([title, qty], index) => <div key={title}><span>{index + 1}. {title}</span><b>{qty} шт.</b></div>)}
                    </div>
                  ) : <div className="empty">Данных пока мало</div>}
                </div>
              </div>

              <AdminOrdersPanel
                orders={filteredOrders}
                allOrdersCount={orders.length}
                orderSearch={orderSearch}
                setOrderSearch={setOrderSearch}
                orderStatusFilter={orderStatusFilter}
                setOrderStatusFilter={setOrderStatusFilter}
                updateOrder={updateOrder}
                removeOrder={removeOrder}
                setSelectedOrder={setSelectedOrder}
                exportOrdersCsv={exportOrdersCsv}
              />

              <SiteSettingsPanel settings={settingsDraft} setSettings={setSettingsDraft} saveSettings={saveSettings} readImageFile={readImageFile} resetDefaults={() => setSettingsDraft(defaultSettings)} />

              <div className="admin-layout">
                <form className="card form-grid" onSubmit={createProduct}>
                  <h2 className="panel-title">Новый товар</h2>
                  {adminMessage && <div className={`message ${adminMessage.type}`}>{adminMessage.text}</div>}
                  <input className="input" required placeholder="Название" value={newProduct.title} onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })} />
                  <div className="two"><input className="input" required placeholder="Категория" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} /><input className="input" required type="number" placeholder="Цена продажи BYN" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} /></div>
                  <div className="two"><input className="input" type="number" placeholder="Старая цена для псевдо-скидки BYN" value={newProduct.old_price} onChange={(e) => setNewProduct({ ...newProduct, old_price: e.target.value })} /><input className="input" type="number" placeholder="Цена закупа BYN — видна только в аналитике" value={newProduct.purchase_price} onChange={(e) => setNewProduct({ ...newProduct, purchase_price: e.target.value })} /></div>
                  <input className="input" required placeholder="Размеры через запятую: S, M, L" value={newProduct.sizes} onChange={(e) => setNewProduct({ ...newProduct, sizes: e.target.value })} />
                  <ProductImagesManager
                    title="Фото товара"
                    mainImage={newProduct.image}
                    images={newProduct.images || []}
                    onFiles={(files) => readProductImageFiles(files, 'new')}
                    onImagesChange={(items) => setNewProduct((current) => ({ ...current, images: items, image: current.image && items.includes(current.image) ? current.image : items[0] || '' }))}
                    onMakeMain={(url) => makeMainProductImage('new', url)}
                    onRemove={(url) => removeProductImage('new', url)}
                  />
                  <input className="input" placeholder="Тег: NEW, HIT, DROP" value={newProduct.tag} onChange={(e) => setNewProduct({ ...newProduct, tag: e.target.value })} />
                  <textarea className="input" rows={4} placeholder="Описание" value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} />
                  <button className="btn-primary">Добавить товар</button>
                </form>

                <div className="card">
                  <div className="panel-head"><h2 className="panel-title">Товары</h2><button className="btn-secondary" onClick={loadProducts}>Обновить</button></div>
                  {products.map((product) => (
                    <div className="admin-product" key={product.id}>
                      <img src={mainProductImage(product)} alt={product.title} />
                      <div><strong>{product.title}</strong><p style={{ margin: '4px 0', color: 'var(--on-variant)' }}>{product.category} · {formatPrice(product.price)} · {product.in_stock ? 'в наличии' : 'скрыт'}</p></div>
                      <div className="admin-actions"><button className="small-btn" onClick={() => setEditingProduct(product)}><Edit3 size={15} /> Редактировать</button><button className="small-btn dark" onClick={() => toggleStock(product)}>{product.in_stock ? 'Скрыть' : 'Вернуть'}</button><button className="small-btn red" onClick={() => deleteProduct(product)}>Удалить</button></div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <Footer go={go} />
      <MobileDock page={page} go={go} user={user} setAuthOpen={setAuthOpen} />
      <CartDrawer open={cartOpen} setOpen={setCartOpen} cart={cart} changeQty={changeQty} total={cartTotal} go={go} setOrderMode={setOrderMode} />
      <AuthModal open={authOpen} setOpen={setAuthOpen} login={login} />
      <ProductModal product={selectedProduct} setProduct={setSelectedProduct} size={selectedSize} setSize={setSelectedSize} addToCart={addToCart} />
      <OrderDetailsModal order={selectedOrder} setOrder={setSelectedOrder} updateOrder={updateOrder} removeOrder={removeOrder} />
      <ProfileOrderModal order={selectedProfileOrder} setOrder={setSelectedProfileOrder} />
      <EditProductModal product={editingProduct} setProduct={setEditingProduct} submit={updateProduct} readProductImageFile={readProductImageFile} readProductImageFiles={readProductImageFiles} addProductImageByUrl={addProductImageByUrl} removeProductImage={removeProductImage} makeMainProductImage={makeMainProductImage} />
    </main>
  )
}


function ProfileDashboard({
  user,
  profileDraft,
  setProfileDraft,
  saveProfileDraft,
  likedProducts,
  cart,
  cartCount,
  cartTotal,
  userOrders,
  activeOrders,
  completedOrders,
  totalSpent,
  openProduct,
  addToCart,
  toggleLike,
  clearLikes,
  go,
  fillOrderFromProfile,
  setSelectedProfileOrder,
}: {
  user: UserType
  profileDraft: ProfileDraft
  setProfileDraft: React.Dispatch<React.SetStateAction<ProfileDraft>>
  saveProfileDraft: (e?: React.FormEvent) => void
  likedProducts: Product[]
  cart: CartItem[]
  cartCount: number
  cartTotal: number
  userOrders: Order[]
  activeOrders: Order[]
  completedOrders: Order[]
  totalSpent: number
  openProduct: (product: Product) => void | Promise<void>
  addToCart: (product: Product) => void
  toggleLike: (product: Product) => void
  clearLikes: () => void
  go: (page: string) => void
  fillOrderFromProfile: (mode: 'cart' | 'link') => void
  setSelectedProfileOrder: (order: Order | null) => void
}) {
  const recentOrders = userOrders.slice(0, 4)
  const topFavorites = likedProducts.slice(0, 3)
  const firstName = (profileDraft.name || user.name || 'Покупатель').split(' ')[0]

  return (
    <div className="profile-pro">
      <div className="profile-hero-card">
        <div className="profile-hero-left">
          <div className="profile-avatar big">{(profileDraft.name || user.name || 'U').charAt(0).toUpperCase()}</div>
          <div>
            <span className="profile-eyebrow">CARGO STORE account</span>
            <h2>Привет, {firstName}</h2>
            <p>{user.email}</p>
          </div>
        </div>
        <div className="profile-hero-actions">
          <button className="btn-primary" onClick={() => fillOrderFromProfile('cart')}><ShoppingBag size={18} /> Оформить корзину</button>
          <button className="btn-secondary" onClick={() => fillOrderFromProfile('link')}><LinkIcon size={18} /> Заказать по ссылке</button>
        </div>
      </div>

      <div className="profile-kpi-grid">
        <ProfileKpi icon={<ClipboardList />} label="Всего заказов" value={userOrders.length} hint={`${activeOrders.length} активных`} />
        <ProfileKpi icon={<CheckCircle />} label="Завершено" value={completedOrders.length} hint={formatPrice(totalSpent)} />
        <ProfileKpi icon={<Heart />} label="Избранное" value={likedProducts.length} hint="сохранённых товаров" />
        <ProfileKpi icon={<ShoppingBag />} label="Корзина" value={cartCount} hint={formatPrice(cartTotal)} />
      </div>

      <div className="profile-main-grid">
        <div className="profile-left-column">
          <form className="card profile-data-card" onSubmit={saveProfileDraft}>
            <div className="panel-head compact">
              <div>
                <h2 className="panel-title">Данные для доставки</h2>
                <p className="profile-muted">Сохрани один раз — при оформлении заказа поля будут подставляться автоматически.</p>
              </div>
              <button className="small-btn dark" type="submit"><Save size={15} /> Сохранить</button>
            </div>
            <div className="profile-form-grid">
              <label className="field-label">Имя<input className="input" value={profileDraft.name} onChange={(e) => setProfileDraft({ ...profileDraft, name: e.target.value })} placeholder="Ваше имя" /></label>
              <label className="field-label">Телефон<input className="input" value={profileDraft.phone} onChange={(e) => setProfileDraft({ ...profileDraft, phone: e.target.value })} placeholder="+375..." /></label>
              <label className="field-label">Город<input className="input" value={profileDraft.city} onChange={(e) => setProfileDraft({ ...profileDraft, city: e.target.value })} placeholder="Минск" /></label>
              <label className="field-label">Адрес<input className="input" value={profileDraft.address} onChange={(e) => setProfileDraft({ ...profileDraft, address: e.target.value })} placeholder="Улица, дом, квартира" /></label>
              <label className="field-label">Telegram<input className="input" value={profileDraft.telegram} onChange={(e) => setProfileDraft({ ...profileDraft, telegram: e.target.value })} placeholder="@username" /></label>
              <label className="field-label">Instagram<input className="input" value={profileDraft.instagram} onChange={(e) => setProfileDraft({ ...profileDraft, instagram: e.target.value })} placeholder="@username" /></label>
            </div>
          </form>

          <div className="card profile-orders-card">
            <div className="panel-head compact">
              <div>
                <h2 className="panel-title">Мои заказы</h2>
                <p className="profile-muted">Отслеживайте статус заказов из каталога и заявок по ссылке.</p>
              </div>
              <button className="small-btn" onClick={() => go('orders')}>Новый заказ</button>
            </div>
            {recentOrders.length ? (
              <div className="profile-order-list">
                {recentOrders.map((order) => <ProfileOrderRow key={order.id} order={order} onOpen={() => setSelectedProfileOrder(order)} />)}
              </div>
            ) : (
              <div className="profile-empty-state">
                <Truck size={34} />
                <h3>Заказов пока нет</h3>
                <p>Выберите товар из каталога или отправьте ссылку на вещь с другой платформы.</p>
                <div><button className="btn-primary" onClick={() => go('catalog')}>Смотреть каталог</button><button className="btn-secondary" onClick={() => fillOrderFromProfile('link')}>Заказать по ссылке</button></div>
              </div>
            )}
          </div>
        </div>

        <div className="profile-right-column">
          <div className="card profile-cart-card">
            <div className="panel-head compact">
              <h2 className="panel-title">Корзина</h2>
              <span className="profile-pill">{cartCount} шт.</span>
            </div>
            {cart.length ? (
              <>
                <div className="profile-mini-lines">
                  {cart.slice(0, 3).map((item) => <div key={item.id + item.size}><span>{item.title} / {item.size}</span><b>{item.qty} × {formatPrice(item.price)}</b></div>)}
                </div>
                <div className="total-row"><span>Итого</span><b>{formatPrice(cartTotal)}</b></div>
                <button className="btn-primary full" onClick={() => fillOrderFromProfile('cart')}>Оформить</button>
              </>
            ) : <div className="profile-small-empty"><Package size={26} /><p>Корзина пустая</p><button className="small-btn" onClick={() => go('catalog')}>В каталог</button></div>}
          </div>

          <div className="card profile-link-card">
            <span className="profile-link-icon"><ExternalLink size={20} /></span>
            <h2>Заказ по ссылке</h2>
            <p>Вставьте ссылку с 1688, Taobao, Poizon или другой платформы. Менеджер рассчитает итоговую стоимость.</p>
            <button className="btn-secondary full" onClick={() => fillOrderFromProfile('link')}>Открыть форму</button>
          </div>

          <div className="card profile-favorites-card">
            <div className="panel-head compact">
              <div><h2 className="panel-title">Избранное</h2><p className="profile-muted">{likedProducts.length} товаров</p></div>
              {likedProducts.length > 0 && <button className="small-btn" onClick={clearLikes}>Очистить</button>}
            </div>
            {topFavorites.length ? (
              <div className="profile-favorite-list">
                {topFavorites.map((product) => (
                  <div className="profile-favorite-line" key={product.id}>
                    <button onClick={() => openProduct(product)}><img src={mainProductImage(product)} alt={product.title} /></button>
                    <div><b>{product.title}</b><span>{formatPrice(product.price)}</span></div>
                    <button className="round-mini" onClick={() => toggleLike(product)}><X size={15} /></button>
                  </div>
                ))}
              </div>
            ) : <div className="profile-small-empty"><Heart size={26} /><p>Сохраняйте товары сердечком</p></div>}
            {likedProducts.length > 3 && <button className="small-btn full" onClick={() => go('catalog')}>Показать в каталоге</button>}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProfileKpi({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string | number; hint: string }) {
  return <div className="profile-kpi-card"><span>{icon}</span><div><b>{value}</b><p>{label}</p><small>{hint}</small></div></div>
}

function ProfileOrderRow({ order, onOpen }: { order: Order; onOpen: () => void }) {
  const isLink = (order.order_type || (order.external_link ? 'link' : 'site')) === 'link'
  return (
    <button className="profile-order-row" onClick={onOpen}>
      <div>
        <b>#{order.id.slice(0, 8)}</b>
        <span>{new Date(order.created_at).toLocaleString('ru-RU')}</span>
      </div>
      <div><OrderTypeBadge order={order} /></div>
      <div><StatusPill status={order.status || 'new'} /></div>
      <strong>{isLink && !order.total ? 'расчёт' : formatPrice(order.total)}</strong>
    </button>
  )
}

function ProfileOrderModal({ order, setOrder }: { order: Order | null; setOrder: (order: Order | null) => void }) {
  if (!order) return null
  const isLink = (order.order_type || (order.external_link ? 'link' : 'site')) === 'link'
  return (
    <div className="modal open">
      <div className="backdrop" onClick={() => setOrder(null)} />
      <div className="modal-card profile-order-modal">
        <div className="panel-head">
          <div><h2 className="panel-title">Заказ #{order.id.slice(0, 8)}</h2><p className="orders-subtitle">{new Date(order.created_at).toLocaleString('ru-RU')}</p></div>
          <button className="icon-btn" onClick={() => setOrder(null)}><X /></button>
        </div>
        <div className="profile-order-modal-top"><OrderTypeBadge order={order} /><StatusPill status={order.status || 'new'} /></div>
        <div className="detail-grid">
          <div className="detail-card"><span>Клиент</span><b>{order.customer_name}</b></div>
          <div className="detail-card"><span>Телефон</span><b>{order.phone}</b></div>
          <div className="detail-card wide"><span>Адрес</span><b>{order.address}</b></div>
          {order.comment && <div className="detail-card wide"><span>Комментарий</span><b>{order.comment}</b></div>}
        </div>
        {isLink && <div className="external-detail-card"><ExternalLink size={20} /><div><h3>Заказ по ссылке</h3>{order.external_link && <a href={order.external_link} target="_blank" rel="noreferrer">{order.external_link}</a>}<p>{[order.external_platform, order.external_details].filter(Boolean).join(' · ') || 'Менеджер уточнит детали'}</p></div></div>}
        <div className="order-items-box">
          <h3>Состав заказа</h3>
          {order.order_items?.length ? order.order_items.map((item, index) => <div className="order-item-line" key={`${item.title}-${index}`}><span>{item.title}{item.size && !String(item.size).startsWith('http') ? ` / ${item.size}` : ''}</span><b>{item.qty} × {formatPrice(item.price)}</b></div>) : <p>Позиции пока рассчитываются менеджером</p>}
        </div>
        <div className="profile-order-next">
          <h3>Что дальше?</h3>
          <p>{order.status === 'calculation' ? 'Менеджер рассчитывает стоимость и скоро свяжется с вами.' : order.status === 'completed' ? 'Заказ завершён. Спасибо за покупку!' : order.status === 'cancelled' ? 'Заказ отменён.' : 'Следите за статусом в профиле. При изменении статуса менеджер увидит это в CRM.'}</p>
        </div>
      </div>
    </div>
  )
}

function SiteSettingsPanel({ settings, setSettings, saveSettings, readImageFile, resetDefaults }: { settings: SiteSettings; setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>; saveSettings: (e: React.FormEvent) => Promise<void>; readImageFile: (file: File, field: keyof SiteSettings) => void; resetDefaults: () => void }) {
  return (
    <form className="card settings-panel" onSubmit={saveSettings}>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Визуал сайта</h2>
          <p className="settings-note">Здесь можно поменять первое промо-фото и логотип во вкладке браузера. После сохранения изменения увидят все пользователи.</p>
        </div>
        <button className="btn-secondary" type="button" onClick={resetDefaults}>Сбросить</button>
      </div>

      <div className="settings-grid">
        <div className="settings-control">
          <div className="settings-preview promo-preview">
            <img src={settings.promo_image || defaultSettings.promo_image} alt="Промо" />
          </div>
          <label className="upload-tile">
            <Upload size={18} />
            <span>Загрузить промо-фото</span>
            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && readImageFile(e.target.files[0], 'promo_image')} />
          </label>
          <input className="input" placeholder="Или вставьте ссылку на промо-фото" value={settings.promo_image} onChange={(e) => setSettings((current) => ({ ...current, promo_image: e.target.value }))} />
        </div>

        <div className="settings-control">
          <div className="settings-preview logo-preview">
            <img src={settings.logo_image || defaultSettings.logo_image} alt="Логотип" />
          </div>
          <label className="upload-tile compact">
            <ImageIcon size={18} />
            <span>Загрузить логотип / favicon</span>
            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && readImageFile(e.target.files[0], 'logo_image')} />
          </label>
          <input className="input" placeholder="Или вставьте ссылку на логотип" value={settings.logo_image} onChange={(e) => setSettings((current) => ({ ...current, logo_image: e.target.value }))} />
        </div>
      </div>

      <button className="btn-primary" type="submit"><Save size={18} /> Сохранить визуал сайта</button>
    </form>
  )
}

function ToastMessage({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const Icon = toast.type === 'ok' ? CheckCircle : toast.type === 'error' ? AlertCircle : Sparkles
  return <div className={`toast ${toast.type}`}><Icon size={19} /><span>{toast.text}</span><button onClick={onClose}><X size={16} /></button></div>
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="feature-card"><div className="feature-icon">{icon}</div><h3>{title}</h3><p>{text}</p></div>
}

function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string | number; hint: string }) {
  return <div className="stat-card"><div className="stat-icon">{icon}</div><p>{label}</p><h3>{value}</h3><span>{hint}</span></div>
}


function MiniKpi({ label, value }: { label: string; value: string | number }) {
  return <div className="mini-kpi"><span>{label}</span><b>{value}</b></div>
}

function OrderTypeBadge({ order }: { order: Order }) {
  const type = order.order_type || (order.external_link ? 'link' : 'site')
  return <span className={`order-type ${type}`}>{type === 'link' ? 'По ссылке' : 'С сайта'}</span>
}

function StatusPill({ status }: { status: string }) {
  return <span className={`status-pill ${statusTone(status)}`}>{statusLabel(status)}</span>
}

function AdminOrdersPanel({ orders, allOrdersCount, orderSearch, setOrderSearch, orderStatusFilter, setOrderStatusFilter, updateOrder, removeOrder, setSelectedOrder, exportOrdersCsv }: {
  orders: Order[]
  allOrdersCount: number
  orderSearch: string
  setOrderSearch: (v: string) => void
  orderStatusFilter: string
  setOrderStatusFilter: (v: string) => void
  updateOrder: (id: string, patch: Partial<Order>) => Promise<void>
  removeOrder: (id: string) => Promise<void>
  setSelectedOrder: (order: Order | null) => void
  exportOrdersCsv: () => void
}) {
  return (
    <div className="card orders-crm">
      <div className="panel-head orders-head">
        <div>
          <h2 className="panel-title">CRM заказов</h2>
          <p className="orders-subtitle">{orders.length} из {allOrdersCount} заказов показано</p>
        </div>
        <div className="orders-head-actions">
          <button className="btn-secondary" onClick={exportOrdersCsv}>Скачать CSV</button>
        </div>
      </div>

      <div className="orders-toolbar">
        <label className="search-control"><Search size={18} /><input value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} placeholder="Поиск: имя, телефон, ссылка, товар" /></label>
        <label className="select-control"><FilterIcon size={18} /><select value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)}><option value="all">Все статусы</option>{orderStatuses.map((status) => <option value={status.value} key={status.value}>{status.label}</option>)}</select></label>
      </div>

      <div className="orders-table">
        <div className="orders-table-row head"><span>Заказ</span><span>Клиент</span><span>Тип</span><span>Сумма</span><span>Статус</span><span>Действия</span></div>
        {orders.length ? orders.map((order) => (
          <div className="orders-table-row" key={order.id}>
            <button className="order-id-button" onClick={() => setSelectedOrder(order)}><b>#{order.id.slice(0, 8)}</b><small>{new Date(order.created_at).toLocaleString('ru-RU')}</small></button>
            <div><strong>{order.customer_name}</strong><small>{order.phone}</small></div>
            <OrderTypeBadge order={order} />
            <b>{formatPrice(order.total)}</b>
            <select className={`status-select ${statusTone(order.status)}`} value={order.status || 'new'} onChange={(e) => updateOrder(order.id, { status: e.target.value })}>{orderStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select>
            <div className="table-actions"><button className="small-btn" onClick={() => setSelectedOrder(order)}>Открыть</button><button className="small-btn red" onClick={() => removeOrder(order.id)}>Удалить</button></div>
          </div>
        )) : <div className="empty">Заказы не найдены</div>}
      </div>
    </div>
  )
}

function OrderDetailsModal({ order, setOrder, updateOrder, removeOrder }: { order: Order | null; setOrder: (v: Order | null) => void; updateOrder: (id: string, patch: Partial<Order> & { link_item?: any }) => Promise<void>; removeOrder: (id: string) => Promise<void> }) {
  const [note, setNote] = useState('')
  const [total, setTotal] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [linkPurchasePrice, setLinkPurchasePrice] = useState('')
  const [linkSalePrice, setLinkSalePrice] = useState('')
  const [linkDetails, setLinkDetails] = useState('')

  useEffect(() => {
    const firstItem = order?.order_items?.[0]
    setNote(order?.manager_note || '')
    setTotal(order ? String(order.total || 0) : '')
    setLinkTitle(firstItem?.title && !firstItem.title.toLowerCase().includes('заказ по ссылке') ? firstItem.title : '')
    setLinkPurchasePrice(firstItem?.purchase_price ? String(firstItem.purchase_price) : '')
    setLinkSalePrice(firstItem?.price ? String(firstItem.price) : (order?.total ? String(order.total) : ''))
    setLinkDetails(order?.external_details || firstItem?.size || '')
  }, [order])

  if (!order) return null
  const isLink = (order.order_type || (order.external_link ? 'link' : 'site')) === 'link'
  const purchaseSum = (order.order_items || []).reduce((sum, item) => sum + Number(item.purchase_price || 0) * Number(item.qty || 1), 0)
  const profit = Math.max(0, Number(order.total || 0) - purchaseSum)

  async function saveLinkCalculation() {
    const salePrice = Number(linkSalePrice || total || 0)
    await updateOrder(order!.id, {
      total: salePrice,
      external_details: linkDetails,
      manager_note: note,
      status: order!.status === 'calculation' ? 'waiting_payment' : order!.status,
      link_item: {
        title: linkTitle || 'Заказ по ссылке',
        size: linkDetails,
        qty: 1,
        price: salePrice,
        purchase_price: Number(linkPurchasePrice || 0),
      },
    } as any)
  }

  return (
    <div className="modal open">
      <div className="backdrop" onClick={() => setOrder(null)} />
      <div className="modal-card order-detail-modal">
        <div className="panel-head">
          <div><h2 className="panel-title">Заказ #{order.id.slice(0, 8)}</h2><p className="orders-subtitle">{new Date(order.created_at).toLocaleString('ru-RU')}</p></div>
          <button className="icon-btn" onClick={() => setOrder(null)}><X /></button>
        </div>

        <div className="order-detail-top">
          <OrderTypeBadge order={order} />
          <StatusPill status={order.status || 'new'} />
        </div>

        <div className="detail-grid">
          <div className="detail-card"><span>Клиент</span><b>{order.customer_name}</b></div>
          <div className="detail-card"><span>Телефон / Telegram</span><b>{order.phone}</b></div>
          <div className="detail-card wide"><span>Адрес</span><b>{order.address}</b></div>
          {order.comment && <div className="detail-card wide"><span>Комментарий клиента</span><b>{order.comment}</b></div>}
        </div>

        {isLink && <div className="external-detail-card"><ExternalLink size={20} /><div><h3>Заказ по ссылке</h3>{order.external_link && <a href={order.external_link} target="_blank" rel="noreferrer">{order.external_link}</a>}<p>{[order.external_platform, order.external_details].filter(Boolean).join(' · ') || 'Детали не указаны'}</p></div></div>}

        {isLink && (
          <div className="card form-grid link-calc-card">
            <h3>Оформление заказа по ссылке</h3>
            <p className="orders-subtitle">Заполни название, закуп и итоговую цену — после сохранения заказ попадёт в аналитику.</p>
            <input className="input" placeholder="Название товара для заказа" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} />
            <textarea className="input" rows={3} placeholder="Размер / цвет / количество / детали" value={linkDetails} onChange={(e) => setLinkDetails(e.target.value)} />
            <div className="two">
              <input className="input" type="number" placeholder="Цена закупа BYN" value={linkPurchasePrice} onChange={(e) => setLinkPurchasePrice(e.target.value)} />
              <input className="input" type="number" placeholder="Итоговая цена для клиента BYN" value={linkSalePrice} onChange={(e) => { setLinkSalePrice(e.target.value); setTotal(e.target.value) }} />
            </div>
            <button className="btn-primary" onClick={saveLinkCalculation} type="button">Сохранить расчёт по ссылке</button>
          </div>
        )}

        <div className="order-items-box">
          <h3>Состав заказа</h3>
          {order.order_items?.length ? order.order_items.map((item, index) => <div className="order-item-line" key={`${item.title}-${index}`}><span>{item.title}{item.size ? ` / ${item.size}` : ''}</span><b>{item.qty} × {formatPrice(item.price)}</b></div>) : <p>Позиции не указаны</p>}
        </div>

        <div className="order-profit-box">
          <MiniKpi label="Сумма заказа" value={formatPrice(Number(order.total || 0))} />
          <MiniKpi label="Закуп" value={formatPrice(purchaseSum)} />
          <MiniKpi label="Маржа" value={formatPrice(profit)} />
        </div>

        <div className="form-grid">
          <label className="field-label">Статус заказа<select className="input" value={order.status || 'new'} onChange={(e) => updateOrder(order.id, { status: e.target.value })}>{orderStatuses.map((status) => <option value={status.value} key={status.value}>{status.label}</option>)}</select></label>
          <label className="field-label">Сумма заказа<input className="input" type="number" value={total} onChange={(e) => setTotal(e.target.value)} onBlur={() => updateOrder(order.id, { total: Number(total || 0) })} /></label>
          <label className="field-label">Заметка менеджера<textarea className="input" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Например: клиент просит доставку после 18:00" /></label>
          <div className="order-detail-actions"><button className="btn-primary" onClick={() => updateOrder(order.id, { manager_note: note, total: Number(total || 0) })}>Сохранить заметку</button><button className="btn-danger" onClick={() => removeOrder(order.id)}>Удалить заказ</button></div>
        </div>
      </div>
    </div>
  )
}

function ProductGrid({ products, openProduct, addToCart, likedIds, toggleLike }: { products: Product[]; openProduct: (p: Product) => void | Promise<void>; addToCart: (p: Product) => void; likedIds: string[]; toggleLike: (p: Product) => void }) {
  if (!products.length) return <div className="empty">Товаров пока нет</div>
  return <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} openProduct={openProduct} addToCart={addToCart} liked={likedIds.includes(product.id)} toggleLike={toggleLike} />)}</div>
}

function ProductCard({ product, openProduct, addToCart, liked, toggleLike }: { product: Product; openProduct: (p: Product) => void | Promise<void>; addToCart: (p: Product) => void; liked: boolean; toggleLike: (p: Product) => void }) {
  const preview = mainProductImage(product)
  return <article className="product-card"><div className="product-photo" onClick={() => openProduct(product)}><span className="product-tag">{product.in_stock ? (hasFakeDiscount(product) ? `-${discountPercent(product)}%` : product.tag || 'NEW') : 'SOLD OUT'}</span>{productImages(product).length > 1 && <span className="photo-count">{productImages(product).length} фото</span>}<div className="product-actions"><button type="button" aria-label="В избранное" className={`round-mini like-btn ${liked ? 'liked' : ''}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleLike(product) }}><Heart size={18} fill={liked ? 'currentColor' : 'none'} /></button></div><img src={preview} alt={product.title} loading="lazy" decoding="async" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=80' }} /></div><div className="product-info"><div className="product-row"><h3 className="product-title">{product.title}</h3><span className="sizes">{product.sizes?.join(' / ')}</span></div><div className="product-row"><div className="price-stack">{hasFakeDiscount(product) && <span className="old-price">{formatPrice(Number(product.old_price))}</span>}<p className="product-price">{formatPrice(product.price)}</p></div><button className="small-btn" disabled={!product.in_stock} onClick={() => addToCart(product)}>{product.in_stock ? 'В корзину' : 'Нет'}</button></div></div></article>
}

function CartLine({ item, changeQty }: { item: CartItem; changeQty: (id: string, size: string, diff: number) => void }) {
  return <div className="cart-item"><img src={mainProductImage(item)} alt={item.title} /><div><strong>{item.title}</strong><p style={{ margin: '4px 0', color: 'var(--on-variant)' }}>{item.size} · {formatPrice(item.price)}</p></div><div className="qty"><button onClick={() => changeQty(item.id, item.size, -1)}>-</button><b>{item.qty}</b><button onClick={() => changeQty(item.id, item.size, 1)}>+</button></div></div>
}

function CartDrawer({ open, setOpen, cart, changeQty, total, go, setOrderMode }: { open: boolean; setOpen: (v: boolean) => void; cart: CartItem[]; changeQty: (id: string, size: string, diff: number) => void; total: number; go: (p: string) => void; setOrderMode: (v: 'cart' | 'link') => void }) {
  return <div className={`drawer ${open ? 'open' : ''}`}><div className="backdrop" onClick={() => setOpen(false)} /><aside className="drawer-panel"><div className="panel-head"><h2 className="panel-title">Корзина</h2><button className="icon-btn" onClick={() => setOpen(false)}><X /></button></div>{cart.length ? cart.map((item) => <CartLine key={item.id + item.size} item={item} changeQty={changeQty} />) : <div className="empty">Корзина пустая</div>}<div className="total-row"><span>Итого</span><span>{formatPrice(total)}</span></div><button className="btn-primary" style={{ width: '100%' }} disabled={!cart.length} onClick={() => { setOrderMode('cart'); setOpen(false); go('orders') }}>Оформить корзину</button><button className="btn-secondary" style={{ width: '100%', marginTop: 10 }} onClick={() => { setOrderMode('link'); setOpen(false); go('orders') }}><LinkIcon size={18} /> Заказать по ссылке</button></aside></div>
}

function AuthModal({ open, setOpen, login }: { open: boolean; setOpen: (v: boolean) => void; login: (email: string, password: string, name?: string) => Promise<void> }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  return <div className={`modal ${open ? 'open' : ''}`}><div className="backdrop" onClick={() => setOpen(false)} /><div className="modal-card"><div className="panel-head"><h2 className="panel-title">{mode === 'login' ? 'Вход' : 'Регистрация'}</h2><button className="icon-btn" onClick={() => setOpen(false)}><X /></button></div><form className="form-grid" onSubmit={async (e) => { e.preventDefault(); await login(email, password, mode === 'register' ? name : undefined) }}>{mode === 'register' && <input className="input" required placeholder="Имя" value={name} onChange={(e) => setName(e.target.value)} />}<input className="input" required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} /><input className="input" required type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} /><button className="btn-primary">{mode === 'login' ? 'Войти' : 'Создать аккаунт'}</button><button type="button" className="btn-secondary" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Вход'}</button></form></div></div>
}

function ProductModal({ product, setProduct, size, setSize, addToCart }: { product: Product | null; setProduct: (p: Product | null) => void; size: string; setSize: (s: string) => void; addToCart: (p: Product, size: string) => void }) {
  const images = productImages(product)
  const [activeImage, setActiveImage] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  useEffect(() => {
    setActiveImage(0)
  }, [product?.id])

  if (!product) return null

  const currentImage = images[activeImage] || mainProductImage(product)
  const hasMultipleImages = images.length > 1
  const goImage = (direction: 1 | -1) => {
    if (!hasMultipleImages) return
    setActiveImage((current) => (current + direction + images.length) % images.length)
  }

  return <div className="modal open product-view-modal"><div className="backdrop" onClick={() => setProduct(null)} /><div className="product-view-card"><button className="product-view-close" onClick={() => setProduct(null)} aria-label="Закрыть"><X /></button><div className="product-view-media" onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY }} onTouchEnd={(e) => { if (touchStartX.current === null || touchStartY.current === null) return; const dx = e.changedTouches[0].clientX - touchStartX.current; const dy = e.changedTouches[0].clientY - touchStartY.current; touchStartX.current = null; touchStartY.current = null; if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.25) goImage(dx < 0 ? 1 : -1) }}><span className="product-view-tag">{product.in_stock ? (hasFakeDiscount(product) ? `-${discountPercent(product)}%` : product.tag || 'NEW') : 'SOLD OUT'}</span>{hasMultipleImages && <><button className="gallery-nav prev" type="button" aria-label="Предыдущее фото" onClick={() => goImage(-1)}>‹</button><button className="gallery-nav next" type="button" aria-label="Следующее фото" onClick={() => goImage(1)}>›</button><div className="gallery-counter">{activeImage + 1} / {images.length}</div></>}<img src={currentImage} alt={product.title} decoding="async" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=80' }} />{images.length > 1 && <div className="product-gallery-thumbs">{images.map((item, index) => <button key={`${item}-${index}`} className={activeImage === index ? 'active' : ''} onClick={() => setActiveImage(index)}><img src={item} alt={`${product.title} ${index + 1}`} loading="lazy" decoding="async" /></button>)}</div>}</div><div className="product-view-info"><p className="eyebrow">{product.category}</p><h2>{product.title}</h2><p className="product-view-desc">{product.description}</p><div className="product-view-section"><span className="section-label">Размер</span><div className="filters">{product.sizes?.map((s) => <button key={s} className={`chip ${size === s ? 'active' : ''}`} onClick={() => setSize(s)}>{s}</button>)}</div></div><div className="product-view-summary"><div><span>Цена</span><b>{hasFakeDiscount(product) && <em className="summary-old-price">{formatPrice(Number(product.old_price))}</em>}{formatPrice(product.price)}</b></div><div><span>Статус</span><b>{product.in_stock ? 'В наличии' : 'Нет в наличии'}</b></div></div><button className="btn-primary product-view-buy" disabled={!product.in_stock} onClick={() => { addToCart(product, size); setProduct(null) }}>Добавить в корзину</button></div></div></div>
}

function EditProductModal({ product, setProduct, submit, readProductImageFile, readProductImageFiles, addProductImageByUrl, removeProductImage, makeMainProductImage }: { product: Product | null; setProduct: (p: Product | null) => void; submit: (e: React.FormEvent) => Promise<void>; readProductImageFile: (file: File, target: 'new' | 'edit') => Promise<void>; readProductImageFiles: (files: FileList | null, target: 'new' | 'edit') => Promise<void>; addProductImageByUrl: (target: 'new' | 'edit', url: string) => void; removeProductImage: (target: 'new' | 'edit', url: string) => void; makeMainProductImage: (target: 'new' | 'edit', url: string) => void }) {
  if (!product) return null
  return (
    <div className="modal open">
      <div className="backdrop" onClick={() => setProduct(null)} />
      <div className="modal-card">
        <div className="panel-head"><h2 className="panel-title">Редактировать товар</h2><button className="icon-btn" onClick={() => setProduct(null)}><X /></button></div>
        <form className="form-grid" onSubmit={submit}>
          <input className="input" required placeholder="Название" value={product.title} onChange={(e) => setProduct({ ...product, title: e.target.value })} />
          <div className="two">
            <input className="input" required placeholder="Категория" value={product.category} onChange={(e) => setProduct({ ...product, category: e.target.value })} />
            <input className="input" required type="number" placeholder="Цена продажи BYN" value={product.price} onChange={(e) => setProduct({ ...product, price: Number(e.target.value) })} />
          </div>
          <div className="two"><input className="input" type="number" placeholder="Старая цена для псевдо-скидки BYN" value={product.old_price || ''} onChange={(e) => setProduct({ ...product, old_price: Number(e.target.value || 0) })} /><input className="input" type="number" placeholder="Цена закупа BYN — только для аналитики" value={product.purchase_price || ''} onChange={(e) => setProduct({ ...product, purchase_price: Number(e.target.value || 0) })} /></div>
          <input className="input" required placeholder="Размеры через запятую" value={product.sizes?.join(', ')} onChange={(e) => setProduct({ ...product, sizes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
          <ProductImagesManager
            title="Фото товара"
            mainImage={product.image}
            images={product.images || []}
            onFiles={(files) => readProductImageFiles(files, 'edit')}
            onImagesChange={(items) => setProduct({ ...product, images: items, image: product.image && items.includes(product.image) ? product.image : items[0] || '' })}
            onMakeMain={(url) => makeMainProductImage('edit', url)}
            onRemove={(url) => removeProductImage('edit', url)}
          />
          <input className="input" placeholder="Тег" value={product.tag} onChange={(e) => setProduct({ ...product, tag: e.target.value })} />
          <textarea className="input" rows={4} placeholder="Описание" value={product.description} onChange={(e) => setProduct({ ...product, description: e.target.value })} />
          <button className="btn-primary">Сохранить изменения</button>
        </form>
      </div>
    </div>
  )
}

function ProductImagesManager({ title, mainImage, images, onFiles, onImagesChange, onMakeMain, onRemove }: { title: string; mainImage: string; images: string[]; onFiles: (files: FileList | null) => void; onImagesChange: (items: string[]) => void; onMakeMain: (url: string) => void; onRemove: (url: string) => void }) {
  const list = Array.from(new Set([mainImage, ...(images || [])].map((item) => String(item || '').trim()).filter(Boolean)))
  const parseImages = (value: string) => Array.from(new Set(value.split(/\n+/).map((item) => item.trim()).filter(Boolean))).slice(0, 10)

  return (
    <div className="image-multi-box">
      <div className="image-multi-head"><strong>{title}</strong><span>До 10 фото. Первое фото будет главным.</span></div>
      <label className="file-upload-btn"><input type="file" accept="image/*" multiple onChange={(e) => onFiles(e.target.files)} />Загрузить фото с устройства</label>
      <textarea className="input" rows={4} placeholder="Или вставьте ссылки на фото, каждую с новой строки" value={list.join('\n')} onChange={(e) => onImagesChange(parseImages(e.target.value))} />
      {list.length ? <div className="image-thumbs-admin">{list.map((url, index) => <div className={`image-thumb-admin ${mainImage === url || (!mainImage && index === 0) ? 'main' : ''}`} key={`${url}-${index}`}><img src={url} alt={`Фото ${index + 1}`} /><div><button type="button" onClick={() => onMakeMain(url)}>Главное</button><button type="button" onClick={() => onRemove(url)}>Удалить</button></div></div>)}</div> : <div className="empty compact">Добавьте хотя бы одно фото товара</div>}
    </div>
  )
}

function MobileDock({ page, go, user, setAuthOpen }: { page: string; go: (p: string) => void; user: UserType | null; setAuthOpen: (v: boolean) => void }) {
  const items = [...nav, ...(user?.role === 'admin' ? [{ id: 'admin', label: 'Админ', icon: ShieldCheck }] : [])]
  return <nav className={`mobile-dock ${user?.role === 'admin' ? 'admin' : 'user'}`}>{items.slice(0, 5).map((item) => { const Icon = item.icon; return <button key={item.id} className={`dock-btn ${page === item.id ? 'active' : ''}`} onClick={() => item.id === 'profile' && !user ? setAuthOpen(true) : go(item.id)}><Icon size={20} /><span>{item.label}</span></button> })}</nav>
}

function Footer({ go }: { go: (p: string) => void }) {
  return <footer className="footer"><div className="container"><div className="footer-logo">CARGO STORE</div><div className="footer-links"><button onClick={() => go('home')}>Главная</button><button onClick={() => go('catalog')}>Каталог</button><button onClick={() => go('orders')}>Заказы</button><button><MessageCircle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />Telegram Channel</button></div><div className="copyright">© 2024 CARGO STORE</div></div></footer>
}
