export type RiceType = "chicken" | "beef" | "sada" | "chana"
export type ProductKey = "biryani" | "pulao" | "zarda" | "drinks" | "raita" | "salad" | "custom"
export type TransactionSource = "counter" | "customized" | "bulk"

export type CartItem = {
  id: string
  name: string
  detail: string
  quantity: number
  unitPrice: number
  catalogKey?: ProductKey
  receiptDetails?: Array<{ label?: string; value: string }>
}

export type Receipt = {
  number: string
  orderNumber: number
  createdAt: Date
  items: CartItem[]
  subtotal: number
  discount: number
  orderType?: string
  partyDetails?: string[]
  advancePayment?: number
  remainingBalance?: number
}

export type Organization = {
  id: string
  name: string
  contactPerson: string
  phone: string
  email: string
  address: string
  notes: string
}

export type Transaction = {
  id: string
  receiptNumber: string
  orderNumber?: number
  source: TransactionSource
  createdAt: string
  items: CartItem[]
  subtotal: number
  discount: number
  grandTotal: number
  initialPayment: number
  amountPaid: number
  outstanding: number
  organizationId?: string
  organizationName?: string
  customerName?: string
  customerPhone?: string
  notes?: string
  cartSignature?: string
}

export type Payment = {
  id: string
  organizationId: string
  createdAt: string
  amount: number
  method: "Cash" | "Bank Transfer" | "Other"
  reference: string
}

export const CONFIG = {
  ricePrices: { chicken: 130, beef: 150, sada: 100, chana: 100 },
  zardaPrice: 100,
  saladPrice: 50,
  raitaPrice: 50,
  drinks: {
    Pepsi: {
      "300 ml": 90,
      "500 ml": 110,
      "1 Litre": 160,
      "1.5 Litre": 180,
      Jumbo: 250,
    },
    "Coca-Cola": {
      "300 ml": 90,
      "500 ml": 110,
      "1 Litre": 160,
      "1.5 Litre": 180,
      Jumbo: 250,
    },
    "7UP": {
      "300 ml": 90,
      "500 ml": 110,
      "1 Litre": 160,
      "1.5 Litre": 180,
      Jumbo: 250,
    },
  },
}

export type AppConfig = typeof CONFIG

export const WEIGHTS = [
  250, 375, 500, 750, 1000, 1250, 1500, 1750, 2000, 2500, 3000,
]
export const QUANTITIES = [1, 2, 3, 4, 5]

export function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function makeReceiptNumber(prefix = "MBBH") {
  const now = new Date()
  const datePart = [
    now.getFullYear().toString().slice(-2),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("")
  return `${prefix}-${datePart}-${now.getTime().toString().slice(-5)}${Math.floor(Math.random() * 90 + 10)}`
}

export function loadStored<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) as T : fallback
  } catch {
    return fallback
  }
}
