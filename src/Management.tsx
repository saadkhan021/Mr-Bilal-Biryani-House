import { useEffect, useState } from "react"
import {
  AppConfig,
  CartItem,
  CONFIG,
  makeId,
  Organization,
  Payment,
  ProductKey,
  Transaction,
  TransactionSource,
} from "./data"

type ModuleScreen = "menu" | "customized" | "bulk" | "ledger"

export function NavigationDrawer({
  open,
  active,
  onClose,
  onNavigate,
  onOpenPrices,
}: {
  open: boolean
  active: ModuleScreen
  onClose: () => void
  onNavigate: (screen: ModuleScreen) => void
  onOpenPrices?: () => void
}) {
  const links: Array<{ id: ModuleScreen; label: string; icon: string }> = [
    { id: "menu", label: "Home / Menu", icon: "⌂" },
    { id: "customized", label: "Event Orders", icon: "＋" },
    { id: "bulk", label: "Bulk Orders", icon: "▦" },
    { id: "ledger", label: "Financial Ledger", icon: "▥" },
  ]

  return (
    <>
      <button
        className={`drawer-scrim ${open ? "open" : ""}`}
        aria-label="Close menu"
        onClick={onClose}
      />
      <aside
        className={`navigation-drawer ${open ? "open" : ""}`}
        aria-hidden={!open}
      >
        <div className="drawer-heading">
          <div>
            <span>MB</span>
            <strong>Mr Bilal Biryani House</strong>
          </div>
          <button aria-label="Close menu" onClick={onClose}>
            ×
          </button>
        </div>
        <nav>
          {links.map((link) => (
            <button
              key={link.id}
              className={active === link.id ? "active" : ""}
              onClick={() => {
                onNavigate(link.id)
                onClose()
              }}
            >
              <span>{link.icon}</span>
              {link.label}
            </button>
          ))}
          {onOpenPrices && (
            <button
              type="button"
              onClick={() => {
                onOpenPrices()
                onClose()
              }}
              style={{ color: "var(--saffron)" }}
            >
              <span>🏷️</span>
              Live Prices (Supabase)
            </button>
          )}
        </nav>
        <p>Counter management</p>
      </aside>
    </>
  )
}

export function ModuleHeader({
  title,
  eyebrow,
  onMenu,
  onHome,
  onNavigate,
  active,
}: {
  title: string
  eyebrow: string
  onMenu: () => void
  onHome: () => void
  onNavigate?: (screen: ModuleScreen) => void
  active?: ModuleScreen
}) {
  return (
    <header className="module-header">
      <div className="module-header-container">
        <div className="module-header-left">
          <button
            className="module-icon-button mobile-only-btn"
            aria-label="Open menu"
            onClick={onMenu}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <div
            className="brand-lockup module-brand"
            onClick={onHome}
            role="button"
            tabIndex={0}
            title="Return to Menu"
          >
            <span>MB</span>
            <div>
              <p>MR BILAL</p>
              <h1>Biryani House</h1>
            </div>
          </div>
          <div className="module-header-divider" />
          <div className="module-header-title">
            <p>{eyebrow}</p>
            <h1>{title}</h1>
          </div>
        </div>

        {onNavigate && (
          <nav className="desktop-nav" aria-label="Module navigation">
            <button
              className={active === "menu" ? "active" : ""}
              onClick={() => onNavigate("menu")}
            >
              <span>⌂</span> Menu
            </button>
            <button
              className={active === "customized" ? "active" : ""}
              onClick={() => onNavigate("customized")}
            >
              <span>＋</span> Event Orders
            </button>
            <button
              className={active === "bulk" ? "active" : ""}
              onClick={() => onNavigate("bulk")}
            >
              <span>▦</span> Bulk Orders
            </button>
            <button
              className={active === "ledger" ? "active" : ""}
              onClick={() => onNavigate("ledger")}
            >
              <span>▥</span> Financial Ledger
            </button>
          </nav>
        )}

        <div className="module-header-right">
          <button className="module-home-button" onClick={onHome}>
            <span>← Menu</span>
          </button>
        </div>
      </div>
    </header>
  )
}

type DraftProduct = {
  product: ProductKey
  riceType: "chicken" | "beef" | "sada" | "chana" | "other"
  customName: string
  customType: string
  weight: number
  brand: keyof typeof CONFIG.drinks
  size: keyof typeof CONFIG.drinks["Pepsi"]
  quantity: number
  customPrice: number
}

const defaultDraft: DraftProduct = {
  product: "biryani",
  riceType: "chicken",
  customName: "",
  customType: "",
  weight: 250,
  brand: "Pepsi",
  size: "300 ml",
  quantity: 1,
  customPrice: CONFIG.ricePrices.chicken,
}

function catalogPrice(draft: DraftProduct, config: AppConfig = CONFIG) {
  if (draft.product === "biryani" || draft.product === "pulao") {
    if (draft.riceType === "other") return draft.customPrice
    const base = config.ricePrices[draft.riceType] ?? 130
    return (draft.weight / 250) * base
  }
  if (draft.product === "custom") return draft.customPrice
  if (draft.product === "drinks") {
    return (config.drinks[draft.brand] && config.drinks[draft.brand][draft.size])
      ? config.drinks[draft.brand][draft.size]
      : 90
  }
  return {
    zarda: config.zardaPrice ?? 100,
    raita: config.raitaPrice ?? 50,
    salad: config.saladPrice ?? 50,
  }[draft.product]
}

