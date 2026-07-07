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
  emptyFollowup,
  emptyRecommendation,
  getCustomer,
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
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0,
  }).format(parsed)
}

function dateTime(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function stageLabel(value?: string) {
  return (value || '').replaceAll('_', ' ') || '-'
}

function buildDemandMessage(customer: Customer | null, lead: Lead | null) {
  const demand = customer?.demand_profile
  const parts = [
    demand?.budget_min && demand?.budget_max ? `budget ${demand.budget_min} to ${demand.budget_max}` : '',
    demand?.energy_type || '',
    demand?.body_type || '',
    demand?.usage_scenario || '',
    lead?.intent_model ? `interested in ${lead.intent_model}` : '',
    lead?.purchase_timeline ? `timeline ${lead.purchase_timeline}` : '',
  ].filter(Boolean)
  return parts.join(', ') || 'budget 200000 to 320000, EV SUV, family weekend trips'
}

function App() {
  const [loadState, setLoadState] = useState<LoadState>('checking')
  const [apiState, setApiState] = useState<ApiState>('loading')
  const [statusText, setStatusText] = useState('Checking session')
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  const [leads, setLeads] = useState<Lead[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
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
        setStatusText('Sign in required')
        return
      }
      setUser(session.user)
      setLoadState('authenticated')
      await loadDesk()
    } catch {
      setLoadState('anonymous')
      setApiState('error')
      setStatusText('API unavailable')
    }
  }

  async function loadDesk() {
    setApiState('loading')
    setStatusText('Loading sales workflow')
    const [leadList, customerList] = await Promise.all([listLeads(), listCustomers()])
    setLeads(leadList)
    setCustomers(customerList)
    const firstLead = leadList[0] || null
    const fallbackCustomer = customerList[0] || null
    await chooseLead(firstLead, fallbackCustomer)
    setApiState('ready')
    setStatusText('Connected to Django')
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
    setStatusText(customer ? `Viewing ${customer.name}` : 'Lead selected')
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
      setLoginError('Invalid username or password')
    }
  }

  async function handleLogout() {
    await logout()
    setUser(null)
    setPassword('')
    setLoadState('anonymous')
    setStatusText('Signed out')
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
      setStatusText('Recommendation refreshed')
    } catch {
      setApiState('error')
      setStatusText('Recommendation failed')
    }
  }

  async function chooseVehicle(card: VehicleCard) {
    setSelectedCard(card)
    setQuoteDraft(await requestQuoteSuggestion(card.inventory_id, selectedCustomer?.id))
  }

  async function addFollowupTask() {
    if (!selectedCustomer) return
    const task = await createCustomerTask(selectedCustomer.id, selectedCustomer.next_action || 'Follow up customer')
    setTasks((current) => [task, ...current])
  }

  async function markDone(task: CustomerTask) {
    const updated = await completeCustomerTask(task.id)
    setTasks((current) => current.map((item) => (item.id === updated.id ? updated : item)))
  }

  async function logFollowup() {
    if (!selectedCustomer) return
    const interaction = await createInteraction(selectedCustomer.id, followup.script)
    setInteractions((current) => [interaction, ...current])
  }

  const metrics = [
    { label: 'Priority leads', value: String(leads.length), trend: `${leads.filter((lead) => lead.score >= 80).length} hot`, tone: 'blue' },
    { label: 'Open tasks', value: String(openTasks.length), trend: `${tasks.length} total`, tone: 'green' },
    { label: 'Quote drafts', value: String(quotes.length), trend: latestQuote ? money(latestQuote.landing_price) : '-', tone: 'amber' },
    { label: 'Customers', value: String(customers.length), trend: selectedCustomer?.stage ? stageLabel(selectedCustomer.stage) : '-', tone: 'slate' },
  ]

  if (loadState !== 'authenticated') {
    return (
      <main className="login-shell">
        <section className="login-visual">
          <img src={showroomImg} alt="" />
          <div>
            <div className="eyebrow">Auto Sales Agent</div>
            <h1>Sales workflow console</h1>
            <p>Lead qualification, customer context, AI recommendations and follow-up execution in one workspace.</p>
          </div>
        </section>
        <form className="login-panel" onSubmit={(event) => void handleLogin(event)}>
          <div>
            <h2>Sign in</h2>
            <p>{loadState === 'checking' ? 'Checking session...' : statusText}</p>
          </div>
          <label>
            Username
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
          </label>
          <label>
            Password
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
            Sign in
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">Auto Sales Agent</div>
          <h1>Sales workflow console</h1>
        </div>
        <div className="topbar-actions">
          <div className={`connection ${apiState}`}>
            <span />
            {statusText}
          </div>
          <div className="user-chip">
            <UserRound size={16} />
            <span>{user?.display_name}</span>
            <b>{user?.profile?.role || (user?.is_superuser ? 'admin' : 'user')}</b>
          </div>
          <button className="icon-button" type="button" title="Sign out" onClick={() => void handleLogout()}>
            <LogOut size={17} />
          </button>
        </div>
      </header>

      <section className="metrics-grid" aria-label="Sales metrics">
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
              <h2>Lead queue</h2>
              <p>{leads.length} active records</p>
            </div>
            <button type="button" title="Refresh" onClick={() => void loadDesk()}>
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
                  <span>{lead.intent_model || 'Intent pending'}</span>
                </div>
                <div>
                  <em>{stageLabel(lead.status)}</em>
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
                <h2>{selectedCustomer?.name || selectedLead?.name || 'No customer selected'}</h2>
                <p>
                  {selectedCustomer?.phone || selectedLead?.phone || '-'} · {selectedCustomer?.city || selectedLead?.city || '-'}
                </p>
              </div>
              <div className="score-block">
                <span>Probability</span>
                <strong>{selectedCustomer?.deal_probability ?? selectedLead?.score ?? 0}</strong>
              </div>
            </div>
            <div className="customer-fields">
              <div>
                <span>Stage</span>
                <strong>{stageLabel(selectedCustomer?.stage || selectedLead?.status)}</strong>
              </div>
              <div>
                <span>Owner</span>
                <strong>{selectedCustomer?.owner_name || selectedLead?.assigned_to_name || '-'}</strong>
              </div>
              <div>
                <span>Store</span>
                <strong>{selectedCustomer?.store_name || selectedLead?.store_name || '-'}</strong>
              </div>
              <div>
                <span>Next action</span>
                <strong>{selectedCustomer?.next_action || 'Qualify demand'}</strong>
              </div>
            </div>
          </section>

          <section className="command-panel">
            <img className="showroom-asset" src={showroomImg} alt="" />
            <div className="command-copy">
              <Sparkles size={18} />
              <div>
                <h2>AI demand assistant</h2>
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
              <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Customer demand" />
              <button type="submit" title="Run recommendation" disabled={apiState === 'loading'}>
                {apiState === 'loading' ? <RefreshCw size={18} className="spin" /> : <Send size={18} />}
              </button>
            </form>
          </section>

          <section className="vehicle-section">
            <div className="section-header">
              <div>
                <h2>Recommended vehicles</h2>
                <p>{selectedCustomer?.demand_profile?.ai_summary || 'Live inventory ranked by demand fit.'}</p>
              </div>
              <button className="text-action" type="button" onClick={() => void runRecommendation()}>
                <RefreshCw size={16} />
                Refresh
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
                    <span>{card.exterior_color}</span>
                  </div>
                  <div className="vehicle-body">
                    <div className="vehicle-title-row">
                      <h3>{card.title}</h3>
                      <strong>{card.match_score}</strong>
                    </div>
                    <div className="vehicle-meta">
                      <span>{money(card.price)}</span>
                      <span>{card.range_km ? `${card.range_km} km` : 'Range n/a'}</span>
                      <span>{stageLabel(card.inventory_status)}</span>
                    </div>
                    <p>{card.reasons[0] || 'Inventory match available.'}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="detail-grid">
            <div className="detail-panel">
              <div className="section-header compact">
                <h2>Match rationale</h2>
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
                <h2>Quote draft</h2>
                <button
                  type="button"
                  title="Generate quote"
                  disabled={!selectedCard}
                  onClick={() => selectedCard && void chooseVehicle(selectedCard)}
                >
                  <BadgeDollarSign size={18} />
                </button>
              </div>
              <dl>
                <div>
                  <dt>Landing price</dt>
                  <dd>{money(quoteDraft?.landing_price || latestQuote?.landing_price)}</dd>
                </div>
                <div>
                  <dt>Discount</dt>
                  <dd>{money(quoteDraft?.discount_amount || latestQuote?.discount_amount)}</dd>
                </div>
                <div>
                  <dt>Down payment</dt>
                  <dd>{money(quoteDraft?.finance_down_payment || latestQuote?.finance_down_payment)}</dd>
                </div>
                <div>
                  <dt>Monthly</dt>
                  <dd>{money(quoteDraft?.finance_monthly_payment || latestQuote?.finance_monthly_payment)}</dd>
                </div>
              </dl>
              <p>{quoteDraft?.explanation || latestQuote?.ai_explanation || 'Draft price pending.'}</p>
            </div>
          </section>
        </section>

        <aside className="side-column">
          <section className="script-panel">
            <div className="section-header compact">
              <h2>Follow-up script</h2>
              <button type="button" title="Log follow-up" disabled={!selectedCustomer} onClick={() => void logFollowup()}>
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
              <button type="button" title="Call customer" disabled={!selectedCustomer}>
                <PhoneCall size={17} />
              </button>
              <button type="button" title="Add task" disabled={!selectedCustomer} onClick={() => void addFollowupTask()}>
                <ClipboardList size={17} />
              </button>
              <button type="button" title="Test drive" disabled={!selectedCustomer}>
                <CalendarClock size={17} />
              </button>
            </div>
          </section>

          <section className="task-panel">
            <div className="section-header compact">
              <h2>Open tasks</h2>
              <span>{openTasks.length}</span>
            </div>
            <div className="timeline-list">
              {tasks.slice(0, 5).map((task) => (
                <div className={`timeline-row ${task.status}`} key={task.id}>
                  <div>
                    <strong>{task.title}</strong>
                    <span>{dateTime(task.due_at)} · {stageLabel(task.status)}</span>
                  </div>
                  {task.status === 'open' && (
                    <button type="button" title="Mark done" onClick={() => void markDone(task)}>
                      <ClipboardCheck size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="task-panel">
            <div className="section-header compact">
              <h2>Activity</h2>
              <span>{interactions.length}</span>
            </div>
            <div className="timeline-list">
              {interactions.slice(0, 5).map((item) => (
                <div className="timeline-row" key={item.id}>
                  <div>
                    <strong>{stageLabel(item.channel)}</strong>
                    <span>{dateTime(item.occurred_at)}</span>
                    <p>{item.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="task-panel">
            <div className="section-header compact">
              <h2>Sales state</h2>
              <span>{nextTestDrive ? stageLabel(nextTestDrive.status) : 'No drive'}</span>
            </div>
            <div className="state-stack">
              <div>
                <span>Next test drive</span>
                <strong>{nextTestDrive ? dateTime(nextTestDrive.scheduled_at) : '-'}</strong>
              </div>
              <div>
                <span>Latest quote</span>
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
