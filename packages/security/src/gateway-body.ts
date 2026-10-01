export class GatewayBodyError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export async function gatewayRequestBody(request: Request, maximumBytes = 128 * 1024, timeoutMs = 10_000): Promise<ArrayBuffer | undefined> {
  if (["GET", "HEAD"].includes(request.method)) return undefined;
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null && (!/^\d+$/.test(declaredLength) || !Number.isSafeInteger(Number(declaredLength)))) {
    throw new GatewayBodyError(400, "The request length is invalid.");
  }
  if (Number(declaredLength) > maximumBytes) throw new GatewayBodyError(413, "The submitted information is too large.");
  if (!request.body) return undefined;
  const reader = request.body.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new GatewayBodyError(408, "The request could not be read in time. No information was forwarded."));
      void reader.cancel().catch(() => {});
    }, timeoutMs);
  });
  try {
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { value, done } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) throw new GatewayBodyError(413, "The submitted information is too large.");
      chunks.push(value);
    }
    const body = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return body.buffer;
  } catch (error) {
    void reader.cancel().catch(() => {});
    if (error instanceof GatewayBodyError) throw error;
    throw new GatewayBodyError(400, "The request could not be read. No information was forwarded.");
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}
