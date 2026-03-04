import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { Quiz, Question, Answer } from '../../types.js';
import { saveQuiz } from '../../storage.js';

interface Props {
  onDone: (quiz: Quiz) => void;
}

type Step =
  | { name: 'title' }
  | { name: 'question_text'; qIndex: number }
  | { name: 'answer_text'; qIndex: number; aIndex: number }
  | { name: 'mark_correct'; qIndex: number }
  | { name: 'next_action'; qIndex: number };

function makeId(): string {
  return Math.random().toString(36).slice(2, 9);
}

export default function BuildScreen({ onDone }: Props): React.ReactElement {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [step, setStep] = useState<Step>({ name: 'title' });
  const [inputValue, setInputValue] = useState('');
  const [answerTexts, setAnswerTexts] = useState<string[]>(['', '', '', '']);
  const [status, setStatus] = useState('');

  // Current question being built (in-progress)
  const currentQ: Question | undefined = questions[
    step.name !== 'title' ? (step as { qIndex: number }).qIndex : -1
  ];

  useInput((input, key) => {
    if (step.name === 'mark_correct') {
      const qIndex = step.qIndex;
      const q = questions[qIndex];
      if (!q) return;
      const num = parseInt(input);
      if (num >= 1 && num <= q.answers.length) {
        const updated = q.answers.map((a, i) => ({ ...a, isCorrect: i === num - 1 }));
        const newQs = [...questions];
        newQs[qIndex] = { ...q, answers: updated };
        setQuestions(newQs);
        setStep({ name: 'next_action', qIndex });
        setStatus('');
      }
      return;
    }

    if (step.name === 'next_action') {
      if (input === 'a') {
        const nextQIndex = step.qIndex + 1;
        setAnswerTexts(['', '', '', '']);
        setInputValue('');
        setStep({ name: 'question_text', qIndex: nextQIndex });
      } else if (input === 'd') {
        // Done building
        const quiz: Quiz = { id: makeId(), title, questions };
        saveQuiz(quiz);
        onDone(quiz);
      }
      return;
    }

    if (step.name === 'answer_text') {
      // handled by TextInput submit
      return;
    }
  });

  const handleSubmit = (value: string): void => {
    setInputValue('');

    if (step.name === 'title') {
      if (!value.trim()) return;
      setTitle(value.trim());
      setAnswerTexts(['', '', '', '']);
      setStep({ name: 'question_text', qIndex: 0 });
      return;
    }

    if (step.name === 'question_text') {
      if (!value.trim()) return;
      const qIndex = step.qIndex;
      const newQ: Question = { id: makeId(), text: value.trim(), answers: [] };
      const newQs = [...questions];
      newQs[qIndex] = newQ;
      setQuestions(newQs);
      setAnswerTexts(['', '', '', '']);
      setStep({ name: 'answer_text', qIndex, aIndex: 0 });
      return;
    }

    if (step.name === 'answer_text') {
      const { qIndex, aIndex } = step;
      const newTexts = [...answerTexts];
      newTexts[aIndex] = value.trim();
      setAnswerTexts(newTexts);

      if (aIndex < 3) {
        setStep({ name: 'answer_text', qIndex, aIndex: aIndex + 1 });
      } else {
        // All 4 answers entered — save them
        const answers: Answer[] = newTexts.map((t, i) => ({
          id: makeId(),
          text: t || `Answer ${i + 1}`,
          isCorrect: false,
        }));
        const newQs = [...questions];
        newQs[qIndex] = { ...newQs[qIndex]!, answers };
        setQuestions(newQs);
        setStep({ name: 'mark_correct', qIndex });
      }
      return;
    }
  };

  const COLORS = ['red', 'blue', 'green', 'yellow'] as const;
  const LABELS = ['A', 'B', 'C', 'D'];

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">── Quiz Builder ──────────────────────────</Text>
      <Box marginTop={1} />

      {step.name === 'title' && (
        <Box flexDirection="column">
          <Text>Quiz title: </Text>
          <TextInput value={inputValue} onChange={setInputValue} onSubmit={handleSubmit} placeholder="e.g. World Geography" />
        </Box>
      )}

      {step.name === 'question_text' && (
        <Box flexDirection="column">
          <Text color="gray">Quiz: <Text bold color="white">{title}</Text></Text>
          <Text color="gray">Question {step.qIndex + 1}</Text>
          <Box marginTop={1} />
          <Text>Question text: </Text>
          <TextInput value={inputValue} onChange={setInputValue} onSubmit={handleSubmit} placeholder="Type your question..." />
        </Box>
      )}

      {step.name === 'answer_text' && (
        <Box flexDirection="column">
          <Text color="gray">Q{step.qIndex + 1}: <Text bold color="white">{questions[step.qIndex]?.text}</Text></Text>
          <Box marginTop={1} />
          {answerTexts.slice(0, step.aIndex).map((t, i) => (
            <Text key={i} color={COLORS[i]!}>{LABELS[i]}: {t}</Text>
          ))}
          <Box>
            <Text color={COLORS[step.aIndex]!}>{LABELS[step.aIndex]}: </Text>
            <TextInput value={inputValue} onChange={setInputValue} onSubmit={handleSubmit} placeholder={`Answer ${LABELS[step.aIndex]}...`} />
          </Box>
        </Box>
      )}

      {step.name === 'mark_correct' && (
        <Box flexDirection="column">
          <Text color="gray">Q{step.qIndex + 1}: <Text bold color="white">{questions[step.qIndex]?.text}</Text></Text>
          <Box marginTop={1} />
          {questions[step.qIndex]?.answers.map((a, i) => (
            <Text key={a.id} color={COLORS[i]!}>{i + 1}. {a.text}</Text>
          ))}
          <Box marginTop={1} />
          <Text>Which answer is correct? (1-{questions[step.qIndex]?.answers.length})</Text>
          {status ? <Text color="red">{status}</Text> : null}
        </Box>
      )}

      {step.name === 'next_action' && (
        <Box flexDirection="column">
          <Text color="green">Question {step.qIndex + 1} saved!</Text>
          <Box marginTop={1}>
            <Text>Press <Text bold color="cyan">A</Text> to add another question  |  <Text bold color="cyan">D</Text> to finish</Text>
          </Box>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray">{questions.length} question{questions.length !== 1 ? 's' : ''} so far</Text>
      </Box>
    </Box>
  );
}
