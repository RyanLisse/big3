import { describe, it, expect } from 'vitest'
import { validateAgentCreation, validateAgentConfig } from '../../src/core/validation'
import type { AgentConfig } from '../../src/config/types'

describe('Validation Framework (T013)', () => {
  describe('validateAgentCreation()', () => {
    it('validates valid agent creation request', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: 'Test instructions'
      }

      const result = validateAgentCreation({ config })

      expect(result.success).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('validates agent with all optional fields', () => {
      const config: AgentConfig = {
        id: 'test-id',
        name: 'TestAgent',
        description: 'Test description',
        instructions: 'Test instructions',
        tools: ['tool1', 'tool2'],
        model: 'gpt-4',
        communication: {
          websocket: {
            url: 'ws://localhost:8000'
          }
        },
        logging: {
          level: 'debug'
        }
      }

      const result = validateAgentCreation({ config })

      expect(result.success).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('rejects request without config', () => {
      const result = validateAgentCreation({})

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toMatch(/config/)
    })

    it('rejects missing agent name', () => {
      const config: AgentConfig = {
        name: '',
        instructions: 'Test instructions'
      }

      const result = validateAgentCreation({ config })

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('name'))).toBe(true)
    })

    it('rejects missing agent instructions', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: ''
      }

      const result = validateAgentCreation({ config })

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('instructions'))).toBe(true)
    })

    it('rejects whitespace-only name', () => {
      const config: AgentConfig = {
        name: '   ',
        instructions: 'Test instructions'
      }

      const result = validateAgentCreation({ config })

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('name'))).toBe(true)
    })

    it('rejects whitespace-only instructions', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: '   '
      }

      const result = validateAgentCreation({ config })

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('instructions'))).toBe(true)
    })

    it('accepts optional model parameter', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: 'Test instructions'
      }

      const result = validateAgentCreation({ config, model: 'gpt-4' })

      expect(result.success).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('collects multiple validation errors', () => {
      const config: AgentConfig = {
        name: '',
        instructions: ''
      }

      const result = validateAgentCreation({ config })

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(2)
    })

    it('validates communication config if provided', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: 'Test instructions',
        communication: {
          websocket: {
            url: ''
          }
        }
      }

      const result = validateAgentCreation({ config })

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('WebSocket'))).toBe(true)
    })

    it('validates logging config if provided', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: 'Test instructions',
        logging: {
          level: 'invalid' as any
        }
      }

      const result = validateAgentCreation({ config })

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('Logging level'))).toBe(true)
    })

    it('accepts valid logging levels', () => {
      const levels: Array<'debug' | 'info' | 'warn' | 'error'> = ['debug', 'info', 'warn', 'error']

      for (const level of levels) {
        const config: AgentConfig = {
          name: 'TestAgent',
          instructions: 'Test instructions',
          logging: { level }
        }

        const result = validateAgentCreation({ config })
        expect(result.success).toBe(true)
      }
    })
  })

  describe('validateAgentConfig()', () => {
    it('validates basic config', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: 'Test instructions'
      }

      const result = validateAgentConfig(config)

      expect(result.success).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('requires name field', () => {
      const config = {
        instructions: 'Test instructions'
      } as any

      const result = validateAgentConfig(config)

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('name'))).toBe(true)
    })

    it('requires instructions field', () => {
      const config = {
        name: 'TestAgent'
      } as any

      const result = validateAgentConfig(config)

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('instructions'))).toBe(true)
    })

    it('validates name is non-empty string', () => {
      const config: AgentConfig = {
        name: '   ',
        instructions: 'Test instructions'
      }

      const result = validateAgentConfig(config)

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('name'))).toBe(true)
    })

    it('validates instructions is non-empty string', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: ''
      }

      const result = validateAgentConfig(config)

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('instructions'))).toBe(true)
    })

    it('accepts valid optional fields', () => {
      const config: AgentConfig = {
        id: 'test-id',
        name: 'TestAgent',
        description: 'Test',
        instructions: 'Test instructions',
        tools: ['tool1'],
        model: 'gpt-4'
      }

      const result = validateAgentConfig(config)

      expect(result.success).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('validates tools array if provided', () => {
      const config = {
        name: 'TestAgent',
        instructions: 'Test instructions',
        tools: 'not-an-array'
      } as any

      const result = validateAgentConfig(config)

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('tools'))).toBe(true)
    })

    it('accepts empty tools array', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: 'Test instructions',
        tools: []
      }

      const result = validateAgentConfig(config)

      expect(result.success).toBe(true)
    })

    it('validates communication config structure', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: 'Test instructions',
        communication: {
          websocket: {
            url: ''
          }
        }
      }

      const result = validateAgentConfig(config)

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('WebSocket'))).toBe(true)
    })

    it('validates logging config structure', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: 'Test instructions',
        logging: {
          level: 'invalid' as any
        }
      }

      const result = validateAgentConfig(config)

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('Logging level'))).toBe(true)
    })
  })

  describe('Error messages', () => {
    it('provides clear error for missing required fields', () => {
      const config = {} as any

      const result = validateAgentConfig(config)

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toBeTruthy()
      expect(typeof result.errors[0]).toBe('string')
    })

    it('includes field names in error messages', () => {
      const config: AgentConfig = {
        name: '',
        instructions: 'Test instructions'
      }

      const result = validateAgentCreation({ config })

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('name'))).toBe(true)
    })

    it('error messages are human readable', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: 'Test instructions',
        logging: {
          level: 'invalid' as any
        }
      }

      const result = validateAgentConfig(config)

      expect(result.success).toBe(false)
      const errorMsg = result.errors[0]
      expect(errorMsg).toMatch(/must|invalid|should|error/)
    })
  })

  describe('Validation with Zod', () => {
    it('uses Zod for schema validation', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: 'Test instructions'
      }

      const result = validateAgentConfig(config)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(config)
    })

    it('returns validated data on success', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: 'Test instructions'
      }

      const result = validateAgentConfig(config)

      expect(result.data).toBeDefined()
      expect(result.data?.name).toBe('TestAgent')
      expect(result.data?.instructions).toBe('Test instructions')
    })

    it('does not return data on validation failure', () => {
      const config: AgentConfig = {
        name: '',
        instructions: 'Test instructions'
      }

      const result = validateAgentConfig(config)

      expect(result.success).toBe(false)
      expect(result.data).toBeUndefined()
    })
  })

  describe('Edge cases', () => {
    it('handles very long strings', () => {
      const longString = 'a'.repeat(10000)
      const config: AgentConfig = {
        name: longString,
        instructions: longString
      }

      const result = validateAgentConfig(config)

      expect(result.success).toBe(true)
    })

    it('handles special characters in name', () => {
      const config: AgentConfig = {
        name: 'Test-Agent_123 (v1.0)',
        instructions: 'Test instructions'
      }

      const result = validateAgentConfig(config)

      expect(result.success).toBe(true)
    })

    it('handles unicode characters', () => {
      const config: AgentConfig = {
        name: 'TestAgent 🤖',
        instructions: 'Test instructions with emoji 🚀'
      }

      const result = validateAgentConfig(config)

      expect(result.success).toBe(true)
    })

    it('handles null values appropriately', () => {
      const config = {
        name: 'TestAgent',
        instructions: 'Test instructions',
        description: null
      } as any

      const result = validateAgentConfig(config)

      expect(result.success).toBe(true)
    })

    it('handles undefined optional fields', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: 'Test instructions',
        description: undefined
      }

      const result = validateAgentConfig(config)

      expect(result.success).toBe(true)
    })
  })

  describe('Performance', () => {
    it('validates quickly for simple config', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: 'Test instructions'
      }

      const start = performance.now()
      validateAgentConfig(config)
      const duration = performance.now() - start

      expect(duration).toBeLessThan(10) // Should be < 10ms
    })

    it('validates complex config within acceptable time', () => {
      const config: AgentConfig = {
        id: 'test-id',
        name: 'TestAgent',
        description: 'Test'.repeat(100),
        instructions: 'Test instructions'.repeat(100),
        tools: Array.from({ length: 50 }, (_, i) => `tool-${i}`),
        model: 'gpt-4',
        communication: {
          websocket: {
            url: 'ws://localhost:8000',
            batching: {
              enabled: true,
              maxSize: 100,
              flushInterval: 100
            }
          }
        },
        logging: {
          level: 'debug'
        }
      }

      const start = performance.now()
      validateAgentConfig(config)
      const duration = performance.now() - start

      expect(duration).toBeLessThan(50) // Should be < 50ms
    })
  })
})
