import { tunnelmole } from 'tunnelmole';

export interface Tunnel {
  url: string;
  close(): void;
}

export async function openTunnel(port: number, _subdomain: string, timeoutMs = 15000): Promise<Tunnel> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('tunnel timeout')), timeoutMs)
  );
  const url = await Promise.race([
    tunnelmole({ port }),
    timeout,
  ]) as string;

  return {
    url,
    close: () => { /* tunnelmole has no explicit close */ },
  };
}
