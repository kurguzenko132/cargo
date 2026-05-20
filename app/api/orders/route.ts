import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

type CartItem = {
  id: string
  title: string
  price: number
  purchase_price?: number
  qty: number
  size?: string
}

async function sendTelegramMessage(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const rawChatIds = process.env.TELEGRAM_CHAT_IDS || process.env.TELEGRAM_CHAT_ID

  if (!token || !rawChatIds) return { skipped: true }

  const chatIds = rawChatIds
    .split(/[\s,;]+/)
    .map((chatId) => chatId.trim())
    .filter(Boolean)

  if (!chatIds.length) return { skipped: true }

  const results = await Promise.allSettled(
    chatIds.map(async (chatId) => {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      })

      if (!response.ok) {
        const detail = await response.text()
        throw new Error(`Telegram error for chat ${chatId}: ${detail}`)
      }

      return { chatId, ok: true }
    })
  )

  const failed = results.filter((result) => result.status === 'rejected')

  if (failed.length === results.length) {
    throw new Error('Не удалось отправить заказ ни в один Telegram-чат')
  }

  failed.forEach((result) => {
    if (result.status === 'rejected') console.error(result.reason)
  })

  return { ok: true, sent: results.length - failed.length, failed: failed.length }
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error
    return NextResponse.json({ orders: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Не удалось загрузить заказы' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const items: CartItem[] = body.items || []
    const customerName = String(body.customerName || '').trim()
    const phone = String(body.phone || '').trim()
    const address = String(body.address || '').trim()
    const comment = String(body.comment || '').trim()
    const externalLink = String(body.externalLink || '').trim()
    const externalPlatform = String(body.externalPlatform || '').trim()
    const externalDetails = String(body.externalDetails || '').trim()
    const userId = body.userId ? String(body.userId).trim() : null
    const userEmail = body.userEmail ? String(body.userEmail).trim().toLowerCase() : null

    if (!customerName || !phone || !address || (!items.length && !externalLink)) {
      return NextResponse.json({ error: 'Укажи имя, телефон, адрес и товар из корзины или ссылку на товар' }, { status: 400 })
    }

    const externalItems: CartItem[] = externalLink ? [{
      id: '',
      title: `Заказ по ссылке${externalPlatform ? `: ${externalPlatform}` : ''}`,
      price: 0,
      purchase_price: 0,
      qty: 1,
      size: externalLink,
    }] : []

    const allItems = [...items, ...externalItems]
    const total = items.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0)
    const supabase = getSupabaseAdmin()

    const orderType = externalLink ? 'link' : 'site'
    const initialStatus = externalLink ? 'calculation' : 'new'

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name: customerName,
        phone,
        address,
        comment,
        total,
        status: initialStatus,
        order_type: orderType,
        external_link: externalLink || null,
        external_platform: externalPlatform || null,
        external_details: externalDetails || null,
        user_id: userId || null,
        customer_email: userEmail || null,
      })
      .select('*')
      .single()

    if (orderError) throw orderError

    const orderItems = allItems.map((item) => ({
      order_id: order.id,
      product_id: item.id || null,
      title: item.title,
      size: item.size || '',
      qty: Number(item.qty),
      price: Number(item.price),
      purchase_price: Number(item.purchase_price || 0),
    }))

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
    if (itemsError) throw itemsError

    const productsText = items.length
      ? items.map((item, index) => `${index + 1}. ${item.title}${item.size ? ` / ${item.size}` : ''} × ${item.qty} — ${item.price * item.qty} BYN`).join('\n')
      : 'Товаров из каталога нет'

    const externalText = externalLink ? [
      '',
      '<b>Заказ по ссылке:</b>',
      `🔗 <b>Ссылка:</b> ${externalLink}`,
      externalPlatform ? `🛍 <b>Платформа:</b> ${externalPlatform}` : '',
      externalDetails ? `📌 <b>Детали:</b> ${externalDetails}` : '',
    ].filter(Boolean).join('\n') : ''

    const message = [
      '🛒 <b>Новый заказ CARGO STORE</b>',
      '',
      `👤 <b>Клиент:</b> ${customerName}`,
      `📞 <b>Телефон:</b> ${phone}`,
      `📍 <b>Адрес:</b> ${address}`,
      comment ? `💬 <b>Комментарий:</b> ${comment}` : '',
      '',
      '<b>Товары из каталога:</b>',
      productsText,
      externalText,
      '',
      `💰 <b>Итого по каталогу:</b> ${total} BYN`,
      `📌 <b>Тип:</b> ${externalLink ? 'Заказ по ссылке' : 'Заказ с сайта'}`,
      `📍 <b>Статус:</b> ${externalLink ? 'Требует расчёта' : 'Новый'}`,
      `🧾 <b>ID заказа:</b> ${order.id}`,
    ].filter(Boolean).join('\n')

    try {
      await sendTelegramMessage(message)
    } catch (telegramError) {
      console.error(telegramError)
    }

    return NextResponse.json({ order })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Не удалось оформить заказ' }, { status: 500 })
  }
}
