import { auth } from "@/server/auth";
import { recentLogs, subscribeLogs } from "@/server/core/logger";

// Server-Sent Events live log feed. One-way (server→client), lighter than websockets.
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  let unsubscribe = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (payload: string) => {
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          // controller closed (client gone) — ignore
        }
      };

      // Replay recent history so the page isn't empty on connect.
      for (const entry of recentLogs(100)) {
        send(`data: ${JSON.stringify(entry)}\n\n`);
      }
      unsubscribe = subscribeLogs((entry) =>
        send(`data: ${JSON.stringify(entry)}\n\n`),
      );
      // Keep the connection alive through proxies.
      heartbeat = setInterval(() => send(`: ping\n\n`), 25_000);
    },
    cancel() {
      unsubscribe();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
