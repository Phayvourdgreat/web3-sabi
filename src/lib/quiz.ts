// Generates quiz options using wrong answers from Supabase.
// Falls back to generic wrong answers if the database doesn't provide them.

interface QuizOption {
  text: string;
  isCorrect: boolean;
}

const fallbackWrongAnswers = [
  'It makes everything faster and cheaper',
  'It removes the need for any technology',
  'It is only for rich people and banks',
];

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateQuizOptions(
  correctAnswer: string,
  dbWrongAnswers: string[] | null
): QuizOption[] {
  const wrongs = dbWrongAnswers && dbWrongAnswers.length >= 3
    ? dbWrongAnswers
    : fallbackWrongAnswers;
  const options: QuizOption[] = [
    { text: correctAnswer, isCorrect: true },
    ...wrongs.map((w) => ({ text: w, isCorrect: false })),
  ];
  return shuffle(options);
}