function buildLine(
  draft: DraftProduct,
  customPricing: boolean,
  id = makeId("line"),
  config: AppConfig = CONFIG,
): CartItem | null {
  if (!Number.isInteger(draft.quantity) || draft.quantity <= 0) return null
  if (
    customPricing &&
    (!Number.isFinite(draft.customPrice) || draft.customPrice <= 0)
  )
    return null
  if (
    (draft.product === "biryani" ||
      draft.product === "pulao" ||
      draft.product === "custom") &&
    (draft.weight <= 0 || draft.weight % 125 !== 0)
  ) {
    return null
  }

  if (draft.product === "biryani" || draft.product === "pulao") {
    const safeType =
      draft.riceType === "other"
        ? "other"
        : draft.product === "biryani"
          ? draft.riceType === "sada" || draft.riceType === "chana"
            ? draft.riceType
            : "chicken"
          : draft.riceType === "sada"
            ? "sada"
            : "beef"
    const typeName =
      safeType === "other"
        ? draft.customType.trim()
        : safeType === "sada"
          ? "Sada"
          : safeType === "chicken"
            ? "Chicken"
            : safeType === "chana"
              ? "Chana"
              : "Beef"
    if (!typeName) return null
    const productName = draft.product === "biryani" ? "Biryani" : "Pulao"
    const weightDetail = customPricing
      ? `${(draft.weight / 1000).toLocaleString()} kg`
      : `${draft.weight.toLocaleString()} g`
    return {
      id,
      catalogKey: draft.product,
      name: `${typeName} ${productName}`,
      detail: weightDetail,
      quantity: draft.quantity,
      unitPrice: customPricing
        ? draft.customPrice
        : (draft.weight / 250) *
          (config.ricePrices[(safeType as Exclude<typeof safeType, "other">)] ?? 130),
      receiptDetails: [
        { label: "Type", value: typeName },
        { label: "Weight", value: weightDetail },
        ...(customPricing
          ? [
              {
                label: "Agreed price",
                value: `Rs. ${draft.customPrice.toLocaleString()}`,
              },
            ]
          : []),
      ],
    }
  }

  if (draft.product === "custom") {
    if (!draft.customName.trim()) return null
    const weightDetail = `${(draft.weight / 1000).toLocaleString()} kg`
    return {
      id,
      catalogKey: "custom",
      name: draft.customName.trim(),
      detail: weightDetail,
      quantity: draft.quantity,
      unitPrice: draft.customPrice,
      receiptDetails: [
        { label: "Weight", value: weightDetail },
        {
          label: "Agreed price",
          value: `Rs. ${draft.customPrice.toLocaleString()}`,
        },
      ],
    }
  }

  if (draft.product === "drinks") {
    return {
      id,
      catalogKey: "drinks",
      name: draft.brand,
      detail: draft.size,
      quantity: draft.quantity,
      unitPrice: customPricing
        ? draft.customPrice
        : (config.drinks[draft.brand]?.[draft.size] ?? 90),
      receiptDetails: [{ label: "Size", value: draft.size }],
    }
  }

  const simple = {
    zarda: {
      name: "Zarda",
      detail: "Box",
      price: config.zardaPrice ?? 100,
      receiptDetails: [{ value: "Box" }],
    },
    raita: {
      name: "Raita",
      detail: "Unit",
      price: config.raitaPrice ?? 50,
      receiptDetails: undefined,
    },
    salad: {
      name: "Garden salad",
      detail: "Unit",
      price: config.saladPrice ?? 50,
      receiptDetails: undefined,
    },
  }[draft.product]

  return {
    id,
    catalogKey: draft.product,
    name: simple.name,
    detail: simple.detail,
    quantity: draft.quantity,
    unitPrice: customPricing ? draft.customPrice : simple.price,
    receiptDetails: simple.receiptDetails,
  }
}

