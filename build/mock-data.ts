import {
  type CashRecordItem,
  type InventoryCategoryItem,
  type InventoryCommodityItem,
  type InventoryOrderItem,
  type MerchantCommodityItem,
  type MerchantUserItem,
  type TagTemplateItem,
  USER_STATUS,
} from '../src/types/api'
import type { LegacyAuthorityNode } from '../src/types/permission'

export interface MockUser {
  id: number
  username: string
  password: string
  nickname: string
  realName: string
}

export const mockUsers: MockUser[] = [
  {
    id: 1,
    username: 'admin',
    password: '123456',
    nickname: '管理员',
    realName: '系统管理员',
  },
]

function crudButtons(): LegacyAuthorityNode[] {
  return [
    { authName: '查询', path: '/index', icon: 'Search' },
    { authName: '新增', path: '/add', icon: 'Plus' },
    { authName: '编辑', path: '/update', icon: 'Edit' },
    { authName: '删除', path: '/delete', icon: 'Delete' },
  ]
}

function listPage(authName: string, withButtons = false): LegacyAuthorityNode {
  return {
    authName,
    path: '/index',
    icon: 'List',
    children: withButtons ? crudButtons() : undefined,
  }
}

function module(
  authName: string,
  path: string,
  icon: string,
  pages: LegacyAuthorityNode[],
): LegacyAuthorityNode {
  return { authName, path, icon, children: pages }
}

export const mockAuthorityMenus: LegacyAuthorityNode[] = [
  {
    authName: '系统管理',
    path: '',
    icon: 'Setting',
    children: [
      module('角色管理', '/role', 'UserFilled', [listPage('角色列表', true)]),
      module('用户管理', '/user', 'User', [listPage('用户列表', true)]),
      module('组织管理', '/organization', 'OfficeBuilding', [listPage('组织列表', true)]),
      module('权限管理', '/authority', 'Lock', [listPage('权限列表', true)]),
      module('字典管理', '/dictionary', 'Collection', [listPage('字典列表', true)]),
      module('访问资源', '/access', 'Link', [listPage('资源列表', true)]),
      module('访问日志', '/accessLog', 'Document', [listPage('日志列表')]),
      module('客户端', '/client', 'Connection', [listPage('客户端列表', true)]),
      module('模块管理', '/module', 'Box', [listPage('模块列表', true)]),
      module('防火墙', '/firewall', 'Shield', [listPage('规则列表', true)]),
      module('静态资源', '/staticResource', 'Folder', [listPage('资源列表')]),
      module('系统监控', '/control', 'Monitor', [
        {
          authName: '监控面板',
          path: '/index',
          icon: 'DataLine',
          children: [
            { authName: '刷新防火墙', path: '/reloadFireWall', icon: 'Refresh' },
            { authName: '刷新缓存', path: '/reloadCache', icon: 'Refresh' },
            { authName: '重载访问资源', path: '/reloadAccessResource', icon: 'Refresh' },
          ],
        },
      ]),
    ],
  },
  {
    authName: '工作流',
    path: '',
    icon: 'Share',
    children: [
      module('流程定义', '/processDefinitionModel', 'SetUp', [listPage('定义列表', true)]),
      module('流程部署', '/processDeployment', 'Upload', [listPage('部署列表')]),
      module('表单定义', '/formDefinitionModel', 'Tickets', [listPage('表单定义', true)]),
      module('表单部署', '/formDeployment', 'UploadFilled', [listPage('表单部署')]),
      module('流程设计', '/flowableDesigner', 'EditPen', [listPage('设计器')]),
    ],
  },
  {
    authName: '商户管理',
    path: '/merchant',
    icon: 'Shop',
    children: [
      module('商品管理', '/commodity', 'Goods', [listPage('商品列表')]),
      module('分销商品', '/commoditydis', 'GoodsFilled', [listPage('分销列表')]),
      module('用户管理', '/user', 'User', [listPage('用户列表')]),
      module('请购管理', '/requisition', 'Document', [listPage('请购列表')]),
      module('退款管理', '/refund', 'RefreshLeft', [listPage('退款列表')]),
      module('保证金管理', '/deposit', 'Wallet', [listPage('保证金列表')]),
      module('订单管理', '/order', 'Tickets', [listPage('订单列表')]),
    ],
  },
  {
    authName: '库存管理',
    path: '/inventory',
    icon: 'Box',
    children: [
      module('分类管理', '/category', 'CollectionTag', [listPage('分类列表', true)]),
      module('商品管理', '/commodity', 'Goods', [listPage('商品列表')]),
      module('订单管理', '/order', 'Tickets', [listPage('订单列表')]),
      module('广告管理', '/advertise', 'Picture', [listPage('广告列表')]),
      module('用户管理', '/user', 'User', [listPage('用户列表')]),
      {
        authName: '配置管理',
        path: '/configure',
        icon: 'Tools',
        children: [
          {
            authName: '支付配置',
            path: '/configure/payment',
            icon: 'CreditCard',
            children: crudButtons(),
          },
          {
            authName: '运费配置',
            path: '/configure/fare',
            icon: 'Van',
            children: crudButtons(),
          },
        ],
      },
    ],
  },
  {
    authName: '仓储管理',
    path: '/stock',
    icon: 'House',
    children: [
      module('原料管理', '/rawFood', 'Food', [listPage('原料列表')]),
      module('库存数量', '/goodsQuantity', 'Histogram', [listPage('库存列表')]),
    ],
  },
  {
    authName: '配置管理',
    path: '/configure',
    icon: 'Tools',
    children: [
      module('支付配置', '/payment', 'CreditCard', [listPage('支付列表', true)]),
      module('运费配置', '/fare', 'Van', [listPage('运费列表', true)]),
    ],
  },
  {
    authName: '员工管理',
    path: '/employee',
    icon: 'Avatar',
    children: [
      module('员工信息', '/employee', 'User', [listPage('员工列表')]),
      module('考勤记录', '/attendanceRecord', 'Calendar', [listPage('考勤列表')]),
    ],
  },
  {
    authName: '现金管理',
    path: '/cash',
    icon: 'Money',
    children: [module('现金记录', '', 'List', [listPage('记录列表')])],
  },
  {
    authName: '标签管理',
    path: '/tag',
    icon: 'PriceTag',
    children: [
      module('模板管理', '/template', 'Files', [listPage('模板列表', true)]),
      module('标签编辑', '/editor', 'Edit', [listPage('内容编辑')]),
      module('打印管理', '/print', 'Printer', [
        { authName: '打印列表', path: '/list/index', icon: 'List' },
        { authName: '打印编辑', path: '/editor/index', icon: 'Edit' },
        { authName: '模板设置', path: '/template/index', icon: 'Setting' },
        { authName: '设计器', path: '/designer/index', icon: 'EditPen' },
      ]),
    ],
  },
]

