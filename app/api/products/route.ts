import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('products')
      .select('id,title,category,price,purchase_price,old_price,sizes,image,images,in_stock,description,tag,created_at')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ products: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Не удалось загрузить товары' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = getSupabaseAdmin()

    const title = String(body.title || '').trim()
    const category = String(body.category || '').trim()
    const price = Number(body.price)
    const purchase_price = Number(body.purchase_price || 0)
    const old_price = Number(body.old_price || 0)
    const sizes = Array.isArray(body.sizes)
      ? body.sizes.map((s: string) => String(s).trim()).filter(Boolean)
      : String(body.sizes || '').split(',').map((s) => s.trim()).filter(Boolean)
    const images = Array.isArray(body.images)
      ? body.images.map((item: string) => String(item || '').trim()).filter(Boolean).slice(0, 10)
      : []
    const image = String(body.image || images[0] || '').trim()
    const description = String(body.description || '').trim() || 'Описание товара скоро появится.'
    const tag = String(body.tag || '').trim() || 'NEW'

    if (!title || !category || !Number.isFinite(price) || price < 0 || !sizes.length || !image) {
      return NextResponse.json({ error: 'Заполни название, категорию, цену, размеры и фото' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('products')
      .insert({ title, category, price, old_price, purchase_price, sizes, image, images: Array.from(new Set([image, ...images].filter(Boolean))), description, tag, in_stock: body.in_stock ?? true })
      .select('id,title,category,price,purchase_price,old_price,sizes,image,images,in_stock,description,tag,created_at')
      .single()

    if (error) throw error
    return NextResponse.json({ product: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Не удалось добавить товар' }, { status: 500 })
  }
}
