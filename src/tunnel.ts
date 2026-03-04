/**
 * Native localtunnel client using only Node.js built-ins (https + net).
 * Avoids the vulnerable axios dependency bundled with the localtunnel npm package.
 *
 * Protocol:
 *  1. GET https://localtunnel.me/<subdomain> → {port, max_conn, url}
 *  2. Open <max_conn> persistent TCP sockets to loca.lt:<port>
 *  3. When loca.lt sends a signal byte (incoming request), connect to localhost
 *     and pipe bidirectionally.
 */
import https from 'https';
import net from 'net';

interface TunnelInfo {
  id: string;
  port: number;
  max_conn: number;
  url: string;
}

function register(subdomain: string): Promise<TunnelInfo> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      `https://localtunnel.me/${subdomain}`,
      { headers: { 'user-agent': 'term-quiz' } },
      (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        res.on('end', () => {
          try {
            resolve(JSON.parse(body) as TunnelInfo);
          } catch {
            reject(new Error(`Unexpected tunnel response: ${body}`));
          }
        });
      }
    );
    req.on('error', reject);
  });
}

function openConn(remotePort: number, localPort: number, closed: { value: boolean }): void {
  if (closed.value) return;

  const remote = net.createConnection({ host: 'loca.lt', port: remotePort });

  remote.once('error', () => {
    if (!closed.value) setTimeout(() => openConn(remotePort, localPort, closed), 1000);
  });

  remote.once('connect', () => {
    // loca.lt sends data to signal an incoming request
    remote.once('data', (firstChunk: Buffer) => {
      remote.pause(); // buffer any additional data while connecting locally

      const local = net.createConnection({ port: localPort });

      local.once('connect', () => {
        local.write(firstChunk); // forward the initial request bytes
        remote.pipe(local);
        local.pipe(remote);
        remote.resume();
        openConn(remotePort, localPort, closed); // keep pool full
      });

      local.on('error', () => remote.destroy());
      remote.on('error', () => local.destroy());
      local.on('close', () => remote.destroy());
      remote.on('close', () => local.destroy());
    });

    remote.once('close', () => {
      if (!closed.value) openConn(remotePort, localPort, closed);
    });
  });
}

export interface Tunnel {
  url: string;
  close(): void;
}

export async function openTunnel(port: number, subdomain: string, timeoutMs = 15000): Promise<Tunnel> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('tunnel timeout')), timeoutMs)
  );

  const info = await Promise.race([register(subdomain), timeout]);
  const maxConn = info.max_conn ?? 10;
  const closed = { value: false };

  for (let i = 0; i < maxConn; i++) {
    openConn(info.port, port, closed);
  }

  return {
    url: info.url,
    close: () => { closed.value = true; },
  };
}
