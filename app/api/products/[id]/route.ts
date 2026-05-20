import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

type ProductRouteContext = {
  params: Promise<{ id: string }>
}


export async function GET(_: NextRequest, context: ProductRouteContext) {
  try {
    const { id } = await context.params
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    return NextResponse.json({ product: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Не удалось загрузить товар' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, context: ProductRouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const supabase = getSupabaseAdmin()

    const patch: Record<string, any> = {}

    if ('title' in body) patch.title = body.title
    if ('category' in body) patch.category = body.category
    if ('price' in body) patch.price = Number(body.price)
    if ('purchase_price' in body) patch.purchase_price = Number(body.purchase_price || 0)
    if ('old_price' in body) patch.old_price = Number(body.old_price || 0)

    if ('sizes' in body) {
      patch.sizes = Array.isArray(body.sizes)
        ? body.sizes
        : String(body.sizes)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
    }

    if ('images' in body) patch.images = Array.isArray(body.images) ? body.images.map((item: string) => String(item || '').trim()).filter(Boolean).slice(0, 10) : []
    if ('image' in body) patch.image = body.image
    if ('description' in body) patch.description = body.description
    if ('tag' in body) patch.tag = body.tag
    if ('in_stock' in body) patch.in_stock = Boolean(body.in_stock)

    const { data, error } = await supabase
      .from('products')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({ product: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Не удалось обновить товар' },
      { status: 500 }
    )
  }
}

export async function DELETE(_: NextRequest, context: ProductRouteContext) {
  try {
    const { id } = await context.params
    const supabase = getSupabaseAdmin()

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Не удалось удалить товар' },
      { status: 500 }
    )
  }
}