import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import type { Quiz, Player, Score, ClientMessage, ServerMessage, AdminEvent } from './types.js';
import { calculatePoints } from './utils/scoring.js';

interface PlayerState extends Player {
  ws: WebSocket;
  answeredAt?: number;
  answerIds?: string[];
}

export class GameServer extends EventEmitter {
  private wss: WebSocketServer;
  private players: Map<string, PlayerState> = new Map();
  private quiz: Quiz;
  private currentQuestionIndex = -1;
  private questionStartTime = 0;
  private pendingAnswers = 0;
  private port: number;

  constructor(quiz: Quiz, port = 3456) {
    super();
    this.quiz = quiz;
    this.port = port;
    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', (ws) => {
      ws.on('message', (data) => this.handleMessage(ws, data.toString()));
      ws.on('close', () => this.handleDisconnect(ws));
    });
  }

  getPort(): number {
    return this.port;
  }

  private broadcast(msg: ServerMessage, exclude?: WebSocket): void {
    const payload = JSON.stringify(msg);
    for (const player of this.players.values()) {
      if (player.ws !== exclude && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(payload);
      }
    }
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  private getLeaderboard(): Score[] {
    return [...this.players.values()]
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({ name: p.name, score: p.score, rank: i + 1 }));
  }

  private handleMessage(ws: WebSocket, raw: string): void {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw) as ClientMessage;
    } catch {
      return;
    }

    if (msg.type === 'join') {
      const id = Math.random().toString(36).slice(2, 9);
      const player: PlayerState = { id, name: msg.name, score: 0, ws };
      this.players.set(id, player);

      const playerNames = [...this.players.values()].map(p => p.name);
      // Tell the joiner their welcome info
      this.send(ws, { type: 'welcome', players: playerNames });
      // Tell everyone else
      this.broadcast({ type: 'player_joined', players: playerNames }, ws);

      const adminEvent: AdminEvent = { type: 'player_joined', players: [...this.players.values()].map(p => ({ id: p.id, name: p.name, score: p.score })) };
      this.emit('admin', adminEvent);
      return;
    }

    if (msg.type === 'answer') {
      const player = [...this.players.values()].find(p => p.ws === ws);
      if (!player || player.answerIds !== undefined) return; // already answered

      const elapsed = Date.now() - this.questionStartTime;
      const question = this.quiz.questions[this.currentQuestionIndex];
      if (!question || question.id !== msg.questionId) return;

      let correct: boolean;
      if ((question.type ?? 'multiple-choice') === 'multiple-answer') {
        // Correct only if selected IDs exactly match all correct answer IDs
        const correctIds = new Set(question.answers.filter(a => a.isCorrect).map(a => a.id));
        const selectedIds = new Set(msg.answerIds);
        correct = correctIds.size === selectedIds.size && [...correctIds].every(id => selectedIds.has(id));
      } else {
        correct = question.answers.find(a => a.id === msg.answerIds[0])?.isCorrect ?? false;
      }

      if (correct) {
        player.score += calculatePoints(elapsed);
      }
      player.answerIds = msg.answerIds;
      player.answeredAt = elapsed;

      this.pendingAnswers--;

      const adminEvent: AdminEvent = { type: 'answer_received', playerId: player.id, remaining: this.pendingAnswers };
      this.emit('admin', adminEvent);

      if (this.pendingAnswers <= 0) {
        this.resolveQuestion();
      }
    }
  }

  private resolveQuestion(): void {
    const question = this.quiz.questions[this.currentQuestionIndex];
    if (!question) return;
    const correctAnswerIds = question.answers.filter(a => a.isCorrect).map(a => a.id);
    const leaderboard = this.getLeaderboard();

    this.broadcast({ type: 'all_answered', correctAnswerIds, leaderboard });

    const adminEvent: AdminEvent = { type: 'all_answered', leaderboard };
    this.emit('admin', adminEvent);
  }

  private handleDisconnect(ws: WebSocket): void {
    for (const [id, player] of this.players.entries()) {
      if (player.ws === ws) {
        this.players.delete(id);
        const playerNames = [...this.players.values()].map(p => p.name);
        this.broadcast({ type: 'player_joined', players: playerNames });
        break;
      }
    }
  }

  startQuestion(index: number): void {
    this.currentQuestionIndex = index;
    this.questionStartTime = Date.now();
    const question = this.quiz.questions[index];
    if (!question) return;

    // Reset answers
    for (const player of this.players.values()) {
      player.answerIds = undefined;
      player.answeredAt = undefined;
    }
    this.pendingAnswers = this.players.size;

    this.broadcast({ type: 'question_start', question, index, total: this.quiz.questions.length });
  }

  endQuiz(): void {
    const leaderboard = this.getLeaderboard();
    this.broadcast({ type: 'quiz_ended', leaderboard });
  }

  getPlayerCount(): number {
    return this.players.size;
  }

  close(): void {
    this.wss.close();
  }
}