function ProductComposer({
  onSave,
  editing,
  onCancelEdit,
  customPricing,
  config = CONFIG,
}: {
  onSave: (item: CartItem) => void
  editing: CartItem | null
  onCancelEdit: () => void
  customPricing: boolean
  config?: AppConfig
}) {
  const [draft, setDraft] = useState<DraftProduct>(defaultDraft)
  const [error, setError] = useState("")
  const editingKey = editing?.id ?? ""

  useEffect(() => {
    if (!editing) return
    const savedType = editing.receiptDetails?.find(
      (detail) => detail.label === "Type",
    )?.value
    const type =
      savedType && !["Sada", "Beef", "Chana", "Chicken"].includes(savedType)
        ? "other"
        : editing.name.startsWith("Sada")
          ? "sada"
          : editing.name.startsWith("Beef")
            ? "beef"
            : editing.name.startsWith("Chana")
              ? "chana"
              : "chicken"
    const parsedWeight =
      Number(editing.detail.replace(/[^0-9.]/g, "")) ||
      (customPricing ? 0.25 : 250)
    setDraft({
      product: editing.catalogKey ?? "biryani",
      riceType: type,
      customName: editing.catalogKey === "custom" ? editing.name : "",
      customType: type === "other" ? (savedType ?? "") : "",
      weight: editing.detail.includes("kg")
        ? parsedWeight * 1000
        : parsedWeight,
      brand: (editing.catalogKey === "drinks"
        ? editing.name
        : "Pepsi") as keyof typeof CONFIG.drinks,
      size: (editing.catalogKey === "drinks"
        ? editing.detail
        : "300 ml") as keyof typeof CONFIG.drinks["Pepsi"],
      quantity: editing.quantity,
      customPrice: editing.unitPrice,
    })
  }, [editingKey])

  const isRice = draft.product === "biryani" || draft.product === "pulao"
  const save = () => {
    const item = buildLine(draft, customPricing, editing?.id, config)
    if (!item) {
      setError(
        "Enter a valid quantity, price, and weight in 0.125 kg increments.",
      )
      return
    }
    onSave(item)
    setDraft(defaultDraft)
    setError("")
  }

  return (
    <section className="composer-card">
      <div className="management-field">
        <label>Product</label>
        <select
          value={draft.product}
          onChange={(event) => {
            const product = event.target.value as ProductKey
            setDraft((current) => {
              const next = {
                ...current,
                product,
                riceType: product === "pulao" ? "beef" : "chicken",
              } as DraftProduct
              return { ...next, customPrice: catalogPrice(next, config) }
            })
          }}
        >
          <option value="biryani">Biryani (Chicken, Sada or Chana)</option>
          <option value="pulao">Pulao (Beef or Sada)</option>
          <option value="zarda">Zarda</option>
          <option value="drinks">Cold Drinks</option>
          <option value="raita">Raita</option>
          <option value="salad">Salad</option>
          {customPricing && <option value="custom">Custom product</option>}
        </select>
      </div>
      {isRice && (
        <div className="composer-grid">
          <div className="management-field">
            <label>Type</label>
            <select
              value={draft.riceType}
              onChange={(event) => {
                const riceType = event.target.value as DraftProduct["riceType"]
                const next = { ...draft, riceType }
                setDraft({ ...next, customPrice: catalogPrice(next, config) })
              }}
            >
              {draft.product === "biryani" ? (
                <>
                  <option value="chicken">Chicken</option>
                  <option value="chana">Chana</option>
                </>
              ) : (
                <option value="beef">Beef</option>
              )}
              <option value="sada">Sada</option>
              {customPricing && <option value="other">Other</option>}
            </select>
          </div>
          <div className="management-field">
            <label>{customPricing ? "Weight (kg)" : "Weight / serving"}</label>
            <input
              type="number"
              min={customPricing ? "0.25" : "250"}
              step={customPricing ? "0.125" : "125"}
              value={customPricing ? draft.weight / 1000 : draft.weight}
              onChange={(event) => {
                const weight =
                  Number(event.target.value) * (customPricing ? 1000 : 1)
                const next = { ...draft, weight }
                setDraft({ ...next, customPrice: catalogPrice(next, config) })
              }}
            />
          </div>
        </div>
      )}
      {isRice && draft.riceType === "other" && (
        <div className="management-field event-price-field">
          <label>Other type name</label>
          <input
            value={draft.customType}
            placeholder="Enter rice type"
            onChange={(event) =>
              setDraft({ ...draft, customType: event.target.value })
            }
          />
        </div>
      )}
      {draft.product === "custom" && (
        <>
          <div className="management-field event-price-field">
            <label>Product name</label>
            <input
              value={draft.customName}
              placeholder="Enter product name"
              onChange={(event) =>
                setDraft({ ...draft, customName: event.target.value })
              }
            />
          </div>
          <div className="management-field event-price-field">
            <label>Weight (kg)</label>
            <input
              type="number"
              min="0.25"
              step="0.125"
              value={draft.weight / 1000}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  weight: Number(event.target.value) * 1000,
                })
              }
            />
          </div>
        </>
      )}
      {draft.product === "drinks" && (
        <div className="composer-grid">
          <div className="management-field">
            <label>Brand</label>
            <select
              value={draft.brand}
              onChange={(event) => {
                const brand = event.target.value as DraftProduct["brand"]
                const next = { ...draft, brand }
                setDraft({ ...next, customPrice: catalogPrice(next, config) })
              }}
            >
              {Object.keys(config.drinks).map((brand) => (
                <option key={brand}>{brand}</option>
              ))}
            </select>
          </div>
          <div className="management-field">
            <label>Size</label>
            <select
              value={draft.size}
              onChange={(event) => {
                const size = event.target.value as DraftProduct["size"]
                const next = { ...draft, size }
                setDraft({ ...next, customPrice: catalogPrice(next, config) })
              }}
            >
              {Object.entries(config.drinks[draft.brand] || {}).map(
                ([size, price]) => (
                  <option key={size} value={size}>
                    {size} — Rs. {price}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>
      )}
      {customPricing && (
        <div className="management-field event-price-field">
          <label>
            {isRice || draft.product === "custom"
              ? "Price for selected weight (Rs.)"
              : "Price per item (Rs.)"}
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={draft.customPrice}
            onChange={(event) =>
              setDraft({ ...draft, customPrice: Number(event.target.value) })
            }
          />
        </div>
      )}
      <div className="management-field">
        <label>{isRice ? "Servings / portions" : "Quantity"}</label>
        <input
          type="number"
          min="1"
          step="1"
          value={draft.quantity}
          onChange={(event) =>
            setDraft({ ...draft, quantity: Number(event.target.value) })
          }
        />
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="composer-actions">
        {editing && (
          <button className="subtle-button" onClick={onCancelEdit}>
            Cancel
          </button>
        )}
        <button className="management-primary" onClick={save}>
          {editing ? "Update product" : "Add product"}
        </button>
      </div>
    </section>
  )
}

function OrderLines({
  items,
  onEdit,
  onRemove,
}: {
  items: CartItem[]
  onEdit: (item: CartItem) => void
  onRemove: (id: string) => void
}) {
  if (!items.length)
    return <div className="management-empty">No products added yet.</div>
  return (
    <div className="management-lines">
      {items.map((item) => (
        <article key={item.id}>
          <div>
            <h3>{item.name}</h3>
            <p>
              {item.detail} · Qty {item.quantity}
            </p>
            <small>Rate Rs. {item.unitPrice.toLocaleString()}</small>
          </div>
          <div className="line-total">
            <strong>
              Rs. {(item.unitPrice * item.quantity).toLocaleString()}
            </strong>
            <span>
              <button onClick={() => onEdit(item)}>Edit</button>
              <button onClick={() => onRemove(item.id)}>Remove</button>
            </span>
          </div>
        </article>
      ))}
    </div>
  )
}

function OrderBuilder({
  mode,
  onMenu,
  onHome,
  onGenerate,
  onNavigate,
  active,
  organization,
  organizations,
  setOrganizations,
  selectedOrganizationId,
  setSelectedOrganizationId,
  onSaveOrganization,
  config = CONFIG,
}: {
  mode: "customized" | "bulk"
  onMenu: () => void
  onHome: () => void
  onGenerate: (payload: {
    items: CartItem[]
    source: "customized" | "bulk"
    discount: number
    initialPayment: number
    organization?: Organization
    customerName?: string
    customerPhone?: string
    notes?: string
  }) => void
  onNavigate?: (screen: ModuleScreen) => void
  active?: ModuleScreen
  organization?: Organization
  organizations?: Organization[]
  setOrganizations?: React.Dispatch<React.SetStateAction<Organization[]>>
  selectedOrganizationId?: string
  setSelectedOrganizationId?: (id: string) => void
  onSaveOrganization?: (saved: Organization) => Promise<void> | void
  config?: AppConfig
}) {
  const isBulk = mode === "bulk"
  const [items, setItems] = useState<CartItem[]>([])
  const [editing, setEditing] = useState<CartItem | null>(null)
  const [showComposer, setShowComposer] = useState(false)
  const [customerName, setCustomerName] = useState("")
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [discount, setDiscount] = useState(0)
  const [advance, setAdvance] = useState(0)
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")
  const [error, setError] = useState("")
  const [showOrganizationForm, setShowOrganizationForm] = useState(false)
  const [editingOrganization, setEditingOrganization] =
    useState<Organization | null>(null)

  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  )
  const grandTotal = Math.max(0, subtotal - Math.max(0, discount))
  const remaining = Math.max(0, grandTotal - Math.max(0, advance))
  const canOrder = !isBulk || !!organization

  const saveLine = (item: CartItem) => {
    setItems((current) =>
      editing
        ? current.map((line) => (line.id === item.id ? item : line))
        : [...current, item],
    )
    setEditing(null)
    setShowComposer(false)
  }

  const submit = () => {
    if (isBulk && !organization) {
      setError(
        "Please select or add an organization before creating a bulk order.",
      )
      return
    }
    if (!items.length) {
      setError("Add at least one product before generating a bill.")
      return
    }
    if (discount < 0 || discount > subtotal) {
      setError("Discount cannot be negative or greater than the subtotal.")
      return
    }
    if (advance < 0 || advance > grandTotal) {
      setError("Advance payment cannot exceed the grand total.")
      return
    }
    onGenerate({
      items,
      source: mode,
      discount,
      initialPayment: isBulk ? advance : grandTotal,
      organization,
      customerName: isBulk ? undefined : customerName,
      customerPhone: isBulk ? undefined : phone,
      notes: [
        notes,
        scheduleDate && `Scheduled: ${scheduleDate} ${scheduleTime}`,
      ]
        .filter(Boolean)
        .join(" · "),
    })
  }

  return (
    <main className="management-shell">
      <ModuleHeader
        title={isBulk ? "Bulk Orders" : "Event Orders"}
        eyebrow={isBulk ? "ORGANIZATION BILLING" : "SPECIAL COUNTER ORDER"}
        onMenu={onMenu}
        onHome={onHome}
        onNavigate={onNavigate}
        active={active || mode}
      />
      <div className="management-content order-builder-content">
        {isBulk && (
          <section className="management-section">
            <div className="section-title-row">
              <div>
                <p>ORGANIZATION</p>
                <h2>Select customer</h2>
              </div>
              <button
                className="text-button"
                onClick={() => {
                  setEditingOrganization(null)
                  setShowOrganizationForm(true)
                }}
              >
                Add Organization
              </button>
            </div>
            <div className="management-field">
              <label>Organization</label>
              <select
                value={selectedOrganizationId}
                onChange={(event) =>
                  setSelectedOrganizationId?.(event.target.value)
                }
              >
                <option value="">Select organization</option>
                {organizations?.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            {organization && (
              <div className="organization-summary">
                <div>
                  <strong>{organization.name}</strong>
                  <p>
                    {[
                      organization.contactPerson,
                      organization.phone,
                      organization.email,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "No contact information"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingOrganization(organization)
                    setShowOrganizationForm(true)
                  }}
                >
                  Edit
                </button>
              </div>
            )}
            {!organization && (
              <p className="inline-notice">
                Please select or add an organization before creating a bulk
                order.
              </p>
            )}
          </section>
        )}

        {showOrganizationForm && setOrganizations && (
          <OrganizationForm
            initial={editingOrganization}
            organizations={organizations ?? []}
            onCancel={() => setShowOrganizationForm(false)}
            onSave={async (saved) => {
              if (onSaveOrganization) {
                await onSaveOrganization(saved)
              } else {
                setOrganizations((current) => {
                  const exists = current.some((item) => item.id === saved.id)
                  return exists
                    ? current.map((item) => (item.id === saved.id ? saved : item))
                    : [...current, saved]
                })
              }
              setSelectedOrganizationId?.(saved.id)
              setShowOrganizationForm(false)
            }}
          />
        )}

        <section
          className={`management-section ${
            !canOrder ? "disabled-section" : ""
          }`}
        >
          <div className="section-title-row">
            <div>
              <p>ADD PRODUCTS</p>
              <h2>Order items</h2>
            </div>
            <button
              className="text-button"
              disabled={!canOrder}
              onClick={() => setShowComposer(true)}
            >
              Add Product
            </button>
          </div>
          {showComposer && canOrder && (
            <ProductComposer
              customPricing={!isBulk}
              editing={editing}
              config={config}
              onSave={saveLine}
              onCancelEdit={() => {
                setEditing(null)
                setShowComposer(false)
              }}
            />
          )}
          <OrderLines
            items={items}
            onEdit={(item) => {
              setEditing(item)
              setShowComposer(true)
            }}
            onRemove={(id) =>
              setItems((current) => current.filter((item) => item.id !== id))
            }
          />
          {items.length > 0 && (
            <button
              className="add-another-button"
              onClick={() => setShowComposer(true)}
            >
              + Add another product
            </button>
          )}
        </section>

        <section className="management-section">
          <div className="section-title-row">
            <div>
              <p>ORDER DETAILS</p>
              <h2>{isBulk ? "Schedule & payment" : "Customer details"}</h2>
            </div>
          </div>
          {!isBulk && (
            <div className="composer-grid">
              <div className="management-field">
                <label>Customer name (optional)</label>
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                />
              </div>
              <div className="management-field">
                <label>Phone (optional)</label>
                <input
                  inputMode="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>
            </div>
          )}
          {isBulk && (
            <>
              <div className="composer-grid">
                <div className="management-field">
                  <label>Delivery / pickup date</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(event) => setScheduleDate(event.target.value)}
                  />
                </div>
                <div className="management-field">
                  <label>Time</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(event) => setScheduleTime(event.target.value)}
                  />
                </div>
              </div>
              <div className="composer-grid">
                <div className="management-field">
                  <label>Authorized discount</label>
                  <input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(event) =>
                      setDiscount(Number(event.target.value))
                    }
                  />
                </div>
                <div className="management-field">
                  <label>Advance received</label>
                  <input
                    type="number"
                    min="0"
                    value={advance}
                    onChange={(event) => setAdvance(Number(event.target.value))}
                  />
                </div>
              </div>
            </>
          )}
          <div className="management-field">
            <label>Order notes (optional)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </section>

        <aside className="builder-summary">
          <p>
            <span>Subtotal</span>
            <b>Rs. {subtotal.toLocaleString()}</b>
          </p>
          {isBulk && (
            <p>
              <span>Discount</span>
              <b>Rs. {Math.max(0, discount).toLocaleString()}</b>
            </p>
          )}
          <div>
            <span>Grand total</span>
            <strong>Rs. {grandTotal.toLocaleString()}</strong>
          </div>
          {isBulk && (
            <>
              <p>
                <span>Advance paid</span>
                <b>Rs. {Math.max(0, advance).toLocaleString()}</b>
              </p>
              <p>
                <span>Remaining</span>
                <b>Rs. {remaining.toLocaleString()}</b>
              </p>
            </>
          )}
          {error && <p className="form-error">{error}</p>}
          <button
            className="management-primary generate-button"
            onClick={submit}
          >
            Generate Bill
          </button>
        </aside>
      </div>
    </main>
  )
}

