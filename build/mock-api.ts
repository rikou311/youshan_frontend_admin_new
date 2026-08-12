import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  filterList,
  listMockRegistry,
  mockAccessList,
  mockAttendanceRecordList,
  mockAuthorityGrantTree,
  mockAuthorityList,
  mockAuthorityMenus,
  mockClientList,
  mockClientResourceGrants,
  mockDashboardOverview,
  mockDictionaries,
  mockDictionaryManageList,
  mockEmployeeList,
  mockFareList,
  mockFirewallList,
  mockInventoryCategoryList,
  mockInventoryCommodityList,
  mockInventoryAdvertiseList,
  mockInventoryOrderList,
  mockInventoryUserList,
  mockMemoryInfo,
  mockMerchantCommodityList,
  mockMerchantCommodityDisList,
  mockMerchantOrderList,
  mockMerchantUserList,
  mockMerchantUserAddressList,
  mockInventoryUserAddressList,
  mockMerchantRanking,
  mockOrganizationList,
  mockPaymentList,
  mockProductRanking,
  mockRawFoodList,
  mockGoodsQuantityList,
  mockRequisitionList,
  mockRefunderList,
  mockDepositList,
  mockCashManagementList,
  mockCashListData,
  mockCashTakeRecordList,
  mockRoleAuthorityGrants,
  mockRoleList,
  mockStaticResourceList,
  mockSysUserList,
  mockTagTemplateList,
  mockTagLabelList,
  mockUsers,
  paginate,
  toUserInfo,
} from './mock-data'

