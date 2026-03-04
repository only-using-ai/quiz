import React from 'react';
import { Box, Text } from 'ink';

interface Props {
  name: string;
  players: string[];
  connecting?: boolean;
}

export default function WaitingScreen({ name, players, connecting }: Props): React.ReactElement {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">── term-quiz ─────────────────────────────</Text>
      <Box marginTop={1} />

      {connecting ? (
        <Text color="yellow">Connecting...</Text>
      ) : (
        <>
          <Text color="green">Joined as <Text bold>{name}</Text></Text>
          <Box marginTop={1} />
          <Text bold>Players in lobby ({players.length}):</Text>
          {players.map((p, i) => (
            <Text key={i} color={p === name ? 'green' : 'white'}>  {i + 1}. {p}{p === name ? ' (you)' : ''}</Text>
          ))}
          <Box marginTop={1} />
          <Text color="gray" dimColor>Waiting for the host to start...</Text>
        </>
      )}
    </Box>
  );
}
