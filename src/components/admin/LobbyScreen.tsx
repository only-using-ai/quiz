import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { Quiz, Player } from '../../types.js';

interface Props {
  quiz: Quiz;
  code: string;
  tunnelUrl: string;
  players: Player[];
  onStart: () => void;
}

export default function LobbyScreen({ quiz, code, tunnelUrl, players, onStart }: Props): React.ReactElement {
  useInput((input) => {
    if (input === ' ' || input === '\r' || input.toLowerCase() === 's') {
      if (players.length > 0) onStart();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">── Hosting: {quiz.title} ──────────────────</Text>
      <Box marginTop={1} />

      <Box borderStyle="round" borderColor="yellow" paddingX={2} paddingY={1} flexDirection="column" alignItems="center">
        <Text>Session: <Text bold color="yellow">{code}</Text></Text>
        <Box marginTop={1} />
        <Text bold color="cyan">quiz --join {tunnelUrl.startsWith('LOCAL') ? `<code> --port <port>` : tunnelUrl}</Text>
      </Box>

      {tunnelUrl.startsWith('LOCAL') && (
        <Box marginTop={1}><Text color="yellow">{tunnelUrl}</Text></Box>
      )}
      <Box marginTop={1} />

      <Text bold>Players ({players.length}):</Text>
      {players.length === 0 ? (
        <Text color="gray" dimColor>  Waiting for players...</Text>
      ) : (
        players.map((p, i) => (
          <Text key={p.id} color="green">  {i + 1}. {p.name}</Text>
        ))
      )}

      <Box marginTop={1} />
      {players.length > 0 ? (
        <Text>Press <Text bold color="green">S</Text> or <Text bold color="green">Space</Text> to start the quiz</Text>
      ) : (
        <Text color="gray">Start becomes available once players join</Text>
      )}
      <Text color="gray">{quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''}</Text>
    </Box>
  );
}
