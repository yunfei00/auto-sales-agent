export type UserProfile = {
  role: string
  phone: string
  tenant: number | null
  tenant_name: string
  store: number | null
  store_name: string
}

export type CurrentUser = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  display_name: string
  is_staff: boolean
  is_superuser: boolean
  profile?: UserProfile | null
}

export type SessionPayload = {
  authenticated: boolean
  user: CurrentUser | null
  csrf_token?: string
}

export type DemandProfile = {
  id: number
  budget_min: string | null
  budget_max: string | null
  energy_type: string
  body_type: string
  seats: number | null
  preferred_brands: string[]
  preferred_models: string[]
  usage_scenario: string
  payment_preference: string
  trade_in_intent: boolean
  purchase_timeline: string
  key_concerns: string[]
  competitor_models: string[]
  ai_summary: string
}

export type Lead = {
  id: number
  name: string
  phone: string
  city: string
  intent_model: string
  budget_min: string | null
  budget_max: string | null
  purchase_timeline: string
  ai_tags: string[]
  score: number
  status: string
  notes: string
  customer: number | null
  customer_name: string
  store_name: string
  source_name: string
  assigned_to_name: string
  created_at: string
  updated_at: string
}

export type Customer = {
  id: number
  name: string
  phone: string
  wechat: string
  city: string
  source_label: string
  stage: string
  tags: string[]
  deal_probability: number
  next_action: string
  next_action_due_at: string | null
  tenant_name: string
  store_name: string
  owner_name: string
  demand_profile?: DemandProfile | null
}

export type CustomerTask = {
  id: number
  customer: number
  customer_name: string
  owner: number | null
  owner_name: string
  title: string
  task_type: string
  due_at: string | null
  priority: number
  status: string
  notes: string
}

export type Interaction = {
  id: number
  customer: number
  customer_name: string
  channel: string
  occurred_at: string
  summary: string
  raw_content: string
  ai_summary: string
  created_by_name: string
}

export type Quote = {
  id: number
  customer: number
  customer_name: string
  inventory: number | null
  inventory_title: string
  consultant_name: string
  status: string
  bare_vehicle_price: string
  discount_amount: string
  insurance_amount: string
  license_fee: string
  accessory_amount: string
  finance_down_payment: string | null
  finance_monthly_payment: string | null
  landing_price: string
  ai_explanation: string
  notes: string
  created_at: string
}

export type TestDrive = {
  id: number
  customer: number
  customer_name: string
  inventory: number | null
  inventory_title: string
  consultant_name: string
  scheduled_at: string
  status: string
  feedback: string
}

export type VehicleCard = {
  inventory_id: number
  vin: string
  vehicle_model_id: number
  title: string
  brand: string
  model: string
  trim: string
  price: string
  official_price: string
  inventory_status: string
  exterior_color: string
  range_km: number | null
  match_score: number
  reasons: string[]
  risks: string[]
  policy: {
    title: string
    amount: string
  }
  actions: string[]
}

export type VehicleRecommendationResult = {
  type: string
  summary: string
  demand: Record<string, string | number | boolean | string[] | null>
  cards: VehicleCard[]
  next_best_actions: Array<{
    action: string
    label: string
    priority: string
  }>
}

export type FollowupScriptResult = {
  type: string
  scenario: string
  script: string
  talking_points: string[]
  next_best_action: {
    action: string
    label: string
  }
}

export type QuoteSuggestionResult = {
  type: string
  customer_id?: number
  inventory_id: number
  vin: string
  bare_vehicle_price: string
  discount_amount: string
  insurance_amount: string
  license_fee: string
  accessory_amount: string
  landing_price: string
  finance_down_payment: string
  finance_monthly_payment: string
  explanation: string
}

type Paginated<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin
let sessionCsrfToken = ''

function getCookie(name: string) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || ''
  return ''
}

function buildUrl(path: string) {
  return `${API_BASE_URL}${path}`
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = init.method || 'GET'
  const headers = new Headers(init.headers)
  const csrfToken = getCookie('csrftoken') || sessionCsrfToken

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (csrfToken && method !== 'GET' && method !== 'HEAD') {
    headers.set('X-CSRFToken', csrfToken)
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    method,
    credentials: 'include',
    headers,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `API ${path} failed with ${response.status}`)
  }

  return response.json() as Promise<T>
}