export const mockRoleList = [
  { id: 1, roleName: '超级管理员', active: 1 },
  { id: 2, roleName: '运营人员', active: 1 },
  { id: 3, roleName: '访客', active: 0 },
]

export const mockSysUserList = [
  {
    id: 1,
    username: 'admin',
    name: '系统管理员',
    realName: '系统管理员',
    sex: '1',
    mobile: '13800000000',
    email: 'admin@test.com',
    avatar: '',
    title: '管理员',
    expireDate: '2099-12-31',
    roleId: 1,
    roleName: '超级管理员',
    clientId: 1,
    client: 'jee-fk',
    organizationId: 1,
    organization: { id: 1, name: '友山总部' },
    active: 1,
  },
  {
    id: 2,
    username: 'operator',
    name: '运营小王',
    realName: '运营小王',
    sex: '2',
    mobile: '13800000001',
    email: 'op@test.com',
    avatar: '',
    title: '运营',
    expireDate: '2030-12-31',
    roleId: 2,
    roleName: '运营人员',
    clientId: 1,
    client: 'jee-fk',
    organizationId: 2,
    organization: { id: 2, name: '华东分部' },
    active: 1,
  },
]

export const mockOrganizationList = [
  { id: 1, name: '有善总部', orgName: '有善总部', superid: null, type: '1', sort: 1, address: '', active: 1 },
  { id: 2, name: '华东分部', orgName: '华东分部', superid: 1, type: '2', sort: 2, address: '上海市', active: 1 },
]

export const mockAuthorityList = [
  {
    id: 1,
    authName: '中台系统',
    path: '/office',
    icon: 'Setting',
    type: 1,
    moduleCode: 'office',
    sort: 1,
    ispublic: 0,
    active: 1,
    superid: '0',
    isLeaf: 0,
    resource: '',
    resourceId: '',
    resourceType: '',
  },
  {
    id: 2,
    authName: '业务中台',
    path: '/business-office',
    icon: 'Menu',
    type: 2,
    moduleCode: 'office',
    sort: 1,
    ispublic: 0,
    active: 1,
    superid: '1',
    isLeaf: 0,
    resource: '',
    resourceId: '',
    resourceType: '',
  },
  {
    id: 3,
    authName: '角色管理',
    path: '/role',
    icon: 'UserFilled',
    type: 3,
    moduleCode: 'role',
    sort: 1,
    ispublic: 0,
    active: 1,
    superid: '2',
    isLeaf: 0,
    resource: '/jee-fk/role/index',
    resourceId: 1,
    resourceType: 'uri',
  },
  {
    id: 4,
    authName: '查询',
    path: '/index',
    icon: 'Search',
    type: 4,
    moduleCode: 'role',
    sort: 1,
    ispublic: 0,
    active: 1,
    superid: '3',
    isLeaf: 1,
    resource: '/jee-fk/role/index',
    resourceId: 1,
    resourceType: 'uri',
  },
  {
    id: 5,
    authName: '权限管理',
    path: '/authority',
    icon: 'Lock',
    type: 3,
    moduleCode: 'authority',
    sort: 2,
    ispublic: 0,
    active: 1,
    superid: '2',
    isLeaf: 1,
    resource: '/jee-fk/authority/index',
    resourceId: '',
    resourceType: 'uri',
  },
]

export const mockAuthorityGrantTree = [
  {
    id: 100,
    authName: '系统管理',
    children: [
      {
        id: 101,
        authName: '角色管理',
        children: [
          { id: 102, authName: '角色列表' },
          { id: 103, authName: '角色新增' },
          { id: 104, authName: '角色授权' },
        ],
      },
      {
        id: 105,
        authName: '权限管理',
        children: [{ id: 106, authName: '权限列表' }],
      },
    ],
  },
  {
    id: 200,
    authName: '商户管理',
    children: [
      {
        id: 201,
        authName: '订单管理',
        children: [{ id: 202, authName: '订单查询' }],
      },
    ],
  },
]

export const mockRoleAuthorityGrants: Record<number, number[]> = {
  1: [102, 103, 202],
  2: [106],
}

export const mockDictionaryManageList = [
  {
    id: 1,
    display: '订单状态',
    groupCode: 'order_status',
    value: '',
    moduleCode: 'common',
    sort: 1,
    active: 1,
    superId: '0',
    isLeaf: 0,
  },
  {
    id: 2,
    display: '待支付',
    groupCode: 'order_status',
    value: '1',
    moduleCode: 'common',
    sort: 1,
    active: 1,
    superId: '1',
    isLeaf: 1,
  },
  {
    id: 3,
    display: '已支付',
    groupCode: 'order_status',
    value: '2',
    moduleCode: 'common',
    sort: 2,
    active: 1,
    superId: '1',
    isLeaf: 1,
  },
  {
    id: 4,
    display: '是否',
    groupCode: 'yesno',
    value: '',
    moduleCode: 'common',
    sort: 2,
    active: 1,
    superId: '0',
    isLeaf: 0,
  },
  {
    id: 5,
    display: '否',
    groupCode: 'yesno',
    value: '0',
    moduleCode: 'common',
    sort: 1,
    active: 1,
    superId: '4',
    isLeaf: 1,
  },
  {
    id: 6,
    display: '是',
    groupCode: 'yesno',
    value: '1',
    moduleCode: 'common',
    sort: 2,
    active: 1,
    superId: '4',
    isLeaf: 1,
  },
]

