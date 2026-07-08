import {
  BadgeDollarSign,
  BarChart3,
  Bot,
  BookOpen,
  CalendarClock,
  CarFront,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FolderOpen,
  Gauge,
  KeyRound,
  LayoutDashboard,
  LineChart,
  LogOut,
  MessageSquareText,
  PhoneCall,
  Plus,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Upload,
  UserRound,
  Zap,
  type LucideIcon,
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
  type LeadImportJob,
  type Order,
  type Quote,
  type QuoteSuggestionResult,
  type TestDrive,
  type VehicleCard,
  type VehicleInventory,
  type VehicleRecommendationResult,
  completeCustomerTask,
  createLead,
  createCustomerTask,
  createInteraction,
  createOrderFromQuote,
  createQuoteFromSuggestion,
  createTestDrive,
  emptyFollowup,
  emptyRecommendation,
  fetchLoginCaptcha,
  getCustomer,
  getDashboardSummary,
  getSession,
  importLeadCsv,
  listCustomerInteractions,
  listCustomerQuotes,
  listCustomerTasks,
  listCustomerTestDrives,
  listCustomers,
  listLeadImports,
  listInventory,
  listLeads,
  listOrders,
  listQuotes,
  listTestDrives,
  login,
  logout,
  requestFollowupScript,
  requestQuoteSuggestion,
  requestVehicleRecommendations,
  searchCustomers,
} from './services/api'

type LoadState = 'checking' | 'anonymous' | 'authenticated'
type ApiState = 'ready' | 'loading' | 'error'
type ActiveView =
  | 'desk'
  | 'projects'
  | 'ranking'
  | 'reports'
  | 'agents'
  | 'permissions'
  | 'settings'
  | 'token'
  | 'training'
  | 'trainingManage'
  | 'trainingStats'
  | 'myTraining'
  | 'trainingRecords'
  | 'askAi'
  | 'leads'
  | 'customers'
  | 'inventory'
  | 'sales'
  | 'dashboard'
  | 'legacyDesk'
type PilotCard = {
  id: ActiveView
  title: string
  description: string
  icon: LucideIcon
  accent: string
  badge: string
  stats: Array<{ value: string; label: string }>
  action: string
}
type PilotModule = {
  title: string
  description: string
  icon: LucideIcon
  cards: PilotCard[]
}

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

function cleanDisplayText(value?: string | null) {
  const text = (value || '').trim()
  if (!text || /^[?？]+$/.test(text)) return ''
  return text
}

