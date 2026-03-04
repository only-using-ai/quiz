import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Question, Score } from '../../types.js';

interface Props {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  onAnswer: (answerId: string) => void;
  phase: 'answering' | 'waiting' | 'reveal';
  selectedAnswerId?: string;
  correctAnswerId?: string;
  leaderboard?: Score[];
  playerName: string;
}

const COLORS = ['red', 'blue', 'green', 'yellow'] as const;
const LABELS = ['A', 'B', 'C', 'D'] as const;
const KEYS = ['a', 'b', 'c', 'd'] as const;

export default function QuestionScreen({
  question,
  questionIndex,
  totalQuestions,
  onAnswer,
  phase,
  selectedAnswerId,
  correctAnswerId,
  leaderboard,
  playerName,
}: Props): React.ReactElement {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (phase !== 'answering') return;
    const start = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500);
    return () => clearInterval(t);
  }, [phase]);

  useInput((input) => {
    if (phase !== 'answering') return;
    const idx = KEYS.indexOf(input.toLowerCase() as typeof KEYS[number]);
    if (idx >= 0 && idx < question.answers.length) {
      onAnswer(question.answers[idx]!.id);
    }
  });

  const myRank = leaderboard?.find(s => s.name === playerName)?.rank;
  const myScore = leaderboard?.find(s => s.name === playerName)?.score;

  return (
    <Box flexDirection="column" padding={1}>
      <Box justifyContent="space-between">
        <Text bold color="cyan">Q{questionIndex + 1}/{totalQuestions}</Text>
        {phase === 'answering' && <Text color="yellow">{elapsed}s</Text>}
      </Box>
      <Box marginTop={1} />

      <Text bold>{question.text}</Text>
      <Box marginTop={1} />

      {question.answers.map((a, i) => {
        let color = COLORS[i]!;
        let prefix = `[${LABELS[i]}]`;
        let suffix = '';

        if (phase === 'reveal' && correctAnswerId) {
          if (a.id === correctAnswerId) {
            color = 'green';
            suffix = ' ✓';
          } else if (a.id === selectedAnswerId) {
            color = 'red';
            suffix = ' ✗';
          }
        } else if (phase !== 'answering' && a.id === selectedAnswerId) {
          suffix = ' ◀ your answer';
        }

        const isSelected = a.id === selectedAnswerId;
        return (
          <Box key={a.id} marginBottom={0}>
            <Text bold={isSelected} color={color}>
              {prefix} {a.text}{suffix}
            </Text>
          </Box>
        );
      })}

      <Box marginTop={1} />

      {phase === 'answering' && (
        <Text color="gray">Press A / B / C / D to answer</Text>
      )}

      {phase === 'waiting' && (
        <Text color="yellow">Answer submitted! Waiting for others...</Text>
      )}

      {phase === 'reveal' && leaderboard && (
        <Box flexDirection="column">
          <Box marginTop={1} />
          <Text bold>Leaderboard:</Text>
          {leaderboard.slice(0, 5).map((s) => (
            <Text key={s.name} color={s.name === playerName ? 'cyan' : 'white'}>
              {s.rank}. {s.name.padEnd(20)} {s.score}pts{s.name === playerName ? ' ◀ you' : ''}
            </Text>
          ))}
          <Box marginTop={1} />
          <Text color="gray" dimColor>Waiting for host to advance...</Text>
        </Box>
      )}
    </Box>
  );
}
