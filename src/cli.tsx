#!/usr/bin/env node
import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import meow from 'meow';
import type { Player, Score, ServerMessage, AdminEvent } from './types.js';
import { listQuizzes } from './storage.js';
import { GameServer } from './server.js';
import { GameClient } from './client.js';
import { openTunnel } from './tunnel.js';
import { generateCode } from './utils/codeGenerator.js';
import BuildScreen from './components/admin/BuildScreen.js';
import LobbyScreen from './components/admin/LobbyScreen.js';
import HostScreen from './components/admin/HostScreen.js';
import WaitingScreen from './components/participant/WaitingScreen.js';
import QuestionScreen from './components/participant/QuestionScreen.js';
import ResultsScreen from './components/participant/ResultsScreen.js';
import type { Quiz, Question } from './types.js';

// ── CLI parsing ────────────────────────────────────────────────────────────────

const cli = meow(`
  Usage:
    quiz --build           Create a new quiz
    quiz --host <name>     Host a quiz by title or id
    quiz --build --host    Build then immediately host
    quiz --join <code>     Join a quiz as a participant

  Examples:
    quiz --build
    quiz --host "My Quiz"
    quiz --join ABCDEFG
    quiz --join ABCDEFG --port 3456    (local fallback, same machine)
`, {
  importMeta: import.meta,
  flags: {
    build: { type: 'boolean', default: false },
    host: { type: 'string' },
    join: { type: 'string' },
    port: { type: 'number' },
  },
});

// ── Admin app ──────────────────────────────────────────────────────────────────

type AdminPhase =
  | { name: 'build' }
  | { name: 'pick_quiz' }
  | { name: 'starting'; quiz: Quiz }
  | { name: 'lobby'; quiz: Quiz; code: string; tunnelUrl: string; server: GameServer }
  | { name: 'question'; quiz: Quiz; server: GameServer; questionIndex: number; totalPlayers: number; remaining: number }
  | { name: 'results'; quiz: Quiz; server: GameServer; questionIndex: number; leaderboard: Score[]; totalPlayers: number }
  | { name: 'ended'; leaderboard: Score[] };

