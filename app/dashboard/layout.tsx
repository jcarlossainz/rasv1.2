/**
 * Layout del Dashboard
 * Incluye el Asistente IA flotante para todas las páginas del dashboard
 */

import { AssistantProvider } from '@/components/assistant'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AssistantProvider>
      {children}
    </AssistantProvider>
  )
}
