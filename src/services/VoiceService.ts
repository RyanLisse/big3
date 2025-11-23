import { Console, Context, Duration, Effect, Layer, Queue } from "effect"
import WebSocket from "ws"

export interface VoiceService {
  readonly connect: Effect.Effect<void, Error>
  readonly eventStream: Queue.Dequeue<any> // Stream of events from OpenAI
  readonly send: (event: any) => Effect.Effect<void, Error>
}

export const VoiceService = Context.GenericTag<VoiceService>("VoiceService")

export const VoiceServiceLive = Layer.scoped(
  VoiceService,
  Effect.gen(function*(_) {
    const eventQueue = yield* _(Queue.unbounded<any>())

    const connectWithRetry = (attempt = 1): Effect.Effect<WebSocket, never> =>
      Effect.tryPromise({
        try: () => {
          const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"
          return new Promise<WebSocket>((resolve, reject) => {
            const socket = new WebSocket(url, {
              headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                "OpenAI-Beta": "realtime=v1"
              }
            })
            socket.on("open", () => resolve(socket))
            socket.on("error", reject)
          })
        },
        catch: (error) => error as Error
      }).pipe(
        Effect.tap(() => Console.log("✅ Voice WebSocket connected")),
        Effect.catchAll((error) => {
          const delayMs = Math.min(1000 * 2 ** (attempt - 1), 10_000)
          return Console.error(
            `Voice WebSocket connect failed (attempt ${attempt}): ${String(error)}. Retrying in ${delayMs}ms`
          ).pipe(
            Effect.zipRight(Effect.sleep(Duration.millis(delayMs))),
            Effect.zipRight(connectWithRetry(attempt + 1))
          )
        })
      )

    // Managed WebSocket Connection
    const ws = yield* _(
      Effect.acquireRelease(connectWithRetry(), (socket) => Effect.sync(() => socket.close()))
    )

    // Heartbeat to keep connection alive
    yield* _(
      Effect.acquireRelease(
        Effect.sync(() =>
          setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.ping()
            }
          }, 15_000)
        ),
        (interval) => Effect.sync(() => clearInterval(interval))
      )
    )

    // Listen to messages and push to queue
    yield* _(
      Effect.sync(() => {
        ws.on("message", (data) => {
          const event = JSON.parse(data.toString())
          Queue.offer(eventQueue, event).pipe(Effect.runSync)
        })
        ws.on("close", (code, reason) => {
          Console.error(
            `Voice WebSocket closed code=${code} reason=${reason.toString()}`
          ).pipe(Effect.runSync)
        })
        ws.on("error", (error) => {
          Console.error(`Voice WebSocket error: ${String(error)}`).pipe(Effect.runSync)
        })
      })
    )

    return {
      connect: Console.log("Voice Service Connected"),
      eventStream: eventQueue,
      send: (event) => Effect.try(() => ws.send(JSON.stringify(event)))
    }
  })
)
