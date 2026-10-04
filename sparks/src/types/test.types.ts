// ─── Student Tests API types ───

export interface TestQuestionOption {
  _id: string;
  questionText: string;
  options: string[];
  correctAnswer: number;
}

export interface TestBanner {
  url: string;
  key: string;
}

export interface TestCreatedBy {
  _id: string;
  name: string;
}

export interface TestFromApi {
  _id: string;
  title: string;
  description?: string;
  banner?: TestBanner;
  startTime: string;
  endTime: string;
  perQuestionMinutes: number;
  perQuestionSeconds: number;
  questions: TestQuestionOption[];
  createdBy: TestCreatedBy;
  isActive: boolean;
  isNotifySubscribed?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TestsPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface TestsListResponse {
  tests: TestFromApi[];
  pagination: TestsPagination;
  averageScore?: number;
}

export type StudentTestsType = "today" | "completed" | "my_completed";

export interface GetStudentTestsQuery {
  type: StudentTestsType;
  page: number;
  limit: number;
}

export interface ResultAnswer {
  questionNumber: number;
  userSelectedOption: number;
  correctOption: number;
  isCorrect: boolean;
}

export interface TestResultResponse {
  test: {
    _id: string;
    title: string;
    description?: string;
    questions: TestQuestionOption[];
  };
  result: {
    answers: ResultAnswer[];
    correctCount: number;
    wrongCount: number;
    total: number;
    scorePercent: number;
    completedAt: string | null;
  };
}
