import { useEffect, useMemo, useState } from "react"
import { api } from "./api"
import {
  BulkOrders,
  CustomizedOrders,
  FinancialLedger,
  NavigationDrawer,
} from "./Management"
import { PriceManagementModal } from "./PriceManagementModal"
import {
  AppConfig,
  CartItem,
  CONFIG,
  loadStored,
  makeId,
  makeReceiptNumber,
  Organization,
  Payment,
  QUANTITIES,
  Receipt,
  Transaction,
  TransactionSource,
  WEIGHTS,
} from "./data"

type Screen = "menu" | "cart" | "receipt" | "customized" | "bulk" | "ledger"

const FOOD_IMAGE =
  "https://images.unsplash.com/photo-1552590635-27c2c2128abf?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=900"

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L20.5 8H6M10 20h.01M17 20h.01" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" />
    </svg>
  )
}

function BowlIcon({ kind }: { kind: "zarda" | "raita" | "salad" | "drink" }) {
  if (kind === "drink") {
    return (
      <svg
        className="food-icon drink-icon"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <path d="M36 13h28l-4 12 8 58H32l8-58z" />
        <path d="M39 47h24" />
        <path className="accent" d="M42 55h20l3 23H35z" />
      </svg>
    )
  }
  return (
    <svg
      className={`food-icon ${kind}-icon`}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      {kind === "salad" && (
        <>
          <path className="leaf" d="M50 48c-19-2-27-13-25-28 16 0 27 8 28 25" />
          <path
            className="leaf two"
            d="M51 49c4-18 15-26 29-25 1 16-8 26-27 28"
          />
        </>
      )}
      <path d="M16 45h68c-2 28-14 40-34 40S18 73 16 45Z" />
      <path className="rim" d="M12 43c0-5 76-5 76 0s-76 5-76 0Z" />
      {kind === "zarda" && (
        <path
          className="steam"
          d="M35 34c-5-8 7-9 2-18M54 33c-5-8 7-9 2-18M70 35c-5-8 7-9 2-18"
        />
      )}
      {kind === "raita" && (
        <path className="topping" d="M28 43c8-12 37-13 47 0" />
      )}
    </svg>
  )
}

function IconButton({
  label,
  onClick,
  children,
  badge,
  className = "",
}: {
  label: string
  onClick?: () => void
  children: React.ReactNode
  badge?: number
  className?: string
}) {
  return (
    <button
      className={`icon-button ${className}`.trim()}
      aria-label={label}
      onClick={onClick}
    >
      {children}
      {!!badge && <span className="cart-badge">{badge}</span>}
    </button>
  )
}

function QuantitySelect({
  value,
  custom,
  onChange,
  onCustomChange,
}: {
  value: string
  custom: string
  onChange: (value: string) => void
  onCustomChange: (value: string) => void
}) {
  return (
    <div className="field-stack">
      <label>Quantity</label>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {QUANTITIES.map((quantity) => (
          <option key={quantity} value={quantity}>
            {quantity}
          </option>
        ))}
        <option value="custom">Custom</option>
      </select>
      {value === "custom" && (
        <input
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          placeholder="Enter qty"
          value={custom}
          onChange={(event) => onCustomChange(event.target.value)}
          aria-label="Custom quantity"
        />
      )}
    </div>
  )
}

function WeightSelect({
  value,
  custom,
  onChange,
  onCustomChange,
}: {
  value: string
  custom: string
  onChange: (value: string) => void
  onCustomChange: (value: string) => void
}) {
  return (
    <div className="field-stack">
      <label>Weight</label>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {WEIGHTS.map((weight) => (
          <option key={weight} value={weight}>
            {weight.toLocaleString()} g
          </option>
        ))}
        <option value="custom">Custom weight</option>
      </select>
      {value === "custom" && (
        <input
          type="number"
          min="250"
          step="125"
          inputMode="numeric"
          placeholder="Grams"
          value={custom}
          onChange={(event) => onCustomChange(event.target.value)}
          aria-label="Custom weight in grams"
        />
      )}
    </div>
  )
}

function RiceCard({
  name,
  typeName,
  price,
  catalogKey,
  imagePosition,
  onAdd,
  notify,
}: {
  name: string
  typeName: string
  price: number
  catalogKey: "biryani" | "pulao"
  imagePosition: string
  onAdd: (item: Omit<CartItem, "id">) => void
  notify: (message: string, error?: boolean) => void
}) {
  const [weight, setWeight] = useState("250")
  const [customWeight, setCustomWeight] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [customQuantity, setCustomQuantity] = useState("")
  const actualWeight =
    weight === "custom" ? Number(customWeight) : Number(weight)
  const actualQuantity =
    quantity === "custom" ? Number(customQuantity) : Number(quantity)
  const validWeight = actualWeight > 0 && actualWeight % 125 === 0
  const validQuantity = Number.isInteger(actualQuantity) && actualQuantity > 0
  const unitPrice = validWeight ? (actualWeight / 250) * price : 0
  const total = validQuantity ? unitPrice * actualQuantity : 0

  const add = () => {
    if (!validWeight) {
      notify("Weight must be a positive multiple of 125 g.", true)
      return
    }
    if (!validQuantity) {
      notify("Quantity must be a positive whole number.", true)
      return
    }
    onAdd({
      name,
      detail: `${actualWeight.toLocaleString()} g`,
      quantity: actualQuantity,
      unitPrice,
      catalogKey,
      receiptDetails: [
        { label: "Type", value: typeName },
        { label: "Weight", value: `${actualWeight.toLocaleString()} g` },
      ],
    })
  }

  return (
    <article className="product-card rice-card">
      <div className="food-photo">
        <img
          src={FOOD_IMAGE}
          alt={`${name} served in a traditional bowl`}
          style={{ objectPosition: imagePosition }}
        />
      </div>
      <div className="card-body">
        <div className="product-title-row">
          <h2>{name}</h2>
          <span className="from-price">Rs. {price}</span>
        </div>
        <p className="price-note">
          Rs. {price} <span>/ 250 g</span>
        </p>
        <div className="control-grid">
          <WeightSelect
            value={weight}
            custom={customWeight}
            onChange={setWeight}
            onCustomChange={setCustomWeight}
          />
          <QuantitySelect
            value={quantity}
            custom={customQuantity}
            onChange={setQuantity}
            onCustomChange={setCustomQuantity}
          />
        </div>
        <div className="card-footer">
          <div>
            <span>Total</span>
            <strong>Rs. {total.toLocaleString()}</strong>
          </div>
          <button className="primary-button" onClick={add}>
            Add to cart
          </button>
        </div>
      </div>
    </article>
  )
}

