
export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

export const questions: Question[] = [
  {
    id: 1,
    question: "Which language is used to develop React applications?",
    options: ["Python", "JavaScript", "C", "PHP"],
    correctAnswer: 1
  },
  {
    id: 2,
    question: "Which technology runs JavaScript on the server?",
    options: ["HTML", "CSS", "Node.js", "Bootstrap"],
    correctAnswer: 2
  },
  {
    id: 3,
    question: "What does API stand for?",
    options: [
      "Application Programming Interface",
      "Advanced Program Internet",
      "Applied Process Integration",
      "Application Page Information"
    ],
    correctAnswer: 0
  },
  {
    id: 4,
    question: "Which HTTP method is commonly used to retrieve data?",
    options: ["POST", "DELETE", "GET", "PATCH"],
    correctAnswer: 2
  },
  {
    id: 5,
    question: "Which language adds static typing to JavaScript?",
    options: ["TypeScript", "HTML", "SQL", "XML"],
    correctAnswer: 0
  }
];