function leadDisplayName(lead?: Lead | null) {
  if (!lead) return ''
  return cleanDisplayText(lead.name) || cleanDisplayText(lead.phone) || '\u672a\u547d\u540d\u7ebf\u7d22'
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
  const [captcha, setCaptcha] = useState('')
  const [captchaImage, setCaptchaImage] = useState('')
  const [loginError, setLoginError] = useState('')
  const [activeView, setActiveView] = useState<ActiveView>('desk')

  const [leads, setLeads] = useState<Lead[]>([])
  const [leadImports, setLeadImports] = useState<LeadImportJob[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null)
  const [inventory, setInventory] = useState<VehicleInventory[]>([])
  const [allQuotes, setAllQuotes] = useState<Quote[]>([])
  const [allTestDrives, setAllTestDrives] = useState<TestDrive[]>([])
  const [orders, setOrders] = useState<Order[]>([])
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
  const [manualLead, setManualLead] = useState({
    name: '',
    phone: '',
    city: '上海',
    intent_model: '',
    budget_min: '',
    budget_max: '',
    purchase_timeline: '本月',
    notes: '',
  })
  const [leadImportFile, setLeadImportFile] = useState<File | null>(null)

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

  async function refreshCaptcha() {
    try {
      const payload = await fetchLoginCaptcha()
      setCaptchaImage(payload.captcha_image)
      setCaptcha('')
    } catch {
      setCaptchaImage('')
    }
  }

  async function bootstrap() {
    setLoadState('checking')
    setApiState('loading')
    try {
      const session = await getSession()
      if (!session.authenticated || !session.user) {
        setLoadState('anonymous')
        setApiState('ready')
        setStatusText('请先登录')
        await refreshCaptcha()
        return
      }
      setUser(session.user)
      setLoadState('authenticated')
      await loadDesk()
    } catch {
      setLoadState('anonymous')
      setApiState('error')
      setStatusText('服务暂不可用')
      await refreshCaptcha()
    }
  }

  async function loadDesk() {
    setApiState('loading')
    setStatusText('正在加载销售流程')
    const [leadList, importList, customerList, summary, inventoryList, quoteList, driveList, orderList] = await Promise.all([
      listLeads(),
      listLeadImports(),
      listCustomers(),
      getDashboardSummary(),
      listInventory(),
      listQuotes(),
      listTestDrives(),
      listOrders(),
    ])
    setLeads(leadList)
    setLeadImports(importList)
    setCustomers(customerList)
    setDashboardSummary(summary)
    setInventory(inventoryList)
    setAllQuotes(quoteList)
    setAllTestDrives(driveList)
    setOrders(orderList)
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

  async function openCustomer(customer: Customer) {
    setActiveView('desk')
    setApiState('loading')
    setSelectedLeadId(null)
    setSelectedCustomer(customer)
    await loadCustomerAssets(customer)
    await refreshAi(customer, null)
    setApiState('ready')
    setStatusText(`正在查看 ${labelText(customer.name)}`)
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoginError('')
    setApiState('loading')
    try {
      const session = await login(username, password, captcha)
      setUser(session.user)
      setLoadState('authenticated')
      await loadDesk()
    } catch {
      setApiState('ready')
      setLoginError('用户名、密码或验证码错误')
      await refreshCaptcha()
    }
  }

  async function handleLogout() {
    await logout()
    setUser(null)
    setPassword('')
    setCaptcha('')
    setLoadState('anonymous')
    setStatusText('已退出登录')
    await refreshCaptcha()
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
    const [customer, summary, quoteList, driveList, orderList, customerList] = await Promise.all([
      getCustomer(customerId),
      getDashboardSummary(),
      listQuotes(),
      listTestDrives(),
      listOrders(),
      listCustomers(),
    ])
    setDashboardSummary(summary)
    setAllQuotes(quoteList)
    setAllTestDrives(driveList)
    setOrders(orderList)
    setCustomers(customerList)
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
      setAllQuotes((current) => [quote, ...current])
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
      setAllTestDrives((current) => [testDrive, ...current])
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

  async function submitManualLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!manualLead.phone.trim()) {
      setStatusText('请填写手机号')
      return
    }
    setApiState('loading')
    try {
      const lead = await createLead(manualLead)
      const [summary, importList] = await Promise.all([getDashboardSummary(), listLeadImports()])
      setLeads((current) => [lead, ...current.filter((item) => item.id !== lead.id)])
      setDashboardSummary(summary)
      setLeadImports(importList)
      setManualLead({
        name: '',
        phone: '',
        city: '上海',
        intent_model: '',
        budget_min: '',
        budget_max: '',
        purchase_timeline: '本月',
        notes: '',
      })
      setApiState('ready')
      setStatusText('手工线索已创建')
    } catch {
      setApiState('error')
      setStatusText('线索创建失败')
    }
  }

  async function uploadLeadImport() {
    if (!leadImportFile) {
      setStatusText('请选择 CSV 文件')
      return
    }
    setApiState('loading')
    try {
      const job = await importLeadCsv(leadImportFile)
      const [leadList, summary, importList] = await Promise.all([listLeads(), getDashboardSummary(), listLeadImports()])
      setLeads(leadList)
      setDashboardSummary(summary)
      setLeadImports([job, ...importList.filter((item) => item.id !== job.id)])
      setLeadImportFile(null)
      setApiState(job.status === 'completed' ? 'ready' : 'error')
      setStatusText(job.status === 'completed' ? `已导入 ${job.imported_rows} 条线索` : '线索导入失败')
    } catch {
      setApiState('error')
      setStatusText('线索导入失败')
    }
  }

  async function generateOrder(quote: Quote) {
    if (!quote.inventory) return
    setApiState('loading')
    try {
      const order = await createOrderFromQuote(quote)
      const summary = await getDashboardSummary()
      setOrders((current) => [order, ...current])
      setDashboardSummary(summary)
      if (selectedCustomer?.id === quote.customer) {
        await reloadCustomer(quote.customer)
      }
      setApiState('ready')
      setStatusText('订单已生成')
    } catch {
      setApiState('error')
      setStatusText('订单生成失败')
    }
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
  const currentUserName = user?.display_name || user?.username || '销售顾问'
  const inProgressProjects = Math.max(leads.length, customers.length, 1)
  const completedProjects = dashboardSummary?.sales.delivered_orders ?? orders.length
  const lostProjects = Math.max(leadImports.filter((job) => job.status === 'failed').length, 1)
  const rankedSeller = selectedCustomer?.owner_name || selectedLead?.assigned_to_name || '李晶云'
  const activeAgents = Math.max(11, inventory.length + customers.length + 3)
  const companionAgents = Math.max(2, Math.ceil(activeAgents / 6))
  const todayToken = Math.max(0, Math.round(Number(dashboardSummary?.sales.quote_pipeline || 0) / 100000))
  const trainingBotCount = 3
  const trainingAnswers = Math.max(56, tasks.length * 8 + interactions.length)

  const navItems = [
    { id: 'desk' as const, label: '工作台', icon: LayoutDashboard },
    { id: 'projects' as const, label: '我的项目', icon: FolderOpen },
    { id: 'ranking' as const, label: '销售排名', icon: BarChart3 },
    { id: 'reports' as const, label: '数据与报告', icon: LineChart },
    { id: 'agents' as const, label: '智能体管理', icon: Bot },
    { id: 'permissions' as const, label: '权限管理', icon: ShieldCheck },
    { id: 'settings' as const, label: '系统设置', icon: Settings },
    { id: 'token' as const, label: 'Token 用量', icon: Zap },
    { id: 'training' as const, label: '培训', icon: BookOpen },
  ]
  const trainingNavItems = [
    { id: 'trainingManage' as const, label: '培训管理' },
    { id: 'trainingStats' as const, label: '培训统计' },
    { id: 'myTraining' as const, label: '我的培训' },
    { id: 'trainingRecords' as const, label: '培训记录' },
  ]
  const coreGuideCards: PilotCard[] = [
    {
      id: 'projects' as const,
      title: '新建项目',
      description: '录入客户信息，开始一次销售陪访与诊断流程。',
      icon: Plus,
      accent: 'violet',
      badge: `${inProgressProjects} 个进行中`,
      stats: [
        { value: String(inProgressProjects), label: '进行中' },
        { value: String(dashboardSummary?.tasks.overdue ?? 0), label: '待报告' },
      ],
      action: '进入新建',
    },
    {
      id: 'askAi' as const,
      title: '问 AI',
      description: '由数字员工协助分析客户、话术、跟进策略与项目问题。',
      icon: Sparkles,
      accent: 'rose',
      badge: '进入 AI 对话',
      stats: [
        { value: String(dashboardSummary?.leads.high_intent ?? 0), label: '高意向客户' },
        { value: String(openTasks.length), label: '待跟进' },
      ],
      action: '开始对话',
    },
    {
      id: 'projects' as const,
      title: '查看我的项目',
      description: '查看正在推进、已完成和已流失的客户项目。',
      icon: FolderOpen,
      accent: 'blue',
      badge: `${customers.length || 14} 个项目`,
      stats: [
        { value: String(completedProjects || 6), label: '已完成' },
        { value: String(lostProjects), label: '已流失' },
      ],
      action: '进入项目',
    },
    {
      id: 'ranking' as const,
      title: '查看排名',
      description: '了解团队销售表现、项目推进和个人排名变化。',
      icon: BarChart3,
      accent: 'amber',
      badge: '来自销售排名',
      stats: [
        { value: String(Math.max(9, customers.length + leads.length)), label: '上榜人数' },
        { value: rankedSeller, label: '当前榜首' },
      ],
      action: '查看排名',
    },
    {
      id: 'myTraining' as const,
      title: '开始培训学习',
      description: '进入训练任务，提升销售话术、客户诊断和跟进能力。',
      icon: BookOpen,
      accent: 'indigo',
      badge: '培训功能已启用',
      stats: [
        { value: String(trainingBotCount), label: '培训智能体' },
        { value: String(trainingAnswers), label: '答题次数' },
      ],
      action: '开始学习',
    },
  ]
  const adminCards: PilotCard[] = [
    {
      id: 'agents' as const,
      title: '配置智能体',
      description: '管理陪访智能体角色、能力、提示词和业务配置。',
      icon: Bot,
      accent: 'slate',
      badge: '来自智能体管理',
      stats: [
        { value: String(activeAgents), label: '启用智能体' },
        { value: String(companionAgents), label: '陪访智能体' },
      ],
      action: '进入配置',
    },
    {
      id: 'token' as const,
      title: 'Token 计算',
      description: '查看 AI 调用消耗、用量趋势和系统成本情况。',
      icon: Zap,
      accent: 'cyan',
      badge: '来自 Token 用量',
      stats: [
        { value: String(todayToken), label: '今日 Token' },
        { value: String(dashboardSummary?.sales.quotes ?? 0), label: '今日调用' },
      ],
      action: '查看用量',
    },
    {
      id: 'trainingStats' as const,
      title: '培训统计',
      description: '查看团队学习进度、训练完成情况和考核结果。',
      icon: BookOpen,
      accent: 'indigo',
      badge: '来自培训统计',
      stats: [
        { value: String(trainingBotCount), label: '培训智能体' },
        { value: String(trainingAnswers), label: '答题次数' },
      ],
      action: '查看统计',
    },
  ]
  const modulePages: Partial<Record<ActiveView, PilotModule>> = {
    projects: { title: '我的项目', description: '按视频结构保留项目入口，承接客户线索、推进状态和销售跟进。', icon: FolderOpen, cards: coreGuideCards.slice(0, 3) },
    ranking: { title: '销售排名', description: '展示团队销售表现、上榜人数和当前榜首。', icon: TrendingUp, cards: [coreGuideCards[3]] },
    reports: { title: '数据与报告', description: '汇总线索、客户、报价、订单和库存的运营指标。', icon: LineChart, cards: [coreGuideCards[2], adminCards[1]] },
    agents: { title: '智能体管理', description: '配置销售陪访、客户诊断、报价建议和培训智能体。', icon: Bot, cards: [adminCards[0]] },
    permissions: { title: '权限管理', description: '管理门店、角色、账号和后台访问范围。', icon: KeyRound, cards: [adminCards[0]] },
    settings: { title: '系统设置', description: '维护业务字段、模型参数和系统运行配置。', icon: Settings, cards: [adminCards[0], adminCards[1]] },
    token: { title: 'Token 用量', description: '查看 AI 调用消耗、用量趋势和成本概览。', icon: Zap, cards: [adminCards[1]] },
    training: { title: '培训', description: '进入培训管理、培训统计、我的培训和训练记录。', icon: BookOpen, cards: [coreGuideCards[4], adminCards[2]] },
    trainingManage: { title: '培训管理', description: '维护训练任务、素材和考核题目。', icon: BookOpen, cards: [coreGuideCards[4]] },
    trainingStats: { title: '培训统计', description: '查看团队学习进度、训练完成情况和考核结果。', icon: BarChart3, cards: [adminCards[2]] },
    myTraining: { title: '我的培训', description: '查看个人训练任务、学习进度和待完成项目。', icon: BookOpen, cards: [coreGuideCards[4]] },
    trainingRecords: { title: '培训记录', description: '查看历史训练记录、答题结果和改进建议。', icon: ClipboardList, cards: [adminCards[2]] },
    askAi: { title: '问 AI', description: '通过数字员工分析客户需求、项目问题和跟进策略。', icon: Sparkles, cards: [coreGuideCards[1]] },
  }
  const activeModule = modulePages[activeView]
  const ActiveModuleIcon = activeModule?.icon
  const viewTitle = navItems.find((item) => item.id === activeView)?.label || trainingNavItems.find((item) => item.id === activeView)?.label || '工作台'
  const trainingViewIds: ActiveView[] = ['training', 'trainingManage', 'trainingStats', 'myTraining', 'trainingRecords']
  const isTrainingView = trainingViewIds.includes(activeView)
  const trainingPrograms = [
    {
      title: 'Aster Nova X 价值传递训练',
      description: '围绕新能源 SUV 的价格、续航、智能座舱与金融方案，训练顾问完整解释客户关注点。',
      questions: '10 题',
      status: '启用',
      level: '专业严谨',
    },
    {
      title: 'Deepvision 销售沟通培训',
      description: '通过标准问答和追问练习，帮助销售建立顾问式沟通的底层结构。',
      questions: '15 题',
      status: '启用',
      level: '专业严谨',
    },
    {
      title: '私域运营系统培训',
      description: '训练销售在私域触达、客户分层、活动邀约和售后回访中的表达方式。',
      questions: '11 题',
      status: '启用',
      level: '专业严谨',
    },
  ]
  const trainingRecords = [
    { title: 'Aster Nova X 价值传递训练', state: '已完成', duration: '28秒 · 2条对话', time: '2026-07-08 09:20', score: '86/100' },
    { title: 'Deepvision 销售沟通培训', state: '已完成', duration: '27秒 · 2条对话', time: '2026-07-07 11:11', score: '0/100' },
    { title: '私域运营系统培训', state: '学习中', duration: '1分钟 · 2条对话', time: '2026-07-07 14:18', score: '0/100' },
    { title: 'Aster Nova X 试驾邀约训练', state: '已完成', duration: '42秒 · 2条对话', time: '2026-07-06 14:23', score: '92/100' },
    { title: 'Deepvision 销售实战：报价异议', state: '已完成', duration: '0分钟 · 0条对话', time: '2026-07-05 10:37', score: '10/100' },
    { title: 'Deepvision 销售沟通培训', state: '已完成', duration: '24秒 · 2条对话', time: '2026-07-05 10:40', score: '0/100' },
    { title: '私域运营系统培训', state: '已完成', duration: '33秒 · 4条对话', time: '2026-07-04 14:34', score: '2/100' },
    { title: 'Aster Nova X 家庭客户跟进', state: '学习中', duration: '1分钟 · 2条对话', time: '2026-07-03 15:03', score: '76/100' },
  ]
  const activeTrainingView = activeView === 'training' ? 'myTraining' : activeView
  const renderTrainingContent = () => {
    if (activeTrainingView === 'trainingStats') {
      return (
        <section className="training-video-page">
          <div className="training-page-heading">
            <div>
              <h2>培训统计</h2>
              <p>查看团队学习进度、训练完成情况和考核结果。</p>
            </div>
            <button type="button">导出报告</button>
          </div>
          <div className="training-stats-grid">
            {[
              ['86%', '完成率', '较上周 +12%'],
              ['117%', '学习活跃', '本月训练次数'],
              ['100%', '启用课程', '3 个智能体'],
              ['43%', '待提升', '低分训练占比'],
            ].map(([value, label, hint]) => (
              <article className="training-stat-card" key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
                <p>{hint}</p>
              </article>
            ))}
          </div>
          <div className="training-analytics-grid">
            <article className="training-panel training-chart-panel">
              <div className="training-panel-header">
                <div>
                  <h3>训练完成趋势</h3>
                  <p>近 7 天学习和考试完成情况</p>
                </div>
              </div>
              <div className="training-bars" aria-hidden="true">
                {[42, 58, 36, 72, 64, 86, 78].map((height, index) => (
                  <span style={{ height: `${height}%` }} key={index} />
                ))}
              </div>
            </article>
            <article className="training-panel">
              <div className="training-panel-header">
                <div>
                  <h3>低分训练排行</h3>
                  <p>优先安排主管复盘和二次演练</p>
                </div>
              </div>
              <div className="training-rank-list">
                {trainingRecords.slice(0, 5).map((record, index) => (
                  <div key={`${record.title}-${record.time}`}>
                    <b>{index + 1}</b>
                    <span>{record.title}</span>
                    <strong>{record.score}</strong>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      )
    }

    if (activeTrainingView === 'trainingRecords') {
      return (
        <section className="training-video-page">
          <div className="training-page-heading">
            <div>
              <h2>培训记录</h2>
              <p>查看历史训练记录、答题结果和改进建议。</p>
            </div>
            <button type="button">全部记录</button>
          </div>
          <div className="training-record-grid">
            {trainingRecords.map((record) => (
              <article className="training-record-card" key={`${record.title}-${record.time}`}>
                <div className="training-record-title">
                  <h3>{record.title}</h3>
                  <span className={record.state === '学习中' ? 'learning' : ''}>{record.state}</span>
                </div>
                <p>{record.duration}</p>
                <div className="training-record-meta">
                  <span>{record.time}</span>
                  <b>{record.score}</b>
                </div>
                <div className="training-record-actions">
                  <button type="button">回看对话</button>
                  <button type="button">查看结果</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )
    }

    if (activeTrainingView === 'trainingManage') {
      return (
        <section className="training-video-page">
          <div className="training-page-heading">
            <div>
              <h2>培训管理</h2>
              <p>配置培训基础信息、考试规则和题库。</p>
            </div>
            <button type="button">新建培训</button>
          </div>
          <div className="training-summary-grid">
            <article>
              <strong>{trainingPrograms.length}</strong>
              <span>启用培训</span>
            </article>
            <article>
              <strong>36</strong>
              <span>题库题目</span>
            </article>
            <article>
              <strong>{trainingAnswers}</strong>
              <span>答题次数</span>
            </article>
          </div>
          <article className="training-panel">
            <div className="training-panel-header">
              <div>
                <h3>培训列表</h3>
                <p>新建培训后，在详情页维护考试规则和题库。</p>
              </div>
              <button type="button">新建培训</button>
            </div>
            <div className="training-search-row">
              <div>搜索名称、编码、简介</div>
              <button type="button">全部状态</button>
            </div>
            <div className="training-program-grid">
              {trainingPrograms.map((program) => (
                <article className="training-program-card" key={program.title}>
                  <div className="training-program-head">
                    <h3>{program.title}</h3>
                    <span>{program.status}</span>
                  </div>
                  <p>{program.description}</p>
                  <div className="training-card-footer">
                    <span>{program.questions}</span>
                    <b>{program.level}</b>
                  </div>
                  <button type="button">点击进入编辑</button>
                </article>
              ))}
            </div>
          </article>
        </section>
      )
    }

    return (
      <section className="training-video-page">
        <div className="training-page-heading">
          <div>
            <h2>我的培训</h2>
            <p>继续未完成学习，或回看已完成的对话。</p>
          </div>
          <button type="button">全部记录</button>
        </div>
        <div className="training-course-grid">
          {trainingPrograms.map((program, index) => (
            <article className="training-course-card" key={program.title}>
              <h3>{program.title}</h3>
              <p>{program.description}</p>
              <div className="training-course-tags">
                <span>{program.questions}</span>
                <span>AI 老师</span>
                <span>{index === 0 ? '86/100' : '0/100'}</span>
              </div>
              <div className="training-result-box">
                <span>{index === 2 ? '学习中' : '已完成'}</span>
                <b>{index === 0 ? '2026-07-08 09:20' : '2026-07-07 11:11'}</b>
                <p>{index === 2 ? '1分钟 · 2条对话' : '28秒 · 2条对话'}</p>
              </div>
              <div className="training-record-actions">
                <button type="button" className="primary">开始学习</button>
                <button type="button">直接考试</button>
              </div>
            </article>
          ))}
        </div>
        <section className="training-panel">
          <div className="training-panel-header">
            <div>
              <h3>最近学习</h3>
              <p>继续未完成学习，或回看已完成的对话</p>
            </div>
          </div>
          <div className="training-record-grid compact">
            {trainingRecords.slice(0, 4).map((record) => (
              <article className="training-record-card" key={`${record.title}-${record.time}`}>
                <div className="training-record-title">
                  <h3>{record.title}</h3>
                  <span className={record.state === '学习中' ? 'learning' : ''}>{record.state}</span>
                </div>
                <p>{record.duration}</p>
                <div className="training-record-meta">
                  <span>{record.time}</span>
                  <b>{record.score}</b>
                </div>
                <div className="training-record-actions">
                  <button type="button">回看对话</button>
                  <button type="button">查看结果</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    )
  }

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
          <label className="captcha-field">
            验证码
            <div className="captcha-row">
              <input
                value={captcha}
                onChange={(event) => setCaptcha(event.target.value.toUpperCase())}
                autoComplete="off"
                inputMode="text"
                maxLength={8}
                placeholder="输入验证码"
              />
              <button className="captcha-image-button" type="button" title="换一张验证码" onClick={() => void refreshCaptcha()}>
                {captchaImage ? <img src={captchaImage} alt="验证码" /> : <RefreshCw size={18} />}
              </button>
            </div>
          </label>
          {loginError && <div className="form-error">{loginError}</div>}
          <button type="submit" disabled={apiState === 'loading' || !captchaImage}>
            {apiState === 'loading' ? <RefreshCw size={18} className="spin" /> : <Send size={18} />}
            登录
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="app-frame">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <div className="sidebar-logo-eye">
              <span />
            </div>
            <strong>deepvision</strong>
          </div>
          <button className="sidebar-collapse" type="button" title="收起侧栏">
            <ChevronLeft size={18} />
          </button>
        </div>
        <nav className="sidebar-nav pilot-nav" aria-label="主导航">
          {navItems.map((item) => {
            const Icon = item.icon
            const isTrainingActive =
              item.id === 'training' && ['training', 'trainingManage', 'trainingStats', 'myTraining', 'trainingRecords'].includes(activeView)
            return (
              <div className={`nav-group ${item.id === 'training' ? 'training-group' : ''}`} key={item.id}>
                <button
                  type="button"
                  className={activeView === item.id || isTrainingActive ? 'active' : ''}
                  onClick={() => setActiveView(item.id === 'training' ? 'myTraining' : item.id)}
                >
                  <Icon size={18} />
                  <span>
                    <strong>{item.label}</strong>
                  </span>
                  {item.id === 'training' && <ChevronDown size={15} />}
                </button>
                {item.id === 'training' && (
                  <div className="sidebar-subnav">
                    {trainingNavItems.map((subItem) => (
                      <button
                        type="button"
                        className={activeView === subItem.id || (activeView === 'training' && subItem.id === 'myTraining') ? 'active-sub' : ''}
                        key={subItem.id}
                        onClick={() => setActiveView(subItem.id)}
                      >
                        <span>{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
        <button className={`sidebar-ai ${activeView === 'askAi' ? 'active' : ''}`} type="button" onClick={() => setActiveView('askAi')}>
          <Sparkles size={16} />
          问 AI
        </button>
      </aside>

      <section className="app-shell" aria-label={viewTitle}>
      <header className="topbar">
        <div className="pilot-topbar-title">
          <h1>Sales pilot</h1>
          <span />
          <p>企业数字员工在线</p>
        </div>
        <div className="topbar-actions">
          <div className="user-chip">
            <span>{currentUserName}</span>
            <div className="user-avatar">
              <UserRound size={18} />
            </div>
          </div>
          <button className="icon-button logout-button" type="button" title="退出登录" onClick={() => void handleLogout()}>
            <LogOut size={17} />
          </button>
        </div>
      </header>

      {activeView === 'desk' && (
        <section className="pilot-home">
          <section className="pilot-hero">
            <div className="pilot-hero-pill">Sales pilot 运行总览</div>
            <h2>欢迎回来，{currentUserName}</h2>
            <p>数字员工正在协助你管理项目、诊断机会与完成培训。</p>
          </section>

          <section className="pilot-section">
            <div className="pilot-section-title">
              <div className="pilot-section-icon">
                <LayoutDashboard size={18} />
              </div>
              <div>
                <h2>核心引导</h2>
                <p>从项目、AI、排名和培训开始今天的工作</p>
              </div>
            </div>
            <div className="pilot-card-grid">
              {coreGuideCards.map((card, index) => {
                const Icon = card.icon
                return (
                  <article className={`pilot-action-card accent-${card.accent} ${index < 2 ? 'wide' : ''}`} key={`${card.title}-${index}`}>
                    <div className="pilot-card-head">
                      <div className="pilot-card-icon">
                        <Icon size={24} />
                      </div>
                      <span>{card.badge}</span>
                    </div>
                    <div className="pilot-card-body">
                      <h3>{card.title}</h3>
                      <p>{card.description}</p>
                    </div>
                    <div className="pilot-card-stats">
                      {card.stats.map((stat) => (
                        <div key={`${card.title}-${stat.label}`}>
                          <strong>{stat.value}</strong>
                          <span>{stat.label}</span>
                        </div>
                      ))}
                    </div>
                    <button className="pilot-card-link" type="button" onClick={() => setActiveView(card.id)}>
                      {card.action}
                      <ChevronRight size={16} />
                    </button>
                  </article>
                )
              })}
            </div>
          </section>

          <section className="pilot-section">
            <div className="pilot-section-title">
              <div className="pilot-section-icon">
                <Settings size={18} />
              </div>
              <div>
                <h2>管理员专区</h2>
                <p>维护智能体、用量和团队培训数据</p>
              </div>
            </div>
            <div className="pilot-card-grid admin">
              {adminCards.map((card) => {
                const Icon = card.icon
                return (
                  <article className={`pilot-action-card accent-${card.accent}`} key={card.title}>
                    <div className="pilot-card-head">
                      <div className="pilot-card-icon">
                        <Icon size={23} />
                      </div>
                      <span>{card.badge}</span>
                    </div>
                    <div className="pilot-card-body">
                      <h3>{card.title}</h3>
                      <p>{card.description}</p>
                    </div>
                    <div className="pilot-card-stats">
                      {card.stats.map((stat) => (
                        <div key={`${card.title}-${stat.label}`}>
                          <strong>{stat.value}</strong>
                          <span>{stat.label}</span>
                        </div>
                      ))}
                    </div>
                    <button className="pilot-card-link" type="button" onClick={() => setActiveView(card.id)}>
                      {card.action}
                      <ChevronRight size={16} />
                    </button>
                  </article>
                )
              })}
            </div>
          </section>
        </section>
      )}

      {isTrainingView && renderTrainingContent()}

      {activeModule && activeView !== 'desk' && !isTrainingView && (
        <section className="pilot-module-page">
          <section className="pilot-module-hero">
            <div className="pilot-module-icon">
              {ActiveModuleIcon && <ActiveModuleIcon size={26} />}
            </div>
            <div>
              <div className="pilot-hero-pill">Sales pilot 模块</div>
              <h2>{activeModule.title}</h2>
              <p>{activeModule.description}</p>
            </div>
          </section>
          <div className="pilot-card-grid">
            {activeModule.cards.map((card, index) => {
              const Icon = card.icon
              return (
                <article className={`pilot-action-card accent-${card.accent}`} key={`${activeModule.title}-${card.title}-${index}`}>
                  <div className="pilot-card-head">
                    <div className="pilot-card-icon">
                      <Icon size={23} />
                    </div>
                    <span>{card.badge}</span>
                  </div>
                  <div className="pilot-card-body">
                    <h3>{card.title}</h3>
                    <p>{card.description}</p>
                  </div>
                  <div className="pilot-card-stats">
                    {card.stats.map((stat) => (
                      <div key={`${activeModule.title}-${card.title}-${stat.label}`}>
                        <strong>{stat.value}</strong>
                        <span>{stat.label}</span>
                      </div>
                    ))}
                  </div>
                  <button className="pilot-card-link" type="button" onClick={() => setActiveView(card.id)}>
                    {card.action}
                    <ChevronRight size={16} />
                  </button>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {activeView === 'legacyDesk' && (
        <>
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
                  <strong>{leadDisplayName(lead)}</strong>
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
                <h2>
                  {labelText(cleanDisplayText(selectedCustomer?.name) || leadDisplayName(selectedLead) || '\u672a\u9009\u62e9\u5ba2\u6237')}
                </h2>
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
        </>
      )}

      {activeView === 'leads' && (
        <section className="page-panel">
          <div className="section-header">
            <div>
              <h2>获客管理</h2>
              <p>手工录入、CSV 导入和线索分配状态。</p>
            </div>
            <button className="text-action" type="button" onClick={() => void loadDesk()}>
              <RefreshCw size={16} />
              刷新
            </button>
          </div>
          <div className="lead-capture-grid">
            <form className="lead-form record-card" onSubmit={(event) => void submitManualLead(event)}>
              <div className="section-header compact">
                <h2>手工录入</h2>
                <Plus size={18} />
              </div>
              <label>
                姓名
                <input
                  value={manualLead.name}
                  onChange={(event) => setManualLead((current) => ({ ...current, name: event.target.value }))}
                  placeholder="客户姓名"
                />
              </label>
              <label>
                手机号
                <input
                  value={manualLead.phone}
                  onChange={(event) => setManualLead((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="13800000000"
                />
              </label>
              <div className="form-grid">
                <label>
                  城市
                  <input
                    value={manualLead.city}
                    onChange={(event) => setManualLead((current) => ({ ...current, city: event.target.value }))}
                  />
                </label>
                <label>
                  意向车型
                  <input
                    value={manualLead.intent_model}
                    onChange={(event) => setManualLead((current) => ({ ...current, intent_model: event.target.value }))}
                  />
                </label>
              </div>
              <div className="form-grid">
                <label>
                  预算下限
                  <input
                    value={manualLead.budget_min}
                    onChange={(event) => setManualLead((current) => ({ ...current, budget_min: event.target.value }))}
                    placeholder="180000"
                  />
                </label>
                <label>
                  预算上限
                  <input
                    value={manualLead.budget_max}
                    onChange={(event) => setManualLead((current) => ({ ...current, budget_max: event.target.value }))}
                    placeholder="230000"
                  />
                </label>
              </div>
              <label>
                购车周期
                <input
                  value={manualLead.purchase_timeline}
                  onChange={(event) => setManualLead((current) => ({ ...current, purchase_timeline: event.target.value }))}
                />
              </label>
              <label>
                备注
                <input
                  value={manualLead.notes}
                  onChange={(event) => setManualLead((current) => ({ ...current, notes: event.target.value }))}
                />
              </label>
              <button type="submit" disabled={apiState === 'loading'}>
                <Plus size={16} />
                创建线索
              </button>
            </form>

            <section className="record-card import-panel">
              <div className="section-header compact">
                <h2>CSV 导入</h2>
                <Upload size={18} />
              </div>
              <div className="upload-box">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => setLeadImportFile(event.target.files?.[0] || null)}
                />
                <strong>{leadImportFile?.name || '未选择文件'}</strong>
                <p>支持字段：姓名、手机号、城市、意向车型、预算下限、预算上限、购车周期、评分、备注。</p>
              </div>
              <button className="text-action full-width" type="button" disabled={!leadImportFile || apiState === 'loading'} onClick={() => void uploadLeadImport()}>
                <Upload size={16} />
                导入线索
              </button>
              <div className="record-list">
                {leadImports.slice(0, 5).map((job) => (
                  <article className="timeline-row" key={job.id}>
                    <div>
                      <strong>{job.original_filename || `导入任务 ${job.id}`}</strong>
                      <span>
                        {labelText(job.status)} · {job.imported_rows}/{job.total_rows}
                      </span>
                      {job.error_message && <p>{job.error_message}</p>}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="record-card">
              <div className="section-header compact">
                <h2>最新线索</h2>
                <span>{leads.length}</span>
              </div>
              <div className="record-list">
                {leads.slice(0, 8).map((lead) => (
                  <article className="timeline-row" key={lead.id}>
                    <div>
                      <strong>{leadDisplayName(lead)}</strong>
                      <span>
                        {lead.intent_model || '意向待确认'} · {labelText(lead.status)} · {lead.score}
                      </span>
                      <p>{lead.phone} · {labelText(lead.city || lead.source_name || '-')}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </section>
      )}

      {activeView === 'customers' && (
        <section className="page-panel">
          <div className="section-header">
            <div>
              <h2>客户档案</h2>
              <p>按成交概率排序，快速进入销售工作台继续跟进。</p>
            </div>
            <button className="text-action" type="button" onClick={() => void loadDesk()}>
              <RefreshCw size={16} />
              刷新
            </button>
          </div>
          <div className="directory-grid">
            {customers.map((customer) => (
              <article className="record-card" key={customer.id}>
                <div className="record-title">
                  <div>
                    <h3>{labelText(customer.name)}</h3>
                    <p>{customer.phone || '-'} · {labelText(customer.city || customer.store_name)}</p>
                  </div>
                  <strong>{customer.deal_probability}</strong>
                </div>
                <div className="record-tags">
                  <span>{labelText(customer.stage)}</span>
                  {(customer.tags || []).slice(0, 3).map((tag) => (
                    <span key={tag}>{labelText(tag)}</span>
                  ))}
                </div>
                <dl className="compact-facts">
                  <div>
                    <dt>预算</dt>
                    <dd>
                      {customer.demand_profile?.budget_min && customer.demand_profile?.budget_max
                        ? `${money(customer.demand_profile.budget_min)} - ${money(customer.demand_profile.budget_max)}`
                        : '-'}
                    </dd>
                  </div>
                  <div>
                    <dt>意向</dt>
                    <dd>{customer.demand_profile?.preferred_models?.[0] || customer.demand_profile?.body_type || '-'}</dd>
                  </div>
                  <div>
                    <dt>下一步</dt>
                    <dd>{localizeText(customer.next_action) || '确认购车需求'}</dd>
                  </div>
                </dl>
                <button className="text-action full-width" type="button" onClick={() => void openCustomer(customer)}>
                  <UserRound size={16} />
                  进入工作台
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeView === 'inventory' && (
        <section className="page-panel">
          <div className="section-header">
            <div>
              <h2>车辆资源</h2>
              <p>查看现车、在途和已预留车辆，支撑推荐与试驾安排。</p>
            </div>
            <button className="text-action" type="button" onClick={() => void loadDesk()}>
              <RefreshCw size={16} />
              刷新
            </button>
          </div>
          <div className="inventory-grid">
            {inventory.map((vehicle) => (
              <article className="record-card vehicle-resource" key={vehicle.id}>
                <div className="record-title">
                  <div>
                    <h3>{vehicle.title}</h3>
                    <p>{vehicle.vin}</p>
                  </div>
                  <CarFront size={24} />
                </div>
                <div className="record-tags">
                  <span>{labelText(vehicle.status)}</span>
                  <span>{labelText(vehicle.exterior_color)}</span>
                  <span>{labelText(vehicle.interior_color)}</span>
                </div>
                <dl className="compact-facts">
                  <div>
                    <dt>门店</dt>
                    <dd>{labelText(vehicle.store_name)}</dd>
                  </div>
                  <div>
                    <dt>挂牌价</dt>
                    <dd>{money(vehicle.listed_price)}</dd>
                  </div>
                  <div>
                    <dt>可谈价</dt>
                    <dd>{money(vehicle.negotiable_price)}</dd>
                  </div>
                  <div>
                    <dt>里程</dt>
                    <dd>{vehicle.mileage_km} km</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeView === 'sales' && (
        <section className="page-panel">
          <div className="section-header">
            <div>
              <h2>报价订单</h2>
              <p>跟踪报价、试驾和订单，形成从推荐到成交的闭环。</p>
            </div>
            <button className="text-action" type="button" onClick={() => void loadDesk()}>
              <RefreshCw size={16} />
              刷新
            </button>
          </div>
          <div className="sales-board">
            <section>
              <div className="section-header compact">
                <h2>报价单</h2>
                <span>{allQuotes.length}</span>
              </div>
              <div className="record-list">
                {allQuotes.map((quote) => {
                  const hasOrder = orders.some((order) => order.quote === quote.id)
                  return (
                    <article className="record-card compact-card" key={quote.id}>
                      <div className="record-title">
                        <div>
                          <h3>{labelText(quote.customer_name)}</h3>
                          <p>{quote.inventory_title || '车辆待确认'}</p>
                        </div>
                        <strong>{money(quote.landing_price)}</strong>
                      </div>
                      <div className="record-tags">
                        <span>{labelText(quote.status)}</span>
                        <span>{dateTime(quote.created_at)}</span>
                      </div>
                      <button
                        className="text-action full-width"
                        type="button"
                        disabled={!quote.inventory || hasOrder}
                        onClick={() => void generateOrder(quote)}
                      >
                        <FileText size={16} />
                        {hasOrder ? '已生成订单' : '生成订单'}
                      </button>
                    </article>
                  )
                })}
              </div>
            </section>

            <section>
              <div className="section-header compact">
                <h2>试驾预约</h2>
                <span>{allTestDrives.length}</span>
              </div>
              <div className="record-list">
                {allTestDrives.map((drive) => (
                  <article className="record-card compact-card" key={drive.id}>
                    <div className="record-title">
                      <div>
                        <h3>{labelText(drive.customer_name)}</h3>
                        <p>{drive.inventory_title || '车辆待确认'}</p>
                      </div>
                      <CalendarClock size={22} />
                    </div>
                    <div className="record-tags">
                      <span>{labelText(drive.status)}</span>
                      <span>{dateTime(drive.scheduled_at)}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <div className="section-header compact">
                <h2>订单</h2>
                <span>{orders.length}</span>
              </div>
              <div className="record-list">
                {orders.map((order) => (
                  <article className="record-card compact-card" key={order.id}>
                    <div className="record-title">
                      <div>
                        <h3>{order.order_number}</h3>
                        <p>{labelText(order.customer_name)} · {order.inventory_title}</p>
                      </div>
                      <strong>{money(order.total_amount)}</strong>
                    </div>
                    <div className="record-tags">
                      <span>{labelText(order.status)}</span>
                      <span>订金 {money(order.deposit_amount)}</span>
                      <span>{order.expected_delivery_date || '交付待定'}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </section>
      )}

      {activeView === 'dashboard' && (
        <section className="page-panel">
          <div className="section-header">
            <div>
              <h2>数据看板</h2>
              <p>线索、待办、试驾、报价、订单和库存的实时运营摘要。</p>
            </div>
            <button className="text-action" type="button" onClick={() => void loadDesk()}>
              <RefreshCw size={16} />
              刷新
            </button>
          </div>
          <section className="metrics-grid" aria-label="销售指标">
            {metrics.map((metric) => (
              <article className={`metric metric-${metric.tone}`} key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <em>{metric.trend}</em>
              </article>
            ))}
          </section>
          <div className="insight-grid">
            <article className="insight-card">
              <span>线索漏斗</span>
              <strong>{dashboardSummary?.leads.total ?? 0}</strong>
              <p>今日新增 {dashboardSummary?.leads.today ?? 0}，已转化 {dashboardSummary?.leads.converted ?? 0}</p>
            </article>
            <article className="insight-card">
              <span>客户阶段</span>
              <strong>{dashboardSummary?.customers.quoted ?? 0}</strong>
              <p>已报价客户，预约试驾 {dashboardSummary?.customers.test_drive_booked ?? 0}</p>
            </article>
            <article className="insight-card">
              <span>订单交付</span>
              <strong>{dashboardSummary?.sales.orders ?? 0}</strong>
              <p>已交付/完成 {dashboardSummary?.sales.delivered_orders ?? 0}</p>
            </article>
            <article className="insight-card">
              <span>库存结构</span>
              <strong>{dashboardSummary?.inventory.available ?? inventory.length}</strong>
              <p>在途 {dashboardSummary?.inventory.in_transit ?? 0}，预留 {dashboardSummary?.inventory.reserved ?? 0}</p>
            </article>
          </div>
        </section>
      )}
      </section>
    </main>
  )
}

export default App
