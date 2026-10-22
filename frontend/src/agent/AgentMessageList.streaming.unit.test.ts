import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// The streaming list check is only worth its green if it got there by watching the screen, not by
// outlasting it. This reads the check itself and holds it to that.
const streamingTest = readFileSync(
  fileURLToPath(new URL('./AgentMessageList.streaming.component.test.tsx', import.meta.url)),
  'utf8',
)
const vitestConfig = readFileSync(
  fileURLToPath(new URL('../../vite.config.ts', import.meta.url)),
  'utf8',
)

it('The test waits for what it checks, never for a fixed time. No sleeps are added, and no timeout is simply raised to hide the problem.', () => {
  // Every streamed row is read through the assertion itself, retried until it holds.
  expect(streamingTest).toContain('await waitFor(')
  expect(streamingTest).toContain("expect(screen.getByText('新'.repeat(index))).toBeVisible()")
  // Nothing is waited out: no sleep, no timer to wind forward, no clock to stand in for the screen.
  expect(streamingTest).not.toMatch(/setTimeout|setInterval|\bsleep\b|FakeTimers|advanceTimers/)
  // No wait is given a longer leash than the library's own default.
  expect(streamingTest).not.toMatch(/timeout\s*:/)
  // And the per-check budget every other check runs under is left where it was.
  expect(vitestConfig).toMatch(/testTimeout:\s*30000/)
  expect(vitestConfig).toMatch(/hookTimeout:\s*30000/)
})
