import { listMockUsers } from '../mocks/users'
import {
  USER_LIST_SOURCE_LABELS,
  USER_STATUSES,
  type UserListItem,
  type UserListQuery,
  type UserListResult,
  type UserStatusCounts,
} from '../types/user'
import { requestJson } from './api'

/**
 * This endpoint is not present in the checked-in backend yet. It is kept as
 * the default path so production does not silently fall back to demo data.
 */
export const USER_LIST_API_PATH = '/api/accounts/users/list/'

/** Mock mode is opt-in; unset or any value other than the string "true" uses the real endpoint. */
export const USERS_MOCK_ENABLED = import.meta.env.VITE_USERS_USE_MOCK === 'true'

export class UserListResponseShapeError extends Error {
  override name = 'UserListResponseShapeError'
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

function readString(record: UnknownRecord | undefined, key: string) {
  const value = record?.[key]
  return typeof value === 'string' && value.trim() ? value : undefined
}

function readNumber(record: UnknownRecord | undefined, key: string) {
  const value = record?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readArray(record: UnknownRecord, key: string) {
  const value = record[key]
  return isUnknownArray(value) ? value : undefined
}

function maskPhone(phone: string | undefined) {
  if (!phone) return undefined

  const compactPhone = phone.replace(/\s/g, '')
  return compactPhone.length >= 7
    ? `${compactPhone.slice(0, 3)}****${compactPhone.slice(-4)}`
    : phone
}

function getDisplayName(record: UnknownRecord) {
  const displayName = readString(record, 'display_name')
  if (displayName) return displayName

  const fullName = [readString(record, 'first_name'), readString(record, 'last_name')]
    .filter((name): name is string => Boolean(name))
    .join(' ')
  return fullName || readString(record, 'username')
}

/**
 * Maps only fields currently documented by the existing CurrentUser session
 * serializer. User-list-specific fields are deliberately not guessed from an
 * undocumented response and therefore remain undefined for real API data.
 */
export function mapUserApiItemToUserListItem(value: unknown): UserListItem {
  if (!isRecord(value)) return {}

  const profile = isRecord(value.profile) ? value.profile : undefined
  const tenantName = readString(profile, 'tenant_name')
  const storeName = readString(profile, 'store_name')
  const role = readString(profile, 'role')
  const organizationPathName = [tenantName, storeName].filter((name): name is string => Boolean(name)).join(' / ')

  return {
    id: readNumber(value, 'id'),
    realName: getDisplayName(value),
    username: readString(value, 'username'),
    phoneMasked: maskPhone(readString(profile, 'phone')),
    employeeNo: undefined,
    avatarUrl: undefined,
    organizationPathName: organizationPathName || undefined,
    positionName: undefined,
    roles: role ? [{ code: role, name: role }] : undefined,
    dataScopeSummary: undefined,
    status: undefined,
    lastLoginAt: undefined,
    createdAt: undefined,
  }
}

function mapStatusCounts(value: unknown): UserStatusCounts | undefined {
  if (!isRecord(value)) return undefined

  const statusCounts = USER_STATUSES.reduce<UserStatusCounts>((counts, status) => {
    const count = readNumber(value, status)
    if (count !== undefined) counts[status] = count
    return counts
  }, {})

  return Object.keys(statusCounts).length ? statusCounts : undefined
}

function getSafePage(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 1
}

function getSafePageSize(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 20
}

/**
 * Converts a successful real-endpoint response into the front-end list
 * contract. It accepts the requested `{ total, page, pageSize, items }`
 * envelope, plus a plain array or DRF's `{ count, results }` envelope.
 */
export function mapUserListResponse(payload: unknown, query: UserListQuery = {}): UserListResult {
  const record = isRecord(payload) ? payload : undefined
  const rawItems = isUnknownArray(payload)
    ? payload
    : record
      ? readArray(record, 'items') ?? readArray(record, 'results')
      : undefined

  if (!rawItems) {
    throw new UserListResponseShapeError(
      '用户列表接口响应缺少 items；当前后端尚未实现已约定的用户列表响应。',
    )
  }

  const total = readNumber(record, 'total') ?? readNumber(record, 'count') ?? rawItems.length
  const page = readNumber(record, 'page') ?? getSafePage(query.page)
  const pageSize = readNumber(record, 'pageSize') ?? readNumber(record, 'page_size') ?? getSafePageSize(query.pageSize)
  const statusCounts = mapStatusCounts(record?.statusCounts ?? record?.status_counts)

  return {
    total,
    page,
    pageSize,
    items: rawItems.map(mapUserApiItemToUserListItem),
    statusCounts,
    source: 'api',
    sourceLabel: USER_LIST_SOURCE_LABELS.api,
  }
}

function appendQueryValue(params: URLSearchParams, key: string, value: string | number | undefined) {
  if (value === undefined || value === '') return
  params.set(key, String(value))
}

function buildUserListRequestPath(query: UserListQuery) {
  const params = new URLSearchParams()
  appendQueryValue(params, 'keyword', query.keyword?.trim())
  appendQueryValue(params, 'organizationId', query.organizationId)
  appendQueryValue(params, 'roleId', query.roleId)
  appendQueryValue(params, 'positionId', query.positionId)
  appendQueryValue(params, 'status', query.status)
  appendQueryValue(params, 'createdStart', query.createdStart)
  appendQueryValue(params, 'createdEnd', query.createdEnd)
  appendQueryValue(params, 'page', query.page)
  appendQueryValue(params, 'pageSize', query.pageSize)
  appendQueryValue(params, 'sortField', query.sortField)
  appendQueryValue(params, 'sortOrder', query.sortOrder)

  const queryString = params.toString()
  return queryString ? `${USER_LIST_API_PATH}?${queryString}` : USER_LIST_API_PATH
}

/**
 * Fetches real data by default. Mock data is used only after explicitly
 * enabling VITE_USERS_USE_MOCK=true; failures from the real endpoint propagate
 * to let the page show a truthful unavailable/error state.
 */
export async function listUsers(query: UserListQuery = {}): Promise<UserListResult> {
  if (USERS_MOCK_ENABLED) return listMockUsers(query)

  const payload = await requestJson<unknown>(buildUserListRequestPath(query))
  return mapUserListResponse(payload, query)
}
