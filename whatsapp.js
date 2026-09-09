// Central helper for building WhatsApp deep links.
// Number is read from env so it can be changed without touching code.
const RAW_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '919625588338'

// Ensures a clean digits-only number in international format (no + , no spaces)
function cleanNumber(num) {
  return String(num).replace(/[^\d]/g, '')
}

export const WHATSAPP_NUMBER = cleanNumber(RAW_NUMBER)
export const WHATSAPP_DISPLAY = '+91 96255 88338'

/**
 * Builds a wa.me link with a prefilled, URL-encoded message.
 */
export function buildWhatsAppLink(message) {
  const text = encodeURIComponent(message)
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`
}

export function genericEnquiryMessage() {
  return 'Hello AK Branding, I am interested in your wholesale collection. Please share more details.'
}

export function wholesaleEnquiryMessage() {
  return 'Hello AK Branding, I would like to place a wholesale order. Please share your latest collection and pricing.'
}

export function productEnquiryMessage(product) {
  return `Hello AK Branding, I am interested in ${product.name} (Code: ${product.code}). Please share wholesale price and availability.`
}

export function productPriceMessage(product) {
  return `Hello AK Branding, please share the best wholesale price for ${product.name} (Code: ${product.code}).`
}

export function contactFormMessage(form) {
  return (
    `Hello AK Branding, this is a wholesale enquiry.\n` +
    `Name: ${form.name}\n` +
    `Business: ${form.businessName || '-'}\n` +
    `Phone: ${form.phone}\n` +
    `City: ${form.city || '-'}\n` +
    `Product Interested In: ${form.product || '-'}\n` +
    `Quantity Required: ${form.quantity || '-'}\n` +
    `Message: ${form.message || '-'}`
  )
}
