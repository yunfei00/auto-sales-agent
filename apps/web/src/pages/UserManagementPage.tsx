import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Plus,
  RefreshCw,
  Search,
  UserRound,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import UserStatusTag from '../components/UserStatusTag'
import { listUsers, USERS_MOCK_ENABLED } from '../services/users'
import {
  USER_STATUS_LABELS,
  type UserListItem,
  type UserListQuery,
  type UserListResult,
  type UserStatus,
} from '../types/user'
import './UserManagementPage.css'

type RequestState = 'loading' | 'ready' | 'error'

type FilterDraft = {
  keyword: string
  status?: UserStatus
}

const DEFAULT_QUERY: Required<Pick<UserListQuery, 'page' | 'pageSize'>> = {
  page: 1,
  pageSize: 20,
}

const USER_STAT_CARDS: Array<{ label: string; status?: UserStatus }> = [
  { label: '用户总数' },
  { label: '正常用户', status: 'ACTIVE' },
  { label: '待激活', status: 'PENDING_ACTIVATION' },
  { label: '已停用', status: 'DISABLED' },
  { label: '已锁定', status: 'LOCKED' },
]

function formatDateTime(value?: string) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return '—'

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function userInitial(user: UserListItem) {
  const name = user.realName || user.username
  return name ? name.slice(0, 1).toUpperCase() : '—'
}

function UserAvatar({ user }: { user: UserListItem }) {
  if (user.avatarUrl) {
    return <img className="user-list-avatar" src={user.avatarUrl} alt="" />
  }

  return <span className="user-list-avatar user-list-avatar--fallback">{userInitial(user)}</span>
}

function UserRoles({ user }: { user: UserListItem }) {
  const roles = user.roles || []

  if (!roles.length) return <span className="user-list-empty-value">—</span>

  return (
    <div className="user-list-roles">
      {roles.slice(0, 2).map((role, index) => (
        <span className="user-list-role" key={role.id || role.code || `${role.name}-${index}`}>
          {role.name}
        </span>
      ))}
      {roles.length > 2 && <span className="user-list-role user-list-role--more">+{roles.length - 2}</span>}
    </div>
  )
}

