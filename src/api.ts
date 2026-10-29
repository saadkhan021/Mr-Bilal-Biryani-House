import {
  CartItem,
  Organization,
  Payment,
  Receipt,
  Transaction,
} from "./data"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api"

/** Generic fetch helper with JSON parsing and error handling */
async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    let errorMsg = `API Error ${response.status}: ${response.statusText}`
    try {
      const errorJson = await response.json()
      if (errorJson.detail) {
        errorMsg = typeof errorJson.detail === "string" ? errorJson.detail : JSON.stringify(errorJson.detail)
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg)
  }

  return response.json() as Promise<T>
}

export const api = {
  /** Check if the PostgreSQL backend is online */
  async checkHealth(): Promise<{ status: string; database: string }> {
    return request<{ status: string; database: string }>("/health")
  },

  /** Fetch backend configuration and pricing metadata */
  async getConfig(): Promise<any> {
    return request<any>("/config")
  },

  /** Fetch complete menu catalog from the database */
  async getMenu(): Promise<any[]> {
    return request<any[]>("/menu")
  },

  /** Fetch dynamic weight price from database */
  async getPrice(productId: number, weightGrams: number): Promise<{ price: number }> {
    return request<{ price: number }>(`/price?product_id=${productId}&weight_grams=${weightGrams}`)
  },

  /** Fetch next daily sequence order number from the database */
  async getNextOrderNumber(targetDate?: string): Promise<{ date: string; next_order_number: number }> {
    const q = targetDate ? `?target_date=${encodeURIComponent(targetDate)}` : ""
    return request<{ date: string; next_order_number: number }>(`/orders/next-number${q}`)
  },

  /** Fetch all client organizations from PostgreSQL */
  async getOrganizations(search?: string): Promise<Organization[]> {
    const q = search ? `?search=${encodeURIComponent(search)}` : ""
    const orgs = await request<any[]>(`/organizations${q}`)
    return orgs.map((o) => ({
      id: o.id,
      name: o.name,
      contactPerson: o.contact_person || "",
      phone: o.phone || "",
      email: o.email || "",
      address: o.address || "",
      notes: o.notes || "",
    }))
  },

  /** Create new organization in PostgreSQL */
  async createOrganization(org: Omit<Organization, "id"> & { id?: string }): Promise<Organization> {
    const payload = {
      id: org.id,
      name: org.name,
      contact_person: org.contactPerson,
      phone: org.phone,
      email: org.email,
      address: org.address,
      notes: org.notes,
    }
    const created = await request<any>("/organizations", {
      method: "POST",
      body: JSON.stringify(payload),
    })
    return {
      id: created.id,
      name: created.name,
      contactPerson: created.contact_person || "",
      phone: created.phone || "",
      email: created.email || "",
      address: created.address || "",
      notes: created.notes || "",
    }
  },

  /** Update organization in PostgreSQL */
  async updateOrganization(id: string, org: Partial<Organization>): Promise<Organization> {
    const payload = {
      name: org.name,
      contact_person: org.contactPerson,
      phone: org.phone,
      email: org.email,
      address: org.address,
      notes: org.notes,
    }
    const updated = await request<any>(`/organizations/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
    return {
      id: updated.id,
      name: updated.name,
      contactPerson: updated.contact_person || "",
      phone: updated.phone || "",
      email: updated.email || "",
      address: updated.address || "",
      notes: updated.notes || "",
    }
  },

  /** Delete organization from PostgreSQL */
  async deleteOrganization(id: string): Promise<void> {
    await request<void>(`/organizations/${id}`, { method: "DELETE" })
  },

  /** Fetch all transactions (bills & orders) from PostgreSQL */
  async getTransactions(filters?: {
    source?: string
    organizationId?: string
    range?: string
    startDate?: string
    endDate?: string
  }): Promise<Transaction[]> {
    const params = new URLSearchParams()
    if (filters?.source) params.append("source", filters.source)
    if (filters?.organizationId) params.append("organization_id", filters.organizationId)
    if (filters?.range) params.append("range", filters.range)
    if (filters?.startDate) params.append("start_date", filters.startDate)
    if (filters?.endDate) params.append("end_date", filters.endDate)

    const queryStr = params.toString() ? `?${params.toString()}` : ""
    const list = await request<any[]>(`/transactions${queryStr}`)

    return list.map((t) => ({
      id: t.id,
      receiptNumber: t.receipt_number,
      orderNumber: t.order_number,
      source: t.source,
      createdAt: t.created_at,
      subtotal: t.subtotal,
      discount: t.discount,
      grandTotal: t.grand_total,
      initialPayment: t.initial_payment,
      amountPaid: t.amount_paid,
      outstanding: t.outstanding,
      organizationId: t.organization_id || undefined,
      organizationName: t.organization_name || undefined,
      customerName: t.customer_name || undefined,
      customerPhone: t.customer_phone || undefined,
      notes: t.notes || undefined,
      cartSignature: t.cart_signature || undefined,
      items: (t.items || []).map((it: any) => ({
        id: it.cart_item_id || String(it.id),
        name: it.name,
        detail: it.detail || "",
        quantity: it.quantity,
        unitPrice: it.unit_price,
        catalogKey: it.catalog_key,
        receiptDetails: it.receipt_details,
      })),
    }))
  },

  /** Save new or updated transaction into PostgreSQL */
  async saveTransaction(txn: {
    id?: string
    receiptNumber?: string
    orderNumber?: number
    source: "counter" | "customized" | "bulk"
    createdAt?: string
    items: CartItem[]
    discount?: number
    initialPayment?: number
    organizationId?: string
    organizationName?: string
    customerName?: string
    customerPhone?: string
    notes?: string
    cartSignature?: string
  }): Promise<Transaction> {
    const payload = {
      id: txn.id,
      receiptNumber: txn.receiptNumber,
      orderNumber: txn.orderNumber,
      source: txn.source,
      createdAt: txn.createdAt,
      items: txn.items.map((i) => ({
        id: i.id,
        name: i.name,
        detail: i.detail,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        catalogKey: i.catalogKey,
        receiptDetails: i.receiptDetails,
      })),
      discount: txn.discount || 0,
      initialPayment: txn.initialPayment || 0,
      organizationId: txn.organizationId,
      organizationName: txn.organizationName,
      customerName: txn.customerName,
      customerPhone: txn.customerPhone,
      notes: txn.notes,
      cartSignature: txn.cartSignature,
    }

    const t = await request<any>("/transactions", {
      method: "POST",
      body: JSON.stringify(payload),
    })

    return {
      id: t.id,
      receiptNumber: t.receipt_number,
      orderNumber: t.order_number,
      source: t.source,
      createdAt: t.created_at,
      subtotal: t.subtotal,
      discount: t.discount,
      grandTotal: t.grand_total,
      initialPayment: t.initial_payment,
      amountPaid: t.amount_paid,
      outstanding: t.outstanding,
      organizationId: t.organization_id || undefined,
      organizationName: t.organization_name || undefined,
      customerName: t.customer_name || undefined,
      customerPhone: t.customer_phone || undefined,
      notes: t.notes || undefined,
      cartSignature: t.cart_signature || undefined,
      items: (t.items || []).map((it: any) => ({
        id: it.cart_item_id || String(it.id),
        name: it.name,
        detail: it.detail || "",
        quantity: it.quantity,
        unitPrice: it.unit_price,
        catalogKey: it.catalog_key,
        receiptDetails: it.receipt_details,
      })),
    }
  },

  /** Fetch all recorded incoming payments from PostgreSQL */
  async getPayments(organizationId?: string): Promise<Payment[]> {
    const q = organizationId ? `?organization_id=${encodeURIComponent(organizationId)}` : ""
    const payments = await request<any[]>(`/payments${q}`)
    return payments.map((p) => ({
      id: p.id,
      organizationId: p.organization_id,
      createdAt: p.created_at,
      amount: p.amount,
      method: p.method,
      reference: p.reference || "",
    }))
  },

  /** Record payment and auto-reconcile in PostgreSQL */
  async recordPayment(payment: {
    id?: string
    organizationId: string
    amount: number
    method: "Cash" | "Bank Transfer" | "Other"
    reference?: string
    createdAt?: string
  }): Promise<Payment> {
    const payload = {
      id: payment.id,
      organizationId: payment.organizationId,
      amount: payment.amount,
      method: payment.method,
      reference: payment.reference || "",
      createdAt: payment.createdAt,
    }

    const p = await request<any>("/payments", {
      method: "POST",
      body: JSON.stringify(payload),
    })

    return {
      id: p.id,
      organizationId: p.organization_id,
      createdAt: p.created_at,
      amount: p.amount,
      method: p.method,
      reference: p.reference || "",
    }
  },

  /** Fetch high-level Financial Ledger analytics from PostgreSQL */
  async getLedgerOverview(): Promise<any> {
    return request<any>("/ledger/overview")
  },

  /** Update dynamic prices directly into Supabase PostgreSQL */
  async updatePrices(payload: {
    rice_prices?: Record<string, number>
    zarda_price?: number
    salad_price?: number
    raita_price?: number
    drinks?: Record<string, Record<string, number>>
  }): Promise<any> {
    return request<any>("/config/prices", {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },

  /** Delete a transaction and cascaded items from Supabase */
  async deleteTransaction(id: string): Promise<{ message: string; id: string }> {
    return request<{ message: string; id: string }>(`/transactions/${id}`, {
      method: "DELETE",
    })
  },
}

