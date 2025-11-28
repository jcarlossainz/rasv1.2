'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/logger'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/components/ui/confirm-modal'
import { useAuth } from '@/hooks/useAuth'
import { useLogout } from '@/hooks/useLogout'
import { useDashboardConfig } from '@/hooks/useDashboardConfig'
import { useDashboardWidgets } from '@/hooks/useDashboardWidgets'
import TopBar from '@/components/ui/topbar'
import Card from '@/components/ui/card'
import Loading from '@/components/ui/loading'
import { DashboardWidget } from '@/components/dashboard'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { WidgetId } from '@/types/dashboard'

/**
 * Sortable Widget Wrapper
 */
function SortableWidget({ widgetId, data, onClick, compact }: { widgetId: WidgetId; data: any; onClick?: () => void; compact?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widgetId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DashboardWidget
        widgetId={widgetId}
        data={data}
        onClick={onClick}
        isDragging={isDragging}
        compact={compact}
      />
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const { user, loading: authLoading } = useAuth()
  const logout = useLogout()

  // Dashboard hooks
  const { config, loading: configLoading, updateConfig, reorderWidgets } = useDashboardConfig()
  const { widgets, loading: widgetsLoading, refreshWidgets } = useDashboardWidgets()

  // Drag & drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle logout
  const handleLogout = async () => {
    const confirmed = await confirm.warning(
      '¿Estás seguro que deseas cerrar sesión?',
      'Se cerrará tu sesión actual'
    )

    if (!confirmed) return

    try {
      await logout()
      toast.success('Sesión cerrada correctamente')
    } catch (error: any) {
      logger.error('Error al cerrar sesión:', error)
      toast.error('Error al cerrar sesión')
    }
  }

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id || !config) {
      return
    }

    const oldIndex = config.widget_order.indexOf(active.id as WidgetId)
    const newIndex = config.widget_order.indexOf(over.id as WidgetId)

    const newOrder = arrayMove(config.widget_order, oldIndex, newIndex)

    try {
      await reorderWidgets(newOrder)
      toast.success('Widgets reordenados')
    } catch (error) {
      logger.error('Error reordenando widgets:', error)
      toast.error('Error al reordenar')
    }
  }

  // Loading state
  if (authLoading || configLoading) {
    return <Loading message="Cargando dashboard..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ras-crema via-white to-ras-crema">
      <TopBar
        title="Inicio"
        showAddButton={true}
        showUserInfo={true}
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Navigation Cards */}
        <div className="grid grid-cols-3 gap-x-4 gap-y-6 mb-6">
          {/* CATÁLOGO */}
          <Card
            title="Catálogo"
            onClick={() => router.push('/dashboard/catalogo')}
            icon={
              <div className="w-24 h-24 rounded-xl bg-gradient-to-b from-ras-crema/20 to-white/20 border-2 border-ras-crema/50 flex items-center justify-center">
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" fill="#4285F4" opacity="0.8" stroke="currentColor" strokeWidth="1.4"/>
                  <rect x="14" y="3" width="7" height="7" rx="1.5" fill="#EA4335" opacity="0.8" stroke="currentColor" strokeWidth="1.4"/>
                  <rect x="3" y="14" width="7" height="7" rx="1.5" fill="#FBBC04" opacity="0.8" stroke="currentColor" strokeWidth="1.4"/>
                  <rect x="14" y="14" width="7" height="7" rx="1.5" fill="#34A853" opacity="0.8" stroke="currentColor" strokeWidth="1.4"/>
                </svg>
              </div>
            }
          />

          {/* MARKET */}
          <Card
            title="Market"
            onClick={() => router.push('/dashboard/market')}
            icon={
              <div className="w-24 h-24 rounded-xl bg-gradient-to-b from-ras-crema/20 to-white/20 border-2 border-ras-crema/50 flex items-center justify-center">
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2a2 2 0 0 1 2 2v1.5a7 7 0 0 1 4.5 6.196V15a3 3 0 0 0 1.5 2.598v.902H4v-.902A3 3 0 0 0 5.5 15v-3.304A7 7 0 0 1 10 5.5V4a2 2 0 0 1 2-2z" fill="#fbbf24" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M9 19a3 3 0 0 0 6 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </div>
            }
          />

          {/* TICKETS */}
          <Card
            title="Tickets"
            onClick={() => router.push('/dashboard/tickets')}
            icon={
              <div className="w-24 h-24 rounded-xl bg-gradient-to-b from-ras-crema/20 to-white/20 border-2 border-ras-crema/50 flex items-center justify-center">
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="3" width="20" height="18" rx="2" fill="#fb8500" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M2 8h20M7 12h7M7 16h4" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </div>
            }
          />

          {/* PLANIFICADOR */}
          <Card
            title="Planificador"
            onClick={() => router.push('/dashboard/calendario')}
            icon={
              <div className="w-24 h-24 rounded-xl bg-gradient-to-b from-ras-crema/20 to-white/20 border-2 border-ras-crema/50 flex items-center justify-center">
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" fill="#5f7c8a" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M3 10h18M8 2v4M16 2v4" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
                  <circle cx="8" cy="15" r="1" fill="white"/>
                  <circle cx="12" cy="15" r="1" fill="white"/>
                  <circle cx="16" cy="15" r="1" fill="white"/>
                </svg>
              </div>
            }
          />

          {/* CUENTAS */}
          <Card
            title="Cuentas"
            onClick={() => router.push('/dashboard/cuentas')}
            icon={
              <div className="w-24 h-24 rounded-xl bg-gradient-to-b from-ras-crema/20 to-white/20 border-2 border-ras-crema/50 flex items-center justify-center">
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="6" width="18" height="12" rx="2" fill="#6b8e23" stroke="currentColor" strokeWidth="1.6"/>
                  <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="1.6"/>
                </svg>
              </div>
            }
          />

          {/* DIRECTORIO */}
          <Card
            title="Directorio"
            onClick={() => router.push('/dashboard/directorio')}
            icon={
              <div className="w-24 h-24 rounded-xl bg-gradient-to-b from-ras-crema/20 to-white/20 border-2 border-ras-crema/50 flex items-center justify-center">
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="3" width="14" height="18" rx="2" fill="#c1666b" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M19 7h2M19 12h2M19 17h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  <circle cx="11" cy="9" r="2" stroke="white" strokeWidth="1.4" fill="none"/>
                  <path d="M8 16a3 3 0 0 1 6 0" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </div>
            }
          />
        </div>

        {/* WIDGETS - 6 widgets en grid 3x2 */}
        <div className="grid grid-cols-3 gap-4">
          {config && config.visible_widgets && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={config.visible_widgets}
                strategy={rectSortingStrategy}
              >
                {config.visible_widgets.map((widgetId) => (
                  <SortableWidget
                    key={widgetId}
                    widgetId={widgetId}
                    data={widgets[widgetId]}
                    compact={true}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </main>
    </div>
  )
}
