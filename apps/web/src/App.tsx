import {
  BadgeDollarSign,
  CalendarClock,
  CarFront,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Gauge,
  LogOut,
  MessageSquareText,
  PhoneCall,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'
import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import './App.css'
import showroomImg from './assets/showroom.svg'
import {
  type CurrentUser,
  type Customer,
  type CustomerTask,
  type DashboardSummary,
  type FollowupScriptResult,
  type Interaction,
  type Lead,
  type Quote,
  type QuoteSuggestionResult,
  type TestDrive,
  type VehicleCard,
  type VehicleRecommendationResult,
  completeCustomerTask,
  createCustomerTask,
  createInteraction,
  createQuoteFromSuggestion,
  createTestDrive,
  emptyFollowup,
  emptyRecommendation,
  getCustomer,
  getDashboardSummary,
  getSession,
  listCustomerInteractions,
  listCustomerQuotes,
  listCustomerTasks,
  listCustomerTestDrives,
  listCustomers,
  listLeads,
  login,
  logout,
  requestFollowupScript,
  requestQuoteSuggestion,
  requestVehicleRecommendations,
  searchCustomers,
} from './services/api'

type LoadState = 'checking' | 'anonymous' | 'authenticated'
type ApiState = 'ready' | 'loading' | 'error'

function money(value?: string | null) {
  if (!value) return '-'
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return value
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0,
  }).format(parsed)
}

