import {
  USER_LIST_SOURCE_LABELS,
  USER_STATUSES,
  type UserListItem,
  type UserListQuery,
  type UserListResult,
  type UserStatusCounts,
} from '../types/user'

/**
 * Development-only records for the user-list screen. They are used only when
 * VITE_USERS_USE_MOCK is explicitly set to "true" by services/users.ts.
 */
export const MOCK_USER_LIST_ITEMS: UserListItem[] = [
  {
    id: 101,
    realName: '张伟',
    username: 'zhangwei',
    phoneMasked: '138****6256',
    employeeNo: 'A2026001',
    organizationPathName: '华东集团 / 上海浦东门店 / 零售一组',
    positionName: '销售顾问',
    roles: [
      { id: 'sales-consultant', code: 'sales_consultant', name: '销售顾问' },
      { id: 'crm-user', code: 'crm_user', name: 'CRM 用户' },
    ],
    dataScopeSummary: '本人及所属线索',
    status: 'ACTIVE',
    lastLoginAt: '2026-07-12T08:40:00+08:00',
    createdAt: '2025-10-10T09:00:00+08:00',
  },
  {
    id: 102,
    realName: '李娜',
    username: 'lina',
    phoneMasked: '139****1823',
    employeeNo: 'A2026002',
    organizationPathName: '华东集团 / 上海浦东门店 / 零售二组',
    positionName: '销售主管',
    roles: [
      { id: 'sales-manager', code: 'sales_manager', name: '销售经理' },
      { id: 'report-user', code: 'report_user', name: '报表用户' },
      { id: 'crm-user', code: 'crm_user', name: 'CRM 用户' },
    ],
    dataScopeSummary: '所属团队',
    status: 'ACTIVE',
    lastLoginAt: '2026-07-11T17:25:00+08:00',
    createdAt: '2025-08-21T09:00:00+08:00',
  },
  {
    id: 103,
    realName: '王海',
    username: 'wanghai',
    phoneMasked: '137****3198',
    employeeNo: 'A2026016',
    organizationPathName: '华东集团 / 上海浦东门店 / 金融保险组',
    positionName: '金融专员',
    roles: [{ id: 'finance-insurance', code: 'finance_insurance', name: '金融保险' }],
    dataScopeSummary: '本人数据',
    status: 'PENDING_ACTIVATION',
    createdAt: '2026-07-10T11:20:00+08:00',
  },
  {
    id: 104,
    realName: '陈晨',
    username: 'chenchen',
    phoneMasked: '136****4478',
    employeeNo: 'A2026008',
    organizationPathName: '华东集团 / 杭州西湖门店 / 零售一组',
    positionName: '销售顾问',
    roles: [{ id: 'sales-consultant', code: 'sales_consultant', name: '销售顾问' }],
    dataScopeSummary: '本人及所属线索',
    status: 'LOCKED',
    lastLoginAt: '2026-06-30T21:03:00+08:00',
    createdAt: '2025-12-05T09:00:00+08:00',
  },
  {
    id: 105,
    realName: '刘敏',
    username: 'liumin',
    phoneMasked: '135****6082',
    employeeNo: 'A2025015',
    organizationPathName: '华东集团 / 杭州西湖门店 / 市场运营组',
    positionName: '运营专员',
    roles: [{ id: 'operations', code: 'operations', name: '运营' }],
    dataScopeSummary: '门店数据',
    status: 'DISABLED',
    lastLoginAt: '2026-05-18T14:32:00+08:00',
    createdAt: '2025-04-12T09:00:00+08:00',
  },
  {
    id: 106,
    realName: '赵磊',
    username: 'zhaolei',
    phoneMasked: '186****2251',
    employeeNo: 'A2026006',
    organizationPathName: '华东集团 / 上海浦东门店 / 零售一组',
    positionName: '销售顾问',
    roles: [{ id: 'sales-consultant', code: 'sales_consultant', name: '销售顾问' }],
    dataScopeSummary: '本人及所属线索',
    status: 'ACTIVE',
    lastLoginAt: '2026-07-12T09:18:00+08:00',
    createdAt: '2025-11-03T09:00:00+08:00',
  },
  {
    id: 107,
    realName: '孙悦',
    username: 'sunyue',
    phoneMasked: '188****7130',
    employeeNo: 'A2024029',
    organizationPathName: '华东集团 / 南京建邺门店 / 管理组',
    positionName: '门店经理',
    roles: [{ id: 'store-manager', code: 'store_manager', name: '门店经理' }],
    dataScopeSummary: '本门店全部数据',
    status: 'ACTIVE',
    lastLoginAt: '2026-07-11T19:05:00+08:00',
    createdAt: '2024-09-01T09:00:00+08:00',
  },
  {
    id: 108,
    realName: '周倩',
    username: 'zhouqian',
    phoneMasked: '159****8364',
    employeeNo: 'A2023012',
    organizationPathName: '华东集团 / 上海浦东门店 / 客服组',
    positionName: '客户运营',
    roles: [{ id: 'customer-operations', code: 'customer_operations', name: '客户运营' }],
    dataScopeSummary: '本门店客户数据',
    status: 'RESIGNED',
    lastLoginAt: '2026-04-30T18:10:00+08:00',
    createdAt: '2023-06-15T09:00:00+08:00',
  },
  {
    id: 109,
    realName: '吴迪',
    username: 'wudi',
    phoneMasked: '133****5021',
    employeeNo: 'A2026009',
    organizationPathName: '华东集团 / 南京建邺门店 / 零售二组',
    positionName: '销售顾问',
    roles: [{ id: 'sales-consultant', code: 'sales_consultant', name: '销售顾问' }],
    dataScopeSummary: '本人及所属线索',
    status: 'EXPIRED',
    lastLoginAt: '2026-06-01T10:15:00+08:00',
    createdAt: '2026-01-18T09:00:00+08:00',
  },
  {
    id: 110,
    realName: '徐静',
    username: 'xujing',
    phoneMasked: '130****4390',
    employeeNo: 'A2026010',
    organizationPathName: '华东集团 / 杭州西湖门店 / 零售二组',
    positionName: '销售顾问',
    roles: [{ id: 'sales-consultant', code: 'sales_consultant', name: '销售顾问' }],
    dataScopeSummary: '本人及所属线索',
    status: 'PENDING_ACTIVATION',
    createdAt: '2026-07-08T16:40:00+08:00',
  },
  {
    id: 111,
    realName: '高翔',
    username: 'gaoxiang',
    phoneMasked: '156****9706',
    employeeNo: 'A2024018',
    organizationPathName: '华东集团 / 南京建邺门店 / 市场运营组',
    positionName: '市场经理',
    roles: [{ id: 'marketing-manager', code: 'marketing_manager', name: '市场经理' }],
    dataScopeSummary: '本门店数据',
    status: 'DISABLED',
    lastLoginAt: '2026-05-24T11:40:00+08:00',
    createdAt: '2024-04-18T09:00:00+08:00',
  },
  {
    id: 112,
    realName: '宋佳',
    username: 'songjia',
    phoneMasked: '131****6625',
    employeeNo: 'A2026012',
    organizationPathName: '华东集团 / 上海浦东门店 / 零售二组',
    positionName: '销售顾问',
    roles: [{ id: 'sales-consultant', code: 'sales_consultant', name: '销售顾问' }],
    dataScopeSummary: '本人及所属线索',
    status: 'LOCKED',
    lastLoginAt: '2026-07-03T15:02:00+08:00',
    createdAt: '2026-02-12T09:00:00+08:00',
  },
]

