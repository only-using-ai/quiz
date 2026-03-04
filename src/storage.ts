import fs from 'fs';
import path from 'path';
import os from 'os';
import type { Quiz } from './types.js';

const QUIZ_DIR = path.join(os.homedir(), '.term-quiz', 'quizzes');

function ensureDir(): void {
  fs.mkdirSync(QUIZ_DIR, { recursive: true });
}

export function saveQuiz(quiz: Quiz): void {
  ensureDir();
  const file = path.join(QUIZ_DIR, `${quiz.id}.json`);
  fs.writeFileSync(file, JSON.stringify(quiz, null, 2));
}

export function loadQuiz(id: string): Quiz | null {
  const file = path.join(QUIZ_DIR, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as Quiz;
}

export function listQuizzes(): Quiz[] {
  ensureDir();
  const files = fs.readdirSync(QUIZ_DIR).filter(f => f.endsWith('.json'));
  return files.map(f => JSON.parse(fs.readFileSync(path.join(QUIZ_DIR, f), 'utf-8')) as Quiz);
}

export function deleteQuiz(id: string): void {
  const file = path.join(QUIZ_DIR, `${id}.json`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}
