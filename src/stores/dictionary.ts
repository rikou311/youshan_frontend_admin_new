import { defineStore } from 'pinia'
import { queryDictionaryGroups } from '@/api/dictionary'
import { saveDictionary } from '@/utils/storage'

const DEFAULT_GROUPS = [
  'order_status',
  'category_kind_type',
  'commodity_category_type',
  'commodity_category_type_p',
  'home_section_type',
  'merchant_commodity_category_type',
  'merchant_home_section_type',
  'authority_type',
  'advertise_type',
  'fare_type',
  'user_type',
  'employee_checkin',
  'deposit_state',
  'deposit_type',
  'requisition_state',
  'requisition_type',
  'refunder_state',
  'refunder_category',

  'merchant_user_state_type',
  'social_type',
  'pay_type',
  'logistics_type',
  'take_time_type',
  'access_resources_type',
  'request_type',
  'oauth2_authority',
  'oauth2_grant_type',
  'oauth2_authority_level',
  'sex',
  'yesno',
]

export const useDictionaryStore = defineStore('dictionary', {
  state: () => ({
    loaded: false,
  }),
  actions: {
    async loadDictionaries(groupIds: string[] = DEFAULT_GROUPS) {
      try {
        const data = await queryDictionaryGroups(groupIds)
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          return
        }
        Object.entries(data).forEach(([groupId, values]) => {
          if (Array.isArray(values) && values.length) {
            saveDictionary(groupId, values)
          }
        })
      } catch {
        // 批量字典可能因某个 groupId 不存在而失败，页面会按需单独拉取
      } finally {
        this.loaded = true
      }
    },
    reset() {
      this.loaded = false
    },
  },
})