function AdminApp({ buildFirst, hostQuery }: { buildFirst: boolean; hostQuery?: string }): React.ReactElement {
  const [phase, setPhase] = useState<AdminPhase>(
    buildFirst ? { name: 'build' } : { name: 'pick_quiz' }
  );
  const [players, setPlayers] = useState<Player[]>([]);
  const [statusMsg, setStatusMsg] = useState('');

  const startHosting = async (quiz: Quiz): Promise<void> => {
    setPhase({ name: 'starting', quiz });
    const code = generateCode();
    const port = 3456 + Math.floor(Math.random() * 1000);
    const server = new GameServer(quiz, port);

    server.on('admin', (event: AdminEvent) => {
      if (event.type === 'player_joined') {
        setPlayers(event.players);
        setPhase(prev => {
          if (prev.name === 'lobby') return { ...prev };
          return prev;
        });
        // Force re-render of lobby with updated players
        setPhase(prev => {
          if (prev.name === 'lobby') {
            return { ...prev }; // triggers re-render
          }
          return prev;
        });
      }
      if (event.type === 'all_answered') {
        setPhase(prev => {
          if (prev.name === 'question') {
            return { name: 'results', quiz: prev.quiz, server: prev.server, questionIndex: prev.questionIndex, leaderboard: event.leaderboard, totalPlayers: prev.totalPlayers };
          }
          return prev;
        });
      }
      if (event.type === 'answer_received') {
        setPhase(prev => {
          if (prev.name === 'question') {
            return { ...prev, remaining: event.remaining };
          }
          return prev;
        });
      }
    });

    let tunnelUrl = `localhost:${port}`;
    let tunnelFailed = false;
    try {
      const tunnel = await openTunnel(port, code.toLowerCase());
      tunnelUrl = tunnel.url;
    } catch {
      tunnelFailed = true;
    }

    setPhase({ name: 'lobby', quiz, code, tunnelUrl: tunnelFailed ? `LOCAL ONLY — ws://localhost:${port}` : tunnelUrl, server });
  };

  const handleQuizBuilt = (quiz: Quiz): void => {
    startHosting(quiz);
  };

  const handleStart = (): void => {
    setPhase(prev => {
      if (prev.name !== 'lobby') return prev;
      const { quiz, server } = prev;
      const totalPlayers = players.length;
      server.startQuestion(0);
      return { name: 'question', quiz, server, questionIndex: 0, totalPlayers, remaining: totalPlayers };
    });
  };

  const handleNext = (): void => {
    setPhase(prev => {
      if (prev.name !== 'results') return prev;
      const { quiz, server, questionIndex, totalPlayers } = prev;
      const nextIndex = questionIndex + 1;
      server.startQuestion(nextIndex);
      return { name: 'question', quiz, server, questionIndex: nextIndex, totalPlayers, remaining: totalPlayers };
    });
  };

  const handleEnd = (): void => {
    setPhase(prev => {
      if (prev.name !== 'results') return prev;
      prev.server.endQuiz();
      setTimeout(() => prev.server.close(), 2000);
      return { name: 'ended', leaderboard: prev.leaderboard };
    });
  };

  // Auto-pick quiz if hostQuery provided
  useEffect(() => {
    if (phase.name === 'pick_quiz' && hostQuery) {
      const quizzes = listQuizzes();
      const match = quizzes.find(q => q.title.toLowerCase().includes(hostQuery.toLowerCase()) || q.id === hostQuery);
      if (match) {
        startHosting(match);
      }
    }
  }, []);

  if (phase.name === 'build') {
    return <BuildScreen onDone={handleQuizBuilt} />;
  }

  if (phase.name === 'pick_quiz') {
    const quizzes = listQuizzes();
    if (quizzes.length === 0) {
      return (
        <Box padding={1} flexDirection="column">
          <Text color="red">No quizzes found. Run <Text bold>quiz --build</Text> to create one.</Text>
        </Box>
      );
    }
    return (
      <Box padding={1} flexDirection="column">
        <Text bold color="cyan">── Available Quizzes ──────────────────────</Text>
        {quizzes.map((q, i) => (
          <Text key={q.id}>{i + 1}. {q.title} ({q.questions.length} questions)</Text>
        ))}
        <Text color="gray">Run: quiz --host "&lt;title&gt;"</Text>
      </Box>
    );
  }

  if (phase.name === 'starting') {
    return (
      <Box padding={1} flexDirection="column">
        <Text color="yellow">Setting up tunnel... (timeout in 8s, will fall back to local)</Text>
      </Box>
    );
  }

  if (phase.name === 'lobby') {
    return (
      <LobbyScreen
        quiz={phase.quiz}
        code={phase.code}
        tunnelUrl={phase.tunnelUrl}
        players={players}
        onStart={handleStart}
      />
    );
  }

  if (phase.name === 'question') {
    return (
      <HostScreen
        quiz={phase.quiz}
        currentIndex={phase.questionIndex}
        totalPlayers={phase.totalPlayers}
        remaining={phase.remaining}
        leaderboard={[]}
        phase="question"
        onNext={handleNext}
        onEnd={handleEnd}
      />
    );
  }

  if (phase.name === 'results') {
    return (
      <HostScreen
        quiz={phase.quiz}
        currentIndex={phase.questionIndex}
        totalPlayers={phase.totalPlayers}
        remaining={0}
        leaderboard={phase.leaderboard}
        phase={phase.questionIndex + 1 >= phase.quiz.questions.length ? 'ended' : 'results'}
        onNext={handleNext}
        onEnd={handleEnd}
      />
    );
  }

  if (phase.name === 'ended') {
    return (
      <HostScreen
        quiz={{ id: '', title: 'Quiz', questions: [] }}
        currentIndex={0}
        totalPlayers={0}
        remaining={0}
        leaderboard={phase.leaderboard}
        phase="ended"
        onNext={() => {}}
        onEnd={() => {}}
      />
    );
  }

  return <Text>Loading...</Text>;
}

// ── Participant app ────────────────────────────────────────────────────────────

type ParticipantPhase =
  | { name: 'enter_name' }
  | { name: 'connecting'; playerName: string }
  | { name: 'waiting'; playerName: string; players: string[] }
  | { name: 'question'; playerName: string; question: Question; questionIndex: number; totalQuestions: number; answerPhase: 'answering' | 'waiting' | 'reveal'; selectedAnswerIds?: string[]; correctAnswerIds?: string[]; leaderboard?: Score[] }
  | { name: 'ended'; playerName: string; leaderboard: Score[] };

