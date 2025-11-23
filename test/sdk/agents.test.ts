import { describe, it, expect, beforeEach } from 'vitest'
import { createAgent } from '../../src/sdk/agents'
import { ModelRegistryImpl } from '../../src/models/registry'
import { AgentError } from '../../src/domain'
import type { Agent, CreateAgentRequest } from '../../src/sdk/index'
import type { AgentConfig } from '../../src/config/types'

describe('Agent Creation API (T012)', () => {
  let registry: ModelRegistryImpl

  beforeEach(() => {
    registry = new ModelRegistryImpl()
  })

  describe('createAgent() - Basic instantiation', () => {
    it('creates agent with minimal valid config', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: 'Test instructions'
      }

      const agent = createAgent({ config }, registry)

      expect(agent).toBeDefined()
      expect(agent.config.name).toBe('TestAgent')
      expect(agent.config.instructions).toBe('Test instructions')
      expect(agent.status).toBe('initializing')
      expect(agent.id).toBeDefined()
      expect(agent.model).toBeDefined()
    })

    it('uses provided model when specified in request', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: 'Test instructions'
      }

      const agent = createAgent({ config, model: 'gpt-4' }, registry)

      expect(agent.model).toBe('gpt-4')
    })

    it('uses model from config when not in request', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: 'Test instructions',
        model: 'claude-3.5'
      }

      const agent = createAgent({ config }, registry)

      expect(agent.model).toBe('claude-3.5')
    })

    it('uses default model when not specified anywhere', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: 'Test instructions'
      }

      const agent = createAgent({ config }, registry)
      const defaultModel = registry.getDefaultModel()

      expect(agent.model).toBe(defaultModel)
    })

    it('generates unique agent ID', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: 'Test instructions'
      }

      const agent1 = createAgent({ config }, registry)
      const agent2 = createAgent({ config }, registry)

      expect(agent1.id).not.toBe(agent2.id)
    })

    it('preserves optional config fields', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        description: 'A test agent',
        instructions: 'Test instructions',
        tools: ['tool1', 'tool2']
      }

      const agent = createAgent({ config }, registry)

      expect(agent.config.description).toBe('A test agent')
      expect(agent.config.tools).toEqual(['tool1', 'tool2'])
    })

    it('preserves communication config', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: 'Test instructions',
        communication: {
          websocket: {
            url: 'ws://localhost:8000'
          }
        }
      }

      const agent = createAgent({ config }, registry)

      expect(agent.config.communication?.websocket?.url).toBe('ws://localhost:8000')
    })

    it('preserves logging config', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: 'Test instructions',
        logging: {
          level: 'debug'
        }
      }

      const agent = createAgent({ config }, registry)

      expect(agent.config.logging?.level).toBe('debug')
    })
  })

  describe('createAgent() - Single model support', () => {
    it('validates model is supported in registry', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: 'Test instructions'
      }

      expect(() => {
        createAgent({ config, model: 'invalid-model' }, registry)
      }).toThrow(AgentError)
    })

    it('throws AgentError for unsupported model', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: 'Test instructions'
      }

      try {
        createAgent({ config, model: 'unsupported-model' }, registry)
        expect.fail('Should have thrown AgentError')
      } catch (error) {
        expect(error).toBeInstanceOf(AgentError)
        if (error instanceof AgentError) {
          expect(error.code).toBe('MODEL_NOT_FOUND')
        }
      }
    })

    it('supports all models in default registry', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: 'Test instructions'
      }

      const availableModels = registry.getAvailableModels()

      for (const model of availableModels) {
        const agent = createAgent({ config, model }, registry)
        expect(agent.model).toBe(model)
      }
    })
  })

  describe('createAgent() - Configuration validation', () => {
    it('requires agent name', () => {
      const config: AgentConfig = {
        name: '',
        instructions: 'Test instructions'
      }

      expect(() => {
        createAgent({ config }, registry)
      }).toThrow(AgentError)
    })

    it('requires agent instructions', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: ''
      }

      expect(() => {
        createAgent({ config }, registry)
      }).toThrow(AgentError)
    })

    it('creates agent with all optional fields', () => {
      const config: AgentConfig = {
        id: 'custom-id',
        name: 'TestAgent',
        description: 'Test description',
        instructions: 'Test instructions',
        tools: ['tool1'],
        model: 'gpt-4',
        communication: {
          websocket: {
            url: 'ws://localhost:8000',
            batching: {
              enabled: true,
              maxSize: 50,
              flushInterval: 100
            }
          }
        },
        logging: {
          level: 'info'
        }
      }

      const agent = createAgent({ config }, registry)

      expect(agent.config.id).toBe('custom-id')
      expect(agent.config.description).toBe('Test description')
      expect(agent.config.tools).toEqual(['tool1'])
      expect(agent.config.communication?.websocket?.batching?.maxSize).toBe(50)
      expect(agent.config.logging?.level).toBe('info')
    })
  })

  describe('createAgent() - Agent properties', () => {
    it('sets correct initial status', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: 'Test instructions'
      }

      const agent = createAgent({ config }, registry)

      expect(agent.status).toBe('initializing')
    })

    it('does not set error on successful creation', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: 'Test instructions'
      }

      const agent = createAgent({ config }, registry)

      expect(agent.error).toBeUndefined()
    })

    it('initializes with empty context', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: 'Test instructions'
      }

      const agent = createAgent({ config }, registry)

      expect(agent.context).toBeUndefined()
    })

    it('copies config without mutation', () => {
      const originalConfig: AgentConfig = {
        name: 'TestAgent',
        instructions: 'Test instructions',
        tools: ['tool1']
      }

      const agent = createAgent({ config: originalConfig }, registry)

      originalConfig.tools?.push('tool2')

      expect(agent.config.tools).toEqual(['tool1'])
    })
  })

  describe('createAgent() - Edge cases', () => {
    it('handles whitespace-only name as invalid', () => {
      const config: AgentConfig = {
        name: '   ',
        instructions: 'Test instructions'
      }

      expect(() => {
        createAgent({ config }, registry)
      }).toThrow(AgentError)
    })

    it('handles whitespace-only instructions as invalid', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: '   '
      }

      expect(() => {
        createAgent({ config }, registry)
      }).toThrow(AgentError)
    })

    it('creates agent with empty tools array', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: 'Test instructions',
        tools: []
      }

      const agent = createAgent({ config }, registry)

      expect(agent.config.tools).toEqual([])
    })

    it('creates agent with long description', () => {
      const longDesc = 'a'.repeat(1000)
      const config: AgentConfig = {
        name: 'TestAgent',
        description: longDesc,
        instructions: 'Test instructions'
      }

      const agent = createAgent({ config }, registry)

      expect(agent.config.description).toBe(longDesc)
    })

    it('creates agent with long instructions', () => {
      const longInstructions = 'a'.repeat(5000)
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: longInstructions
      }

      const agent = createAgent({ config }, registry)

      expect(agent.config.instructions).toBe(longInstructions)
    })
  })

  describe('createAgent() - Type safety', () => {
    it('returns typed Agent with all required properties', () => {
      const config: AgentConfig = {
        name: 'TestAgent',
        instructions: 'Test instructions'
      }

      const agent: Agent = createAgent({ config }, registry)

      expect(agent.id).toBeDefined()
      expect(agent.model).toBeDefined()
      expect(agent.status).toBeDefined()
      expect(agent.config).toBeDefined()
    })

    it('request parameter has correct shape', () => {
      const request: CreateAgentRequest = {
        config: {
          name: 'TestAgent',
          instructions: 'Test instructions'
        },
        model: 'gpt-4'
      }

      const agent = createAgent(request, registry)

      expect(agent.model).toBe('gpt-4')
    })
  })
})
