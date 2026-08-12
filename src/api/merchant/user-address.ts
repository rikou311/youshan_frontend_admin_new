import request from '@/utils/request'

export interface UserAddressItem {
  id: number | string
  uid?: number | string
  user_id?: number | string
  uname?: string
  receive: string
  postcode: string
  prefecture?: string
  city?: string
  town?: string
  address?: string
  building?: string
  roomnumber?: string
  phone?: string
  socialtype?: string | number
  socialaccount?: string
  state?: number | string
}

/** @deprecated 使用 UserAddressItem */
export type MerchantUserAddressItem = UserAddressItem

export function createAddressLocalId() {
  return `${Date.now()}${Math.random().toString(36).slice(2, 8)}`
}

export function formatMerchantUserAddress(item: UserAddressItem) {
  return [
    item.postcode,
    item.prefecture,
    item.city,
    item.town,
    item.address,
    item.building,
    item.roomnumber,
    item.receive,
  ]
    .filter((part) => part !== undefined && part !== null && String(part) !== '' && String(part) !== 'null')
    .join(' ')
}

/** 对齐旧版创建订单地址拼接（不含邮编/收货人） */
export function formatMerchantOrderAddressText(item: UserAddressItem) {
  return (
    String(item.prefecture ?? '') +
    String(item.city ?? '') +
    String(item.town ?? '') +
    String(item.address ?? '') +
    ' ' +
    String(item.building ?? '') +
    ' ' +
    String(item.roomnumber ?? '')
  )
    .split('null')
    .join('')
    .trim()
}

/** 对齐旧版编辑订单地址下拉 label（空格分隔，不含邮编/收货人） */
export function formatMerchantOrderAddressLabel(item: UserAddressItem) {
  return [
    item.prefecture,
    item.city,
    item.town,
    item.address,
    item.building,
    item.roomnumber,
  ]
    .map((part) => (part == null || String(part) === 'null' ? '' : String(part)))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 对齐旧版 orderInfo.changeAddress 写入的 address 字段 */
export function formatMerchantOrderAddressApply(item: UserAddressItem) {
  return (
    String(item.prefecture ?? '') +
    String(item.city ?? '') +
    String(item.address ?? '') +
    String(item.building ?? '') +
    String(item.roomnumber ?? '')
  )
    .split('null')
    .join('')
}

export function queryMerchantUserAddressesByUserId(uid: number) {
  return request.get<UserAddressItem[]>(
    `/jee-fk/merchantyoushanuseraddress/queryByUserId?uid=${uid}`,
  )
}

export function addMerchantUserAddress(data: UserAddressItem) {
  return request.post<void>('/jee-fk/merchantyoushanuseraddress/add', data)
}

export function updateMerchantUserAddress(data: UserAddressItem) {
  return request.put<void>('/jee-fk/merchantyoushanuseraddress/update', data)
}

export function deleteMerchantUserAddress(id: number | string) {
  return request.delete<void>(`/jee-fk/merchantyoushanuseraddress/delete?id=${encodeURIComponent(String(id))}`)
}

export function queryInventoryUserAddressesByUserId(userId: number) {
  return request.get<UserAddressItem[]>(
    `/jee-fk/youshanuseraddress/queryByUserId?user_id=${userId}`,
  )
}

export function addInventoryUserAddress(data: UserAddressItem) {
  return request.post<void>('/jee-fk/youshanuseraddress/add', data)
}

export function updateInventoryUserAddress(data: UserAddressItem) {
  return request.put<void>('/jee-fk/youshanuseraddress/update', data)
}

export function deleteInventoryUserAddress(id: number | string) {
  return request.delete<void>(`/jee-fk/youshanuseraddress/delete?id=${encodeURIComponent(String(id))}`)
}
