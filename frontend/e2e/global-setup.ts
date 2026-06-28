import { cleanupE2eData } from './helpers/cleanup'

export default async function globalSetup() {
  await cleanupE2eData()
}