export const mockInventoryCategoryList: InventoryCategoryItem[] = [
  { id: 1, title: '肉禽蛋', kind: 1, image: '', updatedAt: '2026-07-01 10:20:00' },
  { id: 2, title: '蔬菜水果', kind: 2, image: '', updatedAt: '2026-07-02 11:00:00' },
  { id: 3, title: '粮油米面', kind: 1, image: '', updatedAt: '2026-07-03 13:30:00' },
]

export const mockInventoryCommodityList: InventoryCommodityItem[] = [
  {
    id: 1001,
    title: '有机西红柿',
    price: 12.8,
    priced: 16.8,
    sold: 142,
    total: 86,
    weight: 10,
    unit: 'kg',
    brand: '友山',
    category: '21',
    home: '0|1',
    tax: 8,
  },
  {
    id: 1002,
    title: '草鸡蛋 10枚',
    price: 18.9,
    priced: 22.9,
    sold: 230,
    total: 42,
    weight: 20,
    unit: '盒',
    brand: '农家',
    category: '11',
    home: '1',
    tax: 8,
  },
  {
    id: 1003,
    title: '东北大米 5kg',
    price: 39.9,
    priced: 49.9,
    sold: 98,
    total: 120,
    weight: 5,
    unit: '袋',
    brand: '东北粮',
    category: '11,12',
    home: '2',
    tax: 8,
  },
]

export const mockInventoryOrderList = [
  {
    id: 5001,
    name: '张三',
    status: 2,
    total: 88,
    svf: 6,
    pay: 0,
    yf: 8,
    ld: 3,
    lc: 2,
    uname: 'zhangsan',
    authenappend: String(Math.floor(Date.now() / 1000) - 86400),
    authenmodify: String(Math.floor(Date.now() / 1000) - 3600),
    updatedAt: '2026-07-05 14:12:00',
  },
  {
    id: 5002,
    name: '李四',
    status: 1,
    total: 46,
    svf: 4,
    pay: 1,
    yf: 5,
    ld: 0,
    lc: 0,
    uname: 'lisi',
    authenappend: String(Math.floor(Date.now() / 1000) - 172800),
    authenmodify: String(Math.floor(Date.now() / 1000) - 7200),
    updatedAt: '2026-07-06 09:21:00',
  },
  {
    id: 5003,
    name: '王五',
    status: 3,
    total: 156,
    svf: 0,
    pay: 4,
    yf: 10,
    ld: 6,
    lc: 4,
    uname: 'wangwu',
    authenappend: String(Math.floor(Date.now() / 1000) - 259200),
    authenmodify: String(Math.floor(Date.now() / 1000) - 10800),
    updatedAt: '2026-07-06 18:40:00',
  },
]

export const mockInventoryAdvertiseList = [
  {
    id: 1,
    title: '首页轮播',
    url: '/pages/home',
    type: 1,
    image: 'https://example.com/banner1.jpg',
    status: 1,
    updatedAt: '2026-07-01 10:00:00',
  },
  {
    id: 2,
    title: '夏季促销',
    url: '/pages/promo',
    type: 2,
    image: 'https://example.com/banner2.jpg',
    status: 1,
    updatedAt: '2026-07-02 11:00:00',
  },
]

export const mockInventoryUserList = [
  {
    id: 2001,
    username: 'ys_user_a',
    uname: 'ys_user_a',
    unick: '库存用户A',
    phone: '13900000001',
    name: '库存用户A',
    createdAt: '2026-06-01 08:00:00',
    createtime: '2026-06-01 08:00:00',
  },
  {
    id: 2002,
    username: 'ys_user_b',
    uname: 'ys_user_b',
    unick: '库存用户B',
    phone: '13900000002',
    name: '库存用户B',
    createdAt: '2026-06-02 09:00:00',
    createtime: '2026-06-02 09:00:00',
  },
]

export const mockMerchantUserAddressList = [
  {
    id: 'addr-m-1',
    uid: 3001,
    uname: 'merchant_a',
    receive: '山田',
    postcode: '1000001',
    prefecture: '東京都',
    city: '千代田区',
    town: '丸の内',
    address: '1-1-1',
    building: '丸ビル',
    roomnumber: '101',
    phone: '09011112222',
    socialtype: '0',
    socialaccount: '',
  },
]

export const mockInventoryUserAddressList = [
  {
    id: 'addr-i-1',
    user_id: 2001,
    uid: 2001,
    uname: 'ys_user_a',
    receive: '佐藤',
    postcode: '1500001',
    prefecture: '東京都',
    city: '渋谷区',
    town: '神宮前',
    address: '2-2-2',
    building: '',
    roomnumber: '',
    phone: '08033334444',
  },
]

