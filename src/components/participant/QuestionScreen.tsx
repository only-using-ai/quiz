import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Question, Score } from '../../types.js';

interface Props {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  onAnswer: (answerIds: string[]) => void;
  phase: 'answering' | 'waiting' | 'reveal';
  selectedAnswerIds?: string[];
  correctAnswerIds?: string[];
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
  selectedAnswerIds,
  correctAnswerIds,
  leaderboard,
  playerName,
}: Props): React.ReactElement {
  const [elapsed, setElapsed] = useState(0);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (phase !== 'answering') return;
    const start = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500);
    return () => clearInterval(t);
  }, [phase]);

  // Reset pending selections when a new question arrives
  useEffect(() => {
    setPendingIds(new Set());
    setElapsed(0);
  }, [question.id]);

  const qType = question.type ?? 'multiple-choice';
  const isMultiAnswer = qType === 'multiple-answer';

  useInput((input, key) => {
    if (phase !== 'answering') return;
    const idx = KEYS.indexOf(input.toLowerCase() as typeof KEYS[number]);

    if (isMultiAnswer) {
      if (idx >= 0 && idx < question.answers.length) {
        const answerId = question.answers[idx]!.id;
        setPendingIds(prev => {
          const next = new Set(prev);
          if (next.has(answerId)) next.delete(answerId);
          else next.add(answerId);
          return next;
        });
      } else if (key.return && pendingIds.size > 0) {
        onAnswer([...pendingIds]);
      }
    } else {
      if (idx >= 0 && idx < question.answers.length) {
        onAnswer([question.answers[idx]!.id]);
      }
    }
  });

  const selectedSet = new Set(selectedAnswerIds ?? []);
  const correctSet = new Set(correctAnswerIds ?? []);

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
      {isMultiAnswer && phase === 'answering' && (
        <Text color="gray" dimColor>Select all that apply</Text>
      )}
      <Box marginTop={1} />

      {question.answers.map((a, i) => {
        let color = COLORS[i]!;
        let suffix = '';
        let prefix: string;

        if (isMultiAnswer) {
          // During answering: show toggle checkboxes
          if (phase === 'answering') {
            prefix = pendingIds.has(a.id) ? `[x]` : `[ ]`;
          } else {
            prefix = selectedSet.has(a.id) ? `[x]` : `[ ]`;
          }
        } else {
          prefix = `[${LABELS[i]}]`;
        }

        if (phase === 'reveal' && correctAnswerIds) {
          if (correctSet.has(a.id)) {
            color = 'green';
            suffix = ' ✓';
          } else if (selectedSet.has(a.id)) {
            color = 'red';
            suffix = ' ✗';
          }
        } else if (phase === 'waiting' && !isMultiAnswer && a.id === selectedAnswerIds?.[0]) {
          suffix = ' ◀ your answer';
        }

        const isSelected = isMultiAnswer
          ? (phase === 'answering' ? pendingIds.has(a.id) : selectedSet.has(a.id))
          : a.id === selectedAnswerIds?.[0];

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
        isMultiAnswer ? (
          <Text color="gray">
            Press {LABELS.slice(0, question.answers.length).join(' / ')} to toggle,{' '}
            <Text bold>Enter</Text> to submit
            {pendingIds.size > 0 ? <Text color="cyan"> ({pendingIds.size} selected)</Text> : null}
          </Text>
        ) : (
          <Text color="gray">Press {LABELS.slice(0, question.answers.length).join(' / ')} to answer</Text>
        )
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
