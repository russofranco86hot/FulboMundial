export class RpcRedirectError extends Error {
  public readonly url: string;
  constructor(url: string) {
    super(`RPC_REDIRECT:${url}`);
    this.name = "RpcRedirectError";
    this.url = url;
  }
}

export function rpcRedirect(url: string): never {
  throw new RpcRedirectError(url);
}

export function rpcRevalidatePath(_path: string): void {
  // No-op en el Worker Hono; el cliente reconsulta automáticamente tras RPC.
}