function postJson<T>(path: string, payload: unknown): Promise<T> {
  return requestJson<T>(path, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

function patchJson<T>(path: string, payload: unknown): Promise<T> {
  return requestJson<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

async function getCollection<T>(path: string): Promise<T[]> {
  const payload = await requestJson<Paginated<T> | T[]>(path)
  return Array.isArray(payload) ? payload : payload.results
}

export function getSession() {
  return requestJson<SessionPayload>('/api/accounts/session/').then((payload) => {
    sessionCsrfToken = payload.csrf_token || sessionCsrfToken
    return payload
  })
}

export function login(username: string, password: string) {
  return postJson<SessionPayload>('/api/accounts/login/', { username, password }).then((payload) => {
    sessionCsrfToken = payload.csrf_token || sessionCsrfToken
    return payload
  })
}

export function logout() {
  return postJson<SessionPayload>('/api/accounts/logout/', {}).then((payload) => {
    sessionCsrfToken = payload.csrf_token || ''
    return payload
  })
}

export function listLeads() {
  return getCollection<Lead>('/api/leads/?ordering=-score')
}

export function listCustomers() {
  return getCollection<Customer>('/api/customers/?ordering=-deal_probability')
}

export function getCustomer(customerId: number) {
  return requestJson<Customer>(`/api/customers/${customerId}/`)
}

export function searchCustomers(query: string) {
  return getCollection<Customer>(`/api/customers/?search=${encodeURIComponent(query)}`)
}

export function listCustomerTasks(customerId: number) {
  return getCollection<CustomerTask>(`/api/customers/tasks/?customer=${customerId}&ordering=status,due_at`)
}

export function listCustomerInteractions(customerId: number) {
  return getCollection<Interaction>(`/api/customers/interactions/?customer=${customerId}&ordering=-occurred_at`)
}

export function listCustomerQuotes(customerId: number) {
  return getCollection<Quote>(`/api/sales/quotes/?customer=${customerId}&ordering=-created_at`)
}

export function listCustomerTestDrives(customerId: number) {
  return getCollection<TestDrive>(`/api/sales/test-drives/?customer=${customerId}&ordering=-scheduled_at`)
}

export function createCustomerTask(customerId: number, title: string) {
  const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  return postJson<CustomerTask>('/api/customers/tasks/', {
    customer: customerId,
    title,
    task_type: 'follow_up',
    due_at: dueAt,
    priority: 1,
    status: 'open',
  })
}

export function completeCustomerTask(taskId: number) {
  return patchJson<CustomerTask>(`/api/customers/tasks/${taskId}/`, { status: 'done' })
}

export function createInteraction(customerId: number, summary: string, channel = 'wechat') {
  return postJson<Interaction>('/api/customers/interactions/', {
    customer: customerId,
    channel,
    occurred_at: new Date().toISOString(),
    summary,
    raw_content: summary,
    ai_summary: summary,
  })
}

export function createQuoteFromSuggestion(customerId: number, draft: QuoteSuggestionResult) {
  return postJson<Quote>('/api/sales/quotes/', {
    customer: customerId,
    inventory: draft.inventory_id,
    status: 'draft',
    bare_vehicle_price: draft.bare_vehicle_price,
    discount_amount: draft.discount_amount,
    tax_amount: '0.00',
    insurance_amount: draft.insurance_amount,
    license_fee: draft.license_fee,
    accessory_amount: draft.accessory_amount,
    finance_down_payment: draft.finance_down_payment,
    finance_monthly_payment: draft.finance_monthly_payment,
    landing_price: draft.landing_price,
    ai_explanation: draft.explanation,
    notes: 'AI 生成报价草案，等待销售顾问确认。',
  })
}

export function createTestDrive(customerId: number, inventoryId: number) {
  const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  scheduledAt.setHours(10, 0, 0, 0)
  return postJson<TestDrive>('/api/sales/test-drives/', {
    customer: customerId,
    inventory: inventoryId,
    scheduled_at: scheduledAt.toISOString(),
    status: 'booked',
  })
}

export function requestVehicleRecommendations(message: string, customerId?: number | null) {
  return postJson<VehicleRecommendationResult>('/api/ai/recommendations/vehicles/', {
    message,
    customer_id: customerId || undefined,
    limit: 3,
  })
}

export function requestFollowupScript(customerId?: number | null, scenario = 'test_drive') {
  return postJson<FollowupScriptResult>('/api/ai/followups/generate/', {
    customer_id: customerId || undefined,
    scenario,
  })
}

export function requestQuoteSuggestion(inventoryId: number, customerId?: number | null) {
  return postJson<QuoteSuggestionResult>('/api/ai/quotes/suggest/', {
    inventory_id: inventoryId,
    customer_id: customerId || undefined,
  })
}

export const emptyRecommendation: VehicleRecommendationResult = {
  type: 'vehicle_recommendation',
  summary: '尚未生成车型推荐。',
  demand: {},
  cards: [],
  next_best_actions: [],
}

export const emptyFollowup: FollowupScriptResult = {
  type: 'followup_script',
  scenario: 'test_drive',
  script: '请选择客户并生成跟进话术。',
  talking_points: [],
  next_best_action: { action: 'book_test_drive', label: '预约试驾' },
}
