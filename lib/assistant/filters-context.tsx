'use client'

/**
 * Contexto global para filtros del asistente IA
 * Permite al asistente aplicar filtros en el catálogo y otras vistas
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface CatalogoFilters {
  busqueda?: string
  tipo?: string // Casa, Departamento, Villa, etc.
  estado?: string // Renta largo plazo, Venta, etc.
  propiedad?: 'todos' | 'propios' | 'compartidos'
}

interface AssistantFiltersContextType {
  // Filtros del catálogo
  catalogoFilters: CatalogoFilters
  setCatalogoFilters: (filters: CatalogoFilters) => void
  clearCatalogoFilters: () => void

  // Flag para indicar que el asistente aplicó filtros
  filtersAppliedByAssistant: boolean
  setFiltersAppliedByAssistant: (value: boolean) => void
}

const AssistantFiltersContext = createContext<AssistantFiltersContextType | null>(null)

export function AssistantFiltersProvider({ children }: { children: ReactNode }) {
  const [catalogoFilters, setCatalogoFiltersState] = useState<CatalogoFilters>({})
  const [filtersAppliedByAssistant, setFiltersAppliedByAssistant] = useState(false)

  const setCatalogoFilters = useCallback((filters: CatalogoFilters) => {
    setCatalogoFiltersState(filters)
    setFiltersAppliedByAssistant(true)

    // Emitir evento para que el catálogo lo escuche
    window.dispatchEvent(new CustomEvent('assistant-filter-catalogo', {
      detail: filters
    }))
  }, [])

  const clearCatalogoFilters = useCallback(() => {
    setCatalogoFiltersState({})
    setFiltersAppliedByAssistant(false)

    window.dispatchEvent(new CustomEvent('assistant-filter-catalogo', {
      detail: {}
    }))
  }, [])

  return (
    <AssistantFiltersContext.Provider
      value={{
        catalogoFilters,
        setCatalogoFilters,
        clearCatalogoFilters,
        filtersAppliedByAssistant,
        setFiltersAppliedByAssistant,
      }}
    >
      {children}
    </AssistantFiltersContext.Provider>
  )
}

export function useAssistantFilters() {
  const context = useContext(AssistantFiltersContext)
  if (!context) {
    throw new Error('useAssistantFilters debe usarse dentro de AssistantFiltersProvider')
  }
  return context
}

// Hook para escuchar filtros del asistente (usado en catálogo)
export function useAssistantFilterListener(
  onFilter: (filters: CatalogoFilters) => void
) {
  if (typeof window !== 'undefined') {
    const handler = (e: CustomEvent<CatalogoFilters>) => {
      onFilter(e.detail)
    }

    window.addEventListener('assistant-filter-catalogo', handler as EventListener)

    return () => {
      window.removeEventListener('assistant-filter-catalogo', handler as EventListener)
    }
  }
}
