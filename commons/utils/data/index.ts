export type { DataProvider } from './data-provider'
export { LocalDataProvider } from './local-data-provider'
export { withLabels } from './with-labels'

import type { DataProvider } from './data-provider'
import { LocalDataProvider } from './local-data-provider'

let _provider: DataProvider = new LocalDataProvider()

/** Get the current DataProvider instance. */
export function getDataProvider(): DataProvider { return _provider }

/** Swap the DataProvider (e.g., LocalDataProvider → NeonDataProvider). */
export function setDataProvider(p: DataProvider): void { _provider = p }
