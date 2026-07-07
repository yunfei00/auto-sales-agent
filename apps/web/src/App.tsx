import {
  ArrowRight,
  BadgeDollarSign,
  CalendarClock,
  CarFront,
  CheckCircle2,
  ClipboardList,
  Gauge,
  MessageSquareText,
  PhoneCall,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import './App.css'
import showroomImg from './assets/showroom.svg'
import {
  type FollowupScriptResult,
  type QuoteSuggestionResult,
  type VehicleCard,
  type VehicleRecommendationResult,
  fallbackFollowup,
  fallbackQuote,
  fallbackRecommendation,
  requestFollowupScript,
  requestQuoteSuggestion,
  requestVehicleRecommendations,
} from './services/api'

const metrics = [
  { label: 'New leads', value: '38', trend: '+12%', tone: 'blue' },
  { label: 'Booked test drives', value: '14', trend: '+5', tone: 'green' },
  { label: 'Quote drafts', value: '21', trend: '7 pending', tone: 'amber' },
  { label: 'Orders this week', value: '9', trend: '68% target', tone: 'slate' },
]

const leadRows = [
  { name: 'Demo Customer', stage: 'Qualified', intent: 'EV SUV', age: '2h', score: 78 },
  { name: 'Mia Chen', stage: 'New lead', intent: 'Nova X', age: '4h', score: 86 },
  { name: 'Leo Wang', stage: 'Invited', intent: 'Trail PHEV', age: '1d', score: 72 },
]

function money(value: string) {
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return value
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0,
  }).format(parsed)
}

function App() {
  const [query, setQuery] = useState('budget 200000 ev suv for family weekend test drive')
  const [recommendation, setRecommendation] = useState<VehicleRecommendationResult>(fallbackRecommendation)
  const [selectedCard, setSelectedCard] = useState<VehicleCard>(fallbackRecommendation.cards[0])
  const [followup, setFollowup] = useState<FollowupScriptResult>(fallbackFollowup)
  const [quote, setQuote] = useState<QuoteSuggestionResult>(fallbackQuote(fallbackRecommendation.cards[0].inventory_id))
  const [status, setStatus] = useState<'ready' | 'loading' | 'fallback'>('fallback')
  const [statusText, setStatusText] = useState('Using local demo data')

  const selectedReasons = useMemo(() => selectedCard.reasons.slice(0, 3), [selectedCard])

  async function runRecommendation() {
    setStatus('loading')
    setStatusText('Contacting Django AI Gateway')
    try {
      const result = await requestVehicleRecommendations(query)
      const first = result.cards[0]
      setRecommendation(result)
      if (first) {
        setSelectedCard(first)
        await updateQuote(first.inventory_id)
      }
      setStatus('ready')
      setStatusText('Connected to Django AI Gateway')
    } catch {
      setRecommendation(fallbackRecommendation)
      setSelectedCard(fallbackRecommendation.cards[0])
      setQuote(fallbackQuote(fallbackRecommendation.cards[0].inventory_id))
      setStatus('fallback')
      setStatusText('API unavailable, local demo data shown')
    }
  }

  async function updateFollowup() {
    try {
      const result = await requestFollowupScript(1, 'test_drive')
      setFollowup(result)
    } catch {
      setFollowup(fallbackFollowup)
    }
  }

  async function updateQuote(inventoryId = selectedCard.inventory_id) {
    try {
      const result = await requestQuoteSuggestion(inventoryId, 1)
      setQuote(result)
    } catch {
      setQuote(fallbackQuote(inventoryId))
    }
  }

  function chooseVehicle(card: VehicleCard) {
    setSelectedCard(card)
    void updateQuote(card.inventory_id)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">Auto Sales Agent</div>
          <h1>Sales command center</h1>
        </div>
        <div className={`connection ${status}`}>
          <span />
          {statusText}
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

      <section className="workspace">
        <div className="main-column">
          <section className="command-panel">
            <img className="showroom-asset" src={showroomImg} alt="" />
            <div className="command-copy">
              <Sparkles size={18} />
              <div>
                <h2>AI demand assistant</h2>
                <p>Turn customer intent into vehicle picks, quote drafts and next actions.</p>
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
              <button type="submit" title="Run recommendation" disabled={status === 'loading'}>
                {status === 'loading' ? <RefreshCw size={18} className="spin" /> : <Send size={18} />}
              </button>
            </form>
          </section>

          <section className="vehicle-section">
            <div className="section-header">
              <div>
                <h2>Recommended vehicles</h2>
                <p>{recommendation.summary}</p>
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
                  className={`vehicle-card ${selectedCard.inventory_id === card.inventory_id ? 'active' : ''}`}
                  key={card.vin}
                  onClick={() => chooseVehicle(card)}
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
                      <span>{card.inventory_status}</span>
                    </div>
                    <p>{card.reasons[0]}</p>
                  </div>
                  <ArrowRight size={18} />
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
              {selectedCard.risks.length > 0 && (
                <div className="risk-strip">
                  <ShieldCheck size={16} />
                  {selectedCard.risks[0]}
                </div>
              )}
            </div>

            <div className="detail-panel quote-panel">
              <div className="section-header compact">
                <h2>Quote draft</h2>
                <button type="button" title="Generate quote" onClick={() => void updateQuote()}>
                  <BadgeDollarSign size={18} />
                </button>
              </div>
              <dl>
                <div>
                  <dt>Landing price</dt>
                  <dd>{money(quote.landing_price)}</dd>
                </div>
                <div>
                  <dt>Discount</dt>
                  <dd>{money(quote.discount_amount)}</dd>
                </div>
                <div>
                  <dt>Down payment</dt>
                  <dd>{money(quote.finance_down_payment)}</dd>
                </div>
                <div>
                  <dt>Monthly</dt>
                  <dd>{money(quote.finance_monthly_payment)}</dd>
                </div>
              </dl>
              <p>{quote.explanation}</p>
            </div>
          </section>
        </div>

        <aside className="side-column">
          <section className="profile-panel">
            <div className="profile-header">
              <div className="avatar">
                <UserRound size={22} />
              </div>
              <div>
                <h2>Demo Customer</h2>
                <p>EV SUV, finance, purchase within 2 weeks</p>
              </div>
            </div>
            <div className="profile-actions">
              <button type="button" title="Call customer">
                <PhoneCall size={17} />
              </button>
              <button type="button" title="Book test drive">
                <CalendarClock size={17} />
              </button>
              <button type="button" title="Create task">
                <ClipboardList size={17} />
              </button>
            </div>
          </section>

          <section className="script-panel">
            <div className="section-header compact">
              <h2>Follow-up script</h2>
              <button type="button" title="Generate script" onClick={() => void updateFollowup()}>
                <MessageSquareText size={18} />
              </button>
            </div>
            <p>{followup.script}</p>
            <ul>
              {followup.talking_points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>

          <section className="lead-panel">
            <div className="section-header compact">
              <h2>Priority leads</h2>
              <span>Today</span>
            </div>
            <div className="lead-list">
              {leadRows.map((lead) => (
                <div className="lead-row" key={lead.name}>
                  <div>
                    <strong>{lead.name}</strong>
                    <span>{lead.intent}</span>
                  </div>
                  <div>
                    <em>{lead.stage}</em>
                    <b>{lead.score}</b>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  )
}

export default App
