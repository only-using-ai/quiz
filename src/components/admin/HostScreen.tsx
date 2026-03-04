import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { Quiz, Score, AdminEvent } from '../../types.js';

type Phase = 'question' | 'results' | 'ended';

interface Props {
  quiz: Quiz;
  currentIndex: number;
  totalPlayers: number;
  remaining: number;
  leaderboard: Score[];
  phase: Phase;
  onNext: () => void;
  onEnd: () => void;
}

export default function HostScreen({
  quiz,
  currentIndex,
  totalPlayers,
  remaining,
  leaderboard,
  phase,
  onNext,
  onEnd,
}: Props): React.ReactElement {
  useInput((input) => {
    if (phase === 'results') {
      if (input === ' ' || input.toLowerCase() === 'n') {
        if (currentIndex + 1 < quiz.questions.length) {
          onNext();
        } else {
          onEnd();
        }
      }
    }
  });

  const question = quiz.questions[currentIndex];
  const answered = totalPlayers - remaining;
  const isLast = currentIndex + 1 >= quiz.questions.length;

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">── Admin View ── Q{currentIndex + 1}/{quiz.questions.length} ──────────────</Text>
      <Box marginTop={1} />

      {phase === 'question' && question && (
        <Box flexDirection="column">
          <Text bold>{question.text}</Text>
          <Box marginTop={1} />
          <Box>
            <Text color="green">Answered: {answered}/{totalPlayers}  </Text>
            <Text color="yellow">Waiting: {remaining}</Text>
          </Box>
          <Box marginTop={1}>
            <Text color="gray" dimColor>Results will appear automatically when everyone answers...</Text>
          </Box>
        </Box>
      )}

      {phase === 'results' && (
        <Box flexDirection="column">
          <Text bold color="green">All answered!</Text>
          <Box marginTop={1} />
          <Text bold>Leaderboard:</Text>
          {leaderboard.slice(0, 10).map((s) => (
            <Box key={s.name}>
              <Text color={s.rank === 1 ? 'yellow' : s.rank <= 3 ? 'cyan' : 'white'}>
                {s.rank}. {s.name.padEnd(20)} {s.score}pts
              </Text>
            </Box>
          ))}
          <Box marginTop={1} />
          <Text>
            Press <Text bold color="cyan">N</Text> or <Text bold color="cyan">Space</Text> to {isLast ? 'end quiz' : 'next question'}
          </Text>
        </Box>
      )}

      {phase === 'ended' && (
        <Box flexDirection="column">
          <Text bold color="yellow">Quiz complete!</Text>
          <Box marginTop={1} />
          <Text bold>Final Leaderboard:</Text>
          {leaderboard.map((s) => (
            <Box key={s.name}>
              <Text color={s.rank === 1 ? 'yellow' : s.rank <= 3 ? 'cyan' : 'white'}>
                {s.rank}. {s.name.padEnd(20)} {s.score}pts
              </Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
