export interface OrderLineItem {
  title: string
  quantity: number
  price: number
}

export interface OrderDetailModel {
  id: number
  name: string
  status?: number
  total: number
  phone?: string
  address?: string
  updatedAt?: string
  items?: OrderLineItem[]
}