function OrganizationForm({
  initial,
  organizations,
  onCancel,
  onSave,
}: {
  initial: Organization | null
  organizations: Organization[]
  onCancel: () => void
  onSave: (organization: Organization) => void
}) {
  const [form, setForm] = useState<Organization>(
    initial ?? {
      id: makeId("org"),
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
    },
  )
  const [error, setError] = useState("")
  return (
    <section className="organization-form management-section">
      <div className="section-title-row">
        <div>
          <p>ORGANIZATION RECORD</p>
          <h2>{initial ? "Edit organization" : "New organization"}</h2>
        </div>
      </div>
      <div className="management-field">
        <label>Organization name *</label>
        <input
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
      </div>
      <div className="composer-grid">
        <div className="management-field">
          <label>Contact person</label>
          <input
            value={form.contactPerson}
            onChange={(event) =>
              setForm({ ...form, contactPerson: event.target.value })
            }
          />
        </div>
        <div className="management-field">
          <label>Phone number</label>
          <input
            value={form.phone}
            onChange={(event) =>
              setForm({ ...form, phone: event.target.value })
            }
          />
        </div>
      </div>
      <div className="management-field">
        <label>Email address</label>
        <input
          type="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
        />
      </div>
      <div className="management-field">
        <label>Billing address</label>
        <textarea
          rows={2}
          value={form.address}
          onChange={(event) =>
            setForm({ ...form, address: event.target.value })
          }
        />
      </div>
      <div className="management-field">
        <label>Notes</label>
        <textarea
          rows={2}
          value={form.notes}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
        />
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="composer-actions">
        <button className="subtle-button" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="management-primary"
          onClick={() => {
            if (!form.name.trim()) {
              setError("Organization name is required.")
              return
            }
            if (
              organizations.some(
                (item) =>
                  item.id !== form.id &&
                  item.name.toLowerCase() === form.name.trim().toLowerCase(),
              )
            ) {
              setError("An organization with this name already exists.")
              return
            }
            onSave({ ...form, name: form.name.trim() })
          }}
        >
          Save Organization
        </button>
      </div>
    </section>
  )
}

