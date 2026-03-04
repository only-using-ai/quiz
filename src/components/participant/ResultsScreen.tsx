import React from 'react';
import { Box, Text } from 'ink';
import type { Score } from '../../types.js';

interface Props {
  leaderboard: Score[];
  playerName: string;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function ResultsScreen({ leaderboard, playerName }: Props): React.ReactElement {
  const myResult = leaderboard.find(s => s.name === playerName);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="yellow">── Quiz Complete! ────────────────────────</Text>
      <Box marginTop={1} />

      {myResult && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="cyan">
            You finished #{myResult.rank} with {myResult.score} points!
          </Text>
        </Box>
      )}

      <Text bold>Final Leaderboard:</Text>
      {leaderboard.map((s, i) => {
        const medal = i < 3 ? (MEDALS[i] ?? '') : `${s.rank}.`;
        const isMe = s.name === playerName;
        return (
          <Box key={s.name}>
            <Text color={isMe ? 'cyan' : s.rank <= 3 ? 'yellow' : 'white'} bold={isMe}>
              {medal} {s.name.padEnd(20)} {s.score}pts{isMe ? '  ← you' : ''}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