export const mockMerchantOrderList = [
  {
    id: 8001,
    uid: 3001,
    name: '赵六',
    unick: '友山生鲜店',
    ucode: 'YS001',
    uname: 'merchant_a',
    status: 2,
    pay: 1,
    total: 129,
    totald: 141,
    yf: 10,
    ld: 5,
    svf: 0,
    point: 0,
    taxState: 0,
    zip: '3340073',
    phone: '09012345678',
    address: '埼玉県川口市赤井 1-2-3',
    memo: '午前中配送希望',
    authenappend: String(Math.floor(Date.now() / 1000) - 86400),
    authenmodify: String(Math.floor(Date.now() / 1000) - 3600),
    updatedAt: '2026-07-07 10:10:00',
    merchantAddress: {
      receive: '赵六',
      phone: '09012345678',
      postcode: '3340073',
      prefecture: '埼玉県',
      city: '川口市',
      town: '赤井',
      address: '1-2-3',
      building: '',
      roomnumber: '',
    },
    data: JSON.stringify({
      PID1: {
        pid: 9001,
        title: '商户牛奶',
        count: 2,
        unit: '箱',
        price: 60,
        total: 120,
        tax: 8,
        taxtype: 0,
      },
      PID2: {
        pid: 9002,
        title: '商户橙子',
        count: 1,
        unit: '袋',
        price: 9,
        total: 9,
        tax: 8,
        taxtype: 0,
      },
    }),
  },
  {
    id: 8002,
    uid: 3002,
    name: '钱七',
    unick: '每日鲜送',
    ucode: 'YS002',
    uname: 'merchant_b',
    status: 1,
    pay: 1,
    total: 59,
    totald: 65,
    yf: 6,
    ld: 0,
    svf: 0,
    point: 0,
    taxState: 1,
    zip: '1000001',
    phone: '08098765432',
    address: '東京都千代田区 1-1',
    memo: '',
    authenappend: String(Math.floor(Date.now() / 1000) - 172800),
    authenmodify: String(Math.floor(Date.now() / 1000) - 7200),
    updatedAt: '2026-07-07 11:20:00',
    merchantAddress: {
      receive: '钱七',
      phone: '08098765432',
      postcode: '1000001',
      prefecture: '東京都',
      city: '千代田区',
      town: '',
      address: '1-1',
      building: '',
      roomnumber: '',
    },
    data: JSON.stringify({
      PID3: {
        pid: 9002,
        title: '商户橙子',
        count: 2,
        unit: '袋',
        price: 29.5,
        total: 59,
        tax: 8,
        taxtype: 0,
      },
    }),
  },
  {
    id: 8003,
    uid: 3001,
    name: '赵六',
    unick: '友山生鲜店',
    ucode: 'YS001',
    uname: 'merchant_a',
    status: 0,
    pay: 0,
    total: 38,
    totald: 38,
    yf: 0,
    ld: 0,
    svf: 0,
    point: 0,
    taxState: 0,
    zip: '3340073',
    phone: '09012345678',
    address: '埼玉県川口市赤井 1-2-3',
    memo: '納品書テスト',
    authenappend: String(Math.floor(Date.now() / 1000) - 43200),
    authenmodify: String(Math.floor(Date.now() / 1000) - 1800),
    updatedAt: '2026-07-08 09:00:00',
    data: JSON.stringify({
      PID4: {
        pid: 9001,
        title: '商户牛奶',
        count: 2,
        unit: '箱',
        price: 19,
        total: 38,
        tax: 8,
        taxtype: 0,
      },
    }),
  },
]

export const mockMerchantCommodityList: MerchantCommodityItem[] = [
  {
    id: 9001,
    title: '商户牛奶',
    price: 18.9,
    priced: 22,
    stock: 120,
    total: 120,
    sold: 30,
    viewed: 120,
    weight: 10,
    unit: '本',
    code: 1001,
    category: '3',
    home: '0|1',
    tax: 8,
    taxtype: 0,
  },
  {
    id: 9002,
    title: '商户橙子',
    price: 22.5,
    priced: 28,
    stock: 40,
    total: 40,
    sold: 44,
    viewed: 88,
    weight: 8,
    unit: '箱',
    code: 1002,
    category: '1',
    home: '1',
    tax: 8,
    taxtype: 1,
  },
]

export const mockMerchantUserList: MerchantUserItem[] = [
  {
    id: 3001,
    username: 'merchant_a',
    uname: 'merchant_a',
    unick: '友山生鲜店',
    phone: '13800000001',
    level: 'VIP',
    ucode: 10001,
    name: '商户A会社',
    state: 1,
    createdAt: '2026-05-01 08:20:00',
    createtime: '2026-05-01 08:20:00',
  },
  {
    id: 3002,
    username: 'merchant_b',
    uname: 'merchant_b',
    unick: '每日鲜送',
    phone: '13800000002',
    level: '普通',
    ucode: 10002,
    name: '商户B会社',
    state: 1,
    createdAt: '2026-06-01 09:20:00',
    createtime: '2026-06-01 09:20:00',
  },
]

export const mockMerchantCommodityDisList = [
  {
    id: 9101,
    uname: 'merchant_a',
    unick: '友山生鲜店',
    ctitle: '商户牛奶',
    price: 18.9,
    state: 1,
    userid: 3001,
    commodityid: 9001,
  },
  {
    id: 9102,
    uname: 'merchant_b',
    unick: '每日鲜送',
    ctitle: '商户橙子',
    price: 20,
    state: 0,
    userid: 3002,
    commodityid: 9002,
  },
]

export const mockCashManagementList = [
  {
    id: 7101,
    month: 7,
    mdate: '2026-07-01',
    week: 1,
    amount: 5000,
    type: 0,
    staff: '张三',
    content: '月初入金',
    remark: '',
    createTime: '2026-07-01 09:00:00',
  },
  {
    id: 7102,
    month: 7,
    mdate: '2026-07-05',
    week: 1,
    amount: 1200,
    type: 1,
    staff: '李四',
    content: '运营支出',
    remark: '物料采购',
    createTime: '2026-07-05 14:30:00',
  },
]

export const mockCashListData = [
  { id: 7201, amount: 100, quantity: 20, beforequantity: 18, updateTime: '2026-07-06 10:00:00' },
  { id: 7202, amount: 50, quantity: 10, beforequantity: 10, updateTime: '2026-07-06 11:30:00' },
]

export const mockCashTakeRecordList = [
  { id: 7301, takeTime: '2026-07-06', amount: 300, content: '门店取现', createTime: '2026-07-06 16:00:00' },
  { id: 7302, takeTime: '2026-07-07', amount: 150, content: '备用金', createTime: '2026-07-07 09:30:00' },
]

export const mockCashRecordList: CashRecordItem[] = [
  { id: 7001, userName: '张三', amount: 188, status: 1, createdAt: '2026-07-06 10:00:00' },
  { id: 7002, userName: '李四', amount: 66, status: 2, createdAt: '2026-07-06 11:30:00' },
]