export function CustomizedOrders(props: {
  onMenu: () => void
  onHome: () => void
  onGenerate: Parameters<typeof OrderBuilder>[0]["onGenerate"]
  onNavigate?: (screen: ModuleScreen) => void
  active?: ModuleScreen
  config?: AppConfig
}) {
  return <OrderBuilder mode="customized" {...props} />
}

export function BulkOrders(props: {
  onMenu: () => void
  onHome: () => void
  onGenerate: Parameters<typeof OrderBuilder>[0]["onGenerate"]
  organizations: Organization[]
  setOrganizations: React.Dispatch<React.SetStateAction<Organization[]>>
  selectedOrganizationId: string
  setSelectedOrganizationId: (id: string) => void
  onNavigate?: (screen: ModuleScreen) => void
  active?: ModuleScreen
  onSaveOrganization?: (saved: Organization) => Promise<void> | void
  config?: AppConfig
}) {
  const organization = props.organizations.find(
    (item) => item.id === props.selectedOrganizationId,
  )
  return <OrderBuilder mode="bulk" organization={organization} {...props} />
}

function inRange(date: string, range: string, start: string, end: string) {
  const value = new Date(date)
  const today = new Date()
  const dayKey = (input: Date) =>
    `${input.getFullYear()}-${input.getMonth()}-${input.getDate()}`
  if (range === "today") return dayKey(value) === dayKey(today)
  if (range === "month")
    return (
      value.getFullYear() === today.getFullYear() &&
      value.getMonth() === today.getMonth()
    )
  if (range === "previous") {
    const previous = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    return (
      value.getFullYear() === previous.getFullYear() &&
      value.getMonth() === previous.getMonth()
    )
  }
  if (!start || !end) return true
  return (
    value >= new Date(`${start}T00:00:00`) &&
    value <= new Date(`${end}T23:59:59`)
  )
}

