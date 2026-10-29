import { useState } from "react"
import { AppConfig, CONFIG } from "./data"

interface PriceManagementModalProps {
  open: boolean
  onClose: () => void
  currentConfig: AppConfig
  onSavePrices: (updatedConfig: AppConfig) => Promise<void>
  isOnline: boolean
}

export function PriceManagementModal({
  open,
  onClose,
  currentConfig,
  onSavePrices,
  isOnline,
}: PriceManagementModalProps) {
  const [prices, setPrices] = useState<AppConfig>(() => JSON.parse(JSON.stringify(currentConfig)))
  const [activeDrinkBrand, setActiveDrinkBrand] = useState<"Pepsi" | "Coca-Cola" | "7UP">("Pepsi")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleRiceChange = (key: keyof AppConfig["ricePrices"], value: number) => {
    setPrices((prev) => ({
      ...prev,
      ricePrices: {
        ...prev.ricePrices,
        [key]: value,
      },
    }))
  }

  const handleDrinkChange = (brand: string, size: string, value: number) => {
    setPrices((prev) => {
      const brandDrinks = { ...(prev.drinks[brand as keyof typeof prev.drinks] || {}) }
      brandDrinks[size as keyof typeof brandDrinks] = value
      return {
        ...prev,
        drinks: {
          ...prev.drinks,
          [brand]: brandDrinks,
        },
      }
    })
  }

  const handleResetDefaults = () => {
    if (confirm("Reset all prices back to application defaults?")) {
      setPrices(JSON.parse(JSON.stringify(CONFIG)))
    }
  }

  const handleSave = async () => {
    setError(null)
    // Validation
    const riceVals = Object.values(prices.ricePrices)
    if (riceVals.some((v) => !v || v <= 0)) {
      setError("All rice dish prices must be greater than 0.")
      return
    }
    if (prices.zardaPrice <= 0 || prices.raitaPrice <= 0 || prices.saladPrice <= 0) {
      setError("Extras and dessert prices must be greater than 0.")
      return
    }
    for (const b of Object.keys(prices.drinks)) {
      for (const s of Object.keys(prices.drinks[b as keyof typeof prices.drinks])) {
        const pr = prices.drinks[b as keyof typeof prices.drinks][s as any]
        if (!pr || pr <= 0) {
          setError(`Price for ${b} ${s} must be greater than 0.`)
          return
        }
      }
    }

    try {
      setSaving(true)
      await onSavePrices(prices)
      onClose()
    } catch (err: any) {
      setError(err?.message || "Failed to update prices in Supabase database.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="price-modal-overlay" role="dialog" aria-modal="true">
      <div className="price-modal-card">
        {/* Modal Header */}
        <div className="price-modal-header">
          <div>
            <div className="price-modal-badge">
              <span className={`db-dot ${isOnline ? "online" : "offline"}`} />
              <strong>{isOnline ? "Supabase Cloud PostgreSQL" : "Local Fallback Mode"}</strong>
            </div>
            <h2>Live Price & Menu Rates</h2>
            <p>Update dish rates and beverage pricing directly in your Supabase database.</p>
          </div>
          <button className="price-modal-close" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>

        {error && (
          <div className="price-modal-error">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Modal Body */}
        <div className="price-modal-body">
          {/* Section 1: Rice Specialties */}
          <div className="price-section">
            <h3>🍚 Biryani & Pulao Specialties (Rate per 250g)</h3>
            <div className="price-grid">
              <div className="price-field">
                <label>Chicken Biryani (Rs.)</label>
                <input
                  type="number"
                  min="1"
                  step="5"
                  value={prices.ricePrices.chicken}
                  onChange={(e) => handleRiceChange("chicken", Number(e.target.value))}
                />
                <span className="price-hint">Base 250g rate</span>
              </div>
              <div className="price-field">
                <label>Beef Pulao (Rs.)</label>
                <input
                  type="number"
                  min="1"
                  step="5"
                  value={prices.ricePrices.beef}
                  onChange={(e) => handleRiceChange("beef", Number(e.target.value))}
                />
                <span className="price-hint">Base 250g rate</span>
              </div>
              <div className="price-field">
                <label>Sada Biryani / Pulao (Rs.)</label>
                <input
                  type="number"
                  min="1"
                  step="5"
                  value={prices.ricePrices.sada}
                  onChange={(e) => handleRiceChange("sada", Number(e.target.value))}
                />
                <span className="price-hint">Base 250g rate</span>
              </div>
              <div className="price-field">
                <label>Chana Biryani (Rs.)</label>
                <input
                  type="number"
                  min="1"
                  step="5"
                  value={prices.ricePrices.chana}
                  onChange={(e) => handleRiceChange("chana", Number(e.target.value))}
                />
                <span className="price-hint">Base 250g rate</span>
              </div>
            </div>
          </div>

          {/* Section 2: Desserts & Extras */}
          <div className="price-section">
            <h3>🥗 Traditional Desserts & Sides</h3>
            <div className="price-grid">
              <div className="price-field">
                <label>Zarda Sweet Rice (Rs. / Box)</label>
                <input
                  type="number"
                  min="1"
                  step="5"
                  value={prices.zardaPrice}
                  onChange={(e) => setPrices({ ...prices, zardaPrice: Number(e.target.value) })}
                />
              </div>
              <div className="price-field">
                <label>Fresh Raita (Rs. / Bowl)</label>
                <input
                  type="number"
                  min="1"
                  step="5"
                  value={prices.raitaPrice}
                  onChange={(e) => setPrices({ ...prices, raitaPrice: Number(e.target.value) })}
                />
              </div>
              <div className="price-field">
                <label>Fresh Salad (Rs. / Plate)</label>
                <input
                  type="number"
                  min="1"
                  step="5"
                  value={prices.saladPrice}
                  onChange={(e) => setPrices({ ...prices, saladPrice: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Cold Drinks */}
          <div className="price-section">
            <h3>🥤 Chilled Soft Drinks</h3>
            <div className="drink-brand-tabs">
              {(["Pepsi", "Coca-Cola", "7UP"] as const).map((brand) => (
                <button
                  key={brand}
                  type="button"
                  className={`drink-tab ${activeDrinkBrand === brand ? "active" : ""}`}
                  onClick={() => setActiveDrinkBrand(brand)}
                >
                  {brand}
                </button>
              ))}
            </div>

            <div className="price-grid drink-sizes-grid">
              {Object.entries(prices.drinks[activeDrinkBrand] || {}).map(([size, pr]) => (
                <div key={size} className="price-field">
                  <label>{size} (Rs.)</label>
                  <input
                    type="number"
                    min="1"
                    step="5"
                    value={pr}
                    onChange={(e) => handleDrinkChange(activeDrinkBrand, size, Number(e.target.value))}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="price-modal-footer">
          <button
            type="button"
            className="price-btn-secondary"
            onClick={handleResetDefaults}
            disabled={saving}
          >
            Reset Defaults
          </button>
          <div className="price-modal-footer-right">
            <button
              type="button"
              className="price-btn-ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="price-btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving to Supabase..." : "💾 Save Changes to Supabase"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
