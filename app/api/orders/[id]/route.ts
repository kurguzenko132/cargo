import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

type OrderRouteContext = {
  params: Promise<{ id: string }>
}

const statusLabels: Record<string, string> = {
  new: 'Новый',
  processing: 'В обработке',
  calculation: 'Требует расчёта',
  waiting_payment: 'Ожидает оплаты',
  paid: 'Оплачен',
  ordered_supplier: 'Заказан у поставщика',
  in_transit: 'В пути',
  ready: 'Готов к выдаче',
  completed: 'Завершён',
  cancelled: 'Отменён',
}

async function sendTelegramMessage(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const rawChatIds = process.env.TELEGRAM_CHAT_IDS || process.env.TELEGRAM_CHAT_ID
  if (!token || !rawChatIds) return

  const chatIds = rawChatIds.split(/[\s,;]+/).map((chatId) => chatId.trim()).filter(Boolean)
  await Promise.allSettled(chatIds.map((chatId) => fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  })))
}

export async function PATCH(request: NextRequest, context: OrderRouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const supabase = getSupabaseAdmin()
    const patch: Record<string, any> = {}

    if ('status' in body) patch.status = String(body.status || 'new')
    if ('manager_note' in body) patch.manager_note = String(body.manager_note || '')
    if ('total' in body) patch.total = Number(body.total || 0)
    if ('customer_name' in body) patch.customer_name = String(body.customer_name || '').trim()
    if ('phone' in body) patch.phone = String(body.phone || '').trim()
    if ('address' in body) patch.address = String(body.address || '').trim()
    if ('comment' in body) patch.comment = String(body.comment || '').trim()
    if ('external_link' in body) patch.external_link = String(body.external_link || '').trim() || null
    if ('external_platform' in body) patch.external_platform = String(body.external_platform || '').trim() || null
    if ('external_details' in body) patch.external_details = String(body.external_details || '').trim() || null

    if (body.link_item) {
      const linkItem = body.link_item
      const linkTitle = String(linkItem.title || 'Заказ по ссылке').trim()
      const linkPrice = Number(linkItem.price || patch.total || 0)
      const linkPurchase = Number(linkItem.purchase_price || 0)
      const linkQty = Number(linkItem.qty || 1)

      patch.total = Number(patch.total ?? linkPrice * linkQty)
      patch.order_type = 'link'

      const { error: deleteItemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', id)

      if (deleteItemsError) throw deleteItemsError

      const { error: insertItemError } = await supabase
        .from('order_items')
        .insert({
          order_id: id,
          product_id: null,
          title: linkTitle,
          size: String(linkItem.size || ''),
          qty: linkQty,
          price: linkPrice,
          purchase_price: linkPurchase,
        })

      if (insertItemError) throw insertItemError
    }

    const { data, error } = await supabase
      .from('orders')
      .update(patch)
      .eq('id', id)
      .select('*, order_items(*)')
      .single()

    if (error) throw error

    if ('status' in patch) {
      try {
        await sendTelegramMessage([
          '🔔 <b>Статус заказа обновлён</b>',
          '',
          `🧾 <b>Заказ:</b> ${data.id}`,
          `👤 <b>Клиент:</b> ${data.customer_name}`,
          `📞 <b>Телефон:</b> ${data.phone}`,
          `📍 <b>Новый статус:</b> ${statusLabels[data.status] || data.status}`,
          `💰 <b>Сумма:</b> ${data.total || 0} BYN`,
        ].join('\n'))
      } catch (telegramError) {
        console.error(telegramError)
      }
    }

    return NextResponse.json({ order: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Не удалось обновить заказ' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, context: OrderRouteContext) {
  try {
    const { id } = await context.params
    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Не удалось удалить заказ' }, { status: 500 })
  }
}