interface LegacyPageBody {
  page?: number
  rows?: number
  condition?: Record<string, unknown>
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function legacyOk(res: ServerResponse, data: unknown) {
  sendJson(res, 200, { code: 200, data, message: 'ok' })
}

function legacyFail(res: ServerResponse, message: string, code = 400) {
  sendJson(res, 200, { code, data: null, message })
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk: Buffer) => {
      data += chunk
    })
    req.on('end', () => {
      if (!data) {
        resolve({})
        return
      }
      const contentType = req.headers['content-type'] ?? ''
      if (contentType.includes('application/x-www-form-urlencoded')) {
        resolve(Object.fromEntries(new URLSearchParams(data).entries()))
        return
      }
      try {
        resolve(JSON.parse(data))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function getToken(req: IncomingMessage) {
  const authorization = req.headers.authorization ?? ''
  return authorization.replace(/^Bearer\s+/i, '').trim()
}

function requireAuth(req: IncomingMessage, res: ServerResponse) {
  const token = getToken(req)
  const userId = Number(token.replace('mock-access-token-', ''))
  const user = mockUsers.find((item) => item.id === userId)
  if (!user) {
    sendJson(res, 401, { code: 401, data: null, message: '未登录' })
    return null
  }
  return user
}

function handleLegacyList(
  res: ServerResponse,
  moduleName: string,
  condition: Record<string, unknown>,
  page: number,
  rows: number,
) {
  const config = listMockRegistry[moduleName]
  if (!config) {
    legacyFail(res, '接口不存在', 404)
    return
  }
  const filtered = filterList(config.data, condition, config.searchKeys)
  legacyOk(res, paginate(filtered, page, rows))
}

function matchModuleIndex(pathname: string) {
  const match = pathname.match(/^\/api\/jee-fk\/([^/]+)\/index$/)
  return match?.[1] ?? null
}

function createMutableStore<T extends { id: number | string }>(initial: T[], registryKey: string) {
  let store = [...initial]
  let nextId =
    initial.reduce((max, row) => {
      const idNum = Number(row.id)
      return Number.isFinite(idNum) ? Math.max(max, idNum) : max
    }, 0) + 1

  function sync() {
    if (listMockRegistry[registryKey]) {
      listMockRegistry[registryKey].data = store
    }
  }

  return {
    list: () => store,
    query: (id: number | string) =>
      store.find((row) => String(row.id) === String(id)) ?? null,
    add: (row: Omit<T, 'id'>) => {
      const item = { ...row, id: nextId++ } as T
      store.push(item)
      sync()
      return item
    },
    update: (row: T) => {
      store = store.map((item) => (String(item.id) === String(row.id) ? row : item))
      sync()
    },
    remove: (id: number | string) => {
      store = store.filter((item) => String(item.id) !== String(id))
      sync()
    },
  }
}

type MutableStore = {
  query: (id: number | string) => Record<string, unknown> | null
  add: (row: Record<string, unknown>) => unknown
  update: (row: Record<string, unknown>) => void
  remove: (id: number | string) => void
}

async function handleMutableCrud(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  url: URL,
  store: MutableStore,
  entityLabel: string,
) {
  if (req.method === 'GET' && pathname.endsWith('/query')) {
    if (!requireAuth(req, res)) return true
    legacyOk(res, store.query(Number(url.searchParams.get('id'))))
    return true
  }

  if (req.method === 'POST' && pathname.endsWith('/add')) {
    if (!requireAuth(req, res)) return true
    store.add((await readBody(req)) as Record<string, unknown> as never)
    legacyOk(res, null)
    return true
  }

  if (req.method === 'PUT' && pathname.endsWith('/update')) {
    if (!requireAuth(req, res)) return true
    const body = (await readBody(req)) as { id: number }
    const existing = store.query(body.id)
    if (!existing) {
      legacyFail(res, `${entityLabel}不存在`)
      return true
    }
    store.update({ ...existing, ...(body as Record<string, unknown>) } as typeof existing)
    legacyOk(res, null)
    return true
  }

  if (req.method === 'DELETE' && pathname.endsWith('/delete')) {
    if (!requireAuth(req, res)) return true
    store.remove(Number(url.searchParams.get('id')))
    legacyOk(res, null)
    return true
  }

  return false
}

function buildOrderDetail(order: Record<string, unknown>) {
  return {
    ...order,
    phone: '13800001234',
    address: '上海市浦东新区示例路 100 号',
    zip: '200120',
    items: [
      { title: '示例商品 A', quantity: 2, price: 18.5 },
      { title: '示例商品 B', quantity: 1, price: 32 },
    ],
    orderlist: [
      { title: '示例商品 A', sku: 'SKU-A', price: 18.5, count: 2, tax: 8, taxtype: 0, total: 37 },
      { title: '示例商品 B', sku: 'SKU-B', price: 32, count: 1, tax: 8, taxtype: 0, total: 32 },
    ],
    wechat: 'demo_wechat',
    wuliu: 1,
    pi: 'LP123456',
    memo: '示例备注',
    shtimeArr: ['1', '2'],
    rate: 0.05,
    totalJp: 94,
    merchantAddress: {
      receive: String(order.name ?? '收货人'),
      phone: '13800001234',
      postcode: '200120',
      prefecture: '上海市',
      city: '浦东新区',
      town: '示例路',
      address: '100号',
    },
  }
}

export function mockApiPlugin(): Plugin {
  let categoryStore = [...mockInventoryCategoryList]
  let nextCategoryId = categoryStore.length + 1
  let roleStore = [...mockRoleList]
  let nextRoleId = roleStore.length + 1
  const sysuserStore = createMutableStore(mockSysUserList, 'sysuser')
  const organizationStore = createMutableStore(mockOrganizationList, 'organization')
  const dictionaryStore = createMutableStore(mockDictionaryManageList, 'dictionary')
  const accessStore = createMutableStore(mockAccessList, 'access')
  const clientStore = createMutableStore(mockClientList, 'client')
  const firewallStore = createMutableStore(mockFirewallList, 'firewall')
  const staticResourceStore = createMutableStore(mockStaticResourceList, 'staticResource')
  const tagTemplateStore = createMutableStore(mockTagTemplateList, 'tagTemplate')
  const tagLabelStore = createMutableStore(mockTagLabelList, 'tagLabel')
  const authorityStore = createMutableStore(
    mockAuthorityList as Array<{ id: number } & Record<string, unknown>>,
    'authority',
  )
  const commodityStore = createMutableStore(mockInventoryCommodityList, 'commodity')
  const merchantCommodityStore = createMutableStore(mockMerchantCommodityList, 'merchantcommodity')
  const advertiseStore = createMutableStore(mockInventoryAdvertiseList, 'advertise')
  const paymentStore = createMutableStore(mockPaymentList, 'payment')
  const fareStore = createMutableStore(mockFareList, 'fare')
  const employeeStore = createMutableStore(mockEmployeeList, 'employee')
  const rawFoodStore = createMutableStore(mockRawFoodList, 'rawFood')
  const goodsQuantityStore = createMutableStore(mockGoodsQuantityList, 'goodsQuantity')
  const inventoryUserStore = createMutableStore(mockInventoryUserList, 'youshanuser')
  const merchantUserStore = createMutableStore(mockMerchantUserList, 'merchantyoushanuser')
  let merchantAddressStore = [...mockMerchantUserAddressList]
  let inventoryAddressStore = [...mockInventoryUserAddressList]
  const requisitionStore = createMutableStore(mockRequisitionList, 'requisition')
  const refunderStore = createMutableStore(mockRefunderList, 'refunder')
  const depositStore = createMutableStore(mockDepositList, 'deposit')
  const commodityDisStore = createMutableStore(mockMerchantCommodityDisList, 'merchantcommoditydis')
  const cashManagementStore = createMutableStore(mockCashManagementList, 'cashmanagement')
  const cashListStore = createMutableStore(mockCashListData, 'cashlist')
  const cashTakeRecordStore = createMutableStore(mockCashTakeRecordList, 'cashtakerecord')
  const attendanceRecordStore = createMutableStore(mockAttendanceRecordList, 'attendanceRecord')
  let roleAuthorityGrants: Record<number, number[]> = { ...mockRoleAuthorityGrants }
  let clientResourceGrants: Record<number, number[]> = { ...mockClientResourceGrants }

  return {
    name: 'mock-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.includes('/jee-fk')) {
          next()
          return
        }

        const url = new URL(req.url, 'http://localhost')
        const pathname = url.pathname

        try {
          if (req.method === 'POST' && pathname === '/jee-fk/oauth/token') {
            const body = (await readBody(req)) as { username?: string; password?: string }
            const user = mockUsers.find(
              (item) => item.username === body.username && item.password === body.password,
            )
            if (!user) {
              legacyFail(res, '用户名或密码错误')
              return
            }
            legacyOk(res, {
              access_token: `mock-access-token-${user.id}`,
              token_type: 'Bearer',
              user: toUserInfo(user),
            })
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/sysuser/current') {
            const user = requireAuth(req, res)
            if (!user) {
              return
            }
            legacyOk(res, toUserInfo(user))
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/authority/authoritys') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, mockAuthorityMenus)
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/dictionary/queryByGroupIds') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as { groupIds?: string[] }
            const result: Record<string, Array<{ display: string; value: string }>> = {}
            for (const groupId of body.groupIds ?? []) {
              result[groupId] = mockDictionaries[groupId] ?? []
            }
            legacyOk(res, result)
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/dashboard/index') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, mockDashboardOverview)
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/dashboard/indexProductRanking') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, mockProductRanking)
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/dashboard/indexMerchantRanking') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, mockMerchantRanking)
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/organization/index') {
            if (!requireAuth(req, res)) {
              return
            }
            const orgs = organizationStore.list() as Array<{
              id: number | string
              name?: string
              orgName?: string
              superid?: number | string | null
              active?: number
              type?: string | number
              sort?: number
              address?: string
            }>
            const byId = new Map(
              orgs.map((item) => [
                String(item.id),
                {
                  id: item.id,
                  name: item.name || item.orgName || String(item.id),
                  orgName: item.orgName || item.name || String(item.id),
                  superid: item.superid ?? null,
                  active: item.active ?? 1,
                  type: item.type,
                  sort: item.sort,
                  address: item.address,
                  children: [] as Array<Record<string, unknown>>,
                  extend: true,
                },
              ]),
            )
            const roots: Array<Record<string, unknown>> = []
            byId.forEach((node) => {
              const parentId = node.superid
              if (parentId != null && parentId !== '' && byId.has(String(parentId))) {
                byId.get(String(parentId))!.children.push(node)
              } else {
                roots.push(node)
              }
            })
            legacyOk(res, roots)
            return
          }

          const moduleName = matchModuleIndex(pathname)
          if (req.method === 'POST' && moduleName) {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as LegacyPageBody
            handleLegacyList(
              res,
              moduleName,
              body.condition ?? {},
              Number(body.page ?? 1),
              Number(body.rows ?? 10),
            )
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/yscategory/query') {
            if (!requireAuth(req, res)) {
              return
            }
            const id = Number(url.searchParams.get('id'))
            const item = categoryStore.find((row) => row.id === id)
            legacyOk(res, item ?? null)
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/yscategory/add') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as {
              title: string
              kind: number
              image?: string
            }
            const row = {
              id: nextCategoryId++,
              title: body.title,
              kind: body.kind,
              image: body.image ?? '',
              updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            }
            categoryStore.push(row)
            listMockRegistry.yscategory.data = categoryStore
            legacyOk(res, null)
            return
          }

          if (req.method === 'PUT' && pathname === '/jee-fk/yscategory/update') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as {
              id: number
              title: string
              kind: number
              image?: string
            }
            categoryStore = categoryStore.map((row) =>
              row.id === body.id
                ? {
                    ...row,
                    title: body.title,
                    kind: body.kind,
                    image: body.image ?? row.image,
                    updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
                  }
                : row,
            )
            listMockRegistry.yscategory.data = categoryStore
            legacyOk(res, null)
            return
          }

          if (req.method === 'DELETE' && pathname === '/jee-fk/yscategory/delete') {
            if (!requireAuth(req, res)) {
              return
            }
            const id = Number(url.searchParams.get('id'))
            categoryStore = categoryStore.filter((row) => row.id !== id)
            listMockRegistry.yscategory.data = categoryStore
            legacyOk(res, null)
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/role/query') {
            if (!requireAuth(req, res)) {
              return
            }
            const id = Number(url.searchParams.get('id'))
            legacyOk(res, roleStore.find((row) => row.id === id) ?? null)
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/role/add') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as { roleName: string; active: number }
            const row = { id: nextRoleId++, roleName: body.roleName, active: body.active }
            roleStore.push(row)
            listMockRegistry.role.data = roleStore
            legacyOk(res, null)
            return
          }

          if (req.method === 'PUT' && pathname === '/jee-fk/role/update') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as { id: number; roleName: string; active: number }
            roleStore = roleStore.map((row) =>
              row.id === body.id ? { ...row, roleName: body.roleName, active: body.active } : row,
            )
            listMockRegistry.role.data = roleStore
            legacyOk(res, null)
            return
          }

          if (req.method === 'DELETE' && pathname === '/jee-fk/role/delete') {
            if (!requireAuth(req, res)) {
              return
            }
            const id = Number(url.searchParams.get('id'))
            roleStore = roleStore.filter((row) => row.id !== id)
            listMockRegistry.role.data = roleStore
            legacyOk(res, null)
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/role/all') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, roleStore.filter((row) => row.active === 1))
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/authority/trees') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as { relationId?: number }
            const relationId = Number(body.relationId ?? 0)
            legacyOk(res, {
              trees: mockAuthorityGrantTree,
              grantedAuthorityIds: roleAuthorityGrants[relationId] ?? [],
            })
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/authority/grant') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as {
              relationId?: number
              authorityIds?: number[]
            }
            const relationId = Number(body.relationId ?? 0)
            roleAuthorityGrants[relationId] = (body.authorityIds ?? []).map(Number)
            legacyOk(res, null)
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/authority/index') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as {
              superid?: string | number
              authName?: string
              page?: number
              rows?: number
              condition?: { superid?: string | number; authName?: string }
            }
            const superid = String(body.superid ?? body.condition?.superid ?? '0')
            const authName = String(body.authName ?? body.condition?.authName ?? '').trim()
            let rows = authorityStore.list().filter((row) => String(row.superid ?? '0') === superid)
            if (authName) {
              rows = rows.filter((row) => String(row.authName).includes(authName))
            }
            legacyOk(res, rows)
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/access/all') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(
              res,
              accessStore.list().filter((row) => Number(row.active) === 1),
            )
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/authority/query') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, authorityStore.query(Number(url.searchParams.get('id'))))
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/authority/add') {
            if (!requireAuth(req, res)) {
              return
            }
            authorityStore.add((await readBody(req)) as Omit<(typeof mockAuthorityList)[number], 'id'>)
            legacyOk(res, null)
            return
          }

          if (req.method === 'PUT' && pathname === '/jee-fk/authority/update') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as { id: number }
            const existing = authorityStore.query(body.id)
            if (!existing) {
              legacyFail(res, '权限不存在')
              return
            }
            authorityStore.update({ ...existing, ...(body as Record<string, unknown>) } as typeof existing)
            legacyOk(res, null)
            return
          }

          if (req.method === 'DELETE' && pathname === '/jee-fk/authority/delete') {
            if (!requireAuth(req, res)) {
              return
            }
            authorityStore.remove(Number(url.searchParams.get('id')))
            legacyOk(res, null)
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/commodity/query') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, commodityStore.query(Number(url.searchParams.get('id'))))
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/commodity/add') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as {
              title: string
              price: number
              priced: number
              total: number
              weight: number
            }
            commodityStore.add({ ...body, sold: 0 })
            legacyOk(res, null)
            return
          }

          if (req.method === 'PUT' && pathname === '/jee-fk/commodity/update') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as { id: number }
            const existing = commodityStore.query(body.id)
            if (!existing) {
              legacyFail(res, '商品不存在')
              return
            }
            commodityStore.update({ ...existing, ...(body as Record<string, unknown>) } as typeof existing)
            legacyOk(res, null)
            return
          }

          if (req.method === 'DELETE' && pathname === '/jee-fk/commodity/delete') {
            if (!requireAuth(req, res)) {
              return
            }
            commodityStore.remove(Number(url.searchParams.get('id')))
            legacyOk(res, null)
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/merchantcommodity/query') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, merchantCommodityStore.query(Number(url.searchParams.get('id'))))
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/merchantcommodity/add') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as { title: string; price: number; stock: number }
            merchantCommodityStore.add({ ...body, sold: 0 })
            legacyOk(res, null)
            return
          }

          if (req.method === 'PUT' && pathname === '/jee-fk/merchantcommodity/update') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as { id: number }
            const existing = merchantCommodityStore.query(body.id)
            if (!existing) {
              legacyFail(res, '商品不存在')
              return
            }
            merchantCommodityStore.update({
              ...existing,
              ...(body as Record<string, unknown>),
            } as typeof existing)
            legacyOk(res, null)
            return
          }

          if (req.method === 'DELETE' && pathname === '/jee-fk/merchantcommodity/delete') {
            if (!requireAuth(req, res)) {
              return
            }
            merchantCommodityStore.remove(Number(url.searchParams.get('id')))
            legacyOk(res, null)
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/merchantcommodity/querybyTitle') {
            if (!requireAuth(req, res)) {
              return
            }
            const title = url.searchParams.get('title') ?? ''
            const rows = merchantCommodityStore
              .list()
              .filter((item) => item.title.includes(title))
              .map((item) => ({ id: item.id, title: item.title }))
            legacyOk(res, rows)
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/merchantyoushanuser/queryByUname') {
            if (!requireAuth(req, res)) {
              return
            }
            const uname = url.searchParams.get('uname') ?? ''
            const rows = merchantUserStore
              .list()
              .filter((item) => String(item.username ?? item.uname ?? '').includes(uname))
              .map((item) => ({
                id: item.id,
                uname: item.uname || item.username,
                ucode: (item as { ucode?: number | string }).ucode ?? item.phone,
              }))
            legacyOk(res, rows)
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/merchantyoushanuser/queryByUnick') {
            if (!requireAuth(req, res)) {
              return
            }
            const unick = url.searchParams.get('unick') ?? ''
            const rows = merchantUserStore
              .list()
              .filter((item) => {
                const row = item as {
                  username?: string
                  uname?: string
                  unick?: string
                }
                return (
                  String(row.unick ?? '').includes(unick) ||
                  String(row.uname ?? row.username ?? '').includes(unick)
                )
              })
              .map((item) => {
                const row = item as {
                  id: number
                  username?: string
                  uname?: string
                  unick?: string
                }
                return {
                  id: row.id,
                  unick: row.unick || row.username,
                  uname: row.uname || row.username,
                  money: 5000 + row.id,
                }
              })
            legacyOk(res, rows)
            return
          }

          if (
            req.method === 'GET' &&
            pathname === '/jee-fk/merchantyoushanuseraddress/queryByUserId'
          ) {
            if (!requireAuth(req, res)) {
              return
            }
            const uid = url.searchParams.get('uid')
            legacyOk(
              res,
              merchantAddressStore.filter((item) => String(item.uid) === String(uid)),
            )
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/merchantyoushanuseraddress/add') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as Record<string, unknown>
            merchantAddressStore.push(body as (typeof mockMerchantUserAddressList)[number])
            legacyOk(res, null)
            return
          }

          if (req.method === 'PUT' && pathname === '/jee-fk/merchantyoushanuseraddress/update') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as { id: string | number }
            merchantAddressStore = merchantAddressStore.map((item) =>
              String(item.id) === String(body.id)
                ? ({ ...item, ...body } as (typeof mockMerchantUserAddressList)[number])
                : item,
            )
            legacyOk(res, null)
            return
          }

          if (req.method === 'DELETE' && pathname === '/jee-fk/merchantyoushanuseraddress/delete') {
            if (!requireAuth(req, res)) {
              return
            }
            const id = url.searchParams.get('id')
            merchantAddressStore = merchantAddressStore.filter((item) => String(item.id) !== String(id))
            legacyOk(res, null)
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/youshanuseraddress/queryByUserId') {
            if (!requireAuth(req, res)) {
              return
            }
            const userId = url.searchParams.get('user_id')
            legacyOk(
              res,
              inventoryAddressStore.filter(
                (item) =>
                  String(item.user_id) === String(userId) || String(item.uid) === String(userId),
              ),
            )
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/youshanuseraddress/add') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as Record<string, unknown>
            inventoryAddressStore.push(body as (typeof mockInventoryUserAddressList)[number])
            legacyOk(res, null)
            return
          }

          if (req.method === 'PUT' && pathname === '/jee-fk/youshanuseraddress/update') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as { id: string | number }
            inventoryAddressStore = inventoryAddressStore.map((item) =>
              String(item.id) === String(body.id)
                ? ({ ...item, ...body } as (typeof mockInventoryUserAddressList)[number])
                : item,
            )
            legacyOk(res, null)
            return
          }

          if (req.method === 'DELETE' && pathname === '/jee-fk/youshanuseraddress/delete') {
            if (!requireAuth(req, res)) {
              return
            }
            const id = url.searchParams.get('id')
            inventoryAddressStore = inventoryAddressStore.filter(
              (item) => String(item.id) !== String(id),
            )
            legacyOk(res, null)
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/postCode/selectByParam') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as {
              condition?: { postcode?: string; prefecture?: string; city?: string; town?: string }
            }
            const postcode = body.condition?.postcode ?? ''
            if (!postcode) {
              legacyOk(res, [])
              return
            }
            legacyOk(res, [
              {
                id: 1,
                postcode,
                prefecture: body.condition?.prefecture || '東京都',
                city: body.condition?.city || '千代田区',
                town: body.condition?.town || '丸の内',
              },
              {
                id: 2,
                postcode,
                prefecture: body.condition?.prefecture || '東京都',
                city: body.condition?.city || '中央区',
                town: body.condition?.town || '銀座',
              },
            ])
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/deposit/queryBySender') {
            if (!requireAuth(req, res)) {
              return
            }
            const sender = url.searchParams.get('sender') ?? ''
            const rows = depositStore
              .list()
              .filter((item) => String((item as { sender?: string }).sender ?? '').includes(sender))
              .map((item) => ({
                sender: (item as { sender?: string }).sender ?? sender,
                username: (item as { unick?: string }).unick ?? '',
              }))
            legacyOk(res, rows.length ? rows : [{ sender, username: '' }])
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/merchantyoushanuser/queryByUcode') {
            if (!requireAuth(req, res)) {
              return
            }
            const ucode = url.searchParams.get('ucode') ?? ''
            const rows = merchantUserStore
              .list()
              .filter((item) =>
                String((item as { ucode?: number | string }).ucode ?? item.phone ?? '').includes(
                  ucode,
                ),
              )
              .map((item) => ({
                id: item.id,
                uname: item.uname || item.username,
                ucode: (item as { ucode?: number | string }).ucode ?? item.phone,
              }))
            legacyOk(res, rows)
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/advertise/query') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, advertiseStore.query(Number(url.searchParams.get('id'))))
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/advertise/add') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as Record<string, unknown>
            advertiseStore.add({
              title: String(body.title ?? ''),
              url: String(body.url ?? ''),
              type: Number(body.type ?? 1),
              image: String(body.image ?? ''),
              status: Number(body.status ?? 1),
              updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            } as Omit<(typeof mockInventoryAdvertiseList)[number], 'id'>)
            legacyOk(res, null)
            return
          }

          if (req.method === 'PUT' && pathname === '/jee-fk/advertise/update') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as { id: number }
            const existing = advertiseStore.query(body.id)
            if (!existing) {
              legacyFail(res, '广告不存在')
              return
            }
            advertiseStore.update({
              ...existing,
              ...(body as Record<string, unknown>),
              updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            } as typeof existing)
            legacyOk(res, null)
            return
          }

          if (req.method === 'DELETE' && pathname === '/jee-fk/advertise/delete') {
            if (!requireAuth(req, res)) {
              return
            }
            advertiseStore.remove(Number(url.searchParams.get('id')))
            legacyOk(res, null)
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/client/authoritys') {
            if (!requireAuth(req, res)) {
              return
            }
            const clientId = Number(url.searchParams.get('id'))
            legacyOk(res, {
              accesses: accessStore.list(),
              resourceIds: clientResourceGrants[clientId] ?? [],
            })
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/client/grant') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as { clientId?: number; resourceIds?: number[] }
            clientResourceGrants[Number(body.clientId ?? 0)] = (body.resourceIds ?? []).map(Number)
            legacyOk(res, null)
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/payment/query') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, paymentStore.query(Number(url.searchParams.get('id'))))
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/payment/add') {
            if (!requireAuth(req, res)) {
              return
            }
            paymentStore.add((await readBody(req)) as Omit<(typeof mockPaymentList)[number], 'id'>)
            legacyOk(res, null)
            return
          }

          if (req.method === 'PUT' && pathname === '/jee-fk/payment/update') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as { id: number }
            const existing = paymentStore.query(body.id)
            if (!existing) {
              legacyFail(res, '支付方式不存在')
              return
            }
            paymentStore.update({ ...existing, ...(body as Record<string, unknown>) } as typeof existing)
            legacyOk(res, null)
            return
          }

          if (req.method === 'DELETE' && pathname === '/jee-fk/payment/delete') {
            if (!requireAuth(req, res)) {
              return
            }
            paymentStore.remove(Number(url.searchParams.get('id')))
            legacyOk(res, null)
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/fare/query') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, fareStore.query(Number(url.searchParams.get('id'))))
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/fare/add') {
            if (!requireAuth(req, res)) {
              return
            }
            fareStore.add((await readBody(req)) as Omit<(typeof mockFareList)[number], 'id'>)
            legacyOk(res, null)
            return
          }

          if (req.method === 'PUT' && pathname === '/jee-fk/fare/update') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as { id: number }
            const existing = fareStore.query(body.id)
            if (!existing) {
              legacyFail(res, '运费不存在')
              return
            }
            fareStore.update({ ...existing, ...(body as Record<string, unknown>) } as typeof existing)
            legacyOk(res, null)
            return
          }

          if (req.method === 'DELETE' && pathname === '/jee-fk/fare/delete') {
            if (!requireAuth(req, res)) {
              return
            }
            fareStore.remove(Number(url.searchParams.get('id')))
            legacyOk(res, null)
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/employee/query') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, employeeStore.query(Number(url.searchParams.get('id'))))
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/employee/add') {
            if (!requireAuth(req, res)) {
              return
            }
            employeeStore.add((await readBody(req)) as Omit<(typeof mockEmployeeList)[number], 'id'>)
            legacyOk(res, null)
            return
          }

          if (req.method === 'PUT' && pathname === '/jee-fk/employee/update') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as { id: number }
            const existing = employeeStore.query(body.id)
            if (!existing) {
              legacyFail(res, '员工不存在')
              return
            }
            employeeStore.update({ ...existing, ...(body as Record<string, unknown>) } as typeof existing)
            legacyOk(res, null)
            return
          }

          if (req.method === 'DELETE' && pathname === '/jee-fk/employee/delete') {
            if (!requireAuth(req, res)) {
              return
            }
            employeeStore.remove(Number(url.searchParams.get('id')))
            legacyOk(res, null)
            return
          }

          const crudModules: Array<{ prefix: string; store: MutableStore; label: string }> = [
            { prefix: '/jee-fk/rawFood', store: rawFoodStore as unknown as MutableStore, label: '原料' },
            {
              prefix: '/jee-fk/youshanuser',
              store: inventoryUserStore as unknown as MutableStore,
              label: '用户',
            },
            {
              prefix: '/jee-fk/merchantyoushanuser',
              store: merchantUserStore as unknown as MutableStore,
              label: '商户用户',
            },
            {
              prefix: '/jee-fk/requisition',
              store: requisitionStore as unknown as MutableStore,
              label: '申请单',
            },
            {
              prefix: '/jee-fk/refunder',
              store: refunderStore as unknown as MutableStore,
              label: '退款单',
            },
            {
              prefix: '/jee-fk/deposit',
              store: depositStore as unknown as MutableStore,
              label: '保证金',
            },
            {
              prefix: '/jee-fk/merchantcommoditydis',
              store: commodityDisStore as unknown as MutableStore,
              label: '分销商品',
            },
            {
              prefix: '/jee-fk/cashmanagement',
              store: cashManagementStore as unknown as MutableStore,
              label: '出入金',
            },
            {
              prefix: '/jee-fk/cashlist',
              store: cashListStore as unknown as MutableStore,
              label: '现金列表',
            },
            {
              prefix: '/jee-fk/cashtakerecord',
              store: cashTakeRecordStore as unknown as MutableStore,
              label: '取现记录',
            },
            {
              prefix: '/jee-fk/attendanceRecord',
              store: attendanceRecordStore as unknown as MutableStore,
              label: '考勤记录',
            },
          ]

          for (const module of crudModules) {
            if (pathname.startsWith(module.prefix)) {
              const handled = await handleMutableCrud(req, res, pathname, url, module.store, module.label)
              if (handled) {
                return
              }
            }
          }

          if (req.method === 'GET' && pathname === '/jee-fk/goodsQuantity/query') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, goodsQuantityStore.query(Number(url.searchParams.get('id'))))
            return
          }

          if (req.method === 'PUT' && pathname === '/jee-fk/goodsQuantity/update') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as { id: number }
            const existing = goodsQuantityStore.query(body.id)
            if (!existing) {
              legacyFail(res, '商品库存不存在')
              return
            }
            goodsQuantityStore.update({ ...existing, ...(body as Record<string, unknown>) } as typeof existing)
            legacyOk(res, null)
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/sysuser/query') {
            if (!requireAuth(req, res)) {
              return
            }
            const id = Number(url.searchParams.get('id'))
            legacyOk(res, sysuserStore.query(id))
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/sysuser/add') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as Record<string, unknown>
            const role = roleStore.find((row) => row.id === body.roleId)
            const client = mockClientList.find((row) => row.id === Number(body.clientId))
            const org = organizationStore.query(Number(body.organizationId))
            const name = String(body.name ?? body.realName ?? '')
            sysuserStore.add({
              username: String(body.username ?? ''),
              name,
              realName: name,
              sex: String(body.sex ?? '1'),
              mobile: String(body.mobile ?? ''),
              email: String(body.email ?? ''),
              avatar: String(body.avatar ?? ''),
              title: String(body.title ?? ''),
              expireDate: String(body.expireDate ?? ''),
              roleId: Number(body.roleId ?? 0),
              roleName: role?.roleName ?? '',
              clientId: Number(body.clientId ?? 0),
              client: client?.clientId ?? '',
              organizationId: Number(body.organizationId ?? 0),
              organization: org
                ? {
                    id: Number(org.id),
                    name: String((org as { name?: string; orgName?: string }).name ?? (org as { orgName?: string }).orgName ?? ''),
                  }
                : { id: 0, name: '' },
              active: Number(body.active ?? 1),
            })
            legacyOk(res, null)
            return
          }

          if (req.method === 'PUT' && pathname === '/jee-fk/sysuser/update') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as Record<string, unknown>
            const role = roleStore.find((row) => row.id === body.roleId)
            const client = mockClientList.find((row) => row.id === Number(body.clientId))
            const org = organizationStore.query(Number(body.organizationId))
            const existing = sysuserStore.query(Number(body.id))
            if (!existing) {
              legacyFail(res, '用户不存在')
              return
            }
            const name = String(body.name ?? body.realName ?? existing.name ?? existing.realName ?? '')
            sysuserStore.update({
              ...existing,
              name,
              realName: name,
              sex: String(body.sex ?? existing.sex ?? '1'),
              mobile: String(body.mobile ?? existing.mobile ?? ''),
              email: String(body.email ?? existing.email ?? ''),
              avatar: String(body.avatar ?? existing.avatar ?? ''),
              title: String(body.title ?? existing.title ?? ''),
              expireDate: String(body.expireDate ?? existing.expireDate ?? ''),
              roleId: Number(body.roleId ?? existing.roleId ?? 0),
              roleName: role?.roleName ?? existing.roleName ?? '',
              clientId: Number(body.clientId ?? existing.clientId ?? 0),
              client: client?.clientId ?? existing.client ?? '',
              organizationId: Number(body.organizationId ?? existing.organizationId ?? 0),
              organization: org
                ? {
                    id: Number(org.id),
                    name: String((org as { name?: string; orgName?: string }).name ?? (org as { orgName?: string }).orgName ?? ''),
                  }
                : existing.organization ?? { id: 0, name: '' },
              active: Number(body.active ?? existing.active),
            })
            legacyOk(res, null)
            return
          }

          if (req.method === 'DELETE' && pathname === '/jee-fk/sysuser/delete') {
            if (!requireAuth(req, res)) {
              return
            }
            sysuserStore.remove(Number(url.searchParams.get('id')))
            legacyOk(res, null)
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/organization/currentOrganizationTree') {
            if (!requireAuth(req, res)) {
              return
            }
            const orgs = organizationStore.list() as Array<{
              id: number
              name?: string
              orgName?: string
              superid?: number | null
              active?: number
            }>
            const byId = new Map(
              orgs.map((item) => [
                item.id,
                {
                  id: item.id,
                  name: item.name || item.orgName || String(item.id),
                  orgName: item.orgName || item.name || String(item.id),
                  superid: item.superid ?? null,
                  active: item.active ?? 1,
                  children: [] as Array<Record<string, unknown>>,
                },
              ]),
            )
            let root: Record<string, unknown> | null = null
            byId.forEach((node) => {
              const parentId = node.superid
              if (parentId && byId.has(parentId)) {
                byId.get(parentId)!.children.push(node)
              } else if (!root) {
                root = node
              }
            })
            legacyOk(res, root ?? {
              id: 1,
              name: '友山总部',
              orgName: '友山总部',
              children: [],
            })
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/client/all') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, mockClientList)
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/organization/query') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, organizationStore.query(Number(url.searchParams.get('id'))))
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/organization/add') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as {
              name: string
              orgName?: string
              type?: string | number
              superid?: string | number
              sort?: number
              address?: string
              active: number
            }
            organizationStore.add({
              name: body.name || body.orgName || '',
              orgName: body.orgName || body.name || '',
              type: String(body.type ?? '1'),
              superid:
                body.superid === undefined || body.superid === null || body.superid === ''
                  ? null
                  : Number(body.superid),
              sort: body.sort ?? 1,
              address: body.address ?? '',
              active: body.active,
            })
            legacyOk(res, null)
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/organization/update') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as {
              id: number | string
              name: string
              orgName?: string
              type?: string | number
              superid?: string | number
              sort?: number
              address?: string
              active: number
            }
            const existing = organizationStore.query(body.id)
            if (!existing) {
              legacyFail(res, '组织不存在')
              return
            }
            organizationStore.update({
              ...existing,
              name: body.name || body.orgName || existing.name,
              orgName: body.orgName || body.name || existing.orgName,
              type: body.type === undefined ? existing.type : String(body.type),
              superid:
                body.superid === undefined
                  ? existing.superid
                  : body.superid === null || body.superid === ''
                    ? null
                    : Number(body.superid),
              sort: body.sort ?? existing.sort,
              address: body.address ?? existing.address,
              active: body.active,
            })
            legacyOk(res, null)
            return
          }

          if (req.method === 'DELETE' && pathname === '/jee-fk/organization/delete') {
            if (!requireAuth(req, res)) {
              return
            }
            organizationStore.remove(Number(url.searchParams.get('id')))
            legacyOk(res, null)
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/dictionary/index') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as {
              superId?: string | number
              display?: string
              page?: number
              rows?: number
              condition?: { superId?: string | number; display?: string }
            }
            const superId = String(body.superId ?? body.condition?.superId ?? '0')
            const display = String(body.display ?? body.condition?.display ?? '').trim()
            let rows = dictionaryStore
              .list()
              .filter((row) => String((row as { superId?: string | number }).superId ?? '0') === superId)
            if (display) {
              rows = rows.filter((row) => String(row.display).includes(display))
            }
            legacyOk(res, rows)
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/dictionary/query') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, dictionaryStore.query(Number(url.searchParams.get('id'))))
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/dictionary/add') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as Record<string, unknown>
            dictionaryStore.add({
              display: String(body.display ?? ''),
              groupCode: String(body.groupCode ?? body.groupId ?? ''),
              value: String(body.value ?? ''),
              moduleCode: String(body.moduleCode ?? ''),
              sort: Number(body.sort ?? 1),
              active: Number(body.active ?? 1),
              superId: String(body.superId ?? '0'),
              isLeaf: Number(body.isLeaf ?? 1),
            })
            legacyOk(res, null)
            return
          }

          if (req.method === 'PUT' && pathname === '/jee-fk/dictionary/update') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as Record<string, unknown> & { id: number | string }
            const existing = dictionaryStore.query(body.id)
            if (!existing) {
              legacyFail(res, '字典不存在')
              return
            }
            dictionaryStore.update({
              ...existing,
              ...body,
              groupCode: String(body.groupCode ?? body.groupId ?? existing.groupCode),
            } as typeof existing)
            legacyOk(res, null)
            return
          }

          if (req.method === 'DELETE' && pathname === '/jee-fk/dictionary/delete') {
            if (!requireAuth(req, res)) {
              return
            }
            dictionaryStore.remove(Number(url.searchParams.get('id')))
            legacyOk(res, null)
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/order/query') {
            if (!requireAuth(req, res)) {
              return
            }
            const id = Number(url.searchParams.get('id'))
            const order = mockInventoryOrderList.find((row) => row.id === id)
            legacyOk(res, order ? buildOrderDetail(order as unknown as Record<string, unknown>) : null)
            return
          }

          if (req.method === 'DELETE' && pathname === '/jee-fk/order/delete') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, null)
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/order/add') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, null)
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/merchantorder/query') {
            if (!requireAuth(req, res)) {
              return
            }
            const id = Number(url.searchParams.get('id'))
            const order = mockMerchantOrderList.find((row) => row.id === id)
            legacyOk(res, order ? buildOrderDetail(order as unknown as Record<string, unknown>) : null)
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/merchantorder/updateStatusOrders') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, null)
            return
          }

          if (req.method === 'DELETE' && pathname === '/jee-fk/merchantorder/delete') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, null)
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/merchantorder/add') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, null)
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/requisition/add') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, null)
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/requisition/reqIdsByUids') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as { ids?: number[] }
            const ids = body.ids ?? []
            const result: Record<string, string> = {}
            ids.forEach((uid) => {
              result[String(uid)] = `202607-${uid}-001`
            })
            legacyOk(res, result)
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/requisition/reqmoneydepositmoney') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as { ids?: number[] }
            const ids = body.ids ?? []
            const result: Record<string, [number, number, string]> = {}
            ids.forEach((uid) => {
              result[String(uid)] = [12000, 8000, `pid-${uid}`]
            })
            legacyOk(res, result)
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/refunder/getRefundGoodsByUserIds') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, [])
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/access/query') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, accessStore.query(Number(url.searchParams.get('id'))))
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/access/add') {
            if (!requireAuth(req, res)) {
              return
            }
            accessStore.add((await readBody(req)) as Omit<(typeof mockAccessList)[number], 'id'>)
            legacyOk(res, null)
            return
          }

          if (req.method === 'PUT' && pathname === '/jee-fk/access/update') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as { id: number }
            const existing = accessStore.query(body.id)
            if (!existing) {
              legacyFail(res, '资源不存在')
              return
            }
            accessStore.update({ ...existing, ...(body as Record<string, unknown>) } as typeof existing)
            legacyOk(res, null)
            return
          }

          if (req.method === 'DELETE' && pathname === '/jee-fk/access/delete') {
            if (!requireAuth(req, res)) {
              return
            }
            accessStore.remove(Number(url.searchParams.get('id')))
            legacyOk(res, null)
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/client/query') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, clientStore.query(Number(url.searchParams.get('id'))))
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/client/add') {
            if (!requireAuth(req, res)) {
              return
            }
            clientStore.add((await readBody(req)) as Omit<(typeof mockClientList)[number], 'id'>)
            legacyOk(res, null)
            return
          }

          if (req.method === 'PUT' && pathname === '/jee-fk/client/update') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as { id: number }
            const existing = clientStore.query(body.id)
            if (!existing) {
              legacyFail(res, '客户端不存在')
              return
            }
            clientStore.update({ ...existing, ...(body as Record<string, unknown>) } as typeof existing)
            legacyOk(res, null)
            return
          }

          if (req.method === 'DELETE' && pathname === '/jee-fk/client/delete') {
            if (!requireAuth(req, res)) {
              return
            }
            clientStore.remove(Number(url.searchParams.get('id')))
            legacyOk(res, null)
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/firewall/query') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, firewallStore.query(Number(url.searchParams.get('id'))))
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/firewall/add') {
            if (!requireAuth(req, res)) {
              return
            }
            firewallStore.add((await readBody(req)) as Omit<(typeof mockFirewallList)[number], 'id'>)
            legacyOk(res, null)
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/firewall/update') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as { id: number }
            const existing = firewallStore.query(body.id)
            if (!existing) {
              legacyFail(res, '规则不存在')
              return
            }
            firewallStore.update({ ...existing, ...(body as Record<string, unknown>) } as typeof existing)
            legacyOk(res, null)
            return
          }

          if (req.method === 'DELETE' && pathname === '/jee-fk/firewall/delete') {
            if (!requireAuth(req, res)) {
              return
            }
            firewallStore.remove(Number(url.searchParams.get('id')))
            legacyOk(res, null)
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/staticResource/query') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, staticResourceStore.query(Number(url.searchParams.get('id'))))
            return
          }

          if (req.method === 'DELETE' && pathname === '/jee-fk/staticResource/delete') {
            if (!requireAuth(req, res)) {
              return
            }
            staticResourceStore.remove(Number(url.searchParams.get('id')))
            legacyOk(res, null)
            return
          }

          if (req.method === 'DELETE' && pathname === '/jee-fk/staticResource/deletes') {
            if (!requireAuth(req, res)) {
              return
            }
            const ids = (await readBody(req)) as number[]
            for (const id of ids) {
              staticResourceStore.remove(id)
            }
            legacyOk(res, null)
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/accessLog/query') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, listMockRegistry.accessLog?.data.find(
              (item) => (item as { id: number }).id === Number(url.searchParams.get('id')),
            ) ?? null)
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/tagTemplate/query') {
            if (!requireAuth(req, res)) {
              return
            }
            const item = tagTemplateStore.query(Number(url.searchParams.get('id')))
            legacyOk(res, item ?? null)
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/tagTemplate/add') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as Record<string, unknown>
            tagTemplateStore.add({
              name: String(body.name ?? ''),
              width: Number(body.width ?? 60),
              height: Number(body.height ?? 40),
              config: String(body.config ?? '{}'),
              paperSize: String(body.paperSize ?? 'A4'),
              labelSize: String(body.labelSize ?? ''),
              layout: String(body.layout ?? ''),
              selectedLabel: String(body.selectedLabel ?? ''),
              updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            })
            legacyOk(res, null)
            return
          }

          if (req.method === 'PUT' && pathname === '/jee-fk/tagTemplate/update') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as Record<string, unknown> & { id: number }
            const existing = tagTemplateStore.query(body.id)
            if (!existing) {
              legacyFail(res, '模板不存在')
              return
            }
            tagTemplateStore.update({
              ...existing,
              name: String(body.name ?? existing.name),
              width: Number(body.width ?? existing.width),
              height: Number(body.height ?? existing.height),
              config: String(body.config ?? existing.config ?? '{}'),
              paperSize: String(body.paperSize ?? existing.paperSize ?? 'A4'),
              labelSize: String(body.labelSize ?? existing.labelSize ?? ''),
              layout: String(body.layout ?? existing.layout ?? ''),
              selectedLabel: String(body.selectedLabel ?? existing.selectedLabel ?? ''),
              updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            })
            legacyOk(res, null)
            return
          }

          if (req.method === 'DELETE' && pathname === '/jee-fk/tagTemplate/delete') {
            if (!requireAuth(req, res)) {
              return
            }
            tagTemplateStore.remove(Number(url.searchParams.get('id')))
            legacyOk(res, null)
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/tagLabel/query') {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, tagLabelStore.query(Number(url.searchParams.get('id'))))
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/tagLabel/add') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as Record<string, unknown>
            tagLabelStore.add({
              name: String(body.name ?? ''),
              barcode: String(body.barcode ?? ''),
              config: String(body.config ?? '{}'),
              elements: String(body.elements ?? '[]'),
              updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            })
            legacyOk(res, null)
            return
          }

          if (req.method === 'PUT' && pathname === '/jee-fk/tagLabel/update') {
            if (!requireAuth(req, res)) {
              return
            }
            const body = (await readBody(req)) as Record<string, unknown> & { id: number }
            const existing = tagLabelStore.query(body.id)
            if (!existing) {
              legacyFail(res, '标签不存在')
              return
            }
            tagLabelStore.update({
              ...existing,
              name: String(body.name ?? existing.name),
              barcode: String(body.barcode ?? existing.barcode ?? ''),
              config: String(body.config ?? existing.config),
              elements: String(body.elements ?? existing.elements),
              updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            })
            legacyOk(res, null)
            return
          }

          if (req.method === 'DELETE' && pathname === '/jee-fk/tagLabel/delete') {
            if (!requireAuth(req, res)) {
              return
            }
            tagLabelStore.remove(Number(url.searchParams.get('id')))
            legacyOk(res, null)
            return
          }

          if (req.method === 'POST' && pathname === '/jee-fk/resource/public') {
            if (!requireAuth(req, res)) {
              return
            }
            const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
            const fileName = `upload-${Date.now()}.bin`
            const url = `https://via.placeholder.com/120x120.png?text=mock`
            staticResourceStore.add({
              name: fileName,
              type: 'bin',
              size: 0.01,
              path: `/static/${fileName}`,
              absolutePath: `/data/static/${fileName}`,
              uploadUri: url,
              endpoint: 'default',
              moduleCode: 'platform',
              createTime: now,
              active: 1,
              delete: 1,
              fileName,
              filePath: `/static/${fileName}`,
              fileSize: 10240,
              mimeType: 'application/octet-stream',
              createdAt: now,
            } as never)
            legacyOk(res, [{ url }])
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/control/memory/info') {
            if (!requireAuth(req, res)) {
              return
            }
            const usedPhysical = Math.floor(3800 + Math.random() * 800)
            const jvmUsed = Math.floor(420 + Math.random() * 180)
            const jvmTotal = Math.floor(700 + Math.random() * 80)
            const processCpu = Math.floor(8 + Math.random() * 25)
            const systemCpu = Math.floor(20 + Math.random() * 35)
            legacyOk(res, {
              ...mockMemoryInfo,
              dateTime: new Date().toISOString(),
              usedPhysical,
              totalPhysical: 8192,
              usedSwap: Math.floor(200 + Math.random() * 200),
              totalSwap: 2048,
              jvmUsed,
              jvmTotal,
              jvmMax: 1024,
              processCpu,
              systemCpu,
              systemUsed: usedPhysical,
              systemTotal: 8192,
              cpuUsage: systemCpu,
            })
            return
          }

          if (
            req.method === 'GET' &&
            (pathname === '/jee-fk/control/reload/firewall' ||
              pathname === '/jee-fk/control/reload/cache' ||
              pathname === '/jee-fk/control/reload/accessResource')
          ) {
            if (!requireAuth(req, res)) {
              return
            }
            legacyOk(res, null)
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/module/install') {
            if (!requireAuth(req, res)) {
              return
            }
            const id = Number(url.searchParams.get('id'))
            const modules = listMockRegistry.module?.data ?? []
            listMockRegistry.module.data = modules.map((item) => {
              const row = item as Record<string, unknown>
              return row.id === id ? { ...row, installed: 1 } : row
            })
            legacyOk(res, null)
            return
          }

          if (req.method === 'GET' && pathname === '/jee-fk/module/uninstall') {
            if (!requireAuth(req, res)) {
              return
            }
            const id = Number(url.searchParams.get('id'))
            const modules = listMockRegistry.module?.data ?? []
            listMockRegistry.module.data = modules.map((item) => {
              const row = item as Record<string, unknown>
              return row.id === id ? { ...row, installed: 0 } : row
            })
            legacyOk(res, null)
            return
          }

          sendJson(res, 404, { code: 404, data: null, message: '接口不存在' })
        } catch {
          sendJson(res, 500, { code: 500, data: null, message: '服务异常' })
        }
      })
    },
  }
}