function SimpleWeightedCard({
  price = CONFIG.zardaPrice,
  onAdd,
  notify,
}: {
  price?: number
  onAdd: (item: Omit<CartItem, "id">) => void
  notify: (message: string, error?: boolean) => void
}) {
  const [quantity, setQuantity] = useState("1")
  const [customQuantity, setCustomQuantity] = useState("")
  const actualQuantity =
    quantity === "custom" ? Number(customQuantity) : Number(quantity)
  const valid = Number.isInteger(actualQuantity) && actualQuantity > 0
  const total = valid ? price * actualQuantity : 0

  const add = () => {
    if (!valid) {
      notify("Quantity must be a positive whole number.", true)
      return
    }
    onAdd({
      name: "Zarda",
      detail: "Box",
      quantity: actualQuantity,
      unitPrice: price,
      catalogKey: "zarda",
      receiptDetails: [{ value: "Box" }],
    })
  }

  return (
    <article className="product-card compact-card">
      <div className="illustration zarda-bg">
        <BowlIcon kind="zarda" />
      </div>
      <div className="card-body">
        <div className="product-title-row">
          <h2>Zarda</h2>
          <span className="from-price">Rs. {price}</span>
        </div>
        <p className="price-note">
          Rs. {price} <span>/ box</span>
        </p>
        <QuantitySelect
          value={quantity}
          custom={customQuantity}
          onChange={setQuantity}
          onCustomChange={setCustomQuantity}
        />
        <div className="compact-total">
          Total <strong>Rs. {total.toLocaleString()}</strong>
        </div>
        <button className="primary-button full-button" onClick={add}>
          Add to cart
        </button>
      </div>
    </article>
  )
}

