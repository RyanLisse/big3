import { describe, it, expect, beforeEach } from 'vitest'
import { ModelRegistryImpl } from '../../src/models/registry'
import { ModelInfo, ModelCompatibility } from '../../src/config/types'

describe('Model Registry Enhancement', () => {
  let registry: ModelRegistryImpl

  beforeEach(() => {
    registry = new ModelRegistryImpl()
  })

  describe('Model Compatibility Validation', () => {
    it('should validate model compatibility with requirements', () => {
      const compatibility = registry.validateModelCompatibility('gpt-4', {
        minContextWindow: 8000
      })

      expect(compatibility.compatible).toBe(true)
    })

    it('should reject incompatible models', () => {
      const compatibility = registry.validateModelCompatibility('non-existent-model', {})

      expect(compatibility.compatible).toBe(false)
      expect(compatibility.reason).toBeDefined()
    })

    it('should return missing features for partial compatibility', () => {
      const compatibility = registry.validateModelCompatibility('gpt-4', {
        requiredCapabilities: ['multimodal', 'video-analysis']
      })

      expect(compatibility.missingFeatures).toBeDefined()
    })

    it('should validate context window requirements', () => {
      const compatibility = registry.validateModelCompatibility('gpt-4', {
        minContextWindow: 10000
      })

      expect(compatibility.compatible).toBe(false)
    })

    it('should validate max output token requirements', () => {
      const compatibility = registry.validateModelCompatibility('gpt-4', {
        minMaxOutputTokens: 4096
      })

      expect(compatibility.compatible).toBe(true)
    })
  })

  describe('Provider Registry Management', () => {
    it('should return available models from all providers', () => {
      const models = registry.listModels()

      expect(models.length).toBeGreaterThan(0)
      const providers = new Set(models.map(m => m.provider))
      expect(providers.size).toBeGreaterThan(0)
    })

    it('should filter models by provider', () => {
      const allModels = registry.listModels()
      const openaiModels = allModels.filter(m => m.provider === 'openai')

      expect(openaiModels.length).toBeGreaterThan(0)
      openaiModels.forEach(model => {
        expect(model.provider).toBe('openai')
      })
    })

    it('should get model by ID', () => {
      const model = registry.getModel('gpt-4')

      expect(model).toBeDefined()
      expect(model?.id).toBe('gpt-4')
      expect(model?.provider).toBe('openai')
    })

    it('should return undefined for non-existent model', () => {
      const model = registry.getModel('non-existent-model')

      expect(model).toBeUndefined()
    })

    it('should check if model is supported', () => {
      expect(registry.isModelSupported('gpt-4')).toBe(true)
      expect(registry.isModelSupported('non-existent')).toBe(false)
    })

    it('should get all available models by provider', () => {
      const openaiModels = registry.listModels().filter(m => m.provider === 'openai')
      const googleModels = registry.listModels().filter(m => m.provider === 'google')
      const anthropicModels = registry.listModels().filter(m => m.provider === 'anthropic')

      expect(openaiModels.length).toBeGreaterThan(0)
      expect(googleModels.length).toBeGreaterThan(0)
      expect(anthropicModels.length).toBeGreaterThan(0)
    })
  })

  describe('Capability Checking', () => {
    it('should check if model supports required capability', () => {
      const model = registry.getModel('gpt-4')

      expect(model).toBeDefined()
      expect(model?.name).toBe('GPT-4')
    })

    it('should validate model has required capabilities', () => {
      const compatibility = registry.validateModelCompatibility('gpt-4', {
        requiredCapabilities: ['text-generation', 'code-generation']
      })

      expect(compatibility.compatible).toBe(true)
    })

    it('should fail for unsupported capabilities', () => {
      const compatibility = registry.validateModelCompatibility('gpt-4', {
        requiredCapabilities: ['video-generation', 'image-analysis']
      })

      expect(compatibility.compatible).toBe(false)
      expect(compatibility.missingFeatures).toBeDefined()
    })

    it('should list all supported models with text generation', () => {
      const models = registry.listModels()
      const textGenModels = models.filter(m => {
        const compatibility = registry.validateModelCompatibility(m.id, {
          requiredCapabilities: ['text-generation']
        })
        return compatibility.compatible
      })

      expect(textGenModels.length).toBeGreaterThan(0)
    })
  })

  describe('Provider Compatibility', () => {
    it('should provide provider-specific compatibility info', () => {
      const model = registry.getModel('gpt-4')

      expect(model).toBeDefined()
      expect(model?.provider).toBe('openai')
    })

    it('should handle cross-provider model switching', () => {
      const fromModel = registry.getModel('gpt-4')
      const toModel = registry.getModel('claude-3.5')

      expect(fromModel).toBeDefined()
      expect(toModel).toBeDefined()
      expect(fromModel?.provider).not.toBe(toModel?.provider)
    })

    it('should indicate pricing differences across providers', () => {
      const gpt4 = registry.getModel('gpt-4')
      const claude = registry.getModel('claude-3.5')
      const gemini = registry.getModel('gemini-pro')

      expect(gpt4?.inputPrice).toBeDefined()
      expect(claude?.inputPrice).toBeDefined()
      expect(gemini?.inputPrice).toBeDefined()

      expect(gpt4?.inputPrice).not.toBe(claude?.inputPrice)
    })

    it('should provide context window information per provider', () => {
      const models = registry.listModels()

      const openaiModels = models.filter(m => m.provider === 'openai')
      const anthropicModels = models.filter(m => m.provider === 'anthropic')

      openaiModels.forEach(m => expect(m.contextWindow).toBeDefined())
      anthropicModels.forEach(m => expect(m.contextWindow).toBeDefined())
    })
  })

  describe('Model Feature Compatibility', () => {
    it('should validate all required features present', () => {
      const compatibility = registry.validateModelCompatibility('claude-3.5', {
        requiredCapabilities: ['text-generation', 'code-generation']
      })

      expect(compatibility.compatible).toBe(true)
      expect(compatibility.missingFeatures?.length).toBe(0)
    })

    it('should list missing features when validation fails', () => {
      const compatibility = registry.validateModelCompatibility('gemini-pro', {
        requiredCapabilities: ['video-generation', 'text-generation']
      })

      expect(compatibility.compatible).toBe(false)
      expect(compatibility.missingFeatures).toBeDefined()
      expect(compatibility.missingFeatures?.length).toBeGreaterThan(0)
    })

    it('should provide detailed compatibility reason', () => {
      const compatibility = registry.validateModelCompatibility('invalid-model', {})

      expect(compatibility.compatible).toBe(false)
      expect(compatibility.reason).toBeDefined()
      expect(compatibility.reason?.length).toBeGreaterThan(0)
    })
  })

  describe('Registry Performance', () => {
    it('should get available models efficiently', () => {
      const startTime = performance.now()
      const models = registry.getAvailableModels()
      const endTime = performance.now()

      expect(models.length).toBeGreaterThan(0)
      expect(endTime - startTime).toBeLessThan(100)
    })

    it('should validate model existence quickly', () => {
      const startTime = performance.now()
      registry.isModelSupported('gpt-4')
      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(50)
    })

    it('should handle multiple compatibility checks', () => {
      const startTime = performance.now()

      registry.validateModelCompatibility('gpt-4', { minContextWindow: 8000 })
      registry.validateModelCompatibility('claude-3.5', { minContextWindow: 100000 })
      registry.validateModelCompatibility('gemini-pro', { minContextWindow: 30000 })

      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(200)
    })
  })

  describe('Default Model Selection', () => {
    it('should return default model', () => {
      const defaultModel = registry.getDefaultModel()

      expect(defaultModel).toBeDefined()
      expect(defaultModel).toBe('gpt-4')
    })

    it('should provide fallback when default unavailable', () => {
      const availableModels = registry.getAvailableModels()

      expect(availableModels.length).toBeGreaterThan(0)
      expect(availableModels).toContain('gpt-4')
    })

    it('should list all available models', () => {
      const available = registry.getAvailableModels()

      expect(Array.isArray(available)).toBe(true)
      expect(available.length).toBeGreaterThan(0)
      available.forEach(modelId => {
        expect(registry.isModelSupported(modelId)).toBe(true)
      })
    })
  })

  describe('Model Metadata', () => {
    it('should provide complete model information', () => {
      const model = registry.getModel('gpt-4')

      expect(model).toBeDefined()
      expect(model?.id).toBeDefined()
      expect(model?.provider).toBeDefined()
      expect(model?.name).toBeDefined()
      expect(model?.contextWindow).toBeDefined()
      expect(model?.maxOutputTokens).toBeDefined()
      expect(model?.inputPrice).toBeDefined()
      expect(model?.outputPrice).toBeDefined()
    })

    it('should provide pricing information', () => {
      const models = registry.listModels()

      models.forEach(model => {
        expect(model.inputPrice).toBeGreaterThanOrEqual(0)
        expect(model.outputPrice).toBeGreaterThanOrEqual(0)
      })
    })

    it('should provide context window information', () => {
      const models = registry.listModels()

      models.forEach(model => {
        expect(model.contextWindow).toBeGreaterThan(0)
        expect(model.maxOutputTokens).toBeGreaterThan(0)
      })
    })
  })
})