export function FinancialLedger({
  onMenu,
  onHome,
  onNavigate,
  active,
  organizations,
  transactions,
  payments,
  onRecordPayment,
  onDeleteTransaction,
  onDeleteOrganization,
}: {
  onMenu: () => void
  onHome: () => void
  onNavigate?: (screen: ModuleScreen) => void
  active?: ModuleScreen
  organizations: Organization[]
  transactions: Transaction[]
  payments: Payment[]
  onRecordPayment: (
    organizationId: string,
    amount: number,
    method: Payment["method"],
    reference: string,
    createdAt: string,
  ) => Promise<string | null> | string | null
  onDeleteTransaction?: (txnId: string) => Promise<void> | void
  onDeleteOrganization?: (orgId: string) => Promise<void> | void
}) {
  const [range, setRange] = useState("today")
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("")
  const [search, setSearch] = useState("")
  const [showPayment, setShowPayment] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<Payment["method"]>("Cash")
  const [paymentReference, setPaymentReference] = useState("")
  const [paymentDate, setPaymentDate] = useState(() => {
    const now = new Date()
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
  })
  const [error, setError] = useState("")
  const selectedOrganization = organizations.find(
    (item) => item.id === selectedOrganizationId,
  )
  const filteredTransactions = transactions.filter((item) =>
    inRange(item.createdAt, range, start, end),
  )
  const filteredPayments = payments.filter((item) =>
    inRange(item.createdAt, range, start, end),
  )
  const billed = filteredTransactions.reduce(
    (sum, item) => sum + item.grandTotal,
    0,
  )
  const collected =
    filteredTransactions.reduce((sum, item) => sum + item.initialPayment, 0) +
    filteredPayments.reduce((sum, item) => sum + item.amount, 0)
  const todayTransactions = transactions.filter((item) =>
    inRange(item.createdAt, "today", "", ""),
  )
  const monthTransactions = transactions.filter((item) =>
    inRange(item.createdAt, "month", "", ""),
  )
  const monthPayments = payments.filter((item) =>
    inRange(item.createdAt, "month", "", ""),
  )
  const monthSourceTotal = (source: TransactionSource) =>
    monthTransactions
      .filter((item) => item.source === source)
      .reduce((sum, item) => sum + item.grandTotal, 0)
  const orgTransactions = selectedOrganization
    ? transactions.filter(
        (item) =>
          item.organizationId === selectedOrganization.id &&
          inRange(item.createdAt, range, start, end),
      )
    : []
  const orgPayments = selectedOrganization
    ? payments.filter(
        (item) =>
          item.organizationId === selectedOrganization.id &&
          inRange(item.createdAt, range, start, end),
      )
    : []
  const orgOutstanding = selectedOrganization
    ? transactions
        .filter((item) => item.organizationId === selectedOrganization.id)
        .reduce((sum, item) => sum + item.outstanding, 0)
    : 0
  const orgPeriodPayments =
    orgTransactions.reduce((sum, item) => sum + item.initialPayment, 0) +
    orgPayments.reduce((sum, item) => sum + item.amount, 0)
  const orgTodayTransactions = selectedOrganization
    ? transactions.filter(
        (item) =>
          item.organizationId === selectedOrganization.id &&
          inRange(item.createdAt, "today", "", ""),
      )
    : []
  const orgTodayPayments = selectedOrganization
    ? payments.filter(
        (item) =>
          item.organizationId === selectedOrganization.id &&
          inRange(item.createdAt, "today", "", ""),
      )
    : []
  const orgMonthTransactions = selectedOrganization
    ? transactions.filter(
        (item) =>
          item.organizationId === selectedOrganization.id &&
          inRange(item.createdAt, "month", "", ""),
      )
    : []
  const orgMonthPayments = selectedOrganization
    ? payments.filter(
        (item) =>
          item.organizationId === selectedOrganization.id &&
          inRange(item.createdAt, "month", "", ""),
      )
    : []

  return (
    <main className="management-shell">
      <ModuleHeader
        title="Financial Ledger"
        eyebrow="BILLED SALES & COLLECTIONS"
        onMenu={onMenu}
        onHome={onHome}
        onNavigate={onNavigate}
        active={active || "ledger"}
      />
      <div className="management-content">
        <section className="management-section ledger-filters">
          <div className="section-title-row">
            <div>
              <p>REPORTING PERIOD</p>
              <h2>
                {new Date().toLocaleDateString("en-PK", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
            </div>
            <span>{new Date().toLocaleDateString("en-PK")}</span>
          </div>
          <div className="filter-buttons">
            {[
              ["today", "Today"],
              ["month", "Current Month"],
              ["previous", "Previous Month"],
              ["custom", "Custom"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={range === value ? "active" : ""}
                onClick={() => setRange(value)}
              >
                {label}
              </button>
            ))}
          </div>
          {range === "custom" && (
            <div className="composer-grid">
              <div className="management-field">
                <label>From</label>
                <input
                  type="date"
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                />
              </div>
              <div className="management-field">
                <label>To</label>
                <input
                  type="date"
                  value={end}
                  onChange={(event) => setEnd(event.target.value)}
                />
              </div>
            </div>
          )}
        </section>

        <section className="ledger-overview">
          <div className="ledger-main-card">
            <span>Billed sales</span>
            <strong>Rs. {billed.toLocaleString()}</strong>
            <small>Selected period</small>
          </div>
          <div className="ledger-main-card collected">
            <span>Payments received</span>
            <strong>Rs. {collected.toLocaleString()}</strong>
            <small>Actual collections</small>
          </div>
        </section>
        <section className="summary-grid">
          <article>
            <span>Today's total</span>
            <strong>
              Rs.{" "}
              {todayTransactions
                .reduce((sum, item) => sum + item.grandTotal, 0)
                .toLocaleString()}
            </strong>
          </article>
          <article>
            <span>Today's counter</span>
            <strong>
              Rs.{" "}
              {todayTransactions
                .filter((item) => item.source === "counter")
                .reduce((sum, item) => sum + item.grandTotal, 0)
                .toLocaleString()}
            </strong>
          </article>
          <article>
            <span>Today's event orders</span>
            <strong>
              Rs.{" "}
              {todayTransactions
                .filter((item) => item.source === "customized")
                .reduce((sum, item) => sum + item.grandTotal, 0)
                .toLocaleString()}
            </strong>
          </article>
          <article>
            <span>Today's bulk</span>
            <strong>
              Rs.{" "}
              {todayTransactions
                .filter((item) => item.source === "bulk")
                .reduce((sum, item) => sum + item.grandTotal, 0)
                .toLocaleString()}
            </strong>
          </article>
        </section>
        <section className="management-section revenue-breakdown">
          <div className="section-title-row">
            <div>
              <p>CURRENT MONTH</p>
              <h2>Revenue by source</h2>
            </div>
            <strong>
              Rs.{" "}
              {monthTransactions
                .reduce((sum, item) => sum + item.grandTotal, 0)
                .toLocaleString()}
            </strong>
          </div>
          <p>
            <span>Counter sales</span>
            <b>Rs. {monthSourceTotal("counter").toLocaleString()}</b>
          </p>
          <p>
            <span>Event orders</span>
            <b>Rs. {monthSourceTotal("customized").toLocaleString()}</b>
          </p>
          <p>
            <span>Organization / bulk</span>
            <b>Rs. {monthSourceTotal("bulk").toLocaleString()}</b>
          </p>
          <p>
            <span>Payments collected</span>
            <b>
              Rs.{" "}
              {(
                monthTransactions.reduce(
                  (sum, item) => sum + item.initialPayment,
                  0,
                ) + monthPayments.reduce((sum, item) => sum + item.amount, 0)
              ).toLocaleString()}
            </b>
          </p>
        </section>

        <div className="ledger-master-detail">
          <section className="management-section ledger-accounts-section">
            <div className="section-title-row">
              <div>
                <p>ORGANIZATIONS LEDGER</p>
                <h2>Accounts & balances</h2>
              </div>
            </div>
            <div className="management-field">
              <label>Search organizations</label>
              <input
                placeholder="Search by name"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="organization-ledger-list">
              {organizations
                .filter((item) =>
                  item.name.toLowerCase().includes(search.toLowerCase()),
                )
                .map((organization) => {
                  const records = transactions.filter(
                    (item) => item.organizationId === organization.id,
                  )
                  const monthRecords = records.filter((item) =>
                    inRange(item.createdAt, "month", "", ""),
                  )
                  const organizationMonthPayments = payments.filter(
                    (item) =>
                      item.organizationId === organization.id &&
                      inRange(item.createdAt, "month", "", ""),
                  )
                  const latest = [...records].sort((a, b) =>
                    b.createdAt.localeCompare(a.createdAt),
                  )[0]
                  return (
                    <button
                      key={organization.id}
                      className={
                        selectedOrganizationId === organization.id
                          ? "active"
                          : ""
                      }
                      onClick={() => setSelectedOrganizationId(organization.id)}
                    >
                      <div>
                        <strong>{organization.name}</strong>
                        <span>
                          {monthRecords.length} orders · Billed Rs.{" "}
                          {monthRecords
                            .reduce((sum, item) => sum + item.grandTotal, 0)
                            .toLocaleString()}
                        </span>
                        <span>
                          Paid Rs.{" "}
                          {(
                            monthRecords.reduce(
                              (sum, item) => sum + item.initialPayment,
                              0,
                            ) +
                            organizationMonthPayments.reduce(
                              (sum, item) => sum + item.amount,
                              0,
                            )
                          ).toLocaleString()}{" "}
                          · Last{" "}
                          {latest
                            ? new Date(latest.createdAt).toLocaleDateString(
                                "en-PK",
                              )
                            : "—"}
                        </span>
                      </div>
                      <div>
                        <b>
                          Rs.{" "}
                          {records
                            .reduce((sum, item) => sum + item.outstanding, 0)
                            .toLocaleString()}
                        </b>
                        <span>outstanding</span>
                      </div>
                    </button>
                  )
                })}
              {!organizations.length && (
                <div className="management-empty">
                  No organizations registered yet.
                </div>
              )}
            </div>
          </section>

          {selectedOrganization ? (
            <section className="management-section organization-detail">
              <div className="section-title-row">
                <div>
                  <p>ACCOUNT DETAIL</p>
                  <h2>{selectedOrganization.name}</h2>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    className="text-button"
                    onClick={() => setShowPayment(true)}
                  >
                    Record Payment
                  </button>
                  {onDeleteOrganization && (
                    <button
                      className="text-button"
                      style={{ color: "#ef4444" }}
                      onClick={() => onDeleteOrganization(selectedOrganization.id)}
                      title="Delete account from Supabase database"
                    >
                      Delete Account
                    </button>
                  )}
                </div>
              </div>
              <p className="organization-contact">
                {[
                  selectedOrganization.contactPerson,
                  selectedOrganization.phone,
                  selectedOrganization.email,
                ]
                  .filter(Boolean)
                  .join(" · ") || "No contact information"}
              </p>
              <div className="organization-summary-cards">
                <div>
                  <span>Today's billed</span>
                  <b>
                    Rs.{" "}
                    {orgTodayTransactions
                      .reduce((sum, item) => sum + item.grandTotal, 0)
                      .toLocaleString()}
                  </b>
                </div>
                <div>
                  <span>Today's received</span>
                  <b>
                    Rs.{" "}
                    {(
                      orgTodayTransactions.reduce(
                        (sum, item) => sum + item.initialPayment,
                        0,
                      ) +
                      orgTodayPayments.reduce(
                        (sum, item) => sum + item.amount,
                        0,
                      )
                    ).toLocaleString()}
                  </b>
                </div>
                <div>
                  <span>Month billed</span>
                  <b>
                    Rs.{" "}
                    {orgMonthTransactions
                      .reduce((sum, item) => sum + item.grandTotal, 0)
                      .toLocaleString()}
                  </b>
                </div>
                <div>
                  <span>Month received</span>
                  <b>
                    Rs.{" "}
                    {(
                      orgMonthTransactions.reduce(
                        (sum, item) => sum + item.initialPayment,
                        0,
                      ) +
                      orgMonthPayments.reduce(
                        (sum, item) => sum + item.amount,
                        0,
                      )
                    ).toLocaleString()}
                  </b>
                </div>
                <div>
                  <span>Period received</span>
                  <b>Rs. {orgPeriodPayments.toLocaleString()}</b>
                </div>
                <div>
                  <span>Outstanding</span>
                  <b>Rs. {orgOutstanding.toLocaleString()}</b>
                </div>
              </div>
              {showPayment && (
                <div className="payment-form">
                  <div className="management-field">
                    <label>Amount received</label>
                    <input
                      type="number"
                      min="1"
                      value={paymentAmount}
                      onChange={(event) =>
                        setPaymentAmount(Number(event.target.value))
                      }
                    />
                  </div>
                  <div className="management-field">
                    <label>Payment method</label>
                    <select
                      value={paymentMethod}
                      onChange={(event) =>
                        setPaymentMethod(
                          event.target.value as Payment["method"],
                        )
                      }
                    >
                      <option>Cash</option>
                      <option>Bank Transfer</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="management-field">
                    <label>Payment date and time</label>
                    <input
                      type="datetime-local"
                      value={paymentDate}
                      onChange={(event) => setPaymentDate(event.target.value)}
                    />
                  </div>
                  <div className="management-field">
                    <label>Reference / notes</label>
                    <input
                      value={paymentReference}
                      onChange={(event) =>
                        setPaymentReference(event.target.value)
                      }
                    />
                  </div>
                  {error && <p className="form-error">{error}</p>}
                  <div className="composer-actions">
                    <button
                      className="subtle-button"
                      onClick={() => setShowPayment(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="management-primary"
                      onClick={async () => {
                        const parsedDate = new Date(paymentDate)
                        if (
                          !paymentDate ||
                          Number.isNaN(parsedDate.getTime())
                        ) {
                          setError("Select a valid payment date and time.")
                          return
                        }
                        const paymentError = await onRecordPayment(
                          selectedOrganization.id,
                          paymentAmount,
                          paymentMethod,
                          paymentReference,
                          parsedDate.toISOString(),
                        )
                        if (paymentError) {
                          setError(paymentError)
                          return
                        }
                        setShowPayment(false)
                        setPaymentAmount(0)
                        setPaymentReference("")
                        setError("")
                      }}
                    >
                      Save Payment
                    </button>
                  </div>
                </div>
              )}
              <div className="transaction-list">
                {orgTransactions.map((item) => (
                  <article key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <strong>{item.receiptNumber}</strong>
                      <span>
                        {new Date(item.createdAt).toLocaleDateString("en-PK")}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                      <div style={{ textAlign: "right" }}>
                        <b>Rs. {item.grandTotal.toLocaleString()}</b>
                        <span style={{ display: "block", fontSize: "0.75rem", color: "var(--muted)" }}>
                          Paid Rs. {item.amountPaid.toLocaleString()} · Due Rs.{" "}
                          {item.outstanding.toLocaleString()}
                        </span>
                      </div>
                      {onDeleteTransaction && (
                        <button
                          type="button"
                          title="Delete / Void Order from Supabase"
                          onClick={() => onDeleteTransaction(item.id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            padding: "0.35rem",
                            borderRadius: "0.35rem",
                            fontSize: "0.9rem",
                          }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </article>
                ))}
                {!orgTransactions.length && (
                  <div className="management-empty">
                    No orders in this period.
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className="management-section organization-detail-placeholder desktop-only-flex">
              <div className="placeholder-icon">🏢</div>
              <h3>Select an Organization</h3>
              <p>
                Choose an account from the list to view its financial summary,
                order history, and record incoming payments.
              </p>
            </section>
          )}
        </div>

        <section className="management-section">
          <div className="section-title-row">
            <div>
              <p>TRANSACTIONS</p>
              <h2>Selected period</h2>
            </div>
          </div>
          <div className="transaction-list">
            {filteredTransactions.map((item) => (
              <article key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <strong>{item.receiptNumber}</strong>
                  <span>
                    {new Date(item.createdAt).toLocaleDateString("en-PK")} ·{" "}
                    {item.organizationName || item.customerName || item.source}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                  <div style={{ textAlign: "right" }}>
                    <b>Rs. {item.grandTotal.toLocaleString()}</b>
                    <span style={{ display: "block", fontSize: "0.75rem", color: "var(--muted)" }}>
                      Paid Rs. {item.amountPaid.toLocaleString()} · Due Rs.{" "}
                      {item.outstanding.toLocaleString()}
                    </span>
                  </div>
                  {onDeleteTransaction && (
                    <button
                      type="button"
                      title="Delete / Void Order from Supabase"
                      onClick={() => onDeleteTransaction(item.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        padding: "0.35rem",
                        borderRadius: "0.35rem",
                        fontSize: "0.9rem",
                      }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </article>
            ))}
            {!filteredTransactions.length && (
              <div className="management-empty">
                No transactions in this period.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
