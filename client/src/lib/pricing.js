const WHOLESALE_THRESHOLD = 10
const DEFAULT_UNIT = 'kg'
const DEFAULT_PRICE_BASIS_QUANTITY = 1

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function normalizePriceBasisQuantity(value) {
  const parsed = toFiniteNumber(value, DEFAULT_PRICE_BASIS_QUANTITY)
  return parsed > 0 ? parsed : DEFAULT_PRICE_BASIS_QUANTITY
}

export function getProductUnit(product) {
  return product?.unit || DEFAULT_UNIT
}

export function getPriceBasisQuantity(product) {
  return normalizePriceBasisQuantity(product?.price_basis_quantity)
}

export function formatQuantity(value) {
  const normalized = toFiniteNumber(value, 0)
  if (Number.isInteger(normalized)) {
    return String(normalized)
  }
  return normalized.toFixed(3).replace(/\.?0+$/, '')
}

export function getPriceBasisLabel(product) {
  const unit = getProductUnit(product)
  const quantity = getPriceBasisQuantity(product)
  return quantity === 1 ? unit : `${formatQuantity(quantity)} ${unit}`
}

export function getOriginalPackagePriceForQuantity(product, quantity = 0) {
  const qty = toFiniteNumber(quantity, 0)
  const basePrice = qty >= WHOLESALE_THRESHOLD && product?.wholesale_price
    ? product.wholesale_price
    : product?.price

  return Math.max(0, toFiniteNumber(basePrice, 0))
}

export function getPackagePriceForQuantity(product, quantity = 0) {
  const originalPackagePrice = getOriginalPackagePriceForQuantity(product, quantity)
  const salePercent = Math.min(100, Math.max(0, toFiniteNumber(product?.sale_percent, 0)))

  if (salePercent <= 0) {
    return originalPackagePrice
  }

  return originalPackagePrice * (1 - salePercent / 100)
}

export function getUnitPriceForQuantity(product, quantity = 0) {
  const packagePrice = getPackagePriceForQuantity(product, quantity)
  const basisQuantity = getPriceBasisQuantity(product)
  return packagePrice / basisQuantity
}

export function getLineTotalForQuantity(product, quantity = 0) {
  const qty = Math.max(0, toFiniteNumber(quantity, 0))
  return qty * getUnitPriceForQuantity(product, qty)
}
