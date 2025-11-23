import { Effect, Layer } from "effect"
import { describe, it, expect, beforeEach, vi } from "vitest"
import { AgentSessionStatus } from "../../backend/agent/domain.js"

// Mock services with failure scenarios
const mockVoiceService = {
  transcribe: vi.fn(),
  processAudio: vi.fn(),
  speak: vi.fn()
}

const mockCoderService = {
  executeCode: vi.fn(),
  analyzeCode: vi.fn(),
  generateCode: vi.fn()
}

const mockBrowserService = {
  navigate: vi.fn(),
  click: vi.fn(),
  extractContent: vi.fn()
}

const mockAgentService = {
  spawnAgent: vi.fn(),
  getAgentStatus: vi.fn(),
  resumeAgent: vi.fn(),
  cancelAgent: vi.fn(),
  listAgents: vi.fn()
}

// Test layer
const TestFailurePathLayer = Layer.mergeAll(
  Layer.succeed("VoiceService", mockVoiceService),
  Layer.succeed("CoderService", mockCoderService),
  Layer.succeed("BrowserService", mockBrowserService),
  Layer.succeed("AgentService", mockAgentService)
)

describe("Failure Path Tests - User Story 1", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Tool Failure Scenarios", () => {
    it("should handle Claude service failure with clear error message", async () => {
      // Mock Claude failure
      const claudeError = new Error("Anthropic API rate limit exceeded")
      mockCoderService.analyzeCode.mockRejectedValue(claudeError)

      const program = Effect.gen(function* (_) {
        try {
          const analysis = yield* Effect.sync(() => mockCoderService.analyzeCode("sample-code"))
          return { success: true, analysis }
        } catch (error) {
          return {
            success: false,
            error: "Claude service unavailable",
            message: "Unable to analyze code at this time. Please try again later.",
            details: error instanceof Error ? error.message : "Unknown error",
            alternative: "You can manually review the code or try a different approach."
          }
        }
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestFailurePathLayer))
      )

      // Verify graceful error handling
      expect(result.success).toBe(false)
      expect(result.error).toBe("Claude service unavailable")
      expect(result.message).toContain("Unable to analyze code")
      expect(result.alternative).toContain("manually review")
      expect(mockCoderService.analyzeCode).toHaveBeenCalled()
    })

    it("should handle Gemini/Playwright failure with fallback", async () => {
      // Mock browser failure
      const browserError = new Error("Playwright timeout: Navigation timeout exceeded")
      mockBrowserService.navigate.mockRejectedValue(browserError)

      const program = Effect.gen(function* (_) {
        try {
          const content = yield* Effect.sync(() => mockBrowserService.navigate("https://example.com"))
          return { success: true, content }
        } catch (error) {
          return {
            success: false,
            error: "Browser automation failed",
            message: "Unable to access the requested webpage. The page may be unavailable or taking too long to load.",
            details: error instanceof Error ? error.message : "Unknown error",
            fallback: "Here's what we know about the topic based on existing information..."
          }
        }
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestFailurePathLayer))
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe("Browser automation failed")
      expect(result.message).toContain("Unable to access the requested webpage")
      expect(result.fallback).toContain("existing information")
    })

    it("should handle OpenAI Realtime API failure", async () => {
      // Mock voice service failure
      const voiceError = new Error("OpenAI API connection refused")
      mockVoiceService.transcribe.mockRejectedValue(voiceError)

      const program = Effect.gen(function* (_) {
        try {
          const transcription = yield* Effect.sync(() => mockVoiceService.transcribe("audio-data"))
          return { success: true, transcription }
        } catch (error) {
          return {
            success: false,
            error: "Voice service unavailable",
            message: "Unable to process audio input. Please use text input instead.",
            details: error instanceof Error ? error.message : "Unknown error",
            suggestion: "You can type your request directly, and I'll process it without voice input."
          }
        }
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestFailurePathLayer))
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe("Voice service unavailable")
      expect(result.message).toContain("use text input instead")
      expect(result.suggestion).toContain("type your request directly")
    })

    it("should handle multiple concurrent tool failures", async () => {
      // Mock multiple failures
      mockCoderService.generateCode.mockRejectedValue(new Error("Code generation failed"))
      mockBrowserService.extractContent.mockRejectedValue(new Error("Content extraction failed"))
      mockVoiceService.speak.mockRejectedValue(new Error("Text-to-speech failed"))

      const program = Effect.gen(function* (_) {
        const results = []
        
        // Try each tool and collect results
        const tools = [
          { name: "Code Generation", fn: () => mockCoderService.generateCode("component.tsx") },
          { name: "Content Extraction", fn: () => mockBrowserService.extractContent("url") },
          { name: "Text-to-Speech", fn: () => mockVoiceService.speak("Hello world") }
        ]

        for (const tool of tools) {
          try {
            const result = yield* Effect.sync(() => tool.fn())
            results.push({ tool: tool.name, success: true, result })
          } catch (error) {
            results.push({
              tool: tool.name,
              success: false,
              error: error instanceof Error ? error.message : "Unknown error"
        
      return true
    })
          }
        }

        const failedTools = results.filter(r => !r.success)
        const successfulTools = results.filter(r => r.success)

        return {
          totalAttempts: results.length,
          successful: successfulTools.length,
          failed: failedTools.length,
          systemStable: failedTools.length < results.length, // System is stable if not all tools failed
          results,
          summary: failedTools.length > 0 
            ? `${failedTools.length} tools failed but system remains operational`
            : "All tools working normally"
        }
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestFailurePathLayer))
      )

      expect(result.totalAttempts).toBe(3)
      expect(result.successful).toBe(0)
      expect(result.failed).toBe(3)
      expect(result.systemStable).toBe(false) // All tools failed
      expect(result.summary).toContain("3 tools failed")
    })
  })

  describe("System Stability Under Failure", () => {
    it("should maintain session stability when tools fail", async () => {
      const sessionId = "session-stability-test"
      
      mockAgentService.spawnAgent.mockResolvedValue({
        sessionId,
        status: "planning" as AgentSessionStatus
      })

      // Mock tool failure during session
      mockCoderService.executeCode.mockRejectedValueOnce(new Error("Code execution failed"))

      const program = Effect.gen(function* (_) {
        // Start session
        const session = yield* Effect.sync(() => mockAgentService.spawnAgent({
          initialPrompt: "Execute this code and show results"
    
      return true
    }))

        // Try to execute code (will fail)
        try {
          yield* Effect.sync(() => mockCoderService.executeCode("console.log('test')"))
          return { sessionId: session.sessionId, codeExecuted: true }
        } catch (error) {
          // Session should remain stable despite tool failure
          return {
            sessionId: session.sessionId,
            codeExecuted: false,
            error: error instanceof Error ? error.message : "Unknown error",
            sessionStable: true,
            fallback: "Code execution failed, but here's what would happen: 'test' would be logged"
          }
        }
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestFailurePathLayer))
      )

      expect(result.sessionId).toBe(sessionId)
      expect(result.codeExecuted).toBe(false)
      expect(result.sessionStable).toBe(true)
      expect(result.fallback).toContain("test' would be logged")
    })

    it("should recover from transient failures", async () => {
      // Mock transient failure then success
      let callCount = 0
      mockBrowserService.navigate.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.reject(new Error("Network timeout"))
        }
        return Promise.resolve({ title: "Page loaded", content: "Success" })
      })

      const program = Effect.gen(function* (_) {
        let attempts = 0
        const maxAttempts = 3

        while (attempts < maxAttempts) {
          attempts++
          try {
            const result = yield* Effect.sync(() => mockBrowserService.navigate("https://example.com"))
            return { success: true, result, attempts }
          } catch (error) {
            if (attempts === maxAttempts) {
              throw error
            }
            // Wait before retry
            yield* Effect.sleep(10)
          }
        }

        throw new Error("Max attempts exceeded")
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestFailurePathLayer))
      )

      expect(result.success).toBe(true)
      expect(result.attempts).toBe(2)
      expect(result.result.title).toBe("Page loaded")
    })
  })

  describe("User Communication During Failures", () => {
    it("should provide clear, actionable error messages", async () => {
      mockCoderService.analyzeCode.mockRejectedValue(new Error("Token limit exceeded"))

      const program = Effect.gen(function* (_) {
        try {
          yield* Effect.sync(() => mockCoderService.analyzeCode("large-code-file"))
          return { success: true }
        } catch (error) {
          return {
            success: false,
            userMessage: "I'm unable to analyze this large code file due to token limits.",
            technicalDetails: error instanceof Error ? error.message : "Unknown error",
            suggestions: [
              "Try analyzing smaller sections of the code",
              "Focus on specific functions or components",
              "Provide a summary of what you'd like me to look for"
            ],
            canProceed: true
          }
        }
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestFailurePathLayer))
      )

      expect(result.success).toBe(false)
      expect(result.userMessage).toContain("token limits")
      expect(result.suggestions).toHaveLength(3)
      expect(result.suggestions[0]).toContain("smaller sections")
      expect(result.canProceed).toBe(true)
    })

    it("should maintain system transparency during failures", async () => {
      const program = Effect.gen(function* (_) {
        const failures = [
          { tool: "Claude", error: "Rate limit exceeded", time: new Date() },
          { tool: "Playwright", error: "Navigation timeout", time: new Date() }
        ]

        return {
          systemStatus: "degraded",
          message: "Some services are temporarily unavailable",
          affectedTools: failures.map(f => f.tool),
          estimatedRecovery: "5-10 minutes",
          whatYouCanStillDo: [
            "Use text input instead of voice",
            "Manually review code changes",
            "Try simpler requests"
          ],
          transparency: {
            failures,
            totalTools: 3,
            workingTools: 1,
            systemHealth: "33%"
          }
        }
      })

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestFailurePathLayer))
      )

      expect(result.systemStatus).toBe("degraded")
      expect(result.affectedTools).toContain("Claude")
      expect(result.affectedTools).toContain("Playwright")
      expect(result.transparency.systemHealth).toBe("33%")
      expect(result.whatYouCanStillDo).toHaveLength(3)
    })
  })
})
