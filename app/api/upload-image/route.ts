import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

const BUCKET = 'cargo-media'
const MAX_FILE_SIZE = 7 * 1024 * 1024

function cleanFolder(value: FormDataEntryValue | null) {
  const folder = String(value || 'uploads')
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => part.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, ''))
    .filter(Boolean)
    .join('/')

  return folder || 'uploads'
}

function getExtension(file: File) {
  const byName = file.name.split('.').pop()?.toLowerCase()
  if (byName && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(byName)) return byName
  if (file.type.includes('webp')) return 'webp'
  if (file.type.includes('png')) return 'png'
  if (file.type.includes('gif')) return 'gif'
  return 'jpg'
}

async function ensurePublicBucket() {
  const supabase = getSupabaseAdmin()
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()
  if (listError) throw listError

  const exists = buckets?.some((bucket) => bucket.name === BUCKET)
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    })
    if (error && !String(error.message || '').toLowerCase().includes('already')) throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Можно загружать только изображения' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Изображение слишком большое. Максимум 7 МБ' }, { status: 400 })
    }

    await ensurePublicBucket()

    const supabase = getSupabaseAdmin()
    const folder = cleanFolder(formData.get('folder'))
    const ext = getExtension(file)
    const safeName = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'image'
    const path = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: file.type || 'image/webp',
        cacheControl: '31536000',
        upsert: false,
      })

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)

    return NextResponse.json({ url: data.publicUrl, path, bucket: BUCKET })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Не удалось загрузить изображение' },
      { status: 500 }
    )
  }
}