function ParticipantApp({ code, localPort }: { code: string; localPort?: number }): React.ReactElement {
  const [phase, setPhase] = useState<ParticipantPhase>({ name: 'enter_name' });
  const [nameInput, setNameInput] = useState('');
  const [client, setClient] = useState<GameClient | null>(null);
  const [error, setError] = useState('');

  const connect = (playerName: string): void => {
    setPhase({ name: 'connecting', playerName });
    const serverUrl = localPort
      ? `ws://localhost:${localPort}`
      : `https://${code.toLowerCase()}.loca.lt`;
    const c = new GameClient(serverUrl, playerName);

    c.on('message', (msg: ServerMessage) => {
      if (msg.type === 'welcome' || msg.type === 'player_joined') {
        setPhase(prev => {
          if (prev.name === 'connecting' || prev.name === 'waiting') {
            return { name: 'waiting', playerName: prev.playerName, players: msg.players };
          }
          return prev;
        });
      }
      if (msg.type === 'question_start') {
        setPhase(prev => ({
          name: 'question',
          playerName: prev.name === 'question' ? prev.playerName : (prev as { playerName: string }).playerName,
          question: msg.question,
          questionIndex: msg.index,
          totalQuestions: msg.total,
          answerPhase: 'answering',
        }));
      }
      if (msg.type === 'all_answered') {
        setPhase(prev => {
          if (prev.name === 'question') {
            return { ...prev, answerPhase: 'reveal', correctAnswerIds: msg.correctAnswerIds, leaderboard: msg.leaderboard };
          }
          return prev;
        });
      }
      if (msg.type === 'quiz_ended') {
        setPhase(prev => ({
          name: 'ended',
          playerName: (prev as { playerName: string }).playerName,
          leaderboard: msg.leaderboard,
        }));
      }
    });

    c.on('error', () => {
      setError(`Could not connect to quiz "${code}". Is the host running?`);
      setPhase({ name: 'enter_name' });
    });

    setClient(c);
  };

  const handleAnswer = (answerIds: string[]): void => {
    setPhase(prev => {
      if (prev.name !== 'question') return prev;
      client?.answer(prev.question.id, answerIds);
      return { ...prev, answerPhase: 'waiting', selectedAnswerIds: answerIds };
    });
  };

  if (phase.name === 'enter_name') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">── Join Quiz: {code} ──────────────────────</Text>
        <Box marginTop={1} />
        {error && <Text color="red">{error}</Text>}
        <Text>Your name: </Text>
        <TextInput
          value={nameInput}
          onChange={setNameInput}
          onSubmit={(v) => { if (v.trim()) connect(v.trim()); }}
          placeholder="Enter your name..."
        />
      </Box>
    );
  }

  if (phase.name === 'connecting') {
    return <WaitingScreen name={phase.playerName} players={[]} connecting />;
  }

  if (phase.name === 'waiting') {
    return <WaitingScreen name={phase.playerName} players={phase.players} />;
  }

  if (phase.name === 'question') {
    return (
      <QuestionScreen
        question={phase.question}
        questionIndex={phase.questionIndex}
        totalQuestions={phase.totalQuestions}
        onAnswer={handleAnswer}
        phase={phase.answerPhase}
        selectedAnswerIds={phase.selectedAnswerIds}
        correctAnswerIds={phase.correctAnswerIds}
        leaderboard={phase.leaderboard}
        playerName={phase.playerName}
      />
    );
  }

  if (phase.name === 'ended') {
    return <ResultsScreen leaderboard={phase.leaderboard} playerName={phase.playerName} />;
  }

  return <Text>Loading...</Text>;
}

// ── Main ───────────────────────────────────────────────────────────────────────

const { flags } = cli;

if (flags.join) {
  render(<ParticipantApp code={flags.join.toUpperCase()} localPort={flags.port} />);
} else if (flags.build || flags.host !== undefined) {
  render(<AdminApp buildFirst={flags.build} hostQuery={typeof flags.host === 'string' ? flags.host : undefined} />);
} else {
  cli.showHelp();
}
