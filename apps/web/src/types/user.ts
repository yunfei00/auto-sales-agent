/**
 * User-list contracts owned by the front end.
 *
 * The current backend session serializer does not yet expose every field in
 * this model. Fields that cannot be read from that serializer intentionally
 * remain optional until the user-list API contract is implemented server-side.
 */
export const USER_STATUSES = [
  'PENDING_ACTIVATION',
  'ACTIVE',
  'LOCKED',
  'DISABLED',
  'RESIGNED',
  'EXPIRED',
] as const

export type UserStatus = (typeof USER_STATUSES)[number]

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  PENDING_ACTIVATION: '待激活',
  ACTIVE: '正常',
  LOCKED: '已锁定',
  DISABLED: '已停用',
  RESIGNED: '已离职',
  EXPIRED: '已过期',
}

export type UserRole = {
  id?: string | number
  name: string
  code?: string
}

/**
 * Display model for a user-list row. Optional fields are deliberate: the
 * existing session endpoint only provides the subset described in api.ts.
 */
export type UserListItem = {
  id?: number
  realName?: string
  username?: string
  phoneMasked?: string
  employeeNo?: string
  avatarUrl?: string
  organizationPathName?: string
  positionName?: string
  roles?: UserRole[]
  dataScopeSummary?: string
  status?: UserStatus
  lastLoginAt?: string
  createdAt?: string
}

export type UserListSortOrder = 'asc' | 'desc'

export type UserListQuery = {
  keyword?: string
  organizationId?: string | number
  roleId?: string | number
  positionId?: string | number
  status?: UserStatus
  createdStart?: string
  createdEnd?: string
  page?: number
  pageSize?: number
  sortField?: string
  sortOrder?: UserListSortOrder
}

export type UserStatusCounts = Partial<Record<UserStatus, number>>

export type UserListDataSource = 'api' | 'mock'

export const USER_LIST_SOURCE_LABELS: Record<UserListDataSource, string> = {
  api: '真实接口数据',
  mock: 'Mock 数据（仅开发演示）',
}

export type UserListResult = {
  total: number
  page: number
  pageSize: number
  items: UserListItem[]
  statusCounts?: UserStatusCounts
  source: UserListDataSource
  /** A human-readable label for the data source; show this when source is mock. */
  sourceLabel: string
}
