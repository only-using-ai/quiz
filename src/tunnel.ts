// @ts-expect-error localtunnel has no types
import localtunnel from 'localtunnel';

export interface Tunnel {
  url: string;
  close(): void;
}

export async function openTunnel(port: number, subdomain: string, timeoutMs = 8000): Promise<Tunnel> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('tunnel timeout')), timeoutMs)
  );
  const tunnel = await Promise.race([
    localtunnel({ port, subdomain: subdomain.toLowerCase() }),
    timeout,
  ]);
  return {
    url: (tunnel as { url: string }).url,
    close: () => (tunnel as { close(): void }).close(),
  };
}
