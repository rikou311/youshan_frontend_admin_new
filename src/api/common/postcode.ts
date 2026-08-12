import request from '@/utils/request'

export interface PostcodeItem {
  id?: number | string
  postcode: string
  prefecture?: string
  city?: string
  town?: string
}

export function selectPostcodeByParam(condition: {
  postcode?: string
  prefecture?: string
  city?: string
  town?: string
}) {
  return request.post<PostcodeItem[]>('/jee-fk/postCode/selectByParam', {
    condition,
  })
}

export function lookupPostcodeByPostcode(postcode: string) {
  return selectPostcodeByParam({ postcode })
}
