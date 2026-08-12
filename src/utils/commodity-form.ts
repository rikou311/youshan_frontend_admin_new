export interface CommodityFormBase {
  id?: number
  title: string
  weight: number
  homeArr: Array<string | number>
  categoryArr: Array<string | number>
  special?: string
  brand?: string
  vender?: string
  /** 产品重量（旧字段名 pid） */
  pid?: string
  limittime?: string
  tax?: string | number
  taxtype?: number
  price: number
  priced: number
  unit?: string
  total: number
  code?: number
  summary?: string
  content?: string
  serviceview?: string
  banner?: string
  image?: string
  image1?: string
  image2?: string
  image3?: string
  image4?: string
  image5?: string
  imagedel?: string[]
  category?: string
  home?: string
  sold?: number | string
  viewed?: number | string
  /** 旧版后端必填兼容字段（创建时传空串） */
  fl?: string
  authenaddress?: string
  authenip?: string
  authenlocation?: string
  authenoperator?: string
  authenstamp?: string
  /** 商户商品列表兼容字段 */
  stock?: number
}

export function createEmptyCommodityForm(): CommodityFormBase {
  return {
    title: '',
    weight: 0,
    homeArr: [],
    categoryArr: [],
    special: '',
    brand: '',
    vender: '',
    pid: '',
    limittime: '',
    tax: 8,
    taxtype: 1,
    price: 0,
    priced: 0,
    unit: '',
    total: 0,
    code: 0,
    summary: '',
    content: '',
    serviceview: '',
    banner: '',
    image: '',
    image1: '',
    image2: '',
    image3: '',
    image4: '',
    image5: '',
    imagedel: [],
    sold: '',
    viewed: '',
    fl: '',
    authenaddress: '',
    authenip: '',
    authenlocation: '',
    authenoperator: '',
    authenstamp: '',
  }
}

export function parseCommodityArrays(raw?: {
  category?: string
  home?: string
  categoryArr?: Array<string | number>
  homeArr?: Array<string | number>
}) {
  const categoryArr =
    raw?.categoryArr?.length
      ? [...raw.categoryArr]
      : String(raw?.category ?? '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
  const homeArr =
    raw?.homeArr?.length
      ? [...raw.homeArr]
      : String(raw?.home ?? '')
          .split('|')
          .map((item) => item.trim())
          .filter(Boolean)
  return { categoryArr, homeArr }
}

export function prepareCommodityPayload(form: CommodityFormBase) {
  const payload: CommodityFormBase = {
    ...form,
    category: (form.categoryArr ?? []).map(String).join(','),
    home: (form.homeArr ?? []).map(String).join('|'),
    content: form.content ?? '',
    serviceview: form.serviceview ?? '',
    stock: form.total,
    // 旧版创建商品时这些字段即使为空也必须提交，后端非空校验
    fl: form.fl ?? '',
    authenaddress: form.authenaddress ?? '',
    authenip: form.authenip ?? '',
    authenlocation: form.authenlocation ?? '',
    authenoperator: form.authenoperator ?? '',
    authenstamp: form.authenstamp ?? '',
    sold: form.sold ?? '',
    viewed: form.viewed ?? '',
  }
  return payload
}