export const mockTagTemplateList: TagTemplateItem[] = [
  {
    id: 6001,
    name: '默认价格签',
    width: 60,
    height: 40,
    paperSize: 'A4',
    labelSize: '60×40mm',
    layout: '5×3',
    selectedLabel: '示例价格签',
    config: JSON.stringify({
      templateName: '默认价格签',
      paperSize: 'A4',
      paperWidth: 210,
      paperHeight: 297,
      labelWidth: 60,
      labelHeight: 40,
      rows: 5,
      columns: 3,
      marginLeft: 5,
      marginTop: 5,
      spacing: 2,
      selectedLabel: '示例价格签',
    }),
    updatedAt: '2026-07-01 15:00:00',
  },
  {
    id: 6002,
    name: '仓储标签',
    width: 80,
    height: 50,
    paperSize: 'A5',
    labelSize: '80×50mm',
    layout: '4×2',
    selectedLabel: '仓储标签样例',
    config: JSON.stringify({
      templateName: '仓储标签',
      paperSize: 'A5',
      paperWidth: 148,
      paperHeight: 210,
      labelWidth: 80,
      labelHeight: 50,
      rows: 4,
      columns: 2,
      marginLeft: 4,
      marginTop: 4,
      spacing: 2,
      selectedLabel: '仓储标签样例',
    }),
    updatedAt: '2026-07-02 16:00:00',
  },
]

const defaultTagLabelConfig = JSON.stringify({
  name: '示例价格签',
  width: 250,
  height: 60,
  unit: 'px',
  backgroundColor: '#ffffff',
})

const defaultTagLabelElements = JSON.stringify([
  {
    type: 'text',
    content: '商品名称',
    x: 10,
    y: 10,
    fontSize: 14,
    fontFamily: 'Arial',
    color: '#000000',
    bold: true,
    italic: false,
    textDirection: 'horizontal',
  },
  {
    type: 'barcode',
    content: '1234567890123',
    x: 10,
    y: 30,
    width: 120,
    height: 24,
    fontSize: 10,
    fontFamily: 'Arial',
    color: '#000000',
  },
])

export const mockTagLabelList = [
  {
    id: 6101,
    name: '示例价格签',
    barcode: '1234567890123',
    config: defaultTagLabelConfig,
    elements: defaultTagLabelElements,
    updatedAt: '2026-07-03 10:00:00',
  },
  {
    id: 6102,
    name: '仓储标签样例',
    barcode: '9876543210987',
    config: JSON.stringify({
      name: '仓储标签样例',
      width: 80,
      height: 50,
      unit: 'mm',
      backgroundColor: '#ffffff',
    }),
    elements: defaultTagLabelElements,
    updatedAt: '2026-07-04 11:00:00',
  },
]

export const mockRawFoodList = [
  { id: 1, name: '鸡胸肉', quantity: 120 },
  { id: 2, name: '西兰花', quantity: 80 },
]

export const mockGoodsQuantityList = [
  { id: 1, goodsName: '有机西红柿', quantity: 86 },
  { id: 2, goodsName: '草鸡蛋', quantity: 42 },
]

export const mockPaymentList = [
  { id: 1, title: '微信支付', image: '', demomemo: '推荐使用', state: 1 },
  { id: 2, title: '支付宝', image: '', demomemo: '', state: 1 },
]

export const mockFareList = [
  { id: 1, title: '同城配送', fare: 6, type: '1', usertype: '1' },
  { id: 2, title: '跨省配送', fare: 12, type: '2', usertype: '2' },
]

export const mockEmployeeList = [
  { id: 1, name: '张员工', empId: 'EMP001', department: '运营部', basicGive: 8000 },
  { id: 2, name: '李员工', empId: 'EMP002', department: '仓储部', basicGive: 7500 },
]

export const mockClientResourceGrants: Record<number, number[]> = {
  1: [1],
  2: [2],
}

export const mockAttendanceRecordList = [
  { id: 1, employeeName: '张员工', checkDate: '2026-07-07 09:00:00', type: 1 },
  { id: 2, employeeName: '李员工', checkDate: '2026-07-07 09:05:00', type: 2 },
]

export const mockRequisitionList = [
  {
    id: 'REQ-1001-2001',
    rdate: '2026-07-05',
    username: 3001,
    unick: '商户A',
    moneytotal: 5000,
    taxtotal: 400,
    yf: 300,
    ld: 0,
    svf: 0,
    type: 1,
    state: 1,
    creater: 'admin',
    createtime: '2026-07-05 10:00:00',
    depositmoney: 1000,
    reqmoney: 0,
    pointtotal: 0,
    point: 0,
    requestob: JSON.stringify({
      id: 1001,
      uname: 'merchant_a',
      unick: '商户A',
      name: '山田',
      phone: '090-0000-0000',
      zip: '1000001',
      address: '東京都千代田区1-1',
      pay: 1,
    }),
    mtotal: JSON.stringify({}),
    datalist: JSON.stringify({
      '1001': {
        milk: { title: '牛乳', price: 200, count: 10, total: 2000, tax: 8, taxtype: 0 },
      },
    }),
    refundertotal: JSON.stringify([]),
    othercost: JSON.stringify({}),
  },
  {
    id: 'DLV-2002-3002',
    rdate: '2026-07-06',
    username: 3002,
    unick: '商户B',
    moneytotal: 3200,
    taxtotal: 256,
    yf: 200,
    ld: 0,
    svf: 0,
    type: 0,
    state: 0,
    creater: 'admin',
    createtime: '2026-07-06 11:00:00',
    point: 0,
    requestob: JSON.stringify({
      id: 3002,
      uname: 'merchant_b',
      unick: '商户B',
      name: '佐藤',
      phone: '080-1111-1111',
      zip: '1500001',
      address: '東京都渋谷区2-2',
      data: {
        orange: { title: 'オレンジ', price: 160, count: 20, total: 3200, tax: 8 },
      },
    }),
    mtotal: JSON.stringify({ orange: 3200 }),
    datalist: JSON.stringify({}),
    refundertotal: JSON.stringify([]),
    othercost: JSON.stringify({}),
  },
]

