import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

const SETTINGS_ID = 'main'
const DEFAULT_SETTINGS = {
  promo_image: '/images/default-promo.png',
  logo_image: '/images/default-logo.png',
}

function normalizeSettings(body: any) {
  const promo_image = String(body?.promo_image || '').trim() || DEFAULT_SETTINGS.promo_image
  const logo_image = String(body?.logo_image || '').trim() || DEFAULT_SETTINGS.logo_image

  if (promo_image.length > 4_000_000 || logo_image.length > 4_000_000) {
    throw new Error('Изображение слишком большое. Загрузите файл меньше 2.5 МБ или вставьте ссылку')
  }

  return { promo_image, logo_image }
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('site_settings')
      .select('promo_image, logo_image')
      .eq('id', SETTINGS_ID)
      .maybeSingle()

    if (error) throw error
    return NextResponse.json({ settings: data || DEFAULT_SETTINGS })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Не удалось загрузить настройки сайта' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const settings = normalizeSettings(body)
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('site_settings')
      .upsert({ id: SETTINGS_ID, ...settings, updated_at: new Date().toISOString() }, { onConflict: 'id' })
      .select('promo_image, logo_image')
      .single()

    if (error) throw error
    return NextResponse.json({ settings: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Не удалось сохранить настройки сайта' }, { status: 500 })
  }
}
