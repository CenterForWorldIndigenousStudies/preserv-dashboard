import { redirect } from 'next/navigation'

import { DASHBOARD_PATH } from '@constants/paths'

export default function LandingPage() {
  redirect(DASHBOARD_PATH)
}
