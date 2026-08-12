import type { MerchantOrderListItem } from '@/types/merchant-order'
import { formatDictionary } from '@/utils/dictionary'
import { exportJsonToExcel, promptExportFilename } from '@/utils/export-excel'
import { formatOrderTimestamp } from '@/utils/merchant-order'

function sortOrdersByUid(orders: MerchantOrderListItem[]) {
  return [...orders].sort((a, b) => {
    const uidA = Number(a.uid)
    const uidB = Number(b.uid)
    if (!Number.isNaN(uidA) && !Number.isNaN(uidB) && uidA !== uidB) {
      return uidA - uidB
    }
    return String(a.uid ?? '').localeCompare(String(b.uid ?? ''))
  })
}

export async function exportMerchantOrdersExcel(orders: MerchantOrderListItem[]) {
  if (!orders.length) {
    return false
  }

  const filename = promptExportFilename('选中数据导出')
  if (!filename) {
    return false
  }

  const header = ['订单编号', '商家', '订单状态', '付款方式', '金额', '创建时间', '更新时间']
  const data = orders.map((item) => [
    item.id,
    item.unick ?? '',
    formatDictionary('order_status', item.status),
    formatDictionary('pay_type', item.pay ?? ''),
    `¥${item.totald ?? item.total ?? 0}`,
    formatOrderTimestamp(item.authenappend),
    formatOrderTimestamp(item.authenmodify),
  ])

  await exportJsonToExcel({ header, data, filename })
  return true
}

export async function exportMerchantCollectionSheetExcel(orders: MerchantOrderListItem[]) {
  const sortedOrders = sortOrdersByUid(orders)
  if (!sortedOrders.length) {
    return false
  }

  const filename = promptExportFilename('收款单导出')
  if (!filename) {
    return false
  }

  const header = ['订单编号', '商家', '现金', 'PAYPAY', '月払い', '合计']
  const data: Array<Array<string | number>> = []
  const merges: string[] = []
  let groupStartIndex = 0

  sortedOrders.forEach((item, index) => {
    const pay = Number(item.pay)
    const totald = Number(item.totald ?? item.total ?? 0)
    const cash = pay === 4 ? totald : ''
    const paypay = pay === 0 ? totald : ''
    const monthly = pay === 1 ? totald : ''
    const isFirstInGroup = index === 0 || sortedOrders[index - 1].uid !== item.uid
    const merchant = isFirstInGroup ? `${item.unick ?? ''} [${item.ucode ?? ''}]` : ''

    data.push([item.id, merchant, cash, paypay, monthly, ''])

    const isGroupEnd =
      index === sortedOrders.length - 1 || sortedOrders[index + 1].uid !== item.uid

    if (isGroupEnd) {
      let groupTotal = 0
      for (let j = groupStartIndex; j <= index; j += 1) {
        groupTotal += Number(sortedOrders[j].totald ?? sortedOrders[j].total ?? 0)
      }
      data[groupStartIndex][5] = groupTotal

      if (index > groupStartIndex) {
        const startRow = groupStartIndex + 2
        const endRow = index + 2
        merges.push(`B${startRow}:B${endRow}`)
        merges.push(`F${startRow}:F${endRow}`)
      }
      groupStartIndex = index + 1
    }
  })

  await exportJsonToExcel({
    header,
    data,
    filename,
    merges,
    centerAlign: true,
  })
  return true
}
