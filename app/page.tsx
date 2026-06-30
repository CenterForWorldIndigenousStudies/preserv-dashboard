import { redirect } from 'next/navigation'

import { DASHBOARD_PATH } from '@constants/paths'

export default function DashboardPage() {
  redirect(DASHBOARD_PATH)
}
