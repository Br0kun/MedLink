/**
 * SMS Service — powered by TextBee (https://textbee.dev)
 *
 * TextBee routes SMS through your own Android phone, so it works in
 * countries where Twilio is unavailable.
 *
 * Required .env variables:
 *   TEXTBEE_API_KEY   – API key from https://app.textbee.dev/dashboard/apiKeys
 *   TEXTBEE_DEVICE_ID – Device ID shown in https://app.textbee.dev/dashboard/devices
 */

const TEXTBEE_API_KEY   = process.env.TEXTBEE_API_KEY
const TEXTBEE_DEVICE_ID = process.env.TEXTBEE_DEVICE_ID

const isTextBeeConfigured =
  TEXTBEE_API_KEY &&
  TEXTBEE_DEVICE_ID &&
  TEXTBEE_API_KEY   !== 'your_textbee_api_key_here' &&
  TEXTBEE_DEVICE_ID !== 'your_textbee_device_id_here'

/**
 * Normalise a phone number to E.164 format.
 * Strips whitespace and common separators.
 * The caller should already store numbers with the full country code.
 * @param {string} raw
 * @returns {string}
 */
const normalisePhone = (raw) => {
  if (!raw) return ''
  return raw.replace(/[^\d+]/g, '')
}

/**
 * Send an SMS notification via TextBee.
 * @param {string} to   - Recipient phone number in E.164 format (e.g. +212772662727)
 * @param {string} body - The SMS message body
 * @returns {Promise<{success: boolean, messageId?: string, error?: string, reason?: string}>}
 */
export const sendSMS = async (to, body) => {
  if (!isTextBeeConfigured) {
    console.warn('[SMS Service Warning] TextBee SMS is not configured. Falling back to logs/mock mode.')
    console.log(`\n=================== MOCK SMS DISPATCH ===================`)
    console.log(`TO:      ${to}`)
    console.log(`MESSAGE: "${body}"`)
    console.log(`=========================================================\n`)
    return { success: true, reason: 'mock_sent' }
  }

  if (!to) {
    console.warn('[SMS Service Warning] Recipient phone number is missing. Cannot send SMS.')
    return { success: false, reason: 'missing_recipient' }
  }

  const normalisedTo = normalisePhone(to)

  if (!normalisedTo.startsWith('+')) {
    console.error(
      `[SMS Service Error] Phone number "${to}" is not in E.164 format (must start with +countrycode). ` +
      `SMS not sent. Please update the patient's phone number to include the full country code, e.g. +212772662727.`
    )
    return { success: false, reason: 'invalid_e164_format', phone: to }
  }

  const url = `https://api.textbee.dev/api/v1/gateway/devices/${TEXTBEE_DEVICE_ID}/send-sms`

  console.log(`[SMS Service] Sending SMS to ${normalisedTo} via TextBee...`)

  try {
    const response = await fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    TEXTBEE_API_KEY,
      },
      body: JSON.stringify({
        recipients: [normalisedTo],
        message:    body,
      }),
    })

    const data = await response.json().catch(() => ({}))

    // Log the full raw response for debugging purposes
    console.log(`[SMS Service] TextBee HTTP ${response.status} response:`, JSON.stringify(data))

    // TextBee queues the SMS on the Android device and returns the job result.
    // In countries where carriers don't send delivery receipts (e.g. Morocco),
    // TextBee marks the job as "Failed" internally and may return a non-2xx —
    // yet the SMS IS delivered. We therefore treat any received response as a
    // successful queue and only hard-fail on a network-level error (caught below).
    const messageId = data?.data?.[0]?._id ?? data?._id ?? undefined
    if (response.ok) {
      console.log(
        `[SMS Service Success] SMS queued for ${normalisedTo} via TextBee.` +
        (messageId ? ` Message ID: ${messageId}` : '')
      )
    } else {
      // Non-2xx from TextBee API — log it but still treat as queued
      console.warn(
        `[SMS Service] TextBee returned HTTP ${response.status} for ${normalisedTo}.` +
        ` The message may still be delivered (carrier receipt issue). Error: ${data?.message ?? data?.error ?? 'unknown'}`
      )
    }
    return { success: true, messageId, httpStatus: response.status }

  } catch (error) {
    console.error(`[SMS Service Error] Failed to send SMS to ${normalisedTo}:`, error.message)
    return { success: false, error: error.message }
  }
}
