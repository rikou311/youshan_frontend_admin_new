import type { FareItem } from '@/api/configure'

export function calcMerchantCodSvf(total: number, fares: FareItem[]) {
  if (Number(total) <= 0) {
    return 0
  }
  const codFares = fares.filter((item) => Number(item.type) === 0)
  for (const fare of codFares) {
    const parts = String(fare.title || '').split('_')
    if (parts.length >= 2) {
      const min = Number(parts[0])
      const max = Number(parts[1])
      if (total > min && total <= max) {
        return Number(fare.fare || 0)
      }
    }
  }
  const unlimited = codFares.find((item) => String(item.title || '').includes('无限'))
  return unlimited ? Number(unlimited.fare || 0) : 0
}

export function calcMerchantShippingFees(total: number, address: string, fares: FareItem[]) {
  if (!address.trim()) {
    return { yf: 0, ld: 0 }
  }

  const prefecture = address.trim().split(/\s+/)[0] ?? ''
  const addressFares = fares.filter((item) => [3, 4, 5].includes(Number(item.type)))
  const matched = addressFares.find((item) => String(item.title || '') === prefecture)
  const frozenFare = fares.find(
    (item) => Number(item.type) === 2 && String(item.title || '').includes('冷冻'),
  )

  if (!matched) {
    return { yf: 0, ld: 0 }
  }

  const threshold = Number(matched.display ?? 0)
  if (Number(total) < threshold) {
    return {
      yf: Number(matched.fare || 0),
      ld: frozenFare ? Number(frozenFare.fare || 0) : 0,
    }
  }

  return { yf: 0, ld: 0 }
}

export function calcMerchantOrderFees(
  total: number,
  pay: number | string,
  address: string,
  fares: FareItem[],
) {
  const svf = Number(pay) === 3 ? calcMerchantCodSvf(total, fares) : 0
  const { yf, ld } = calcMerchantShippingFees(total, address, fares)
  return { svf, yf, ld }
}
