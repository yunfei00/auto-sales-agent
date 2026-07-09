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
type SalesProjectStatus = '进行中' | '已完成' | '已流失'
type SalesProject = {
  id: number
  name: string
  owner: string
  companionAgent: string
  industry: string
  level: string
  source: string
  status: SalesProjectStatus
  stage: string
  score: number
  amount: number
  received: number
  progress: number
  createdAt: string
  dueAt: string
  tags: string[]
  description: string
  nextAction: string
  risk: string
}
type SalesProjectForm = {
  name: string
  owner: string
  companionAgent: string
  industry: string
  level: string
  source: string
  status: SalesProjectStatus
  amount: string
  received: string
  progress: string
  dueAt: string
  description: string
}
type SellerRanking = {
  name: string
  sales: number
  lost: number
  conversion: number
  qualityScore: number
  trainingScore: number | null
  monthlyNew: number
  revenue: number
}
type ManagedAgent = {
  id: number
  name: string
  type: string
  status: '启用' | '停用'
  owner: string
  model: string
  skillCount: number
  trigger: string
  updatedAt: string
  prompt: string
}
type ManagedAgentForm = {
  name: string
  type: string
  owner: string
  model: string
  trigger: string
  prompt: string
}
type PermissionAccount = {
  id: number
  name: string
  username: string
  role: '主管' | '销售' | '管理员' | '运营'
  supervisor: string
  status: '启用' | '停用'
}
type PermissionAccountForm = {
  name: string
  username: string
  role: PermissionAccount['role']
  supervisor: string
  status: PermissionAccount['status']
}
type SystemSettingsForm = {
  storeName: string
  defaultCity: string
  leadAssignMode: string
  publicPoolDays: string
  reportCycle: string
  defaultModel: string
  tokenAlert: string
  customerPrivacy: string
  trainingStrictness: string
}
type TokenUsageRecord = {
  module: string
  agent: string
  model: string
  calls: number
  promptTokens: number
  completionTokens: number
  cost: number
  latency: string
  trend: string
}
type AskAiMessage = {
  id: number
  role: 'user' | 'assistant'
  content: string
  time: string
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

const emptyProjectForm: SalesProjectForm = {
  name: '',
  owner: '李晶云',
  companionAgent: '通用销售顾问',
  industry: '',
  level: 'A 类客户',
  source: '官网线索',
  status: '进行中',
  amount: '238000',
  received: '0',
  progress: '20',
  dueAt: '2026-07-31',
  description: '',
}

const emptyAgentForm: ManagedAgentForm = {
  name: '',
  type: '陪访智能体',
  owner: '销售部',
  model: 'gpt-4.1-mini',
  trigger: '项目创建后自动生成首次诊断问题',
  prompt: '',
}

const emptyAccountForm: PermissionAccountForm = {
  name: '',
  username: '',
  role: '销售',
  supervisor: '李晶云',
  status: '启用',
}

const initialSystemSettings: SystemSettingsForm = {
  storeName: 'Deepvision 上海体验中心',
  defaultCity: '上海',
  leadAssignMode: '按销售负载自动分配',
  publicPoolDays: '7',
  reportCycle: '每日 20:00 自动生成',
  defaultModel: 'gpt-4.1-mini',
  tokenAlert: '80',
  customerPrivacy: '手机号脱敏 + 仅主管可导出',
  trainingStrictness: '专业严谨',
}

const initialSalesProjects: SalesProject[] = [
  {
    id: 1,
    name: 'Aster Nova X 家庭增购',
    owner: '李晶云',
    companionAgent: '新能源陪访顾问',
    industry: '家庭用车',
    level: 'A 类客户',
    source: '官网线索',
    status: '进行中',
    stage: '方案演示',
    score: 86,
    amount: 238000,
    received: 10000,
    progress: 68,
    createdAt: '2026-07-01',
    dueAt: '2026-07-18',
    tags: ['高意向', '置换', '金融分期'],
    description: '客户关注续航、儿童座椅空间和月供压力，已完成首次试驾并等待金融方案确认。',
    nextAction: '今日发送两套金融方案，约周末到店二次试驾。',
    risk: '竞品 Model Y 报价已到手，需要强调交付周期和置换补贴。',
  },
  {
    id: 2,
    name: 'Trail PHEV 置换成交',
    owner: '李晶云',
    companionAgent: '置换诊断智能体',
    industry: '改善型家庭',
    level: 'A 类客户',
    source: '直播留资',
    status: '已完成',
    stage: '已交付',
    score: 91,
    amount: 268000,
    received: 268000,
    progress: 100,
    createdAt: '2026-06-16',
    dueAt: '2026-07-06',
    tags: ['已成交', '置换', '高客单'],
    description: '客户旧车置换成功，合同、保险和交付验收已完成。',
    nextAction: '交付后第 7 天回访，补充转介绍权益。',
    risk: '暂无重大风险。',
  },
  {
    id: 3,
    name: 'City E 城市通勤采购',
    owner: '肖玉洁',
    companionAgent: '通用销售顾问',
    industry: '个人通勤',
    level: 'B 类客户',
    source: '门店到访',
    status: '进行中',
    stage: '需求确认',
    score: 74,
    amount: 156800,
    received: 0,
    progress: 42,
    createdAt: '2026-07-03',
    dueAt: '2026-07-22',
    tags: ['预算敏感', '首次购车'],
    description: '客户第一次购车，关注裸车价和保险费用，对颜色库存要求明确。',
    nextAction: '确认薄荷绿现车到港时间，并推送低首付方案。',
    risk: '客户仍在比较同价位燃油车，需降低用车成本疑虑。',
  },
  {
    id: 4,
    name: 'Orion Trail 企业试驾',
    owner: '肖玉洁',
    companionAgent: '企业客户智能体',
    industry: '企业采购',
    level: 'B 类客户',
    source: '私域转介绍',
    status: '已流失',
    stage: '竞品流失',
    score: 59,
    amount: 498000,
    received: 0,
    progress: 35,
    createdAt: '2026-06-28',
    dueAt: '2026-07-12',
    tags: ['企业客户', '竞品拦截'],
    description: '企业行政部门询价两台 PHEV，最终因账期政策选择竞品。',
    nextAction: '进入季度复盘名单，保留换购机会。',
    risk: '账期和批量采购权益不占优。',
  },
  {
    id: 5,
    name: 'Nova X 长续航试驾',
    owner: '张世豪',
    companionAgent: '试驾邀约智能体',
    industry: '家庭用车',
    level: 'A 类客户',
    source: '官网线索',
    status: '进行中',
    stage: '试驾预约',
    score: 78,
    amount: 228800,
    received: 0,
    progress: 56,
    createdAt: '2026-07-04',
    dueAt: '2026-07-19',
    tags: ['长续航', '周末试驾'],
    description: '客户已确认周末试驾，关注高速续航和后排舒适度。',
    nextAction: '试驾前 2 小时提醒，并准备同价竞品对比表。',
    risk: '客户对交付周期敏感。',
  },
  {
    id: 6,
    name: 'Lumen City E 女士通勤',
    owner: 'nikun2',
    companionAgent: '客户诊断智能体',
    industry: '个人通勤',
    level: 'C 类客户',
    source: '短视频线索',
    status: '进行中',
    stage: '报价中',
    score: 65,
    amount: 139800,
    received: 0,
    progress: 48,
    createdAt: '2026-07-05',
    dueAt: '2026-07-25',
    tags: ['女性用户', '城市代步'],
    description: '客户需要一台停车轻松、能耗低的通勤车，已收取报价单。',
    nextAction: '跟进贷款审批材料，确认是否需要赠送充电桩。',
    risk: '竞品优惠力度较大。',
  },
  {
    id: 7,
    name: 'Nova X 老客户转介绍',
    owner: 'Helen',
    companionAgent: '转介绍运营智能体',
    industry: '老客转介绍',
    level: 'B 类客户',
    source: '老客转介绍',
    status: '已完成',
    stage: '定金已付',
    score: 82,
    amount: 218800,
    received: 20000,
    progress: 100,
    createdAt: '2026-06-22',
    dueAt: '2026-07-09',
    tags: ['老客转介绍', '定金'],
    description: '转介绍客户已支付定金，车辆锁定并进入交付准备。',
    nextAction: '交付前确认保险方案和精品包。',
    risk: '需保障承诺交付日期。',
  },
]

const initialSellerRankings: SellerRanking[] = [
  { name: '李晶云', sales: 3, lost: 0, conversion: 100, qualityScore: 78, trainingScore: 33.3, monthlyNew: 1, revenue: 724800 },
  { name: '肖玉洁', sales: 2, lost: 1, conversion: 66.7, qualityScore: 74, trainingScore: 8, monthlyNew: 0, revenue: 425600 },
  { name: '张世豪', sales: 1, lost: 0, conversion: 100, qualityScore: 68, trainingScore: null, monthlyNew: 0, revenue: 228800 },
  { name: 'nikun2', sales: 0, lost: 0, conversion: 0, qualityScore: 61, trainingScore: 20, monthlyNew: 0, revenue: 139800 },
  { name: 'Helen', sales: 0, lost: 0, conversion: 0, qualityScore: 57, trainingScore: null, monthlyNew: 0, revenue: 218800 },
  { name: '刘艳伟', sales: 0, lost: 0, conversion: 0, qualityScore: 45, trainingScore: null, monthlyNew: 0, revenue: 0 },
  { name: '王舒悦', sales: 0, lost: 0, conversion: 0, qualityScore: 38, trainingScore: null, monthlyNew: 0, revenue: 0 },
  { name: '黄艳平', sales: 0, lost: 0, conversion: 0, qualityScore: 33, trainingScore: null, monthlyNew: 0, revenue: 0 },
]

const initialManagedAgents: ManagedAgent[] = [
  {
    id: 1,
    name: '新能源陪访顾问',
    type: '陪访智能体',
    status: '启用',
    owner: '销售部',
    model: 'gpt-4.1-mini',
    skillCount: 8,
    trigger: '新建项目后自动生成首次诊断问题',
    updatedAt: '2026-07-08 09:20',
    prompt: '围绕预算、续航、试驾、竞品和金融方案追问，输出下一步跟进行动。',
  },
  {
    id: 2,
    name: '报价建议智能体',
    type: '报价智能体',
    status: '启用',
    owner: '销售管理部',
    model: 'gpt-4.1',
    skillCount: 6,
    trigger: '客户进入报价阶段后生成价格策略',
    updatedAt: '2026-07-07 17:42',
    prompt: '结合库存、金融政策、客户等级和竞品风险生成报价建议。',
  },
  {
    id: 3,
    name: '培训教练智能体',
    type: '培训智能体',
    status: '启用',
    owner: '培训部',
    model: 'gpt-4.1-mini',
    skillCount: 11,
    trigger: '低分训练记录出现后推送复盘',
    updatedAt: '2026-07-06 14:12',
    prompt: '根据对话记录指出追问不足、价值表达不足和成交推进建议。',
  },
]

const initialPermissionAccounts: PermissionAccount[] = [
  { id: 1, name: '李晶云', username: 'lijingyun', role: '主管', supervisor: '-', status: '启用' },
  { id: 2, name: '肖玉洁', username: 'xjy-xs', role: '销售', supervisor: '李晶云', status: '启用' },
  { id: 3, name: '张世豪', username: 'zsh', role: '销售', supervisor: '李晶云', status: '启用' },
  { id: 4, name: 'nikun2', username: 'nikun2', role: '销售', supervisor: '李晶云', status: '启用' },
  { id: 5, name: 'Helen', username: 'helen', role: '销售', supervisor: '未分配', status: '启用' },
  { id: 6, name: '运营管理员', username: 'ops_admin', role: '运营', supervisor: '-', status: '启用' },
]

const tokenUsageRecords: TokenUsageRecord[] = [
  { module: '问 AI', agent: '销售数字员工', model: 'gpt-4.1-mini', calls: 126, promptTokens: 286400, completionTokens: 96400, cost: 38.28, latency: '1.2s', trend: '+18%' },
  { module: '新建项目', agent: '新能源陪访顾问', model: 'gpt-4.1-mini', calls: 74, promptTokens: 172600, completionTokens: 52800, cost: 22.54, latency: '1.5s', trend: '+9%' },
  { module: '报价建议', agent: '报价建议智能体', model: 'gpt-4.1', calls: 38, promptTokens: 146000, completionTokens: 61200, cost: 62.16, latency: '2.4s', trend: '-4%' },
  { module: '培训评分', agent: '培训教练智能体', model: 'gpt-4.1-mini', calls: 92, promptTokens: 209500, completionTokens: 77800, cost: 28.73, latency: '1.8s', trend: '+31%' },
  { module: '数据报告', agent: '运营分析智能体', model: 'gpt-4.1-mini', calls: 21, promptTokens: 118300, completionTokens: 43200, cost: 16.15, latency: '2.1s', trend: '+6%' },
]

const tokenTrend = [
  { day: '07-03', prompt: 64, completion: 21 },
  { day: '07-04', prompt: 88, completion: 36 },
  { day: '07-05', prompt: 72, completion: 30 },
  { day: '07-06', prompt: 108, completion: 42 },
  { day: '07-07', prompt: 96, completion: 39 },
  { day: '07-08', prompt: 124, completion: 47 },
  { day: '07-09', prompt: 142, completion: 58 },
]

const systemFieldGroups = [
  { title: '线索来源', values: ['官网线索', '直播留资', '门店到访', '短视频线索', '老客转介绍'] },
  { title: '客户等级', values: ['A 类客户', 'B 类客户', 'C 类客户', '无效线索'] },
  { title: '项目阶段', values: ['需求诊断', '方案演示', '试驾预约', '报价推进', '成交交付', '流失复盘'] },
]

const settingPolicyCards = [
  ['自动分配', '新线索进入后按销售负载、门店和客户等级分配。'],
  ['数据脱敏', '手机号、微信号和报价附件仅在授权角色下完整展示。'],
  ['报告生成', '日报、月报和风险报告可按固定周期进入待办。'],
  ['培训规则', '低分训练自动推送主管复盘和二次演练任务。'],
]

const initialAskAiMessages: AskAiMessage[] = [
  {
    id: 1,
    role: 'assistant',
    content: '你好，我是销售数字员工。可以帮你分析客户、生成跟进话术、解释排名波动、检查 Token 用量，或整理培训复盘。',
    time: '09:20',
  },
  {
    id: 2,
    role: 'assistant',
    content: '当前建议优先关注 Aster Nova X 家庭增购项目：客户已经试驾，下一步需要金融方案和竞品价值对比。',
    time: '09:21',
  },
]

const askAiPromptTemplates = [
  '分析当前最容易成交的项目，并给出下一步话术',
  '解释今天 Token 用量异常的模块和优化建议',
  '根据低分培训记录生成主管复盘要点',
  '为 A 类客户生成三条试驾后跟进问题',
]

function projectToForm(project: SalesProject): SalesProjectForm {
  return {
    name: project.name,
    owner: project.owner,
    companionAgent: project.companionAgent,
    industry: project.industry,
    level: project.level,
    source: project.source,
    status: project.status,
    amount: String(project.amount),
    received: String(project.received),
    progress: String(project.progress),
    dueAt: project.dueAt,
    description: project.description,
  }
}

function agentToForm(agent: ManagedAgent): ManagedAgentForm {
  return {
    name: agent.name,
    type: agent.type,
    owner: agent.owner,
    model: agent.model,
    trigger: agent.trigger,
    prompt: agent.prompt,
  }
}

function accountToForm(account: PermissionAccount): PermissionAccountForm {
  return {
    name: account.name,
    username: account.username,
    role: account.role,
    supervisor: account.supervisor,
    status: account.status,
  }
}

function loadStoredArray<T>(key: string, fallback: T[]) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : fallback
  } catch {
    return fallback
  }
}

