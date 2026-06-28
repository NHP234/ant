import { cleanupE2eData } from './helpers/cleanup'

export default async function globalTeardown() {
  await cleanupE2eData()
}
