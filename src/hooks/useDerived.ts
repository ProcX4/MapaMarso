import { use } from 'react'
import { DatasetsContext, HoverContext, RouteContext } from '../state/derivedContexts'

function need<T>(value: T | null, name: string): T {
  if (value === null) throw new Error(`${name} must be used inside <DerivedProvider>`)
  return value
}

export const useDatasets = () => need(use(DatasetsContext), 'useDatasets')
export const useRoute = () => need(use(RouteContext), 'useRoute')
export const useHover = () => need(use(HoverContext), 'useHover')
