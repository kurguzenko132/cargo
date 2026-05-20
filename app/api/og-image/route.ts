import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

const DEFAULT_PROMO = '/images/default-promo.png'

function dataUriToResponse(dataUri: string) {
  const match = dataUri.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) return null

  const contentType = match[1]
  const base64 = match[2]
  const buffer = Buffer.from(base64, 'base64')

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  })
}

async function getPromoImage() {
  try {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase
      .from('site_settings')
      .select('promo_image')
      .eq('id', 'main')
      .maybeSingle()

    return data?.promo_image || DEFAULT_PROMO
  } catch {
    return DEFAULT_PROMO
  }
}

export async function GET() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cargo-pied-three.vercel.app').replace(/\/$/, '')
  const promoImage = await getPromoImage()

  if (promoImage.startsWith('data:image/')) {
    const response = dataUriToResponse(promoImage)
    if (response) return response
  }

  if (promoImage.startsWith('http://') || promoImage.startsWith('https://')) {
    return NextResponse.redirect(promoImage, 307)
  }

  const absoluteUrl = new URL(promoImage || DEFAULT_PROMO, siteUrl)
  return NextResponse.redirect(absoluteUrl, 307)
}
