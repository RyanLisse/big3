import { Console, Context, Effect, Layer, Queue } from "effect"
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

    // Managed WebSocket Connection
    const ws = yield* _(
      Effect.acquireRelease(
        Effect.tryPromise(() => {
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
        }),
        (socket) => Effect.sync(() => socket.close())
      )
    )

    // Listen to messages and push to queue
    yield* _(
      Effect.sync(() => {
        ws.on("message", (data) => {
          const event = JSON.parse(data.toString())
          Queue.offer(eventQueue, event).pipe(Effect.runSync)
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