function loadStoredObject<T>(key: string, fallback: T) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? { ...fallback, ...parsed } as T : fallback
  } catch {
    return fallback
  }
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [trainingExpanded, setTrainingExpanded] = useState(true)

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
  const [salesProjects, setSalesProjects] = useState<SalesProject[]>(() => loadStoredArray('sales-pilot-projects', initialSalesProjects))
  const [projectQuery, setProjectQuery] = useState('')
  const [projectStatus, setProjectStatus] = useState<'全部' | SalesProjectStatus>('全部')
  const [projectModal, setProjectModal] = useState<{ mode: 'create' | 'edit'; project?: SalesProject } | null>(null)
  const [projectForm, setProjectForm] = useState<SalesProjectForm>(emptyProjectForm)
  const [managedAgents, setManagedAgents] = useState<ManagedAgent[]>(() => loadStoredArray('sales-pilot-agents', initialManagedAgents))
  const [agentModal, setAgentModal] = useState<{ mode: 'create' | 'edit'; agent?: ManagedAgent } | null>(null)
  const [agentForm, setAgentForm] = useState<ManagedAgentForm>(emptyAgentForm)
  const [permissionAccounts, setPermissionAccounts] = useState<PermissionAccount[]>(() => loadStoredArray('sales-pilot-permissions', initialPermissionAccounts))
  const [permissionSearch, setPermissionSearch] = useState('')
  const [permissionModal, setPermissionModal] = useState<{ mode: 'create' | 'edit'; account?: PermissionAccount } | null>(null)
  const [permissionForm, setPermissionForm] = useState<PermissionAccountForm>(emptyAccountForm)
  const [systemSettings, setSystemSettings] = useState<SystemSettingsForm>(() => loadStoredObject('sales-pilot-system-settings', initialSystemSettings))
  const [askAiInput, setAskAiInput] = useState('')
  const [askAiMessages, setAskAiMessages] = useState<AskAiMessage[]>(() => loadStoredArray('sales-pilot-ai-messages', initialAskAiMessages))

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) || null,
    [leads, selectedLeadId],
  )
  const openTasks = useMemo(() => tasks.filter((task) => task.status === 'open'), [tasks])
  const latestQuote = quotes[0] || null
  const nextTestDrive = testDrives[0] || null
  const selectedReasons = selectedCard?.reasons.slice(0, 3) || []
  const filteredProjects = useMemo(
    () =>
      salesProjects.filter((project) => {
        const queryText = `${project.name} ${project.owner} ${project.industry} ${project.tags.join(' ')}`.toLowerCase()
        const matchesQuery = !projectQuery.trim() || queryText.includes(projectQuery.trim().toLowerCase())
        const matchesStatus = projectStatus === '全部' || project.status === projectStatus
        return matchesQuery && matchesStatus
      }),
    [projectQuery, projectStatus, salesProjects],
  )
  const sortedSellerRankings = useMemo(
    () =>
      [...initialSellerRankings].sort((left, right) => {
        const leftScore = left.sales * 12 + left.conversion * 0.25 + left.qualityScore * 0.35 + (left.trainingScore || 0) * 0.2
        const rightScore = right.sales * 12 + right.conversion * 0.25 + right.qualityScore * 0.35 + (right.trainingScore || 0) * 0.2
        return rightScore - leftScore
      }),
    [],
  )
  const filteredPermissionAccounts = useMemo(
    () =>
      permissionAccounts.filter((account) => {
        const queryText = `${account.name} ${account.username} ${account.role} ${account.supervisor}`.toLowerCase()
        return !permissionSearch.trim() || queryText.includes(permissionSearch.trim().toLowerCase())
      }),
    [permissionAccounts, permissionSearch],
  )

  useEffect(() => {
    void bootstrap()
  }, [])

  useEffect(() => {
    window.localStorage.setItem('sales-pilot-projects', JSON.stringify(salesProjects))
  }, [salesProjects])

  useEffect(() => {
    window.localStorage.setItem('sales-pilot-agents', JSON.stringify(managedAgents))
  }, [managedAgents])

  useEffect(() => {
    window.localStorage.setItem('sales-pilot-permissions', JSON.stringify(permissionAccounts))
  }, [permissionAccounts])

  useEffect(() => {
    window.localStorage.setItem('sales-pilot-system-settings', JSON.stringify(systemSettings))
  }, [systemSettings])

  useEffect(() => {
    window.localStorage.setItem('sales-pilot-ai-messages', JSON.stringify(askAiMessages.slice(-18)))
  }, [askAiMessages])

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

  function handlePilotCardAction(card: PilotCard) {
    if (card.title === '新建项目') {
      openProjectCreate()
      return
    }
    setActiveView(card.id)
  }

  function openProjectCreate() {
    setActiveView('projects')
    setProjectForm(emptyProjectForm)
    setProjectModal({ mode: 'create' })
  }

  function openProjectEdit(project: SalesProject) {
    setProjectForm(projectToForm(project))
    setProjectModal({ mode: 'edit', project })
  }

  function closeProjectModal() {
    setProjectModal(null)
    setProjectForm(emptyProjectForm)
  }

  function submitProjectForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!projectForm.name.trim()) {
      setStatusText('请输入项目名称')
      return
    }
    const amount = Number(projectForm.amount) || 0
    const received = Number(projectForm.received) || 0
    const progress = Math.max(0, Math.min(100, Number(projectForm.progress) || 0))
    const nextAction =
      projectForm.status === '已完成'
        ? '交付后回访并收集转介绍'
        : projectForm.status === '已流失'
          ? '进入复盘名单，记录流失原因'
          : '完成首次诊断并推进试驾/报价'
    const scoreBase = projectForm.level.startsWith('A') ? 25 : projectForm.level.startsWith('B') ? 15 : 8
    const projectPayload: SalesProject = {
      id: projectModal?.project?.id || Math.max(0, ...salesProjects.map((project) => project.id)) + 1,
      name: projectForm.name.trim(),
      owner: projectForm.owner,
      companionAgent: projectForm.companionAgent,
      industry: projectForm.industry.trim() || '汽车销售',
      level: projectForm.level,
      source: projectForm.source,
      status: projectForm.status,
      stage: projectForm.status === '已完成' ? '已交付' : projectForm.status === '已流失' ? '已流失' : '需求诊断',
      score: Math.min(99, Math.round(progress * 0.72 + scoreBase)),
      amount,
      received,
      progress,
      createdAt: projectModal?.project?.createdAt || new Date().toISOString().slice(0, 10),
      dueAt: projectForm.dueAt,
      tags: [projectForm.level, projectForm.source, projectForm.companionAgent].filter(Boolean),
      description: projectForm.description.trim() || '项目创建后由陪访智能体生成首次诊断问题和下一步行动。',
      nextAction,
      risk: projectForm.status === '已流失' ? '需要记录竞品、价格或交付风险。' : '关注预算、竞品报价和交付周期变化。',
    }

    setSalesProjects((current) => {
      if (projectModal?.mode === 'edit') {
        return current.map((project) => (project.id === projectPayload.id ? projectPayload : project))
      }
      return [projectPayload, ...current]
    })
    setProjectStatus('全部')
    setProjectQuery('')
    closeProjectModal()
    setStatusText(projectModal?.mode === 'edit' ? '项目已更新' : '项目已创建')
  }

  function deleteProject(projectId: number) {
    setSalesProjects((current) => current.filter((project) => project.id !== projectId))
    setStatusText('项目已删除')
  }

  function openAgentCreate() {
    setAgentForm(emptyAgentForm)
    setAgentModal({ mode: 'create' })
  }

  function openAgentEdit(agent: ManagedAgent) {
    setAgentForm(agentToForm(agent))
    setAgentModal({ mode: 'edit', agent })
  }

  function closeAgentModal() {
    setAgentModal(null)
    setAgentForm(emptyAgentForm)
  }

  function submitAgentForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!agentForm.name.trim()) {
      setStatusText('请输入智能体名称')
      return
    }
    const agentPayload: ManagedAgent = {
      id: agentModal?.agent?.id || Math.max(0, ...managedAgents.map((agent) => agent.id)) + 1,
      name: agentForm.name.trim(),
      type: agentForm.type,
      status: agentModal?.agent?.status || '启用',
      owner: agentForm.owner,
      model: agentForm.model,
      skillCount: agentModal?.agent?.skillCount || 4,
      trigger: agentForm.trigger,
      updatedAt: new Intl.DateTimeFormat('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date()),
      prompt: agentForm.prompt.trim() || '根据客户画像、项目状态和销售阶段输出下一步建议。',
    }
    setManagedAgents((current) => {
      if (agentModal?.mode === 'edit') {
        return current.map((agent) => (agent.id === agentPayload.id ? agentPayload : agent))
      }
      return [agentPayload, ...current]
    })
    closeAgentModal()
    setStatusText(agentModal?.mode === 'edit' ? '智能体已更新' : '智能体已创建')
  }

  function toggleAgentStatus(agentId: number) {
    setManagedAgents((current) =>
      current.map((agent) => (agent.id === agentId ? { ...agent, status: agent.status === '启用' ? '停用' : '启用' } : agent)),
    )
  }

  function openAccountCreate() {
    setPermissionForm(emptyAccountForm)
    setPermissionModal({ mode: 'create' })
  }

  function openAccountEdit(account: PermissionAccount) {
    setPermissionForm(accountToForm(account))
    setPermissionModal({ mode: 'edit', account })
  }

  function closeAccountModal() {
    setPermissionModal(null)
    setPermissionForm(emptyAccountForm)
  }

  function submitAccountForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!permissionForm.name.trim() || !permissionForm.username.trim()) {
      setStatusText('请输入姓名和账号')
      return
    }
    const accountPayload: PermissionAccount = {
      id: permissionModal?.account?.id || Math.max(0, ...permissionAccounts.map((account) => account.id)) + 1,
      name: permissionForm.name.trim(),
      username: permissionForm.username.trim(),
      role: permissionForm.role,
      supervisor: permissionForm.supervisor || '未分配',
      status: permissionForm.status,
    }
    setPermissionAccounts((current) => {
      if (permissionModal?.mode === 'edit') {
        return current.map((account) => (account.id === accountPayload.id ? accountPayload : account))
      }
      return [accountPayload, ...current]
    })
    closeAccountModal()
    setStatusText(permissionModal?.mode === 'edit' ? '账号已更新' : '账号已新增')
  }

  function deleteAccount(accountId: number) {
    setPermissionAccounts((current) => current.filter((account) => account.id !== accountId))
    setStatusText('账号已删除')
  }

  function submitSystemSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatusText('系统设置已保存')
  }

  function updateSystemSetting<K extends keyof SystemSettingsForm>(key: K, value: SystemSettingsForm[K]) {
    setSystemSettings((current) => ({ ...current, [key]: value }))
  }

  function resetSystemSettings() {
    setSystemSettings(initialSystemSettings)
    setStatusText('系统设置已恢复为演示默认值')
  }

  function formatTokenCount(value: number) {
    if (value >= 10000) return `${(value / 10000).toFixed(1)} 万`
    return String(value)
  }

  function generateAiReply(question: string) {
    const topProject = [...salesProjects].sort((left, right) => right.score - left.score)[0]
    const riskProject = salesProjects.find((project) => project.status === '已流失') || salesProjects.find((project) => project.risk !== '暂无重大风险。')
    const topSeller = sortedSellerRankings[0]
    const lowerQuestion = question.toLowerCase()

    if (question.includes('Token') || lowerQuestion.includes('token') || question.includes('用量')) {
      const topUsage = [...tokenUsageRecords].sort((left, right) => right.promptTokens + right.completionTokens - (left.promptTokens + left.completionTokens))[0]
      return `Token 用量最高的是「${topUsage.module}」，由${topUsage.agent}产生 ${formatTokenCount(topUsage.promptTokens + topUsage.completionTokens)} Token。建议先优化高频模板、缩短历史上下文，并把报价建议类请求限制为关键阶段触发。`
    }

    if (question.includes('培训') || question.includes('复盘') || question.includes('低分')) {
      const lowScoreRecord = trainingRecords.find((record) => record.score.startsWith('0/')) || trainingRecords[0]
      return `培训侧建议先复盘「${lowScoreRecord.title}」。可以让主管重点看三件事：是否追问客户预算和使用场景、是否把竞品差异讲清楚、是否给出明确下一步邀约。低分记录建议安排二次演练。`
    }

    if (question.includes('排名') || question.includes('销售')) {
      return `当前榜首是${topSeller.name}，成交 ${topSeller.sales} 单，成交额 ${money(String(topSeller.revenue))}。排名提升最有效的动作是把 A 类项目推进到试驾和报价阶段，同时把低分培训项补齐，综合分会同步上涨。`
    }

    if (question.includes('系统') || question.includes('设置') || question.includes('权限')) {
      return `系统设置建议保持「${systemSettings.leadAssignMode}」，公海回收 ${systemSettings.publicPoolDays} 天，Token 告警 ${systemSettings.tokenAlert}%。如果要开放导出能力，建议只给主管和运营角色，销售侧保留本人数据权限。`
    }

    return `我建议优先推进「${topProject?.name || 'Aster Nova X 家庭增购'}」：下一步是${topProject?.nextAction || '补齐客户需求并安排试驾'}。同时关注${riskProject?.name || '竞品价格风险项目'}的风险点，把金融方案、交付周期和竞品对比作为下一轮沟通重点。`
  }

  function submitAskAi(event?: FormEvent<HTMLFormElement>, preset?: string) {
    event?.preventDefault()
    const content = (preset || askAiInput).trim()
    if (!content) {
      setStatusText('请输入要询问 AI 的问题')
      return
    }
    const time = new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date())
    const baseId = Date.now()
    const reply = generateAiReply(content)
    setAskAiMessages((current) => [
      ...current,
      { id: baseId, role: 'user', content, time },
      { id: baseId + 1, role: 'assistant', content: reply, time },
    ])
    setAskAiInput('')
    setStatusText('AI 建议已生成')
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
  const inProgressProjects = salesProjects.filter((project) => project.status === '进行中').length
  const completedProjects = salesProjects.filter((project) => project.status === '已完成').length
  const lostProjects = salesProjects.filter((project) => project.status === '已流失').length
  const rankedSeller = sortedSellerRankings[0]?.name || '李晶云'
  const activeAgents = managedAgents.filter((agent) => agent.status === '启用').length
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
      code: 'TR-202607-A01',
      title: 'Aster Nova X 价值传递训练',
      description: '围绕新能源 SUV 的价格、续航、智能座舱与金融方案，训练顾问完整解释客户关注点。',
      questions: '10 题',
      status: '启用',
      level: '专业严谨',
      owner: '培训教练智能体',
      learners: 18,
      passRate: 86,
    },
    {
      code: 'TR-202607-B02',
      title: 'Deepvision 销售沟通培训',
      description: '通过标准问答和追问练习，帮助销售建立顾问式沟通的底层结构。',
      questions: '15 题',
      status: '启用',
      level: '专业严谨',
      owner: '销售主管',
      learners: 24,
      passRate: 43,
    },
    {
      code: 'TR-202607-C03',
      title: '私域运营系统培训',
      description: '训练销售在私域触达、客户分层、活动邀约和售后回访中的表达方式。',
      questions: '11 题',
      status: '启用',
      level: '专业严谨',
      owner: '运营管理员',
      learners: 16,
      passRate: 62,
    },
  ]
  const trainingRecords = [
    { title: 'Aster Nova X 价值传递训练', state: '已完成', duration: '28秒 · 2条对话', time: '2026-07-08 09:20', score: '86/100', user: '李晶云', advice: '金融方案表达完整，可补充竞品交付周期对比。' },
    { title: 'Deepvision 销售沟通培训', state: '已完成', duration: '27秒 · 2条对话', time: '2026-07-07 11:11', score: '0/100', user: '肖玉洁', advice: '缺少预算追问和下一步邀约，需要主管复盘。' },
    { title: '私域运营系统培训', state: '学习中', duration: '1分钟 · 2条对话', time: '2026-07-07 14:18', score: '0/100', user: '张世豪', advice: '私域触达节奏不清晰，建议补充客户分层话术。' },
    { title: 'Aster Nova X 试驾邀约训练', state: '已完成', duration: '42秒 · 2条对话', time: '2026-07-06 14:23', score: '92/100', user: 'Helen', advice: '邀约目标明确，可沉淀为团队优秀案例。' },
    { title: 'Deepvision 销售实战：报价异议', state: '已完成', duration: '0分钟 · 0条对话', time: '2026-07-05 10:37', score: '10/100', user: 'nikun2', advice: '报价异议处理过短，需要补充价值锚点。' },
    { title: 'Deepvision 销售沟通培训', state: '已完成', duration: '24秒 · 2条对话', time: '2026-07-05 10:40', score: '0/100', user: '王舒悦', advice: '客户需求确认不足，建议二次练习。' },
    { title: '私域运营系统培训', state: '已完成', duration: '33秒 · 4条对话', time: '2026-07-04 14:34', score: '2/100', user: '黄艳平', advice: '活动权益描述不完整，需要补充邀约闭环。' },
    { title: 'Aster Nova X 家庭客户跟进', state: '学习中', duration: '1分钟 · 2条对话', time: '2026-07-03 15:03', score: '76/100', user: '李晶云', advice: '家庭场景把握较好，建议强化旧车置换问题。' },
  ]
  const activeTrainingView = activeView === 'training' ? 'myTraining' : activeView
  const trainingQuestionTotal = trainingPrograms.reduce((sum, program) => sum + Number(program.questions.replace(' 题', '')), 0)
  const trainingAveragePassRate = Math.round(trainingPrograms.reduce((sum, program) => sum + program.passRate, 0) / Math.max(1, trainingPrograms.length))
  const trainingLowScoreCount = trainingRecords.filter((record) => Number(record.score.split('/')[0]) < 60).length
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
              [`${trainingAveragePassRate}%`, '平均通过率', '较上周 +12%'],
              [`${trainingRecords.length}`, '训练记录', '本月训练次数'],
              [`${trainingPrograms.length}`, '启用课程', `${trainingBotCount} 个智能体`],
              [`${trainingLowScoreCount}`, '待提升记录', '低分训练需复盘'],
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
                {[...trainingRecords]
                  .sort((left, right) => Number(left.score.split('/')[0]) - Number(right.score.split('/')[0]))
                  .slice(0, 5)
                  .map((record, index) => (
                  <div key={`${record.title}-${record.time}`}>
                    <b>{index + 1}</b>
                    <span>{record.user} · {record.title}</span>
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
                <p>{record.user} · {record.duration}</p>
                <div className="training-advice">{record.advice}</div>
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
              <strong>{trainingQuestionTotal}</strong>
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
                    <div>
                      <h3>{program.title}</h3>
                      <p>{program.code} · {program.owner}</p>
                    </div>
                    <span>{program.status}</span>
                  </div>
                  <p>{program.description}</p>
                  <div className="training-progress-row">
                    <span style={{ width: `${program.passRate}%` }} />
                    <b>{program.passRate}% 通过</b>
                  </div>
                  <div className="training-card-footer">
                    <span>{program.questions}</span>
                    <span>{program.learners} 人学习</span>
                    <b>{program.level}</b>
                  </div>
                  <button type="button">点击进入编辑</button>
                </article>
              ))}
            </div>
          </article>
          <div className="training-rule-grid">
            {[
              ['考试规则', '随机抽题 10 题，低于 60 分自动进入复训。'],
              ['AI 评分', '从追问深度、价值表达、成交推进三个维度评分。'],
              ['主管复盘', '低分记录自动推送给直属主管，并生成改进建议。'],
              ['素材维护', '支持话术、竞品对比、金融政策和交付 FAQ。'],
            ].map(([title, desc]) => (
              <article key={title}>
                <strong>{title}</strong>
                <p>{desc}</p>
              </article>
            ))}
          </div>
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
        <div className="training-summary-grid">
          {[
            [`${trainingPrograms.length}`, '可学习课程'],
            [`${trainingAveragePassRate}%`, '平均通过率'],
            [`${trainingLowScoreCount}`, '待复盘记录'],
          ].map(([value, label]) => (
            <article key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </article>
          ))}
        </div>
        <div className="training-course-grid">
          {trainingPrograms.map((program, index) => (
            <article className="training-course-card" key={program.title}>
              <h3>{program.title}</h3>
              <p>{program.description}</p>
              <div className="training-course-tags">
                <span>{program.code}</span>
                <span>{program.questions}</span>
                <span>AI 老师</span>
                <span>{program.passRate}/100</span>
              </div>
              <div className="training-result-box">
                <span>{index === 2 ? '学习中' : '已完成'}</span>
                <b>{index === 0 ? '2026-07-08 09:20' : '2026-07-07 11:11'}</b>
                <p>{program.owner} · {program.learners} 人学习</p>
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
                <p>{record.user} · {record.duration}</p>
                <div className="training-advice">{record.advice}</div>
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

  const renderProjectsPage = () => {
    const projectStats = [
      { label: '进行中', value: inProgressProjects, hint: '需要持续跟进' },
      { label: '已完成', value: completedProjects, hint: '进入交付回访' },
      { label: '已流失', value: lostProjects, hint: '等待复盘' },
      { label: '预计成交额', value: money(String(salesProjects.reduce((sum, project) => sum + project.amount, 0))), hint: '测试项目合计' },
    ]

    return (
      <section className="sales-video-page">
        <div className="video-page-heading">
          <div>
            <h2>我的项目</h2>
            <p>参考视频的项目卡片流：按状态筛选，支持新建、编辑、删除和继续陪访。</p>
          </div>
          <button className="primary-action" type="button" onClick={openProjectCreate}>
            <Plus size={16} />
            新建项目
          </button>
        </div>

        <div className="video-stat-grid">
          {projectStats.map((stat) => (
            <article className="video-stat-card" key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <p>{stat.hint}</p>
            </article>
          ))}
        </div>

        <div className="video-toolbar">
          <input value={projectQuery} onChange={(event) => setProjectQuery(event.target.value)} placeholder="搜索项目、负责人、行业或标签" />
          <select value={projectStatus} onChange={(event) => setProjectStatus(event.target.value as '全部' | SalesProjectStatus)}>
            <option value="全部">全部状态</option>
            <option value="进行中">进行中</option>
            <option value="已完成">已完成</option>
            <option value="已流失">已流失</option>
          </select>
        </div>

        <div className="project-group-strip">
          {(['进行中', '已完成', '已流失'] as SalesProjectStatus[]).map((status) => (
            <button
              type="button"
              className={projectStatus === status ? 'active' : ''}
              key={status}
              onClick={() => setProjectStatus(projectStatus === status ? '全部' : status)}
            >
              {status}
              <b>{salesProjects.filter((project) => project.status === status).length}</b>
            </button>
          ))}
        </div>

        <div className="project-card-grid">
          {filteredProjects.map((project) => {
            const statusClass = project.status === '进行中' ? 'active' : project.status === '已完成' ? 'done' : 'lost'
            return (
              <article className={`project-card ${statusClass}`} key={project.id}>
                <div className="project-card-header">
                  <div>
                    <h3>{project.name}</h3>
                    <p>{project.industry} · {project.source}</p>
                  </div>
                  <span>{project.score} 分</span>
                </div>
                <div className="project-card-tags">
                  <b>{project.status}</b>
                  <b>{project.level}</b>
                  <b>{project.stage}</b>
                </div>
                <dl className="project-facts">
                  <div>
                    <dt>负责人</dt>
                    <dd>{project.owner}</dd>
                  </div>
                  <div>
                    <dt>陪访智能体</dt>
                    <dd>{project.companionAgent}</dd>
                  </div>
                  <div>
                    <dt>成交额</dt>
                    <dd>{money(String(project.amount))}</dd>
                  </div>
                  <div>
                    <dt>截止日期</dt>
                    <dd>{project.dueAt}</dd>
                  </div>
                </dl>
                <div className="project-progress-row">
                  <span style={{ width: `${project.progress}%` }} />
                  <b>{project.progress}%</b>
                </div>
                <p className="project-description">{project.description}</p>
                <div className="project-next-action">
                  <strong>下一步</strong>
                  <span>{project.nextAction}</span>
                </div>
                <div className="project-actions">
                  <button type="button" onClick={() => openProjectEdit(project)}>查看详情</button>
                  <button type="button" onClick={() => openProjectEdit(project)}>编辑</button>
                  <button className="danger" type="button" onClick={() => deleteProject(project.id)}>删除</button>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    )
  }

  const renderRankingPage = () => {
    const topSeller = sortedSellerRankings[0]
    const totalSales = sortedSellerRankings.reduce((sum, seller) => sum + seller.sales, 0)
    const totalRevenue = sortedSellerRankings.reduce((sum, seller) => sum + seller.revenue, 0)

    return (
      <section className="sales-video-page">
        <div className="video-page-heading">
          <div>
            <h2>销售排名</h2>
            <p>已加入真实测试数据，排名按销量、成交率、项目质量和培训得分综合计算。</p>
          </div>
          <button className="ghost-action" type="button" onClick={() => setStatusText('排名数据已刷新')}>
            <RefreshCw size={16} />
            刷新排名
          </button>
        </div>

        <div className="ranking-hero-grid">
          <article className="ranking-winner-card">
            <span>当前榜首</span>
            <h3>{topSeller?.name}</h3>
            <p>{topSeller?.sales} 单成交 · {money(String(topSeller?.revenue || 0))} 成交额</p>
          </article>
          <article className="video-stat-card">
            <span>上榜人数</span>
            <strong>{sortedSellerRankings.length}</strong>
            <p>覆盖主管、销售和新人账号</p>
          </article>
          <article className="video-stat-card">
            <span>成交总数</span>
            <strong>{totalSales}</strong>
            <p>来自 2026 年 7 月测试数据</p>
          </article>
          <article className="video-stat-card">
            <span>成交额</span>
            <strong>{money(String(totalRevenue))}</strong>
            <p>订单、定金和报价联动</p>
          </article>
        </div>

        <div className="ranking-table-wrap">
          <table className="ranking-table">
            <thead>
              <tr>
                <th>排名</th>
                <th>销售</th>
                <th>成交 / 流失</th>
                <th>成交率</th>
                <th>项目质量均分</th>
                <th>培训得分</th>
                <th>综合排名分</th>
                <th>本月新增</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {sortedSellerRankings.map((seller, index) => {
                const score = seller.sales * 12 + seller.conversion * 0.25 + seller.qualityScore * 0.35 + (seller.trainingScore || 0) * 0.2
                return (
                  <tr className={index === 0 ? 'top-rank' : ''} key={seller.name}>
                    <td><span className={`rank-badge rank-${index + 1}`}>{index + 1}</span></td>
                    <td><strong>{seller.name}</strong></td>
                    <td>{seller.sales} / {seller.lost}</td>
                    <td>{seller.conversion}%</td>
                    <td>{seller.qualityScore}</td>
                    <td>{seller.trainingScore ?? '暂无'}</td>
                    <td><b>{score.toFixed(1)}</b></td>
                    <td>{seller.monthlyNew ? `+${seller.monthlyNew}` : '-'}</td>
                    <td><button type="button" onClick={() => setProjectQuery(seller.name)}>查看详情</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  const renderReportsPage = () => {
    const totalAmount = salesProjects.reduce((sum, project) => sum + project.amount, 0)
    const receivedAmount = salesProjects.reduce((sum, project) => sum + project.received, 0)
    const averageScore = Math.round(salesProjects.reduce((sum, project) => sum + project.score, 0) / Math.max(1, salesProjects.length))
    const funnelStages = [
      { label: '线索确认', value: salesProjects.length },
      { label: '需求诊断', value: salesProjects.filter((project) => project.progress >= 20).length },
      { label: '方案演示', value: salesProjects.filter((project) => project.progress >= 45).length },
      { label: '报价推进', value: salesProjects.filter((project) => project.progress >= 60).length },
      { label: '成交交付', value: completedProjects },
    ]
    const maxFunnelValue = Math.max(...funnelStages.map((stage) => stage.value), 1)

    return (
      <section className="sales-video-page">
        <div className="video-page-heading">
          <div>
            <h2>数据与报告</h2>
            <p>按参考视频增加销售漏斗、成交项目得分、团队统计和报告卡片。</p>
          </div>
          <button className="primary-action" type="button" onClick={() => setStatusText('报告已导出到本地演示队列')}>
            <FileText size={16} />
            导出报告
          </button>
        </div>

        <div className="video-stat-grid reports">
          <article className="video-stat-card">
            <span>项目数</span>
            <strong>{salesProjects.length}</strong>
            <p>进行中 {inProgressProjects} · 已完成 {completedProjects}</p>
          </article>
          <article className="video-stat-card">
            <span>成交额</span>
            <strong>{money(String(totalAmount))}</strong>
            <p>已回款 {money(String(receivedAmount))}</p>
          </article>
          <article className="video-stat-card">
            <span>质量均分</span>
            <strong>{averageScore}</strong>
            <p>来自项目质量与客户等级</p>
          </article>
          <article className="video-stat-card">
            <span>风险项目</span>
            <strong>{lostProjects + salesProjects.filter((project) => project.risk !== '暂无重大风险。').length}</strong>
            <p>需复盘价格、竞品与交付</p>
          </article>
        </div>

        <div className="report-dashboard-grid">
          <article className="report-panel funnel-panel">
            <div className="report-panel-header">
              <h3>销售漏斗</h3>
              <span>各销售阶段分布</span>
            </div>
            <div className="funnel-list">
              {funnelStages.map((stage) => (
                <div key={stage.label}>
                  <span>{stage.label}</span>
                  <strong>{stage.value} 个</strong>
                  <b style={{ width: `${Math.max(12, (stage.value / maxFunnelValue) * 100)}%` }} />
                </div>
              ))}
            </div>
          </article>

          <article className="report-panel">
            <div className="report-panel-header">
              <h3>已成交项目得分排行</h3>
              <span>质量得分从高到低展示 Top 6</span>
            </div>
            <div className="score-bar-list">
              {[...salesProjects].sort((left, right) => right.score - left.score).slice(0, 6).map((project) => (
                <div key={project.id}>
                  <span>{project.name}</span>
                  <b style={{ width: `${project.score}%` }} />
                  <strong>{project.score}</strong>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="report-dashboard-grid lower">
          <article className="report-panel">
            <div className="report-panel-header">
              <h3>团队成员项目完成数</h3>
              <span>来自销售排名测试数据</span>
            </div>
            <div className="team-report-list">
              {sortedSellerRankings.slice(0, 5).map((seller) => (
                <div key={seller.name}>
                  <span>{seller.name}</span>
                  <strong>{seller.sales} 单</strong>
                  <em>{money(String(seller.revenue))}</em>
                </div>
              ))}
            </div>
          </article>
          <article className="report-panel report-card-stack">
            <div className="report-panel-header">
              <h3>报告卡片</h3>
              <span>月报、日报和风险报告</span>
            </div>
            {[
              ['2026 年 7 月销售月报', '生成中', '重点复盘 Nova X 项目成交与流失原因。'],
              ['2026-07-08 门店日报', '已生成', '今日新增项目 2 个，试驾预约 3 场。'],
              ['竞品价格风险报告', '待处理', 'Trail PHEV 企业采购项目出现账期风险。'],
            ].map(([title, state, desc]) => (
              <article className="report-mini-card" key={title}>
                <div>
                  <h4>{title}</h4>
                  <p>{desc}</p>
                </div>
                <span>{state}</span>
              </article>
            ))}
          </article>
        </div>
      </section>
    )
  }

  const renderAgentsPage = () => (
    <section className="sales-video-page">
      <div className="video-page-heading">
        <div>
          <h2>智能体管理</h2>
          <p>参考视频的新建智能体流程，维护名称、类型、模型、触发规则和提示词。</p>
        </div>
        <button className="primary-action" type="button" onClick={openAgentCreate}>
          <Plus size={16} />
          新建智能体
        </button>
      </div>

      <div className="agent-card-grid">
        {managedAgents.map((agent) => (
          <article className={`agent-card ${agent.status === '启用' ? 'enabled' : 'disabled'}`} key={agent.id}>
            <div className="agent-card-head">
              <div className="agent-avatar">
                <Bot size={22} />
              </div>
              <div>
                <h3>{agent.name}</h3>
                <p>{agent.type} · {agent.owner}</p>
              </div>
              <span>{agent.status}</span>
            </div>
            <dl className="project-facts">
              <div>
                <dt>模型</dt>
                <dd>{agent.model}</dd>
              </div>
              <div>
                <dt>能力数</dt>
                <dd>{agent.skillCount}</dd>
              </div>
              <div>
                <dt>触发规则</dt>
                <dd>{agent.trigger}</dd>
              </div>
              <div>
                <dt>更新</dt>
                <dd>{agent.updatedAt}</dd>
              </div>
            </dl>
            <p>{agent.prompt}</p>
            <div className="project-actions">
              <button type="button" onClick={() => openAgentEdit(agent)}>编辑</button>
              <button type="button" onClick={() => toggleAgentStatus(agent.id)}>{agent.status === '启用' ? '停用' : '启用'}</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )

  const renderPermissionsPage = () => {
    const roleMatrix = [
      ['管理员', '全部数据、角色配置、智能体配置、系统设置'],
      ['主管', '本团队项目、排名、报告、账号分配'],
      ['销售', '本人项目、客户跟进、试驾报价、培训'],
      ['运营', '报告导出、标签配置、线索导入、数据复盘'],
    ]

    return (
      <section className="sales-video-page">
        <div className="video-page-heading">
          <div>
            <h2>权限管理</h2>
            <p>管理销售、主管的登录账号与角色；选择角色后自动赋予对应权限。</p>
          </div>
          <button className="primary-action" type="button" onClick={openAccountCreate}>
            <Plus size={16} />
            新增账号
          </button>
        </div>

        <div className="video-toolbar">
          <input value={permissionSearch} onChange={(event) => setPermissionSearch(event.target.value)} placeholder="搜索姓名或账号" />
          <button className="ghost-action" type="button" onClick={() => setPermissionSearch('')}>清空</button>
        </div>

        <div className="permission-grid">
          <section className="permission-table-card">
            <table className="ranking-table permission-table">
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>账号</th>
                  <th>角色</th>
                  <th>所属主管</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredPermissionAccounts.map((account) => (
                  <tr key={account.id}>
                    <td><strong>{account.name}</strong></td>
                    <td>{account.username}</td>
                    <td><span className="role-pill">{account.role}</span></td>
                    <td>{account.supervisor}</td>
                    <td>{account.status}</td>
                    <td>
                      <button type="button" onClick={() => openAccountEdit(account)}>编辑</button>
                      <button className="text-danger" type="button" onClick={() => deleteAccount(account.id)}>删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <aside className="permission-matrix">
            <h3>角色权限矩阵</h3>
            {roleMatrix.map(([role, scope]) => (
              <article key={role}>
                <strong>{role}</strong>
                <p>{scope}</p>
              </article>
            ))}
          </aside>
        </div>
      </section>
    )
  }

  const renderSettingsPage = () => (
    <form className="sales-video-page settings-page" onSubmit={submitSystemSettings}>
      <div className="video-page-heading">
        <div>
          <h2>系统设置</h2>
          <p>参考视频的系统配置页，集中维护门店、分配规则、模型、数据安全和培训策略。</p>
        </div>
        <div className="heading-actions">
          <button className="ghost-action" type="button" onClick={resetSystemSettings}>恢复默认</button>
          <button className="primary-action" type="submit">
            <CheckCircle2 size={16} />
            保存设置
          </button>
        </div>
      </div>

      <div className="video-stat-grid">
        {[
          ['当前门店', systemSettings.storeName, systemSettings.defaultCity],
          ['默认模型', systemSettings.defaultModel, `Token 告警 ${systemSettings.tokenAlert}%`],
          ['公海回收', `${systemSettings.publicPoolDays} 天`, systemSettings.leadAssignMode],
          ['报告周期', systemSettings.reportCycle, systemSettings.customerPrivacy],
        ].map(([label, value, hint]) => (
          <article className="video-stat-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <p>{hint}</p>
          </article>
        ))}
      </div>

      <div className="settings-grid">
        <section className="report-panel settings-form-panel">
          <div className="report-panel-header">
            <div>
              <h3>基础配置</h3>
              <span>门店信息、线索分配和客户公海规则</span>
            </div>
          </div>
          <div className="settings-form-grid">
            <label>
              门店名称
              <input value={systemSettings.storeName} onChange={(event) => updateSystemSetting('storeName', event.target.value)} />
            </label>
            <label>
              默认城市
              <input value={systemSettings.defaultCity} onChange={(event) => updateSystemSetting('defaultCity', event.target.value)} />
            </label>
            <label>
              线索分配
              <select value={systemSettings.leadAssignMode} onChange={(event) => updateSystemSetting('leadAssignMode', event.target.value)}>
                <option>按销售负载自动分配</option>
                <option>按门店和客户等级分配</option>
                <option>主管手动分配</option>
              </select>
            </label>
            <label>
              公海回收天数
              <input value={systemSettings.publicPoolDays} onChange={(event) => updateSystemSetting('publicPoolDays', event.target.value)} inputMode="numeric" />
            </label>
            <label>
              报告周期
              <select value={systemSettings.reportCycle} onChange={(event) => updateSystemSetting('reportCycle', event.target.value)}>
                <option>每日 20:00 自动生成</option>
                <option>每周一 09:00 自动生成</option>
                <option>仅手动生成</option>
              </select>
            </label>
            <label>
              默认模型
              <select value={systemSettings.defaultModel} onChange={(event) => updateSystemSetting('defaultModel', event.target.value)}>
                <option>gpt-4.1-mini</option>
                <option>gpt-4.1</option>
                <option>o4-mini</option>
              </select>
            </label>
            <label>
              Token 告警阈值
              <input value={systemSettings.tokenAlert} onChange={(event) => updateSystemSetting('tokenAlert', event.target.value)} inputMode="numeric" />
            </label>
            <label>
              培训评分模式
              <select value={systemSettings.trainingStrictness} onChange={(event) => updateSystemSetting('trainingStrictness', event.target.value)}>
                <option>专业严谨</option>
                <option>门店实战</option>
                <option>新人友好</option>
              </select>
            </label>
            <label className="settings-span">
              数据安全策略
              <textarea value={systemSettings.customerPrivacy} onChange={(event) => updateSystemSetting('customerPrivacy', event.target.value)} />
            </label>
          </div>
        </section>

        <aside className="settings-side-stack">
          <section className="report-panel">
            <div className="report-panel-header">
              <h3>业务字段</h3>
              <span>视频中的标签与阶段配置</span>
            </div>
            <div className="settings-field-groups">
              {systemFieldGroups.map((group) => (
                <article key={group.title}>
                  <strong>{group.title}</strong>
                  <div>
                    {group.values.map((value) => (
                      <span key={value}>{value}</span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="report-panel">
            <div className="report-panel-header">
              <h3>策略开关</h3>
              <span>按视频补齐后台配置项</span>
            </div>
            <div className="settings-policy-list">
              {settingPolicyCards.map(([title, desc]) => (
                <article key={title}>
                  <CheckCircle2 size={17} />
                  <div>
                    <strong>{title}</strong>
                    <p>{desc}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </form>
  )

  const renderTokenPage = () => {
    const totalPromptTokens = tokenUsageRecords.reduce((sum, record) => sum + record.promptTokens, 0)
    const totalCompletionTokens = tokenUsageRecords.reduce((sum, record) => sum + record.completionTokens, 0)
    const totalTokens = totalPromptTokens + totalCompletionTokens
    const totalCalls = tokenUsageRecords.reduce((sum, record) => sum + record.calls, 0)
    const totalCost = tokenUsageRecords.reduce((sum, record) => sum + record.cost, 0)
    const maxTrend = Math.max(...tokenTrend.map((item) => item.prompt + item.completion), 1)

    return (
      <section className="sales-video-page token-page">
        <div className="video-page-heading">
          <div>
            <h2>Token 用量</h2>
            <p>展示视频中的用量概览、趋势图、模块排行和费用监控。</p>
          </div>
          <button className="ghost-action" type="button" onClick={() => setStatusText('Token 用量已刷新')}>
            <RefreshCw size={16} />
            刷新用量
          </button>
        </div>

        <div className="video-stat-grid">
          <article className="video-stat-card">
            <span>总 Token</span>
            <strong>{formatTokenCount(totalTokens)}</strong>
            <p>输入 {formatTokenCount(totalPromptTokens)} · 输出 {formatTokenCount(totalCompletionTokens)}</p>
          </article>
          <article className="video-stat-card">
            <span>调用次数</span>
            <strong>{totalCalls}</strong>
            <p>问 AI、新建项目、报价和培训评分</p>
          </article>
          <article className="video-stat-card">
            <span>预估费用</span>
            <strong>¥{totalCost.toFixed(2)}</strong>
            <p>本月预算使用 43%</p>
          </article>
          <article className="video-stat-card">
            <span>告警阈值</span>
            <strong>{systemSettings.tokenAlert}%</strong>
            <p>{systemSettings.defaultModel} 作为默认模型</p>
          </article>
        </div>

        <div className="token-dashboard-grid">
          <section className="report-panel token-chart-panel">
            <div className="report-panel-header">
              <div>
                <h3>近 7 天用量趋势</h3>
                <span>紫色为输入 Token，蓝色为输出 Token</span>
              </div>
            </div>
            <div className="token-trend-chart">
              {tokenTrend.map((item) => {
                const promptHeight = Math.max(12, (item.prompt / maxTrend) * 100)
                const completionHeight = Math.max(10, (item.completion / maxTrend) * 100)
                return (
                  <div key={item.day}>
                    <span className="prompt" style={{ height: `${promptHeight}%` }} />
                    <span className="completion" style={{ height: `${completionHeight}%` }} />
                    <b>{item.day}</b>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="report-panel token-quota-panel">
            <div className="report-panel-header">
              <div>
                <h3>预算与配额</h3>
                <span>按视频增加成本监控卡片</span>
              </div>
            </div>
            {[
              ['本月预算', 43, '¥300 / ¥700'],
              ['高峰并发', 62, '31 / 50'],
              ['缓存命中', 76, '减少重复上下文'],
              ['异常调用', 12, '2 条需复核'],
            ].map(([label, value, hint]) => (
              <div className="token-quota-row" key={label}>
                <div>
                  <strong>{label}</strong>
                  <span>{hint}</span>
                </div>
                <div className="project-progress-row">
                  <span style={{ width: `${value}%` }} />
                  <b>{value}%</b>
                </div>
              </div>
            ))}
          </section>
        </div>

        <section className="ranking-table-wrap">
          <table className="ranking-table token-table">
            <thead>
              <tr>
                <th>模块</th>
                <th>智能体</th>
                <th>模型</th>
                <th>调用</th>
                <th>输入 Token</th>
                <th>输出 Token</th>
                <th>费用</th>
                <th>平均耗时</th>
                <th>趋势</th>
              </tr>
            </thead>
            <tbody>
              {tokenUsageRecords.map((record) => (
                <tr key={`${record.module}-${record.agent}`}>
                  <td><strong>{record.module}</strong></td>
                  <td>{record.agent}</td>
                  <td>{record.model}</td>
                  <td>{record.calls}</td>
                  <td>{formatTokenCount(record.promptTokens)}</td>
                  <td>{formatTokenCount(record.completionTokens)}</td>
                  <td>¥{record.cost.toFixed(2)}</td>
                  <td>{record.latency}</td>
                  <td><span className={record.trend.startsWith('+') ? 'token-up' : 'token-down'}>{record.trend}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
    )
  }

  const renderAskAiPage = () => (
    <section className="sales-video-page ask-ai-page">
      <div className="video-page-heading">
        <div>
          <h2>问 AI</h2>
          <p>按视频补齐数字员工对话台，可围绕项目、排名、Token、培训和系统配置即时提问。</p>
        </div>
        <button className="ghost-action" type="button" onClick={() => setAskAiMessages(initialAskAiMessages)}>清空对话</button>
      </div>

      <div className="ask-ai-layout">
        <aside className="ask-ai-sidebar">
          <section className="report-panel">
            <div className="report-panel-header">
              <div>
                <h3>推荐问题</h3>
                <span>来自视频中的问 AI 快捷入口</span>
              </div>
            </div>
            <div className="ask-ai-template-list">
              {askAiPromptTemplates.map((template) => (
                <button type="button" key={template} onClick={() => submitAskAi(undefined, template)}>
                  <Sparkles size={15} />
                  {template}
                </button>
              ))}
            </div>
          </section>

          <section className="report-panel ask-ai-context">
            <div className="report-panel-header">
              <div>
                <h3>当前上下文</h3>
                <span>AI 会优先参考这些业务数据</span>
              </div>
            </div>
            <article>
              <FolderOpen size={16} />
              <div>
                <strong>{salesProjects.length} 个项目</strong>
                <p>{inProgressProjects} 个进行中，{lostProjects} 个需复盘</p>
              </div>
            </article>
            <article>
              <TrendingUp size={16} />
              <div>
                <strong>{rankedSeller}</strong>
                <p>当前销售榜首，适合作为优秀案例</p>
              </div>
            </article>
            <article>
              <Zap size={16} />
              <div>
                <strong>{formatTokenCount(tokenUsageRecords[0].promptTokens + tokenUsageRecords[0].completionTokens)}</strong>
                <p>问 AI 模块本月 Token 用量</p>
              </div>
            </article>
          </section>
        </aside>

        <section className="ask-ai-chat-panel">
          <div className="ask-ai-chat-header">
            <div className="agent-avatar">
              <MessageSquareText size={22} />
            </div>
            <div>
              <h3>销售数字员工</h3>
              <p>连接项目、培训、报告和系统配置的运营助手</p>
            </div>
          </div>
          <div className="ask-ai-message-list">
            {askAiMessages.map((message) => (
              <article className={`ask-ai-message ${message.role}`} key={message.id}>
                <span>{message.role === 'assistant' ? 'AI' : currentUserName}</span>
                <p>{message.content}</p>
                <b>{message.time}</b>
              </article>
            ))}
          </div>
          <form className="ask-ai-input" onSubmit={(event) => submitAskAi(event)}>
            <textarea
              value={askAiInput}
              onChange={(event) => setAskAiInput(event.target.value)}
              placeholder="例如：帮我分析 Aster Nova X 项目的下一步跟进话术"
            />
            <button className="primary-action" type="submit">
              <Send size={16} />
              发送
            </button>
          </form>
        </section>
      </div>
    </section>
  )

  const renderManagementContent = () => {
    if (activeView === 'projects') return renderProjectsPage()
    if (activeView === 'ranking') return renderRankingPage()
    if (activeView === 'reports') return renderReportsPage()
    if (activeView === 'agents') return renderAgentsPage()
    if (activeView === 'permissions') return renderPermissionsPage()
    if (activeView === 'settings') return renderSettingsPage()
    if (activeView === 'token') return renderTokenPage()
    if (activeView === 'askAi') return renderAskAiPage()
    return null
  }

  const renderProjectModal = () =>
    projectModal && (
      <div className="video-modal-backdrop" role="presentation">
        <form className="video-modal project-modal" onSubmit={submitProjectForm}>
          <div className="video-modal-header">
            <div>
              <h3>{projectModal.mode === 'edit' ? '编辑项目' : '新建项目'}</h3>
              <p>创建后会进入项目列表，并自动生成首次陪访任务。</p>
            </div>
            <button type="button" onClick={closeProjectModal}>×</button>
          </div>
          <div className="modal-form-grid">
            <label>
              客户名称 *
              <input value={projectForm.name} onChange={(event) => setProjectForm((current) => ({ ...current, name: event.target.value }))} maxLength={20} placeholder="请输入客户名称" />
            </label>
            <label>
              负责人 *
              <select value={projectForm.owner} onChange={(event) => setProjectForm((current) => ({ ...current, owner: event.target.value }))}>
                {sortedSellerRankings.slice(0, 6).map((seller) => (
                  <option value={seller.name} key={seller.name}>{seller.name}</option>
                ))}
              </select>
            </label>
            <label>
              陪访智能体 *
              <select value={projectForm.companionAgent} onChange={(event) => setProjectForm((current) => ({ ...current, companionAgent: event.target.value }))}>
                {managedAgents.map((agent) => (
                  <option value={agent.name} key={agent.id}>{agent.name}</option>
                ))}
              </select>
            </label>
            <label>
              客户行业
              <input value={projectForm.industry} onChange={(event) => setProjectForm((current) => ({ ...current, industry: event.target.value }))} placeholder="例：家庭用车、企业采购" />
            </label>
            <label>
              客户等级
              <select value={projectForm.level} onChange={(event) => setProjectForm((current) => ({ ...current, level: event.target.value }))}>
                <option>A 类客户</option>
                <option>B 类客户</option>
                <option>C 类客户</option>
              </select>
            </label>
            <label>
              项目来源
              <select value={projectForm.source} onChange={(event) => setProjectForm((current) => ({ ...current, source: event.target.value }))}>
                <option>官网线索</option>
                <option>直播留资</option>
                <option>门店到访</option>
                <option>老客转介绍</option>
                <option>私域转介绍</option>
              </select>
            </label>
            <label>
              项目状态
              <select value={projectForm.status} onChange={(event) => setProjectForm((current) => ({ ...current, status: event.target.value as SalesProjectStatus }))}>
                <option value="进行中">进行中</option>
                <option value="已完成">已完成</option>
                <option value="已流失">已流失</option>
              </select>
            </label>
            <label>
              预计成交额
              <input value={projectForm.amount} onChange={(event) => setProjectForm((current) => ({ ...current, amount: event.target.value }))} inputMode="numeric" />
            </label>
            <label>
              已回款
              <input value={projectForm.received} onChange={(event) => setProjectForm((current) => ({ ...current, received: event.target.value }))} inputMode="numeric" />
            </label>
            <label>
              截止日期
              <input value={projectForm.dueAt} onChange={(event) => setProjectForm((current) => ({ ...current, dueAt: event.target.value }))} type="date" />
            </label>
            <label className="modal-range">
              推进进度
              <input value={projectForm.progress} onChange={(event) => setProjectForm((current) => ({ ...current, progress: event.target.value }))} type="range" min="0" max="100" />
              <b>{projectForm.progress}%</b>
            </label>
            <label className="modal-span">
              项目描述
              <textarea value={projectForm.description} onChange={(event) => setProjectForm((current) => ({ ...current, description: event.target.value }))} placeholder="描述客户关注点、竞品风险和下一步计划" />
            </label>
          </div>
          <div className="video-modal-actions">
            <button type="button" onClick={closeProjectModal}>取消</button>
            <button className="primary-action" type="submit">{projectModal.mode === 'edit' ? '保存项目' : '创建项目'}</button>
          </div>
        </form>
      </div>
    )

  const renderAgentModal = () =>
    agentModal && (
      <div className="video-modal-backdrop" role="presentation">
        <form className="video-modal" onSubmit={submitAgentForm}>
          <div className="video-modal-header">
            <div>
              <h3>{agentModal.mode === 'edit' ? '编辑智能体' : '新建智能体'}</h3>
              <p>配置销售智能体的基础提示词和陪访提问规则。</p>
            </div>
            <button type="button" onClick={closeAgentModal}>×</button>
          </div>
          <div className="modal-form-grid">
            <label>
              智能体名称
              <input value={agentForm.name} onChange={(event) => setAgentForm((current) => ({ ...current, name: event.target.value }))} placeholder="如：通用销售顾问" />
            </label>
            <label>
              智能体类型
              <select value={agentForm.type} onChange={(event) => setAgentForm((current) => ({ ...current, type: event.target.value }))}>
                <option>陪访智能体</option>
                <option>报价智能体</option>
                <option>培训智能体</option>
                <option>客户诊断智能体</option>
              </select>
            </label>
            <label>
              所属部门
              <input value={agentForm.owner} onChange={(event) => setAgentForm((current) => ({ ...current, owner: event.target.value }))} />
            </label>
            <label>
              模型
              <select value={agentForm.model} onChange={(event) => setAgentForm((current) => ({ ...current, model: event.target.value }))}>
                <option>gpt-4.1-mini</option>
                <option>gpt-4.1</option>
                <option>o4-mini</option>
              </select>
            </label>
            <label className="modal-span">
              陪访提问规则
              <textarea value={agentForm.trigger} onChange={(event) => setAgentForm((current) => ({ ...current, trigger: event.target.value }))} />
            </label>
            <label className="modal-span">
              基础提示词
              <textarea value={agentForm.prompt} onChange={(event) => setAgentForm((current) => ({ ...current, prompt: event.target.value }))} placeholder="告诉智能体如何分析客户、生成问题和输出建议" />
            </label>
          </div>
          <div className="video-modal-actions">
            <button type="button" onClick={closeAgentModal}>取消</button>
            <button className="primary-action" type="submit">保存</button>
          </div>
        </form>
      </div>
    )

  const renderPermissionModal = () =>
    permissionModal && (
      <div className="video-modal-backdrop" role="presentation">
        <form className="video-modal permission-modal" onSubmit={submitAccountForm}>
          <div className="video-modal-header">
            <div>
              <h3>{permissionModal.mode === 'edit' ? '编辑账号' : '新增账号'}</h3>
              <p>选择角色后，系统将自动加载对应权限范围。</p>
            </div>
            <button type="button" onClick={closeAccountModal}>×</button>
          </div>
          <div className="modal-form-grid">
            <label>
              姓名
              <input value={permissionForm.name} onChange={(event) => setPermissionForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label>
              账号
              <input value={permissionForm.username} onChange={(event) => setPermissionForm((current) => ({ ...current, username: event.target.value }))} />
            </label>
            <label>
              角色
              <select value={permissionForm.role} onChange={(event) => setPermissionForm((current) => ({ ...current, role: event.target.value as PermissionAccount['role'] }))}>
                <option value="主管">主管</option>
                <option value="销售">销售</option>
                <option value="管理员">管理员</option>
                <option value="运营">运营</option>
              </select>
            </label>
            <label>
              所属主管
              <select value={permissionForm.supervisor} onChange={(event) => setPermissionForm((current) => ({ ...current, supervisor: event.target.value }))}>
                <option>-</option>
                <option>李晶云</option>
                <option>肖玉洁</option>
                <option>未分配</option>
              </select>
            </label>
            <label>
              状态
              <select value={permissionForm.status} onChange={(event) => setPermissionForm((current) => ({ ...current, status: event.target.value as PermissionAccount['status'] }))}>
                <option value="启用">启用</option>
                <option value="停用">停用</option>
              </select>
            </label>
          </div>
          <div className="permission-preview">
            <strong>{permissionForm.role}权限</strong>
            <p>
              {permissionForm.role === '管理员'
                ? '全部数据、角色配置、智能体配置、系统设置'
                : permissionForm.role === '主管'
                  ? '本团队项目、排名、报告、账号分配'
                  : permissionForm.role === '运营'
                    ? '报告导出、标签配置、线索导入、数据复盘'
                    : '本人项目、客户跟进、试驾报价、培训'}
            </p>
          </div>
          <div className="video-modal-actions">
            <button type="button" onClick={closeAccountModal}>取消</button>
            <button className="primary-action" type="submit">保存账号</button>
          </div>
        </form>
      </div>
    )

  const isManagementView = ['projects', 'ranking', 'reports', 'agents', 'permissions', 'settings', 'token', 'askAi'].includes(activeView)

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
    <main className={`app-frame ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <div className="sidebar-logo-eye">
              <span />
            </div>
            <strong>deepvision</strong>
          </div>
          <button
            className="sidebar-collapse"
            type="button"
            title={sidebarCollapsed ? '展开侧栏' : '收起侧栏'}
            aria-label={sidebarCollapsed ? '展开侧栏' : '收起侧栏'}
            aria-pressed={sidebarCollapsed}
            onClick={() => setSidebarCollapsed((value) => !value)}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
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
                  aria-expanded={item.id === 'training' ? trainingExpanded : undefined}
                  title={item.label}
                  onClick={() => {
                    if (item.id === 'training') {
                      setTrainingExpanded((value) => !value)
                      if (!isTrainingActive) setActiveView('myTraining')
                      return
                    }
                    setActiveView(item.id)
                  }}
                >
                  <Icon size={18} />
                  <span>
                    <strong>{item.label}</strong>
                  </span>
                  {item.id === 'training' && <ChevronDown className="training-chevron" size={15} />}
                </button>
                {item.id === 'training' && trainingExpanded && (
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
        <button className={`sidebar-ai ${activeView === 'askAi' ? 'active' : ''}`} type="button" title="问 AI" onClick={() => setActiveView('askAi')}>
          <Sparkles size={16} />
          <span>问 AI</span>
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
                    <button className="pilot-card-link" type="button" onClick={() => handlePilotCardAction(card)}>
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
                    <button className="pilot-card-link" type="button" onClick={() => handlePilotCardAction(card)}>
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

      {isManagementView && renderManagementContent()}

      {activeModule && activeView !== 'desk' && !isTrainingView && !isManagementView && (
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
                  <button className="pilot-card-link" type="button" onClick={() => handlePilotCardAction(card)}>
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
      {renderProjectModal()}
      {renderAgentModal()}
      {renderPermissionModal()}
      </section>
    </main>
  )
}

export default App