export const mockRefunderList = [
  {
    rid: 12001,
    id: 12001,
    oid: 88001,
    uname: '用户甲',
    state: 1,
    total: 188,
    refunded: 50,
    rate: 1,
    updater: 'admin',
    updatetime: '2026-07-05 14:00:00',
    createtime: '2026-07-05 12:00:00',
    memo: '部分退款',
    data: JSON.stringify({
      PID1: { pid: 1, title: '牛奶', price: 18.8, count: 10, total: 188, tax: 8, taxtype: 0, unit: '本' },
    }),
  },
  {
    rid: 12002,
    id: 12002,
    oid: 88002,
    uname: '用户乙',
    state: 3,
    total: 66,
    refunded: 66,
    rate: 1,
    updater: 'admin',
    updatetime: '2026-07-06 15:00:00',
    createtime: '2026-07-06 13:00:00',
    memo: '',
    data: JSON.stringify({
      PID2: { pid: 2, title: '橙子', price: 22, count: 3, total: 66, tax: 8, taxtype: 0, unit: '个' },
    }),
  },
]

export const mockDepositList = [
  {
    id: 13001,
    sender: '张三',
    bank: '0',
    username: 3001,
    unick: '商户A',
    deposit: 10000,
    beforedeposit: 5000,
    deposittime: '2026-07-01',
    state: 2,
    type: 1,
    remark: '月结入金',
    createtime: '2026-07-01 09:00:00',
    creater: 'admin',
  },
  {
    id: 13002,
    sender: '李四',
    bank: '1',
    username: 3002,
    unick: '商户C',
    deposit: 8000,
    beforedeposit: 2000,
    deposittime: '2026-07-02',
    state: 1,
    type: 0,
    remark: '记录',
    createtime: '2026-07-02 10:00:00',
    creater: 'admin',
  },
]

export const mockAccessList = [
  {
    id: 1,
    resourceName: '角色列表',
    resource: '/jee-fk/role/index',
    type: 'uri',
    method: 'POST',
    moduleCode: 'role',
    sort: 1,
    ispublic: 0,
    authority: 'READ',
    active: 1,
  },
  {
    id: 2,
    resourceName: '登录接口',
    resource: '/jee-fk/oauth/token',
    type: 'uri',
    method: 'POST',
    moduleCode: 'oauth',
    sort: 2,
    ispublic: 1,
    authority: 'EXECUTE',
    active: 1,
  },
]

export const mockAccessLogList = [
  {
    id: 1,
    uri: '/jee-fk/role/index',
    resource: '/jee-fk/role/index',
    username: 'admin',
    cuname: 'admin',
    method: 'POST',
    type: 'API',
    createdAt: '2026-07-07 10:00:00',
    createTime: '2026-07-07 10:00:00',
    status: 200,
    statusCode: 200,
    param: '{"page":1,"rows":10}',
    header: JSON.stringify({ Authorization: 'Bearer mock', 'Content-Type': 'application/json' }),
  },
  {
    id: 2,
    uri: '/jee-fk/sysuser/index',
    resource: '/jee-fk/sysuser/index',
    username: 'operator',
    cuname: 'operator',
    method: 'POST',
    type: 'API',
    createdAt: '2026-07-07 10:05:00',
    createTime: '2026-07-07 10:05:00',
    status: 200,
    statusCode: 200,
    param: '{"page":1,"rows":10}',
    header: JSON.stringify({ Authorization: 'Bearer mock' }),
  },
]

export const mockClientList = [
  { id: 1, clientId: 'jee-fk', clientName: '管理后台', active: 1 },
  { id: 2, clientId: 'mobile-app', clientName: '移动端', active: 1 },
]

export const mockModuleList = [
  { id: 1, moduleName: '友山核心', moduleCode: 'youshan-core', version: '1.0.0', installed: 1 },
  { id: 2, moduleName: '标签打印', moduleCode: 'tag-print', version: '0.9.1', installed: 0 },
]

export const mockFirewallList = [
  { id: 1, ruleName: '允许内网', ip: '192.168.0.0/16', action: 'ALLOW', active: 1 },
  { id: 2, ruleName: '拒绝黑名单', ip: '10.0.0.8', action: 'DENY', active: 1 },
]

export const mockStaticResourceList = [
  {
    id: 1,
    name: 'logo.png',
    type: 'png',
    size: 0.02,
    path: '/static/logo.png',
    absolutePath: '/data/static/logo.png',
    uploadUri: '/public/resources/static/logo.png',
    endpoint: 'default',
    moduleCode: 'platform',
    createTime: '2026-06-01 08:00:00',
    active: 1,
    delete: 1,
    fileName: 'logo.png',
    filePath: '/static/logo.png',
    fileSize: 20480,
    mimeType: 'image/png',
    createdAt: '2026-06-01 08:00:00',
  },
  {
    id: 2,
    name: 'banner.jpg',
    type: 'jpg',
    size: 0.1,
    path: '/static/banner.jpg',
    absolutePath: '/data/static/banner.jpg',
    uploadUri: '/public/resources/static/banner.jpg',
    endpoint: 'default',
    moduleCode: 'platform',
    createTime: '2026-06-02 09:00:00',
    active: 1,
    delete: 1,
    fileName: 'banner.jpg',
    filePath: '/static/banner.jpg',
    fileSize: 102400,
    mimeType: 'image/jpeg',
    createdAt: '2026-06-02 09:00:00',
  },
]

export const mockProcessDefinitionList = [
  { id: 1, name: '请假流程', key: 'leave_process', version: 1, deploymentId: 'dep-001' },
  { id: 2, name: '采购审批', key: 'purchase_process', version: 2, deploymentId: 'dep-002' },
]

export const mockMemoryInfo = {
  unit: 'MB',
  dateTime: new Date().toISOString(),
  jvmUsed: 512,
  jvmMax: 1024,
  jvmTotal: 768,
  systemUsed: 4096,
  systemTotal: 8192,
  usedPhysical: 4096,
  totalPhysical: 8192,
  usedSwap: 256,
  totalSwap: 2048,
  processCpu: 18,
  systemCpu: 35,
  cpuUsage: 35,
}