export default function UserManagementPage() {
  const [query, setQuery] = useState<UserListQuery>(DEFAULT_QUERY)
  const [draft, setDraft] = useState<FilterDraft>({ keyword: '' })
  const [result, setResult] = useState<UserListResult | null>(null)
  const [requestState, setRequestState] = useState<RequestState>('loading')
  const [loadError, setLoadError] = useState('')
  const [reloadVersion, setReloadVersion] = useState(0)
  const [isFilterExpanded, setIsFilterExpanded] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let disposed = false

    async function load() {
      setRequestState('loading')
      setLoadError('')

      try {
        const nextResult = await listUsers(query)
        if (disposed) return
        setResult(nextResult)
        setRequestState('ready')
      } catch (error) {
        if (disposed) return
        setRequestState('error')
        setLoadError(error instanceof Error ? error.message : '用户列表加载失败，请稍后重试。')
      }
    }

    void load()
    return () => {
      disposed = true
    }
  }, [query, reloadVersion])

  const mockMode = USERS_MOCK_ENABLED
  const page = result?.page || query.page || 1
  const pageSize = result?.pageSize || query.pageSize || DEFAULT_QUERY.pageSize
  const total = result?.total
  const totalPages = total === undefined ? 1 : Math.max(1, Math.ceil(total / pageSize))
  const isInitialLoad = requestState === 'loading' && result === null
  const isRefreshing = requestState === 'loading' && result !== null

  const activeFilters = useMemo(() => {
    const filters: Array<{ id: string; label: string; onClear: () => void }> = []
    if (query.keyword) {
      filters.push({
        id: 'keyword',
        label: `关键词：${query.keyword}`,
        onClear: () => {
          setDraft((current) => ({ ...current, keyword: '' }))
          setQuery((current) => ({ ...current, keyword: undefined, page: 1 }))
        },
      })
    }
    if (query.status) {
      filters.push({
        id: 'status',
        label: `状态：${USER_STATUS_LABELS[query.status]}`,
        onClear: () => {
          setDraft((current) => ({ ...current, status: undefined }))
          setQuery((current) => ({ ...current, status: undefined, page: 1 }))
        },
      })
    }
    return filters
  }, [query.keyword, query.status])

  function applyFilters() {
    if (!mockMode) {
      setReloadVersion((value) => value + 1)
      return
    }

    setQuery((current) => ({
      ...current,
      keyword: draft.keyword.trim() || undefined,
      status: draft.status,
      page: 1,
    }))
  }

  function resetFilters() {
    setDraft({ keyword: '' })
    setQuery(DEFAULT_QUERY)
    setReloadVersion((value) => value + 1)
  }

  function toggleStatusFilter(status: UserStatus) {
    if (!mockMode) return

    const nextStatus = query.status === status ? undefined : status
    setDraft((current) => ({ ...current, status: nextStatus }))
    setQuery((current) => ({ ...current, status: nextStatus, page: 1 }))
  }

  function showNotConnectedNotice(feature: string) {
    setNotice(`${feature}后端接口尚未接入。`)
  }

  function changePage(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return
    setQuery((current) => ({ ...current, page: nextPage }))
  }

  return (
    <section className="sales-video-page user-management-page" aria-busy={requestState === 'loading'}>
      <div className="video-page-heading user-page-heading">
        <div>
          <div className="page-kicker">系统管理</div>
          <h2>用户管理</h2>
          <p>管理集团、门店及团队成员的账号、组织关系和系统权限</p>
        </div>
        <div className="user-page-actions">
          <button className="ghost-action" type="button" onClick={() => showNotConnectedNotice('批量导入')}>
            <FileUp size={16} />
            批量导入
          </button>
          <button className="primary-action" type="button" onClick={() => showNotConnectedNotice('新建用户')}>
            <Plus size={16} />
            新建用户
          </button>
        </div>
      </div>

      {notice && (
        <div className="user-page-notice" role="status">
          <span>{notice}</span>
          <button type="button" aria-label="关闭提示" onClick={() => setNotice('')}>
            <X size={15} />
          </button>
        </div>
      )}

      {result?.source === 'mock' && (
        <div className="user-page-mock-banner" role="status">
          <AlertCircle size={17} />
          <span>当前展示 {result.sourceLabel}；真实用户列表接口尚未接通，所有操作均不会写入后端。</span>
        </div>
      )}

      <section className="user-stat-grid" aria-label="用户统计">
        {USER_STAT_CARDS.map((card) => {
          const count = card.status ? result?.statusCounts?.[card.status] : total
          const isSelected = Boolean(card.status && query.status === card.status)
          const isClickable = Boolean(card.status && mockMode && result)

          return (
            <button
              className={`user-stat-card ${isSelected ? 'active' : ''}`}
              disabled={!isClickable || requestState === 'loading'}
              key={card.label}
              type="button"
              onClick={() => card.status && toggleStatusFilter(card.status)}
            >
              <span>{card.label}</span>
              <strong>{typeof count === 'number' ? count : '—'}</strong>
              {card.status && <small>{isSelected ? '再次点击取消筛选' : mockMode ? '点击筛选' : '接口暂未支持'}</small>}
            </button>
          )
        })}
      </section>

      <section className="user-filter-card" aria-label="用户筛选">
        <form
          className="user-filter-row"
          onSubmit={(event) => {
            event.preventDefault()
            applyFilters()
          }}
        >
          <label className="user-filter-field user-filter-field--keyword">
            <span>关键词</span>
            <div>
              <Search size={16} />
              <input
                disabled={!mockMode}
                placeholder={mockMode ? '姓名、手机号、工号或账号' : '接口暂未支持关键词筛选'}
                value={draft.keyword}
                onChange={(event) => setDraft((current) => ({ ...current, keyword: event.target.value }))}
              />
            </div>
          </label>
          <label className="user-filter-field">
            <span>用户状态</span>
            <select
              disabled={!mockMode}
              value={draft.status || ''}
              onChange={(event) => setDraft((current) => ({
                ...current,
                status: event.target.value ? (event.target.value as UserStatus) : undefined,
              }))}
            >
              <option value="">全部状态</option>
              {Object.entries(USER_STATUS_LABELS).map(([status, label]) => (
                <option key={status} value={status}>{label}</option>
              ))}
            </select>
          </label>
          <div className="user-filter-actions">
            <button className="primary-action" disabled={requestState === 'loading'} type="submit">
              {requestState === 'loading' ? <RefreshCw className="spin" size={16} /> : <Search size={16} />}
              查询
            </button>
            <button className="ghost-action" type="button" onClick={resetFilters}>重置</button>
            <button className="text-action" type="button" onClick={() => setIsFilterExpanded((value) => !value)}>
              {isFilterExpanded ? '收起筛选' : '展开筛选'}
            </button>
          </div>
        </form>

        {isFilterExpanded && (
          <div className="user-filter-row user-filter-row--expanded">
            <label className="user-filter-field">
              <span>所属组织</span>
              <select disabled title="接口暂未支持组织筛选">
                <option>接口暂未支持</option>
              </select>
            </label>
            <label className="user-filter-field">
              <span>角色</span>
              <select disabled title="接口暂未支持角色筛选">
                <option>接口暂未支持</option>
              </select>
            </label>
            <label className="user-filter-field">
              <span>创建时间</span>
              <input disabled title="接口暂未支持创建时间筛选" type="date" />
            </label>
          </div>
        )}

        {activeFilters.length > 0 && (
          <div className="user-active-filters" aria-label="当前筛选条件">
            <span>当前筛选：</span>
            {activeFilters.map((filter) => (
              <button key={filter.id} type="button" onClick={filter.onClear}>
                {filter.label}
                <X size={13} />
              </button>
            ))}
          </div>
        )}
      </section>

      {isInitialLoad && (
        <section className="user-list-state user-list-state--loading" aria-live="polite">
          <RefreshCw className="spin" size={24} />
          <strong>正在加载用户列表</strong>
          <span>正在请求用户管理数据，请稍候。</span>
        </section>
      )}

      {!isInitialLoad && requestState === 'error' && !result && (
        <section className="user-list-state user-list-state--error" role="alert">
          <AlertCircle size={26} />
          <strong>用户列表加载失败</strong>
          <span>{loadError || '用户列表接口尚未接入。'}</span>
          <button className="primary-action" type="button" onClick={() => setReloadVersion((value) => value + 1)}>
            <RefreshCw size={16} />
            重新加载
          </button>
        </section>
      )}

      {result && (
        <section className="user-list-card">
          {requestState === 'error' && (
            <div className="user-inline-error" role="alert">
              <AlertCircle size={16} />
              <span>{loadError || '刷新失败，正在展示上一次成功加载的数据。'}</span>
              <button type="button" onClick={() => setReloadVersion((value) => value + 1)}>重试</button>
            </div>
          )}
          <div className="user-list-card-header">
            <div>
              <h3>用户列表</h3>
              <p>共 {total ?? '—'} 位用户{result.source === 'mock' ? ' · Mock 演示数据' : ''}</p>
            </div>
            {isRefreshing && <RefreshCw className="spin" size={18} aria-label="正在刷新" />}
          </div>

          {result.items.length === 0 ? (
            <div className="user-list-empty">
              <UserRound size={30} />
              <strong>{activeFilters.length ? '没有符合条件的用户' : '暂时没有用户数据'}</strong>
              <span>{activeFilters.length ? '请调整筛选条件后重试。' : '用户数据接入后将在这里展示。'}</span>
              {activeFilters.length > 0 && <button className="ghost-action" type="button" onClick={resetFilters}>清除筛选</button>}
            </div>
          ) : (
            <div className="user-table-scroll">
              <table className="user-list-table">
                <thead>
                  <tr>
                    <th scope="col">用户</th>
                    <th scope="col">用户名 / 工号</th>
                    <th scope="col">所属组织</th>
                    <th scope="col">角色</th>
                    <th scope="col">状态</th>
                    <th scope="col">最后登录</th>
                    <th className="user-list-actions-column" scope="col">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((user, index) => (
                    <tr key={user.id || user.username || index}>
                      <td>
                        <div className="user-list-person">
                          <UserAvatar user={user} />
                          <div>
                            <strong>{user.realName || '—'}</strong>
                            <span>{user.phoneMasked || '—'}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong>{user.username || user.employeeNo || '—'}</strong>
                        {user.employeeNo && user.username && <span className="user-list-muted">{user.employeeNo}</span>}
                      </td>
                      <td>{user.organizationPathName || '—'}</td>
                      <td><UserRoles user={user} /></td>
                      <td><UserStatusTag status={user.status} /></td>
                      <td>{formatDateTime(user.lastLoginAt)}</td>
                      <td className="user-list-actions-column">
                        <div className="user-row-actions">
                          <button type="button" onClick={() => setNotice('用户详情页面将在下一阶段实现。')}>查看</button>
                          <button type="button" onClick={() => setNotice('用户编辑页面将在下一阶段实现。')}>编辑</button>
                          <button type="button" onClick={() => showNotConnectedNotice('用户操作')}>更多</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <footer className="user-list-pagination">
            <span>第 {page} / {totalPages} 页</span>
            <div>
              <button disabled={requestState === 'loading' || page <= 1} type="button" onClick={() => changePage(page - 1)}>
                <ChevronLeft size={16} />
                上一页
              </button>
              <button disabled={requestState === 'loading' || page >= totalPages} type="button" onClick={() => changePage(page + 1)}>
                下一页
                <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        </section>
      )}
    </section>
  )
}
