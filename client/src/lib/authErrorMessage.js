const invalidCredentialPattern = /invalid login credentials/i
const emailNotConfirmedPattern = /email not confirmed|email not verified/i
const networkFailurePattern = /network error|failed to fetch/i

export const getAuthErrorMessage = (error, fallbackMessage = 'Authentication failed. Please try again.') => {
  const rawMessage = error?.message || ''
  const rawCode = error?.code || ''

  if (invalidCredentialPattern.test(rawMessage) || rawCode === 'invalid_credentials') {
    return 'Invalid email or password. If this account was created in another Supabase project, update your production environment keys and URL.'
  }

  if (emailNotConfirmedPattern.test(rawMessage)) {
    return 'Please verify your email first, then try signing in again.'
  }

  if (networkFailurePattern.test(rawMessage)) {
    return 'Cannot reach the server right now. Verify Vercel rewrites and Render availability, then retry.'
  }

  return rawMessage || fallbackMessage
}