export const mockDictionaries: Record<string, Array<{ display: string; value: string }>> = {
  order_status: [
    { display: '待支付', value: '1' },
    { display: '已支付', value: '2' },
    { display: '已完成', value: '3' },
    { display: '已取消', value: '4' },
  ],
  category_kind_type: [
    { display: '生鲜', value: '1' },
    { display: '果蔬', value: '2' },
    { display: '粮油', value: '3' },
  ],
  commodity_category_type: [
    { display: '普通生鲜', value: '11' },
    { display: '特价生鲜', value: '12' },
    { display: '普通果蔬', value: '21' },
    { display: '特价果蔬', value: '22' },
  ],
  commodity_category_type_p: [
    { display: '生鲜', value: '1' },
    { display: '果蔬', value: '2' },
  ],
  home_section_type: [
    { display: '首页推荐', value: '0' },
    { display: '热卖', value: '1' },
    { display: '新品', value: '2' },
  ],
  merchant_commodity_category_type: [
    { display: '食材', value: '1' },
    { display: '调料', value: '2' },
    { display: '饮品', value: '3' },
  ],
  merchant_home_section_type: [
    { display: '店铺推荐', value: '0' },
    { display: '热卖', value: '1' },
    { display: '活动', value: '2' },
  ],
  yes_no: [
    { display: '是', value: '1' },
    { display: '否', value: '0' },
  ],
  yesno: [
    { display: '是', value: '1' },
    { display: '否', value: '0' },
  ],
  organization_type: [
    { display: '总部', value: '1' },
    { display: '分公司', value: '2' },
    { display: '部门', value: '3' },
  ],
  sex: [
    { display: '男', value: '1' },
    { display: '女', value: '2' },
  ],
  authority_type: [
    { display: '系统', value: '1' },
    { display: '模块', value: '2' },
    { display: '页面', value: '3' },
    { display: '按钮', value: '4' },
  ],
  advertise_type: [
    { display: '首页轮播', value: '1' },
    { display: '活动推广', value: '2' },
    { display: '弹窗广告', value: '3' },
  ],
  fare_type: [
    { display: '固定运费', value: '1' },
    { display: '按重量', value: '2' },
    { display: '按距离', value: '3' },
  ],
  user_type: [
    { display: '普通用户', value: '1' },
    { display: '商户用户', value: '2' },
    { display: 'VIP用户', value: '3' },
  ],
  employee_checkin: [
    { display: '正常', value: '1' },
    { display: '迟到', value: '2' },
    { display: '早退', value: '3' },
    { display: '缺勤', value: '4' },
  ],
  deposit_state: [
    { display: '有效', value: '0' },
    { display: '待确认', value: '1' },
    { display: '已入账', value: '2' },
    { display: '已驳回', value: '3' },
  ],
  deposit_type: [
    { display: '三菱UFJ', value: '0' },
    { display: 'みずほ', value: '1' },
    { display: '三井住友', value: '2' },
  ],
  requisition_state: [
    { display: '有效', value: '0' },
    { display: '废弃', value: '1' },
    { display: '已通过', value: '2' },
    { display: '已拒绝', value: '3' },
  ],
  requisition_type: [
    { display: '納品書', value: '0' },
    { display: '請求書', value: '1' },
  ],
  refunder_state: [
    { display: '待处理', value: '1' },
    { display: '处理中', value: '2' },
    { display: '已关闭', value: '3' },
    { display: '部分退款', value: '4' },
  ],
  refunder_category: [
    { display: '商品退款', value: '0' },
    { display: '运费退款', value: '1' },
  ],
  merchant_user_state_type: [
    { display: '正常', value: '1' },
    { display: '停用', value: '0' },
  ],
  social_type: [
    { display: '微信', value: '0' },
    { display: 'LINE', value: '1' },
    { display: '其它', value: '2' },
  ],
  pay_type: [
    { display: 'PAYPAY', value: '0' },
    { display: '月払い', value: '1' },
    { display: '现金', value: '4' },
  ],
  logistics_type: [
    { display: '自提', value: '0' },
    { display: '配送', value: '1' },
  ],
  take_time_type: [
    { display: '上午', value: '1' },
    { display: '下午', value: '2' },
    { display: '晚上', value: '3' },
  ],
  access_resources_type: [
    { display: 'URI', value: 'uri' },
  ],
  oauth2_authority: [
    { display: '读', value: 'READ' },
    { display: '写', value: 'WRITE' },
    { display: '执行', value: 'EXECUTE' },
    { display: '删除', value: 'DELETE' },
  ],
  oauth2_grant_type: [
    { display: '密码模式', value: 'password' },
    { display: '授权码模式', value: 'authorization_code' },
    { display: '刷新令牌', value: 'refresh_token' },
    { display: '客户端模式', value: 'client_credentials' },
    { display: '简化模式', value: 'implicit' },
  ],
  oauth2_authority_level: [
    { display: '角色', value: 'ROLE' },
    { display: '公开', value: 'PUBLIC' },
  ],
  request_type: [
    { display: 'GET', value: 'GET' },
    { display: 'POST', value: 'POST' },
    { display: 'PUT', value: 'PUT' },
    { display: 'DELETE', value: 'DELETE' },
  ],
}

export const mockDashboardOverview = {
  summary: {
    orderCount: 1286,
    salesAmount: 98560,
    merchantCount: 48,
    productCount: 326,
  },
  trend: [
    { date: '2026-07-01', orderCount: 120, salesAmount: 8600 },
    { date: '2026-07-02', orderCount: 156, salesAmount: 11200 },
    { date: '2026-07-03', orderCount: 142, salesAmount: 9800 },
    { date: '2026-07-04', orderCount: 188, salesAmount: 14300 },
    { date: '2026-07-05', orderCount: 165, salesAmount: 12100 },
    { date: '2026-07-06', orderCount: 201, salesAmount: 15800 },
    { date: '2026-07-07', orderCount: 214, salesAmount: 16760 },
  ],
}

export const mockProductRanking = [
  { id: 1, name: '有机西红柿', orderCount: 230, salesAmount: 2944 },
  { id: 2, name: '草鸡蛋 10枚', orderCount: 188, salesAmount: 3553 },
  { id: 3, name: '东北大米 5kg', orderCount: 96, salesAmount: 3830 },
  { id: 4, name: '商户牛奶', orderCount: 82, salesAmount: 1549 },
  { id: 5, name: '商户橙子', orderCount: 74, salesAmount: 1665 },
]

