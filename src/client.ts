import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import type { ServerMessage, ClientMessage } from './types.js';

export class GameClient extends EventEmitter {
  private ws: WebSocket;
  private name: string;

  constructor(url: string, name: string) {
    super();
    this.name = name;
    // https → wss, http/ws → ws (already correct)
    const wsUrl = url.startsWith('ws://') || url.startsWith('wss://')
      ? url
      : url.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://');
    this.ws = new WebSocket(wsUrl, {
      headers: { 'bypass-tunnel-reminder': 'true' },
    });

    this.ws.on('open', () => {
      this.send({ type: 'join', name: this.name });
    });

    this.ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as ServerMessage;
        this.emit('message', msg);
      } catch {
        // ignore malformed
      }
    });

    this.ws.on('error', (err) => {
      this.emit('error', err);
    });

    this.ws.on('close', () => {
      this.emit('close');
    });
  }

  send(msg: ClientMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  answer(questionId: string, answerIds: string[]): void {
    this.send({ type: 'answer', questionId, answerIds, timestamp: Date.now() });
  }

  close(): void {
    this.ws.close();
  }
}
