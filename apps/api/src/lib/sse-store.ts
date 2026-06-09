import type { SSEStreamingApi } from "hono/streaming";

const connections = new Map<string, Set<SSEStreamingApi>>();

export function addConnection(clinicId: string, stream: SSEStreamingApi) {
  if (!connections.has(clinicId)) connections.set(clinicId, new Set());
  connections.get(clinicId)!.add(stream);
}

export function removeConnection(clinicId: string, stream: SSEStreamingApi) {
  connections.get(clinicId)?.delete(stream);
  if (connections.get(clinicId)?.size === 0) connections.delete(clinicId);
}

export async function broadcast(clinicId: string, event: string, data: unknown) {
  const clients = connections.get(clinicId);
  if (!clients) return;

  const payload = JSON.stringify(data);
  for (const stream of clients) {
    await stream.writeSSE({ event, data: payload });
  }
}