export const mockMerchantRanking = [
  { id: 1, name: '友山生鲜店', orderCount: 320, salesAmount: 28600 },
  { id: 2, name: '华东优选', orderCount: 210, salesAmount: 19800 },
  { id: 3, name: '每日鲜送', orderCount: 186, salesAmount: 15200 },
  { id: 4, name: '绿色农场', orderCount: 142, salesAmount: 12600 },
  { id: 5, name: '社区团购站', orderCount: 118, salesAmount: 9800 },
]

export interface ListMockConfig {
  data: unknown[]
  searchKeys?: string[]
}

export const listMockRegistry: Record<string, ListMockConfig> = {
  role: { data: mockRoleList, searchKeys: ['roleName'] },
  sysuser: { data: mockSysUserList, searchKeys: ['username', 'realName'] },
  organization: { data: mockOrganizationList, searchKeys: ['orgName'] },
  authority: { data: mockAuthorityList, searchKeys: ['authName'] },
  dictionary: { data: mockDictionaryManageList, searchKeys: ['groupId', 'display'] },
  yscategory: { data: mockInventoryCategoryList, searchKeys: ['title'] },
  commodity: { data: mockInventoryCommodityList, searchKeys: ['title'] },
  order: { data: mockInventoryOrderList, searchKeys: ['name', 'uname', 'id'] },
  advertise: { data: mockInventoryAdvertiseList, searchKeys: ['title'] },
  youshanuser: { data: mockInventoryUserList, searchKeys: ['username', 'uname', 'unick', 'phone'] },
  merchantorder: { data: mockMerchantOrderList, searchKeys: ['name', 'unick', 'ucode', 'id'] },
  merchantcommodity: { data: mockMerchantCommodityList, searchKeys: ['title', 'code'] },
  merchantcommoditydis: { data: mockMerchantCommodityDisList, searchKeys: ['uname', 'unick', 'ctitle'] },
  merchantyoushanuser: {
    data: mockMerchantUserList,
    searchKeys: ['username', 'uname', 'unick', 'phone', 'level'],
  },
  requisition: { data: mockRequisitionList, searchKeys: ['id', 'unick', 'username', 'name'] },
  refunder: { data: mockRefunderList, searchKeys: ['uname', 'oid', 'name'] },
  deposit: { data: mockDepositList, searchKeys: ['sender', 'unick', 'username', 'name'] },
  cashmanagement: { data: mockCashManagementList, searchKeys: ['id', 'staff', 'content'] },
  cashlist: { data: mockCashListData, searchKeys: ['amount'] },
  cashtakerecord: { data: mockCashTakeRecordList, searchKeys: ['content'] },
  cashlist_legacy: { data: mockCashRecordList, searchKeys: ['userName'] },
  tagTemplate: { data: mockTagTemplateList, searchKeys: ['name'] },
  tagLabel: { data: mockTagLabelList, searchKeys: ['name'] },
  rawFood: { data: mockRawFoodList, searchKeys: ['name'] },
  goodsQuantity: { data: mockGoodsQuantityList, searchKeys: ['goodsName'] },
  payment: { data: mockPaymentList, searchKeys: ['title'] },
  fare: { data: mockFareList, searchKeys: ['title'] },
  employee: { data: mockEmployeeList, searchKeys: ['name', 'department'] },
  attendanceRecord: { data: mockAttendanceRecordList, searchKeys: ['employeeName'] },
  access: { data: mockAccessList, searchKeys: ['resourceName', 'resource'] },
  accessLog: { data: mockAccessLogList, searchKeys: ['username', 'resource', 'uri', 'cuname'] },
  client: { data: mockClientList, searchKeys: ['clientId', 'clientName'] },
  module: { data: mockModuleList, searchKeys: ['moduleName', 'moduleCode'] },
  firewall: { data: mockFirewallList, searchKeys: ['ruleName', 'ip'] },
  staticResource: { data: mockStaticResourceList, searchKeys: ['fileName', 'name'] },
  processDefinitionModel: { data: mockProcessDefinitionList, searchKeys: ['name', 'key'] },
  processDeployment: { data: mockProcessDefinitionList, searchKeys: ['name', 'key'] },
  formDefinitionModel: { data: mockProcessDefinitionList, searchKeys: ['name', 'key'] },
  formDeployment: { data: mockProcessDefinitionList, searchKeys: ['name', 'key'] },
}

export function paginate<T>(list: T[], page: number, rows: number) {
  const start = (page - 1) * rows
  return { data: list.slice(start, start + rows), total: list.length }
}

export function filterList(
  list: unknown[],
  condition: Record<string, unknown>,
  searchKeys?: string[],
) {
  const entries = Object.entries(condition).filter(([, value]) => value !== undefined && value !== '')
  if (!entries.length) {
    return list
  }

  return list.filter((item) => {
    const row = item as Record<string, unknown>
    return entries.every(([key, value]) => {
      if (Array.isArray(value)) {
        if (!value.length) {
          return true
        }
        const statusField = key === 'statusList' ? row.status : row[key]
        return value.map(Number).includes(Number(statusField))
      }

      if (key === 'startDate' && row.updatedAt) {
        return String(row.updatedAt).slice(0, 10) >= String(value)
      }
      if (key === 'endDate' && row.updatedAt) {
        return String(row.updatedAt).slice(0, 10) <= String(value)
      }

      const fieldValue = row[key]
      if (fieldValue === undefined && key === 'id') {
        return String(row.id ?? '').includes(String(value))
      }
      if (fieldValue === undefined && searchKeys?.length) {
        return searchKeys.some((searchKey) =>
          String(row[searchKey] ?? '')
            .toLowerCase()
            .includes(String(value).toLowerCase()),
        )
      }
      return String(fieldValue ?? '')
        .toLowerCase()
        .includes(String(value).toLowerCase())
    })
  })
}

export function toUserInfo(user: MockUser) {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    realName: user.realName,
    permissions: ['dashboard:view'],
  }
}

export { USER_STATUS }