function normalizePage(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 1
}

function normalizePageSize(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 20
}

function normalizeSearchValue(value: string | undefined) {
  return value?.trim().toLocaleLowerCase('zh-CN') || ''
}

function matchesKeyword(item: UserListItem, keyword: string) {
  if (!keyword) return true

  const searchableValues = [item.realName, item.username, item.phoneMasked, item.employeeNo]
  return searchableValues.some((value) => value?.toLocaleLowerCase('zh-CN').includes(keyword) ?? false)
}

function getStatusCounts(items: UserListItem[]): UserStatusCounts {
  return USER_STATUSES.reduce<UserStatusCounts>((counts, status) => {
    counts[status] = items.reduce((total, item) => total + Number(item.status === status), 0)
    return counts
  }, {})
}

/**
 * Development-only list implementation. Use keyword `__mock_error__` to
 * exercise the request-failure state, or any unmatched keyword (including
 * `__mock_empty__`) to exercise an empty result state.
 */
export async function listMockUsers(query: UserListQuery = {}): Promise<UserListResult> {
  const keyword = normalizeSearchValue(query.keyword)

  if (keyword === '__mock_error__') {
    throw new Error('Mock 用户列表请求失败（仅用于验证失败状态）')
  }

  const keywordMatchedItems = MOCK_USER_LIST_ITEMS.filter((item) => matchesKeyword(item, keyword))
  const filteredItems = query.status
    ? keywordMatchedItems.filter((item) => item.status === query.status)
    : keywordMatchedItems
  const page = normalizePage(query.page)
  const pageSize = normalizePageSize(query.pageSize)
  const start = (page - 1) * pageSize

  return {
    total: filteredItems.length,
    page,
    pageSize,
    items: filteredItems.slice(start, start + pageSize),
    statusCounts: getStatusCounts(keywordMatchedItems),
    source: 'mock',
    sourceLabel: USER_LIST_SOURCE_LABELS.mock,
  }
}