function dateTime(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const textLabels: Record<string, string> = {
  admin: '管理员',
  store_manager: '门店经理',
  sales_manager: '销售经理',
  sales_consultant: '销售顾问',
  finance_insurance: '金融保险',
  operations: '运营',
  user: '用户',
  new: '新线索',
  qualified: '已意向确认',
  duplicate: '重复线索',
  invalid: '无效线索',
  converted: '已转化',
  new_lead: '新客户',
  contacted: '已联系',
  invited: '已邀约',
  test_drive_booked: '已预约试驾',
  test_driven: '已试驾',
  quoted: '已报价',
  deposit_paid: '已付定金',
  contract_signed: '已签约',
  delivered: '已交付',
  lost: '已流失',
  open: '待处理',
  done: '已完成',
  cancelled: '已取消',
  draft: '草稿',
  booked: '已预约',
  arrived: '已到店',
  completed: '已完成',
  pending_approval: '待审批',
  approved: '已审批',
  sent: '已发送',
  accepted: '已接受',
  rejected: '已拒绝',
  available: '现车可售',
  reserved: '已预留',
  sold: '已售出',
  in_transit: '在途',
  test_drive: '试驾车',
  wechat: '微信',
  phone: '电话',
  store_visit: '到店',
  website: '网站',
  other: '其他',
  bev: '纯电',
  phev: '插混',
  hev: '混动',
  erev: '增程',
  ice: '燃油',
  'Demo Auto Group': '演示汽车集团',
  'Demo Customer': '演示客户',
  'Mia Chen': '陈米娅',
  'Leo Wang': '王立欧',
  'Ivy Liu': '刘艾薇',
  'Shanghai Main Store': '上海主门店',
  Shanghai: '上海',
  'Sales Demo': '演示销售',
  Website: '官网',
  Livestream: '直播',
  'Pearl White': '珍珠白',
  'Graphite Gray': '石墨灰',
  'Deep Blue': '深海蓝',
  'Mint Green': '薄荷绿',
  Black: '黑色',
  'Invite weekend test drive': '邀约周末试驾',
  '邀约周末试驾': '邀约周末试驾',
  '试驾前确认到店时间': '试驾前确认到店时间',
  '发送报价并确认订金意向': '发送报价并确认订金意向',
  '推进合同签署和交付准备': '推进合同签署和交付准备',
  'Qualify demand': '确认购车需求',
  'Follow up customer': '跟进客户',
  'family commute and weekend trips': '家庭通勤与周末出行',
  'within 2 weeks': '两周内',
  'this month': '本月',
  finance: '金融分期',
  price: '价格',
  range: '续航',
  delivery_time: '交付时间',
  high_intent: '高意向',
  family_use: '家庭用车',
  ev: '新能源',
  valid_lead: '有效线索',
  demo: '演示数据',
  'High-intent family buyer with EV SUV preference and price sensitivity.': '高意向家庭用户，偏好新能源 SUV，对价格和成交政策较敏感。',
  'Asked about EV SUV range, weekend test drive and finance plan.': '咨询新能源 SUV 续航、周末试驾和金融方案。',
  'Focus on range confidence and monthly payment.': '重点跟进续航信心和月供方案。',
  'Draft quote based on demo cash discount and finance intent.': '基于演示现金优惠和金融意向生成的报价草案。',
}

function labelText(value?: string | null) {
  if (!value) return '-'
  return textLabels[value] || textLabels[value.toLowerCase()] || value.replaceAll('_', ' ')
}

function localizeText(value?: string | null) {
  if (!value) return ''
  return textLabels[value] || value
}

function buildDemandMessage(customer: Customer | null, lead: Lead | null) {
  const demand = customer?.demand_profile
  const parts = [
    demand?.budget_min && demand?.budget_max ? `预算 ${demand.budget_min} 到 ${demand.budget_max}` : '',
    demand?.energy_type ? labelText(demand.energy_type) : '',
    demand?.body_type || '',
    demand?.usage_scenario ? localizeText(demand.usage_scenario) : '',
    lead?.intent_model ? `意向车型 ${lead.intent_model}` : '',
    lead?.purchase_timeline ? `购车周期 ${labelText(lead.purchase_timeline)}` : '',
  ].filter(Boolean)
  return parts.join('，') || '预算 200000 到 320000，新能源 SUV，家庭周末出行'
}

function App() {
  const [loadState, setLoadState] = useState<LoadState>('checking')
  const [apiState, setApiState] = useState<ApiState>('loading')
  const [statusText, setStatusText] = useState('正在检查登录状态')
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  const [leads, setLeads] = useState<Lead[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null)
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [tasks, setTasks] = useState<CustomerTask[]>([])
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [testDrives, setTestDrives] = useState<TestDrive[]>([])

  const [query, setQuery] = useState('')
  const [recommendation, setRecommendation] = useState<VehicleRecommendationResult>(emptyRecommendation)
  const [selectedCard, setSelectedCard] = useState<VehicleCard | null>(null)
  const [followup, setFollowup] = useState<FollowupScriptResult>(emptyFollowup)
  const [quoteDraft, setQuoteDraft] = useState<QuoteSuggestionResult | null>(null)

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) || null,
    [leads, selectedLeadId],
  )
  const openTasks = useMemo(() => tasks.filter((task) => task.status === 'open'), [tasks])
  const latestQuote = quotes[0] || null
  const nextTestDrive = testDrives[0] || null
  const selectedReasons = selectedCard?.reasons.slice(0, 3) || []

  useEffect(() => {
    void bootstrap()
  }, [])

  async function bootstrap() {
    setLoadState('checking')
    setApiState('loading')
    try {
      const session = await getSession()
      if (!session.authenticated || !session.user) {
        setLoadState('anonymous')
        setApiState('ready')
        setStatusText('请先登录')
        return
      }
      setUser(session.user)
      setLoadState('authenticated')
      await loadDesk()
    } catch {
      setLoadState('anonymous')
      setApiState('error')
      setStatusText('服务暂不可用')
    }
  }

  async function loadDesk() {
    setApiState('loading')
    setStatusText('正在加载销售流程')
    const [leadList, customerList, summary] = await Promise.all([listLeads(), listCustomers(), getDashboardSummary()])
    setLeads(leadList)
    setCustomers(customerList)
    setDashboardSummary(summary)
    const firstLead = leadList[0] || null
    const fallbackCustomer = customerList[0] || null
    await chooseLead(firstLead, fallbackCustomer)
    setApiState('ready')
    setStatusText('已连接后端服务')
  }

  async function resolveCustomer(lead: Lead | null, fallbackCustomer: Customer | null) {
    if (lead?.customer) {
      return getCustomer(lead.customer)
    }
    if (lead?.phone) {
      const matches = await searchCustomers(lead.phone)
      if (matches[0]) return matches[0]
    }
    return fallbackCustomer
  }

  async function loadCustomerAssets(customer: Customer | null) {
    if (!customer) {
      setTasks([])
      setInteractions([])
      setQuotes([])
      setTestDrives([])
      return
    }
    const [taskList, interactionList, quoteList, driveList] = await Promise.all([
      listCustomerTasks(customer.id),
      listCustomerInteractions(customer.id),
      listCustomerQuotes(customer.id),
      listCustomerTestDrives(customer.id),
    ])
    setTasks(taskList)
    setInteractions(interactionList)
    setQuotes(quoteList)
    setTestDrives(driveList)
  }

  async function refreshAi(customer: Customer | null, lead: Lead | null) {
    const demandMessage = buildDemandMessage(customer, lead)
    setQuery(demandMessage)
    try {
      const [recommendationResult, followupResult] = await Promise.all([
        requestVehicleRecommendations(demandMessage, customer?.id),
        requestFollowupScript(customer?.id, 'test_drive'),
      ])
      setRecommendation(recommendationResult)
      setFollowup(followupResult)
      const firstCard = recommendationResult.cards[0] || null
      setSelectedCard(firstCard)
      if (firstCard) {
        setQuoteDraft(await requestQuoteSuggestion(firstCard.inventory_id, customer?.id))
      } else {
        setQuoteDraft(null)
      }
    } catch {
      setRecommendation(emptyRecommendation)
      setSelectedCard(null)
      setFollowup(emptyFollowup)
      setQuoteDraft(null)
    }
  }

  async function chooseLead(lead: Lead | null, fallbackCustomer = customers[0] || null) {
    setApiState('loading')
    setSelectedLeadId(lead?.id || null)
    const customer = await resolveCustomer(lead, fallbackCustomer)
    setSelectedCustomer(customer)
    await loadCustomerAssets(customer)
    await refreshAi(customer, lead)
    setApiState('ready')
    setStatusText(customer ? `正在查看 ${labelText(customer.name)}` : '已选择线索')
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoginError('')
    setApiState('loading')
    try {
      const session = await login(username, password)
      setUser(session.user)
      setLoadState('authenticated')
      await loadDesk()
    } catch {
      setApiState('error')
      setLoginError('用户名或密码错误')
    }
  }

  async function handleLogout() {
    await logout()
    setUser(null)
    setPassword('')
    setLoadState('anonymous')
    setStatusText('已退出登录')
  }

  async function runRecommendation() {
    setApiState('loading')
    try {
      const result = await requestVehicleRecommendations(query, selectedCustomer?.id)
      const first = result.cards[0] || null
      setRecommendation(result)
      setSelectedCard(first)
      setQuoteDraft(first ? await requestQuoteSuggestion(first.inventory_id, selectedCustomer?.id) : null)
      setApiState('ready')
      setStatusText('推荐已刷新')
    } catch {
      setApiState('error')
      setStatusText('推荐生成失败')
    }
  }

  async function chooseVehicle(card: VehicleCard) {
    setSelectedCard(card)
    setQuoteDraft(await requestQuoteSuggestion(card.inventory_id, selectedCustomer?.id))
  }

  async function reloadCustomer(customerId: number) {
    const [customer, summary] = await Promise.all([getCustomer(customerId), getDashboardSummary()])
    setDashboardSummary(summary)
    setSelectedCustomer(customer)
    await loadCustomerAssets(customer)
    return customer
  }

  async function saveQuoteDraft() {
    if (!selectedCustomer || !quoteDraft) return
    setApiState('loading')
    try {
      const quote = await createQuoteFromSuggestion(selectedCustomer.id, quoteDraft)
      setQuotes((current) => [quote, ...current])
      await reloadCustomer(selectedCustomer.id)
      setApiState('ready')
      setStatusText('报价单已保存')
    } catch {
      setApiState('error')
      setStatusText('报价保存失败')
    }
  }

  async function bookTestDrive() {
    if (!selectedCustomer || !selectedCard) return
    setApiState('loading')
    try {
      const testDrive = await createTestDrive(selectedCustomer.id, selectedCard.inventory_id)
      setTestDrives((current) => [testDrive, ...current])
      await reloadCustomer(selectedCustomer.id)
      setApiState('ready')
      setStatusText(`已预约 ${dateTime(testDrive.scheduled_at)} 试驾`)
    } catch {
      setApiState('error')
      setStatusText('试驾预约失败')
    }
  }

  async function logPhoneCall() {
    if (!selectedCustomer) return
    setApiState('loading')
    try {
      const summary = `电话联系客户：${followup.script}`
      const interaction = await createInteraction(selectedCustomer.id, summary, 'phone')
      setInteractions((current) => [interaction, ...current])
      setApiState('ready')
      setStatusText('电话跟进已记录')
    } catch {
      setApiState('error')
      setStatusText('电话记录失败')
    }
  }

  async function addFollowupTask() {
    if (!selectedCustomer) return
    const task = await createCustomerTask(selectedCustomer.id, localizeText(selectedCustomer.next_action) || '跟进客户')
    setTasks((current) => [task, ...current])
    setStatusText('待办已创建')
  }

  async function markDone(task: CustomerTask) {
    const updated = await completeCustomerTask(task.id)
    setTasks((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    setStatusText('待办已完成')
  }

  async function logFollowup() {
    if (!selectedCustomer) return
    const interaction = await createInteraction(selectedCustomer.id, followup.script)
    setInteractions((current) => [interaction, ...current])
    setStatusText('跟进记录已保存')
  }

  const metrics = [
    {
      label: '今日线索',
      value: String(dashboardSummary?.leads.today ?? leads.length),
      trend: `${dashboardSummary?.leads.high_intent ?? leads.filter((lead) => lead.score >= 80).length} 条高意向`,
      tone: 'blue',
    },
    {
      label: '待办任务',
      value: String(dashboardSummary?.tasks.open ?? openTasks.length),
      trend: `${dashboardSummary?.tasks.overdue ?? 0} 条逾期`,
      tone: 'green',
    },
    {
      label: '试驾预约',
      value: String(dashboardSummary?.sales.test_drives_booked ?? testDrives.length),
      trend: `今日 ${dashboardSummary?.sales.test_drives_today ?? 0} 场`,
      tone: 'amber',
    },
    {
      label: '报价管道',
      value: String(dashboardSummary?.sales.quotes ?? quotes.length),
      trend: money(dashboardSummary?.sales.quote_pipeline || latestQuote?.landing_price),
      tone: 'slate',
    },
  ]

  if (loadState !== 'authenticated') {
    return (
      <main className="login-shell">
        <section className="login-visual">
          <img src={showroomImg} alt="" />
          <div>
            <div className="eyebrow">汽车销售智能体</div>
            <h1>汽车销售智能工作台</h1>
            <p>在线索、客户画像、AI 推荐、报价和跟进任务之间快速流转。</p>
          </div>
        </section>
        <form className="login-panel" onSubmit={(event) => void handleLogin(event)}>
          <div>
            <h2>登录</h2>
            <p>{loadState === 'checking' ? '正在检查登录状态...' : statusText}</p>
          </div>
          <label>
            用户名
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
          </label>
          <label>
            密码
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </label>
          {loginError && <div className="form-error">{loginError}</div>}
          <button type="submit" disabled={apiState === 'loading'}>
            {apiState === 'loading' ? <RefreshCw size={18} className="spin" /> : <Send size={18} />}
            登录
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">汽车销售智能体</div>
          <h1>汽车销售智能工作台</h1>
        </div>
        <div className="topbar-actions">
          <div className={`connection ${apiState}`}>
            <span />
            {statusText}
          </div>
          <div className="user-chip">
            <UserRound size={16} />
            <span>{user?.display_name}</span>
            <b>{labelText(user?.profile?.role || (user?.is_superuser ? 'admin' : 'user'))}</b>
          </div>
          <button className="icon-button" type="button" title="退出登录" onClick={() => void handleLogout()}>
            <LogOut size={17} />
          </button>
        </div>
      </header>

      <section className="metrics-grid" aria-label="销售指标">
        {metrics.map((metric) => (
          <article className={`metric metric-${metric.tone}`} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <em>{metric.trend}</em>
          </article>
        ))}
      </section>

      <section className="workflow-grid">
        <aside className="lead-queue">
          <div className="section-header compact">
            <div>
              <h2>线索队列</h2>
              <p>{leads.length} 条有效记录</p>
            </div>
            <button type="button" title="刷新" onClick={() => void loadDesk()}>
              <RefreshCw size={17} className={apiState === 'loading' ? 'spin' : ''} />
            </button>
          </div>
          <div className="lead-list">
            {leads.map((lead) => (
              <button
                type="button"
                className={`lead-row ${selectedLeadId === lead.id ? 'active' : ''}`}
                key={lead.id}
                onClick={() => void chooseLead(lead)}
              >
                <div>
                  <strong>{lead.name || lead.phone}</strong>
                  <span>{lead.intent_model || '待确认意向'}</span>
                </div>
                <div>
                  <em>{labelText(lead.status)}</em>
                  <b>{lead.score}</b>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="main-column">
          <section className="customer-panel">
            <div className="customer-hero">
              <div className="avatar">
                <UserRound size={24} />
              </div>
              <div>
                <h2>{labelText(selectedCustomer?.name || selectedLead?.name || '未选择客户')}</h2>
                <p>
                  {selectedCustomer?.phone || selectedLead?.phone || '-'} · {labelText(selectedCustomer?.city || selectedLead?.city || '-')}
                </p>
              </div>
              <div className="score-block">
                <span>成交概率</span>
                <strong>{selectedCustomer?.deal_probability ?? selectedLead?.score ?? 0}</strong>
              </div>
            </div>
            <div className="customer-fields">
              <div>
                <span>阶段</span>
                <strong>{labelText(selectedCustomer?.stage || selectedLead?.status)}</strong>
              </div>
              <div>
                <span>负责人</span>
                <strong>{labelText(selectedCustomer?.owner_name || selectedLead?.assigned_to_name || '-')}</strong>
              </div>
              <div>
                <span>门店</span>
                <strong>{labelText(selectedCustomer?.store_name || selectedLead?.store_name || '-')}</strong>
              </div>
              <div>
                <span>下一步</span>
                <strong>{localizeText(selectedCustomer?.next_action) || '确认购车需求'}</strong>
              </div>
            </div>
          </section>

          <section className="command-panel">
            <img className="showroom-asset" src={showroomImg} alt="" />
            <div className="command-copy">
              <Sparkles size={18} />
              <div>
                <h2>AI 需求助手</h2>
                <p>{recommendation.summary}</p>
              </div>
            </div>
            <form
              className="command-form"
              onSubmit={(event) => {
                event.preventDefault()
                void runRecommendation()
              }}
            >
              <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="客户需求" />
              <button type="submit" title="生成推荐" disabled={apiState === 'loading'}>
                {apiState === 'loading' ? <RefreshCw size={18} className="spin" /> : <Send size={18} />}
              </button>
            </form>
          </section>

          <section className="vehicle-section">
            <div className="section-header">
              <div>
                <h2>推荐车型</h2>
                <p>{localizeText(selectedCustomer?.demand_profile?.ai_summary) || '根据客户需求和现有库存实时排序。'}</p>
              </div>
              <button className="text-action" type="button" onClick={() => void runRecommendation()}>
                <RefreshCw size={16} />
                刷新
              </button>
            </div>
            <div className="vehicle-list">
              {recommendation.cards.map((card) => (
                <button
                  type="button"
                  className={`vehicle-card ${selectedCard?.inventory_id === card.inventory_id ? 'active' : ''}`}
                  key={card.vin}
                  onClick={() => void chooseVehicle(card)}
                >
                  <div className="vehicle-media" aria-hidden="true">
                    <CarFront size={34} />
                    <span>{labelText(card.exterior_color)}</span>
                  </div>
                  <div className="vehicle-body">
                    <div className="vehicle-title-row">
                      <h3>{card.title}</h3>
                      <strong>{card.match_score}</strong>
                    </div>
                    <div className="vehicle-meta">
                      <span>{money(card.price)}</span>
                      <span>{card.range_km ? `${card.range_km} km` : '续航待确认'}</span>
                      <span>{labelText(card.inventory_status)}</span>
                    </div>
                    <p>{card.reasons[0] || '当前库存中有匹配车型。'}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="detail-grid">
            <div className="detail-panel">
              <div className="section-header compact">
                <h2>匹配理由</h2>
                <Gauge size={18} />
              </div>
              <ul className="reason-list">
                {selectedReasons.map((reason) => (
                  <li key={reason}>
                    <CheckCircle2 size={16} />
                    {reason}
                  </li>
                ))}
              </ul>
              {selectedCard?.risks?.[0] && (
                <div className="risk-strip">
                  <ShieldCheck size={16} />
                  {selectedCard.risks[0]}
                </div>
              )}
            </div>

            <div className="detail-panel quote-panel">
              <div className="section-header compact">
                <h2>报价草案</h2>
                <button
                  type="button"
                  title="生成报价"
                  disabled={!selectedCard}
                  onClick={() => selectedCard && void chooseVehicle(selectedCard)}
                >
                  <BadgeDollarSign size={18} />
                </button>
              </div>
              <dl>
                <div>
                  <dt>落地价</dt>
                  <dd>{money(quoteDraft?.landing_price || latestQuote?.landing_price)}</dd>
                </div>
                <div>
                  <dt>优惠</dt>
                  <dd>{money(quoteDraft?.discount_amount || latestQuote?.discount_amount)}</dd>
                </div>
                <div>
                  <dt>首付</dt>
                  <dd>{money(quoteDraft?.finance_down_payment || latestQuote?.finance_down_payment)}</dd>
                </div>
                <div>
                  <dt>月供</dt>
                  <dd>{money(quoteDraft?.finance_monthly_payment || latestQuote?.finance_monthly_payment)}</dd>
                </div>
              </dl>
              <p>{localizeText(quoteDraft?.explanation || latestQuote?.ai_explanation) || '报价草案待生成。'}</p>
              <div className="quote-actions">
                <button type="button" disabled={!selectedCustomer || !quoteDraft} onClick={() => void saveQuoteDraft()}>
                  <BadgeDollarSign size={16} />
                  保存报价
                </button>
                <button type="button" disabled={!selectedCustomer || !selectedCard} onClick={() => void bookTestDrive()}>
                  <CalendarClock size={16} />
                  预约试驾
                </button>
              </div>
            </div>
          </section>
        </section>

        <aside className="side-column">
          <section className="script-panel">
            <div className="section-header compact">
              <h2>跟进话术</h2>
              <button type="button" title="记录跟进" disabled={!selectedCustomer} onClick={() => void logFollowup()}>
                <MessageSquareText size={18} />
              </button>
            </div>
            <p>{followup.script}</p>
            <ul>
              {followup.talking_points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <div className="profile-actions">
              <button type="button" title="拨打客户电话" disabled={!selectedCustomer} onClick={() => void logPhoneCall()}>
                <PhoneCall size={17} />
              </button>
              <button type="button" title="新增任务" disabled={!selectedCustomer} onClick={() => void addFollowupTask()}>
                <ClipboardList size={17} />
              </button>
              <button type="button" title="预约试驾" disabled={!selectedCustomer || !selectedCard} onClick={() => void bookTestDrive()}>
                <CalendarClock size={17} />
              </button>
            </div>
          </section>

          <section className="task-panel">
            <div className="section-header compact">
              <h2>待办任务</h2>
              <span>{openTasks.length}</span>
            </div>
            <div className="timeline-list">
              {tasks.slice(0, 5).map((task) => (
                <div className={`timeline-row ${task.status}`} key={task.id}>
                  <div>
                    <strong>{localizeText(task.title)}</strong>
                    <span>{dateTime(task.due_at)} · {labelText(task.status)}</span>
                  </div>
                  {task.status === 'open' && (
                    <button type="button" title="标记完成" onClick={() => void markDone(task)}>
                      <ClipboardCheck size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="task-panel">
            <div className="section-header compact">
              <h2>跟进记录</h2>
              <span>{interactions.length}</span>
            </div>
            <div className="timeline-list">
              {interactions.slice(0, 5).map((item) => (
                <div className="timeline-row" key={item.id}>
                  <div>
                    <strong>{labelText(item.channel)}</strong>
                    <span>{dateTime(item.occurred_at)}</span>
                    <p>{localizeText(item.summary)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="task-panel">
            <div className="section-header compact">
              <h2>销售状态</h2>
              <span>{nextTestDrive ? labelText(nextTestDrive.status) : '暂无试驾'}</span>
            </div>
            <div className="state-stack">
              <div>
                <span>下次试驾</span>
                <strong>{nextTestDrive ? dateTime(nextTestDrive.scheduled_at) : '-'}</strong>
              </div>
              <div>
                <span>最新报价</span>
                <strong>{latestQuote ? money(latestQuote.landing_price) : '-'}</strong>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </main>
  )
}

export default App