function DrinksCard({
  drinksConfig = CONFIG.drinks,
  onAdd,
  notify,
}: {
  drinksConfig?: AppConfig["drinks"]
  onAdd: (item: Omit<CartItem, "id">) => void
  notify: (message: string, error?: boolean) => void
}) {
  const [brand, setBrand] = useState<keyof typeof CONFIG.drinks>("Pepsi")
  const [size, setSize] =
    useState<keyof typeof CONFIG.drinks["Pepsi"]>("300 ml")
  const [quantity, setQuantity] = useState("1")
  const [customQuantity, setCustomQuantity] = useState("")
  const actualQuantity =
    quantity === "custom" ? Number(customQuantity) : Number(quantity)
  const price = (drinksConfig[brand] && drinksConfig[brand][size]) ?? 90
  const valid = Number.isInteger(actualQuantity) && actualQuantity > 0

  const add = () => {
    if (!valid) {
      notify("Quantity must be a positive whole number.", true)
      return
    }
    onAdd({
      name: brand,
      detail: size,
      quantity: actualQuantity,
      unitPrice: price,
      catalogKey: "drinks",
      receiptDetails: [{ label: "Size", value: size }],
    })
  }

  return (
    <article className="product-card compact-card drinks-card">
      <div className="illustration drinks-bg">
        <BowlIcon kind="drink" />
      </div>
      <div className="card-body">
        <div className="product-title-row">
          <h2>Cold drinks</h2>
          <span className="from-price">Rs. {price}</span>
        </div>
        <div className="drink-controls">
          <div className="field-stack">
            <label>Brand</label>
            <select
              value={brand}
              onChange={(event) =>
                setBrand(event.target.value as keyof typeof CONFIG.drinks)
              }
            >
              {Object.keys(drinksConfig).map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="field-stack">
            <label>Size</label>
            <select
              value={size}
              onChange={(event) =>
                setSize(
                  event.target.value as keyof typeof CONFIG.drinks["Pepsi"],
                )
              }
            >
              {(Object.keys(
                drinksConfig[brand] || {},
              ) as Array<keyof typeof CONFIG.drinks["Pepsi"]>).map((item) => (
                <option key={item} value={item}>
                  {item} — Rs. {drinksConfig[brand]?.[item]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <QuantitySelect
          value={quantity}
          custom={customQuantity}
          onChange={setQuantity}
          onCustomChange={setCustomQuantity}
        />
        <div className="compact-total">
          Total{" "}
          <strong>
            Rs. {(valid ? price * actualQuantity : 0).toLocaleString()}
          </strong>
        </div>
        <button className="primary-button full-button" onClick={add}>
          Add to cart
        </button>
      </div>
    </article>
  )
}

function BasicCard({
  kind,
  name,
  price,
  onAdd,
  notify,
}: {
  kind: "raita" | "salad"
  name: string
  price: number | null
  onAdd: (item: Omit<CartItem, "id">) => void
  notify: (message: string, error?: boolean) => void
}) {
  const [quantity, setQuantity] = useState("1")
  const [customQuantity, setCustomQuantity] = useState("")
  const actualQuantity =
    quantity === "custom" ? Number(customQuantity) : Number(quantity)
  const valid = Number.isInteger(actualQuantity) && actualQuantity > 0

  return (
    <article className="product-card basic-card">
      <div className={`illustration ${kind}-bg`}>
        <BowlIcon kind={kind} />
      </div>
      <div className="card-body">
        <h2>{name}</h2>
        <strong className="basic-price">
          {price ? `Rs. ${price}` : "Price pending"}
        </strong>
        <QuantitySelect
          value={quantity}
          custom={customQuantity}
          onChange={setQuantity}
          onCustomChange={setCustomQuantity}
        />
        <button
          className="primary-button full-button"
          onClick={() => {
            if (!price) {
              notify(`${name} pricing has not been configured yet.`, true)
              return
            }
            if (!valid) {
              notify("Quantity must be a positive whole number.", true)
              return
            }
            onAdd({
              name,
              detail: "Single serving",
              quantity: actualQuantity,
              unitPrice: price,
              catalogKey: kind,
            })
          }}
        >
          Add to cart
        </button>
      </div>
    </article>
  )
}

function CartScreen({
  items,
  setItems,
  onBack,
  onCheckout,
}: {
  items: CartItem[]
  setItems: React.Dispatch<React.SetStateAction<CartItem[]>>
  onBack: () => void
  onCheckout: () => void
}) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  )
  const updateQuantity = (id: string, change: number) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + change) }
          : item,
      ),
    )
  }

  return (
    <main className="app-shell cart-screen">
      <header className="cart-header">
        <div className="topbar-container">
          <IconButton label="Back to menu" onClick={onBack}>
            <ArrowIcon />
          </IconButton>
          <div className="cart-header-title">
            <p>YOUR ORDER</p>
            <h1>Review cart</h1>
          </div>
          <button className="cart-header-back-btn" onClick={onBack}>
            <span>← Menu</span>
          </button>
        </div>
      </header>
      <section className="cart-content">
        {items.length === 0 ? (
          <div className="empty-cart">
            <div className="empty-icon">
              <CartIcon />
            </div>
            <h2>Your cart is empty</h2>
            <p>Good food is just a few taps away.</p>
            <button className="primary-button" onClick={onBack}>
              Browse the menu
            </button>
          </div>
        ) : (
          <div className="cart-grid-container">
            <div className="cart-list">
              {items.map((item) => (
                <article className="cart-item" key={item.id}>
                  <div className="cart-item-thumb">
                    <img src={FOOD_IMAGE} alt={item.name} />
                  </div>
                  <div className="cart-item-info">
                    <h2>{item.name}</h2>
                    <p>{item.detail}</p>
                    <strong>
                      Rs. {(item.unitPrice * item.quantity).toLocaleString()}
                    </strong>
                  </div>
                  <div className="cart-item-actions">
                    <button
                      className="remove-button"
                      aria-label={`Remove ${item.name}`}
                      onClick={() =>
                        setItems((current) =>
                          current.filter((cartItem) => cartItem.id !== item.id),
                        )
                      }
                    >
                      <TrashIcon />
                    </button>
                    <div className="stepper">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        aria-label={`Decrease ${item.name} quantity`}
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        aria-label={`Increase ${item.name} quantity`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <aside className="order-summary">
              <p>
                <span>Total items</span>
                <span>
                  {items.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </p>
              <div>
                <span>Subtotal</span>
                <strong>Rs. {subtotal.toLocaleString()}</strong>
              </div>
              <button className="checkout-button" onClick={onCheckout}>
                Proceed to checkout
              </button>
              <small>Receipt generated immediately on order completion</small>
            </aside>
          </div>
        )}
      </section>
    </main>
  )
}

function ReceiptScreen({
  receipt,
  onBack,
}: {
  receipt: Receipt | null
  onBack: () => void
}) {
  if (!receipt) {
    return (
      <main className="receipt-screen">
        <section className="empty-bill">
          <h1>No bill generated</h1>
          <p>Your order is empty. Please add items before generating a bill.</p>
          <button className="receipt-action secondary" onClick={onBack}>
            Return to menu
          </button>
        </section>
      </main>
    )
  }

  const grandTotal = receipt.subtotal - receipt.discount
  const formattedDate = receipt.createdAt.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
  const formattedTime = receipt.createdAt.toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <main className="receipt-screen">
      <div className="receipt-container">
        <div className="receipt-top-toolbar">
          <button className="receipt-action secondary" onClick={onBack}>
            ← Return to Menu
          </button>
          <button
            className="receipt-action primary"
            onClick={() => window.print()}
          >
            🖨️ Print Receipt
          </button>
        </div>

        <section className="receipt-paper" id="thermal-receipt">
          <header className="receipt-heading">
            <h1>Mr Bilal Biryani House</h1>
            <p>Restaurant receipt</p>
          </header>
          <div className="receipt-meta">
            <p>
              <span>Order No:</span>
              <b>{receipt.orderNumber}</b>
            </p>
            {receipt.orderType && (
              <p>
                <span>Order Type:</span>
                <b>{receipt.orderType}</b>
              </p>
            )}
            <p>
              <span>Receipt No:</span>
              <b>{receipt.number}</b>
            </p>
            <p>
              <span>Date:</span>
              <b>{formattedDate}</b>
            </p>
            <p>
              <span>Time:</span>
              <b>{formattedTime}</b>
            </p>
          </div>
          {!!receipt.partyDetails?.length && (
            <div className="receipt-party">
              {receipt.partyDetails.map((detail) => (
                <p key={detail}>{detail}</p>
              ))}
            </div>
          )}
          <div className="receipt-divider" />
          <h2 className="receipt-section-title">ORDER ITEMS</h2>
          <div className="receipt-items">
            {receipt.items.map((item) => (
              <article className="receipt-item" key={item.id}>
                <h3>{item.name}</h3>
                {item.receiptDetails?.map((detail, index) => (
                  <p key={`${detail.label ?? "detail"}-${index}`}>
                    {detail.label ? <span>{detail.label}:</span> : <span />}
                    <b>{detail.value}</b>
                  </p>
                ))}
                <p>
                  <span>Qty:</span>
                  <b>{item.quantity}</b>
                </p>
                <p>
                  <span>Rate:</span>
                  <b>Rs. {item.unitPrice.toLocaleString()}</b>
                </p>
                <p className="receipt-amount">
                  <span>Amount:</span>
                  <b>Rs. {(item.unitPrice * item.quantity).toLocaleString()}</b>
                </p>
              </article>
            ))}
          </div>
          <div className="receipt-divider" />
          <div className="receipt-totals">
            <p>
              <span>Subtotal:</span>
              <b>Rs. {receipt.subtotal.toLocaleString()}</b>
            </p>
            <p>
              <span>Discount:</span>
              <b>Rs. {receipt.discount.toLocaleString()}</b>
            </p>
            <p className="grand-total">
              <span>GRAND TOTAL:</span>
              <b>Rs. {grandTotal.toLocaleString()}</b>
            </p>
            {receipt.advancePayment !== undefined && (
              <p>
                <span>Advance Paid:</span>
                <b>Rs. {receipt.advancePayment.toLocaleString()}</b>
              </p>
            )}
            {receipt.remainingBalance !== undefined && (
              <p>
                <span>Remaining:</span>
                <b>Rs. {receipt.remainingBalance.toLocaleString()}</b>
              </p>
            )}
          </div>
          <div className="receipt-divider" />
          <footer className="receipt-footer">
            <p>Thank you for your order!</p>
            <p>Please visit again.</p>
          </footer>
        </section>

        <div className="receipt-actions">
          <button className="receipt-action" onClick={() => window.print()}>
            Print Receipt
          </button>
          <button className="receipt-action secondary" onClick={onBack}>
            Go Back
          </button>
        </div>
      </div>
    </main>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu")
  const [items, setItems] = useState<CartItem[]>([])
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(
    null,
  )
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [receiptReturnScreen, setReceiptReturnScreen] =
    useState<Exclude<Screen, "receipt">>("menu")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>(() =>
    loadStored("bh-organizations", []),
  )
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    loadStored("bh-transactions", []),
  )
  const [payments, setPayments] = useState<Payment[]>(() =>
    loadStored("bh-payments", []),
  )
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("")
  const [appConfig, setAppConfig] = useState<AppConfig>(() =>
    loadStored("bh-config", CONFIG),
  )
  const [priceModalOpen, setPriceModalOpen] = useState(false)
  const [counterTransactionId, setCounterTransactionId] =
    useState<string | null>(null)
  const [isBackendConnected, setIsBackendConnected] = useState(false)
  const cartCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  )

  // Initial synchronization with Supabase PostgreSQL Database
  useEffect(() => {
    let active = true

    async function syncDatabase() {
      try {
        const [health, dbConfig, dbOrgs, dbTxns, dbPayments] = await Promise.all([
          api.checkHealth(),
          api.getConfig(),
          api.getOrganizations(),
          api.getTransactions(),
          api.getPayments(),
        ])

        if (health.status === "ok" && health.database === "connected") {
          if (active) setIsBackendConnected(true)
        }

        if (active) {
          if (dbConfig && dbConfig.rice_prices) {
            const syncedConfig: AppConfig = {
              ricePrices: {
                chicken: dbConfig.rice_prices.chicken ?? 130,
                beef: dbConfig.rice_prices.beef ?? 150,
                sada: dbConfig.rice_prices.sada ?? 100,
                chana: dbConfig.rice_prices.chana ?? 100,
              },
              zardaPrice: dbConfig.zarda_price ?? 100,
              saladPrice: dbConfig.salad_price ?? 50,
              raitaPrice: dbConfig.raita_price ?? 50,
              drinks: dbConfig.drinks ?? CONFIG.drinks,
            }
            setAppConfig(syncedConfig)
            localStorage.setItem("bh-config", JSON.stringify(syncedConfig))
          }
          if (dbOrgs) setOrganizations(dbOrgs)
          if (dbTxns) setTransactions(dbTxns)
          if (dbPayments) setPayments(dbPayments)
        }
      } catch (err) {
        console.warn("Backend database not reachable or initial sync error:", err)
        if (active) setIsBackendConnected(false)
      }
    }

    syncDatabase()
    return () => {
      active = false
    }
  }, [])

  useEffect(
    () =>
      localStorage.setItem("bh-organizations", JSON.stringify(organizations)),
    [organizations],
  )
  useEffect(
    () => localStorage.setItem("bh-transactions", JSON.stringify(transactions)),
    [transactions],
  )
  useEffect(
    () => localStorage.setItem("bh-payments", JSON.stringify(payments)),
    [payments],
  )
  useEffect(() => {
    if (items.length === 0) setCounterTransactionId(null)
  }, [items.length])

  const notify = (message: string, error = false) => {
    setToast({ message, error })
    window.setTimeout(() => setToast(null), 2600)
  }

  const handleSaveOrganization = async (saved: Organization) => {
    setOrganizations((current) => {
      const exists = current.some((item) => item.id === saved.id)
      return exists
        ? current.map((item) => (item.id === saved.id ? saved : item))
        : [...current, saved]
    })

    try {
      const existsInDb = organizations.some((item) => item.id === saved.id)
      if (existsInDb) {
        const updated = await api.updateOrganization(saved.id, saved)
        setOrganizations((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        )
      } else {
        const created = await api.createOrganization(saved)
        setOrganizations((current) =>
          current.map((item) => (item.id === saved.id ? created : item)),
        )
      }
      notify(`Organization '${saved.name}' saved to database.`)
    } catch (err: any) {
      console.warn("Could not persist organization to database, saved locally:", err)
    }
  }

  const handleManualSync = async () => {
    try {
      notify("Syncing with Supabase database...")
      const [health, dbConfig, dbOrgs, dbTxns, dbPayments] = await Promise.all([
        api.checkHealth(),
        api.getConfig(),
        api.getOrganizations(),
        api.getTransactions(),
        api.getPayments(),
      ])
      if (health.status === "ok" && health.database === "connected") {
        setIsBackendConnected(true)
      }
      if (dbConfig && dbConfig.rice_prices) {
        const syncedConfig: AppConfig = {
          ricePrices: {
            chicken: dbConfig.rice_prices.chicken ?? 130,
            beef: dbConfig.rice_prices.beef ?? 150,
            sada: dbConfig.rice_prices.sada ?? 100,
            chana: dbConfig.rice_prices.chana ?? 100,
          },
          zardaPrice: dbConfig.zarda_price ?? 100,
          saladPrice: dbConfig.salad_price ?? 50,
          raitaPrice: dbConfig.raita_price ?? 50,
          drinks: dbConfig.drinks ?? CONFIG.drinks,
        }
        setAppConfig(syncedConfig)
        localStorage.setItem("bh-config", JSON.stringify(syncedConfig))
      }
      if (dbOrgs) setOrganizations(dbOrgs)
      if (dbTxns) setTransactions(dbTxns)
      if (dbPayments) setPayments(dbPayments)
      notify("Database synchronized with Supabase PostgreSQL!")
    } catch (err: any) {
      setIsBackendConnected(false)
      notify(err.message || "Failed to sync with Supabase database.", true)
    }
  }

  const handleUpdatePrices = async (updatedConfig: AppConfig) => {
    try {
      const payload = {
        rice_prices: updatedConfig.ricePrices,
        zarda_price: updatedConfig.zardaPrice,
        salad_price: updatedConfig.saladPrice,
        raita_price: updatedConfig.raitaPrice,
        drinks: updatedConfig.drinks,
      }
      const res = await api.updatePrices(payload)
      if (res && res.rice_prices) {
        const syncedConfig: AppConfig = {
          ricePrices: {
            chicken: res.rice_prices.chicken ?? 130,
            beef: res.rice_prices.beef ?? 150,
            sada: res.rice_prices.sada ?? 100,
            chana: res.rice_prices.chana ?? 100,
          },
          zardaPrice: res.zarda_price ?? 100,
          saladPrice: res.salad_price ?? 50,
          raitaPrice: res.raita_price ?? 50,
          drinks: res.drinks ?? CONFIG.drinks,
        }
        setAppConfig(syncedConfig)
        localStorage.setItem("bh-config", JSON.stringify(syncedConfig))
      } else {
        setAppConfig(updatedConfig)
      }
      notify("Prices successfully updated in Supabase database!")
    } catch (err: any) {
      console.error("Price update error:", err)
      notify(err.message || "Failed to update prices in database.", true)
      throw err
    }
  }

  const handleDeleteTransaction = async (txnId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this order from Supabase database?")) return
    try {
      await api.deleteTransaction(txnId)
      setTransactions((cur) => cur.filter((t) => t.id !== txnId))
      notify("Order deleted from Supabase database.")
    } catch (err: any) {
      notify(err.message || "Failed to delete order from database.", true)
    }
  }

  const handleDeleteOrganization = async (orgId: string) => {
    if (!window.confirm("Are you sure you want to delete this organization from Supabase database?")) return
    try {
      await api.deleteOrganization(orgId)
      setOrganizations((cur) => cur.filter((o) => o.id !== orgId))
      setSelectedOrganizationId("")
      notify("Organization deleted from Supabase database.")
    } catch (err: any) {
      notify(err.message || "Failed to delete organization from database.", true)
    }
  }


  const addItem = (item: Omit<CartItem, "id">) => {
    setItems((current) => [
      ...current,
      { ...item, id: `${Date.now()}-${Math.random()}` },
    ])
    notify(`${item.name} added to your cart.`)
  }

  const nextDailyOrderNumber = (date: Date) => {
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    const todaysTransactions = transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.createdAt)
      return (
        `${transactionDate.getFullYear()}-${transactionDate.getMonth()}-${transactionDate.getDate()}` ===
        dateKey
      )
    })
    const highestSavedNumber = todaysTransactions.reduce(
      (highest, transaction) => Math.max(highest, transaction.orderNumber ?? 0),
      0,
    )
    return Math.max(todaysTransactions.length, highestSavedNumber) + 1
  }

  const generateReceipt = async (returnScreen: "menu" | "cart") => {
    setReceiptReturnScreen(returnScreen)
    if (items.length === 0) {
      setReceipt(null)
      setScreen("receipt")
      return
    }

    const now = new Date()
    const receiptItems = items.map((item) => ({
      ...item,
      receiptDetails: item.receiptDetails?.map((detail) => ({ ...detail })),
    }))
    const subtotal = receiptItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    )
    const signature = receiptItems
      .map((item) => `${item.id}:${item.quantity}:${item.unitPrice}`)
      .join("|")
    const existing = transactions.find(
      (transaction) =>
        transaction.source === "counter" &&
        (transaction.id === counterTransactionId ||
          transaction.cartSignature === signature),
    )
    const number = existing?.receiptNumber ?? makeReceiptNumber()
    const orderNumber =
      existing?.orderNumber ??
      nextDailyOrderNumber(existing ? new Date(existing.createdAt) : now)

    setReceipt({
      number,
      orderNumber,
      createdAt: existing ? new Date(existing.createdAt) : now,
      items: receiptItems,
      subtotal,
      discount: 0,
      orderType: "Counter Sale",
    })

    // Save to PostgreSQL backend database
    try {
      const savedTxn = await api.saveTransaction({
        id: existing?.id,
        receiptNumber: number,
        orderNumber,
        source: "counter",
        createdAt: (existing ? new Date(existing.createdAt) : now).toISOString(),
        items: receiptItems,
        discount: 0,
        initialPayment: subtotal,
        cartSignature: signature,
      })
      setTransactions((current) => {
        const idx = current.findIndex((t) => t.id === savedTxn.id)
        if (idx >= 0) {
          const updated = [...current]
          updated[idx] = savedTxn
          return updated
        }
        return [...current, savedTxn]
      })
      notify(`Counter bill #${savedTxn.orderNumber} saved to database.`)
    } catch (err) {
      console.warn("Could not save to database, saved locally:", err)
      if (existing) {
        setTransactions((current) =>
          current.map((transaction) =>
            transaction.id === existing.id
              ? {
                  ...transaction,
                  orderNumber,
                  items: receiptItems,
                  subtotal,
                  grandTotal: subtotal,
                  initialPayment: subtotal,
                  amountPaid: subtotal,
                  outstanding: 0,
                  cartSignature: signature,
                }
              : transaction,
          ),
        )
        setCounterTransactionId(existing.id)
      } else {
        const transactionId = makeId("txn")
        setTransactions((current) => [
          ...current,
          {
            id: transactionId,
            receiptNumber: number,
            orderNumber,
            source: "counter",
            createdAt: now.toISOString(),
            items: receiptItems,
            subtotal,
            discount: 0,
            grandTotal: subtotal,
            initialPayment: subtotal,
            amountPaid: subtotal,
            outstanding: 0,
            cartSignature: signature,
          },
        ])
        setCounterTransactionId(transactionId)
      }
    }

    setItems([])
    setCounterTransactionId(null)
    setScreen("receipt")
  }

  const generateManagementReceipt = async (payload: {
    items: CartItem[]
    source: "customized" | "bulk"
    discount: number
    initialPayment: number
    organization?: Organization
    customerName?: string
    customerPhone?: string
    notes?: string
  }) => {
    const now = new Date()
    const number = makeReceiptNumber(payload.source === "bulk" ? "BLK" : "CUS")
    const orderNumber = nextDailyOrderNumber(now)
    const receiptItems = payload.items.map((item) => ({
      ...item,
      receiptDetails: item.receiptDetails?.map((detail) => ({ ...detail })),
    }))
    const subtotal = receiptItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    )
    const grandTotal = Math.max(0, subtotal - payload.discount)
    const paid = Math.min(grandTotal, payload.initialPayment)

    setReceipt({
      number,
      orderNumber,
      createdAt: now,
      items: receiptItems,
      subtotal,
      discount: payload.discount,
      orderType:
        payload.source === "bulk" ? "Organization / Bulk Order" : "Event Order",
      partyDetails: [
        payload.organization?.name,
        payload.organization?.contactPerson,
        payload.organization?.phone,
        payload.customerName,
        payload.customerPhone,
        payload.notes,
      ].filter((value): value is string => !!value),
      advancePayment: payload.source === "bulk" ? paid : undefined,
      remainingBalance:
        payload.source === "bulk" ? grandTotal - paid : undefined,
    })

    // Save to PostgreSQL database
    try {
      const savedTxn = await api.saveTransaction({
        receiptNumber: number,
        orderNumber,
        source: payload.source,
        createdAt: now.toISOString(),
        items: receiptItems,
        discount: payload.discount,
        initialPayment: paid,
        organizationId: payload.organization?.id,
        organizationName: payload.organization?.name,
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        notes: payload.notes,
      })
      setTransactions((current) => [...current, savedTxn])
      notify(`Order ${savedTxn.receiptNumber} saved to database.`)
    } catch (err) {
      console.warn("Could not save to database, saved locally:", err)
      const transaction: Transaction = {
        id: makeId("txn"),
        receiptNumber: number,
        orderNumber,
        source: payload.source,
        createdAt: now.toISOString(),
        items: receiptItems,
        subtotal,
        discount: payload.discount,
        grandTotal,
        initialPayment: paid,
        amountPaid: paid,
        outstanding: grandTotal - paid,
        organizationId: payload.organization?.id,
        organizationName: payload.organization?.name,
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        notes: payload.notes,
      }
      setTransactions((current) => [...current, transaction])
    }

    setReceiptReturnScreen(payload.source)
    setScreen("receipt")
  }

  const recordPayment = async (
    organizationId: string,
    amount: number,
    method: Payment["method"],
    reference: string,
    createdAt: string,
  ) => {
    const outstanding = transactions
      .filter((item) => item.organizationId === organizationId)
      .reduce((sum, item) => sum + item.outstanding, 0)
    if (!Number.isFinite(amount) || amount <= 0)
      return "Payment must be greater than zero."
    if (amount > outstanding)
      return "Payment cannot exceed the outstanding balance."

    try {
      await api.recordPayment({
        organizationId,
        amount,
        method,
        reference,
        createdAt,
      })

      // Fetch fresh reconciled records from PostgreSQL database
      const [updatedTxns, updatedPayments] = await Promise.all([
        api.getTransactions(),
        api.getPayments(),
      ])
      setTransactions(updatedTxns)
      setPayments(updatedPayments)
      notify("Payment recorded and reconciled in database!")
      return null
    } catch (err: any) {
      console.warn("Backend payment failed, applying local fallback:", err)
      let remainingPayment = amount
      setTransactions((current) =>
        current.map((transaction) => {
          if (
            transaction.organizationId !== organizationId ||
            transaction.outstanding <= 0 ||
            remainingPayment <= 0
          )
            return transaction
          const applied = Math.min(transaction.outstanding, remainingPayment)
          remainingPayment -= applied
          return {
            ...transaction,
            amountPaid: transaction.amountPaid + applied,
            outstanding: transaction.outstanding - applied,
          }
        }),
      )
      setPayments((current) => [
        ...current,
        {
          id: makeId("payment"),
          organizationId,
          createdAt,
          amount,
          method,
          reference,
        },
      ])
      return null
    }
  }

  if (screen === "receipt") {
    return (
      <ReceiptScreen
        receipt={receipt}
        onBack={() => setScreen(receiptReturnScreen)}
      />
    )
  }

  if (screen === "cart") {
    return (
      <CartScreen
        items={items}
        setItems={setItems}
        onBack={() => setScreen("menu")}
        onCheckout={() => generateReceipt("cart")}
      />
    )
  }

  const drawer = (
    <NavigationDrawer
      open={drawerOpen}
      active={
        screen === "customized" || screen === "bulk" || screen === "ledger"
          ? screen
          : "menu"
      }
      onClose={() => setDrawerOpen(false)}
      onNavigate={(next) => setScreen(next)}
      onOpenPrices={() => setPriceModalOpen(true)}
    />
  )

  const priceModal = (
    <PriceManagementModal
      open={priceModalOpen}
      onClose={() => setPriceModalOpen(false)}
      currentConfig={appConfig}
      onSavePrices={handleUpdatePrices}
      isOnline={isBackendConnected}
    />
  )

  if (screen === "customized") {
    return (
      <>
        {drawer}
        {priceModal}
        <CustomizedOrders
          onMenu={() => setDrawerOpen(true)}
          onHome={() => setScreen("menu")}
          onNavigate={(next) => setScreen(next)}
          active={screen}
          config={appConfig}
          onGenerate={generateManagementReceipt}
        />
      </>
    )
  }

  if (screen === "bulk") {
    return (
      <>
        {drawer}
        {priceModal}
        <BulkOrders
          onMenu={() => setDrawerOpen(true)}
          onHome={() => setScreen("menu")}
          onNavigate={(next) => setScreen(next)}
          active={screen}
          config={appConfig}
          onGenerate={generateManagementReceipt}
          organizations={organizations}
          setOrganizations={setOrganizations}
          selectedOrganizationId={selectedOrganizationId}
          setSelectedOrganizationId={setSelectedOrganizationId}
          onSaveOrganization={handleSaveOrganization}
        />
      </>
    )
  }

  if (screen === "ledger") {
    return (
      <>
        {drawer}
        {priceModal}
        <FinancialLedger
          onMenu={() => setDrawerOpen(true)}
          onHome={() => setScreen("menu")}
          onNavigate={(next) => setScreen(next)}
          active={screen}
          organizations={organizations}
          transactions={transactions}
          payments={payments}
          onRecordPayment={recordPayment}
          onDeleteTransaction={handleDeleteTransaction}
          onDeleteOrganization={handleDeleteOrganization}
        />
      </>
    )
  }

  return (
    <>
      <main className="app-shell">
        <header className="topbar">
          <div className="topbar-container">
            <div className="topbar-left">
              <IconButton
                label="Open menu"
                onClick={() => setDrawerOpen(true)}
                className="mobile-only-btn"
              >
                <MenuIcon />
              </IconButton>
              <div className="brand-lockup">
                <span>MB</span>
                <div>
                  <p>MR BILAL</p>
                  <h1>Biryani House</h1>
                </div>
              </div>
            </div>

            <nav className="desktop-nav" aria-label="Main navigation">
              <button className="active" onClick={() => setScreen("menu")}>
                <span>⌂</span> Menu
              </button>
              <button onClick={() => setScreen("customized")}>
                <span>＋</span> Event Orders
              </button>
              <button onClick={() => setScreen("bulk")}>
                <span>▦</span> Bulk Orders
              </button>
              <button onClick={() => setScreen("ledger")}>
                <span>▥</span> Financial Ledger
              </button>
            </nav>

            <div className="topbar-right">
              <button
                className={`db-status-pill ${isBackendConnected ? "online" : "offline"}`}
                onClick={handleManualSync}
                title={
                  isBackendConnected
                    ? "Connected to Supabase PostgreSQL (Click to sync)"
                    : "Connecting / Local Mode (Click to retry sync)"
                }
                style={{ cursor: "pointer", border: "none", background: "inherit" }}
              >
                <span className="db-dot" />
                <span className="db-label">
                  {isBackendConnected ? "Supabase Cloud" : "Connecting..."}
                </span>
                <span style={{ fontSize: "11px", marginLeft: "3px" }}>🔄</span>
              </button>
              <button
                className="desktop-quick-bill-btn"
                style={{ background: "#d97706", color: "#fff", display: "inline-flex", alignItems: "center", gap: "5px" }}
                onClick={() => setPriceModalOpen(true)}
                title="Manage Live Prices in Supabase"
              >
                <span>🏷️</span> Live Prices
              </button>
              <button
                className="desktop-quick-bill-btn"
                onClick={() => generateReceipt("menu")}
              >
                Quick Bill
              </button>
              <button
                className="topbar-cart-btn"
                onClick={() => setScreen("cart")}
                aria-label="View cart"
              >
                <CartIcon />
                <span className="desktop-cart-label">Cart</span>
                {cartCount > 0 && (
                  <span className="cart-badge">{cartCount}</span>
                )}
                {cartCount > 0 && (
                  <span className="desktop-cart-total">
                    Rs.{" "}
                    {items
                      .reduce(
                        (sum, item) => sum + item.unitPrice * item.quantity,
                        0,
                      )
                      .toLocaleString()}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        <section className="welcome">
          <div className="welcome-container">
            <div className="welcome-text">
              <p className="eyebrow">Made fresh. Served warm.</p>
              <h2>What are you craving today?</h2>
            </div>
            <div className="welcome-actions">
              <button
                className="quick-bill-button"
                onClick={() => generateReceipt("menu")}
              >
                Quick Bill
              </button>
              <button
                className="view-order-button"
                onClick={() => setScreen("cart")}
              >
                View order <span>{cartCount}</span>
              </button>
            </div>
          </div>
        </section>

        <section className="menu-section">
          <div className="menu-heading">
            <div>
              <p>OUR MENU</p>
              <h2>House specialities</h2>
            </div>
            <span>9 dishes</span>
          </div>
          <div className="product-grid">
            <RiceCard
              name="Chicken Biryani"
              typeName="Chicken"
              price={appConfig.ricePrices.chicken}
              catalogKey="biryani"
              imagePosition="50% 58%"
              onAdd={addItem}
              notify={notify}
            />
            <RiceCard
              name="Beef Pulao"
              typeName="Beef"
              price={appConfig.ricePrices.beef}
              catalogKey="pulao"
              imagePosition="50% 38%"
              onAdd={addItem}
              notify={notify}
            />
            <RiceCard
              name="Sada Biryani"
              typeName="Sada"
              price={appConfig.ricePrices.sada}
              catalogKey="biryani"
              imagePosition="50% 58%"
              onAdd={addItem}
              notify={notify}
            />
            <RiceCard
              name="Sada Pulao"
              typeName="Sada"
              price={appConfig.ricePrices.sada}
              catalogKey="pulao"
              imagePosition="50% 38%"
              onAdd={addItem}
              notify={notify}
            />
            <RiceCard
              name="Chana Biryani"
              typeName="Chana"
              price={appConfig.ricePrices.chana}
              catalogKey="biryani"
              imagePosition="50% 58%"
              onAdd={addItem}
              notify={notify}
            />
            <SimpleWeightedCard price={appConfig.zardaPrice} onAdd={addItem} notify={notify} />
            <DrinksCard drinksConfig={appConfig.drinks} onAdd={addItem} notify={notify} />
            <BasicCard
              kind="raita"
              name="Raita"
              price={appConfig.raitaPrice}
              onAdd={addItem}
              notify={notify}
            />
            <BasicCard
              kind="salad"
              name="Garden salad"
              price={appConfig.saladPrice}
              onAdd={addItem}
              notify={notify}
            />
          </div>
        </section>

        <button
          className="floating-cart"
          onClick={() => setScreen("cart")}
          aria-label="View shopping cart"
        >
          <CartIcon />
          <span>
            <b>
              {cartCount
                ? `${cartCount} item${cartCount === 1 ? "" : "s"}`
                : "Cart"}
            </b>
            {cartCount ? "View your order" : "No items added"}
          </span>
          <strong>
            Rs.{" "}
            {items
              .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
              .toLocaleString()}
          </strong>
        </button>

        {toast && (
          <div className={`toast ${toast.error ? "error" : ""}`} role="status">
            {toast.message}
          </div>
        )}
      </main>
      {drawer}
      {priceModal}
    </>
  )
}
