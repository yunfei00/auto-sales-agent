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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`API ${path} failed with ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function requestVehicleRecommendations(message: string) {
  return postJson<VehicleRecommendationResult>('/api/ai/recommendations/vehicles/', {
    message,
    limit: 3,
  })
}

export function requestFollowupScript(customerId = 1, scenario = 'test_drive') {
  return postJson<FollowupScriptResult>('/api/ai/followups/generate/', {
    customer_id: customerId,
    scenario,
  })
}

export function requestQuoteSuggestion(inventoryId: number, customerId = 1) {
  return postJson<QuoteSuggestionResult>('/api/ai/quotes/suggest/', {
    inventory_id: inventoryId,
    customer_id: customerId,
  })
}

export const fallbackRecommendation: VehicleRecommendationResult = {
  type: 'vehicle_recommendation',
  summary: 'Local fallback: recommended vehicles are shown while the API is unavailable.',
  demand: {
    budget_min: '180000.00',
    budget_max: '220000.00',
    energy_type: 'bev',
    body_type: 'SUV',
  },
  cards: [
    {
      inventory_id: 1,
      vin: 'ASTERNOVAX000001',
      vehicle_model_id: 1,
      title: 'Aster Nova X Long Range Pro',
      brand: 'Aster',
      model: 'Nova X',
      trim: 'Long Range Pro',
      price: '192800.00',
      official_price: '198800.00',
      inventory_status: 'available',
      exterior_color: 'Pearl White',
      range_km: 620,
      match_score: 95,
      reasons: ['Price fits the stated budget range.', 'Body type matches: SUV.', 'In stock and available for delivery.'],
      risks: ['White stock is limited.'],
      policy: { title: 'Nova X demo cash discount', amount: '6000.00' },
      actions: ['generate_quote', 'book_test_drive', 'generate_followup'],
    },
    {
      inventory_id: 2,
      vin: 'ASTERNOVAX000002',
      vehicle_model_id: 1,
      title: 'Aster Nova X Urban Plus',
      brand: 'Aster',
      model: 'Nova X',
      trim: 'Urban Plus',
      price: '172800.00',
      official_price: '178800.00',
      inventory_status: 'available',
      exterior_color: 'Graphite Gray',
      range_km: 520,
      match_score: 87,
      reasons: ['Strong budget fit.', 'Compact SUV size works for city commuting.', 'Active cash discount is available.'],
      risks: [],
      policy: { title: 'Nova X demo cash discount', amount: '6000.00' },
      actions: ['generate_quote', 'book_test_drive', 'generate_followup'],
    },
    {
      inventory_id: 3,
      vin: 'ORIONTRAIL000001',
      vehicle_model_id: 2,
      title: 'Orion Trail PHEV Family Max',
      brand: 'Orion',
      model: 'Trail PHEV',
      trim: 'Family Max',
      price: '212800.00',
      official_price: '218800.00',
      inventory_status: 'available',
      exterior_color: 'Deep Blue',
      range_km: 1100,
      match_score: 82,
      reasons: ['Family-focused SUV.', 'Long combined range reduces charging anxiety.', 'Trade-in policy can improve landing cost.'],
      risks: ['Slightly above the center of the budget range.'],
      policy: { title: 'Trail demo cash discount', amount: '6000.00' },
      actions: ['generate_quote', 'book_test_drive', 'generate_followup'],
    },
  ],
  next_best_actions: [
    { action: 'book_test_drive', label: 'Book a test drive', priority: 'high' },
    { action: 'generate_quote', label: 'Generate quote draft', priority: 'high' },
  ],
}

export const fallbackFollowup: FollowupScriptResult = {
  type: 'followup_script',
  scenario: 'test_drive',
  script:
    'Hi Demo Customer, the recommended SUV is available for a weekend test drive. I can reserve a slot and prepare a finance plan before you arrive.',
  talking_points: ['Confirm budget and purchase timeline.', 'Reserve a test drive slot.', 'Offer finance and trade-in comparison.'],
  next_best_action: { action: 'book_test_drive', label: 'Book test drive' },
}

export function fallbackQuote(inventoryId: number): QuoteSuggestionResult {
  return {
    type: 'quote_suggestion',
    customer_id: 1,
    inventory_id: inventoryId,
    vin: 'ASTERNOVAX000001',
    bare_vehicle_price: '192800.00',
    discount_amount: '6000.00',
    insurance_amount: '5800.00',
    license_fee: '1200.00',
    accessory_amount: '3000.00',
    landing_price: '196800.00',
    finance_down_payment: '59040.00',
    finance_monthly_payment: '3826.67',
    explanation: 'Draft only. Final price, finance approval and insurance quote must be confirmed by the store.',
  }
}
