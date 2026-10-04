export interface LongVideo {
  id: string;
  title: string;
  duration: string;
  views: string;
  thumbnail?: string;
}

export interface Course {
  id: string;
  title: string;
  instructor: string;
  instructorInitial: string;
  lessons: number;
  category: string;
  introVideoDuration: string;
  rating: number;
  students: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  icon: string;
  thumbnail?: string;
}

export const COURSE_CATEGORIES = ["All", "Mathematics", "English", "Science", "Coding", "GK", "Motivation"] as const;

export const LONG_VIDEOS: LongVideo[] = Array.from({ length: 10 }, (_, i) => ({
  id: `video-${i + 1}`,
  title: `Learning Video ${i + 1}: Sparks Tutorial`,
  duration: `${Math.floor(Math.random() * 20) + 5}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`,
  views: `${(Math.random() * 50 + 1).toFixed(1)}K views`,
}));

export const COURSES: Course[] = [
  { id: "c1", title: "Complete Sparks Masterclass", instructor: "Sparks Academy", instructorInitial: "S", lessons: 24, category: "Mathematics", introVideoDuration: "2:30", rating: 4.8, students: "12.5K", level: "Beginner", icon: "calculator" },
  { id: "c2", title: "English Grammar from Scratch", instructor: "Learn English Hub", instructorInitial: "L", lessons: 32, category: "English", introVideoDuration: "3:15", rating: 4.6, students: "8.3K", level: "Beginner", icon: "language" },
  { id: "c3", title: "Physics Fundamentals", instructor: "Science Pro", instructorInitial: "S", lessons: 18, category: "Science", introVideoDuration: "1:45", rating: 4.9, students: "15.1K", level: "Intermediate", icon: "flask" },
  { id: "c4", title: "JavaScript for Beginners", instructor: "Code Academy", instructorInitial: "C", lessons: 28, category: "Coding", introVideoDuration: "4:00", rating: 4.7, students: "22.4K", level: "Beginner", icon: "code-slash" },
  { id: "c5", title: "Algebra Made Easy", instructor: "Math Mentor", instructorInitial: "M", lessons: 20, category: "Mathematics", introVideoDuration: "2:00", rating: 4.5, students: "6.7K", level: "Intermediate", icon: "calculator" },
  { id: "c6", title: "Vocabulary Building", instructor: "Word Masters", instructorInitial: "W", lessons: 15, category: "English", introVideoDuration: "1:30", rating: 4.4, students: "5.2K", level: "Beginner", icon: "language" },
  { id: "c7", title: "Chemistry Basics", instructor: "Science Pro", instructorInitial: "S", lessons: 22, category: "Science", introVideoDuration: "2:45", rating: 4.8, students: "9.8K", level: "Advanced", icon: "flask" },
  { id: "c8", title: "Python Programming", instructor: "Code Academy", instructorInitial: "C", lessons: 30, category: "Coding", introVideoDuration: "3:30", rating: 4.9, students: "31.2K", level: "Intermediate", icon: "code-slash" },
  { id: "c9", title: "General Knowledge Mastery", instructor: "GK Experts", instructorInitial: "G", lessons: 25, category: "GK", introVideoDuration: "2:15", rating: 4.3, students: "4.1K", level: "Beginner", icon: "globe" },
  { id: "c10", title: "Study Motivation & Habits", instructor: "Sparks Academy", instructorInitial: "S", lessons: 12, category: "Motivation", introVideoDuration: "1:00", rating: 4.7, students: "18.6K", level: "Beginner", icon: "rocket" },
];

export interface Quiz {
  id: string;
  title: string;
  questions: number;
  duration: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  icon: string;
  score?: number;
  completed?: boolean;
}

export const QUIZ_TODAY: Quiz[] = [
  { id: "q1", title: "Mathematics Basics", questions: 10, duration: "15 min", category: "Mathematics", difficulty: "Easy", icon: "calculator" },
  { id: "q2", title: "English Grammar", questions: 15, duration: "20 min", category: "English", difficulty: "Medium", icon: "language" },
  { id: "q3", title: "Science Quiz", questions: 12, duration: "18 min", category: "Science", difficulty: "Hard", icon: "flask" },
  { id: "q4", title: "History Quiz", questions: 8, duration: "12 min", category: "History", difficulty: "Easy", icon: "book" },
  { id: "q5", title: "Geography Test", questions: 10, duration: "15 min", category: "Geography", difficulty: "Medium", icon: "globe" },
];

export const QUIZ_COMPLETE: Quiz[] = [
  { id: "qc1", title: "Introduction to Programming", questions: 20, duration: "25 min", category: "Coding", difficulty: "Hard", icon: "code-slash", score: 85, completed: true },
  { id: "qc2", title: "General Knowledge", questions: 15, duration: "20 min", category: "GK", difficulty: "Easy", icon: "bulb", score: 92, completed: true },
  { id: "qc3", title: "Logical Reasoning", questions: 10, duration: "15 min", category: "Logic", difficulty: "Medium", icon: "git-branch", score: 78, completed: true },
];

export interface Reel {
  id: string;
  title: string;
  description: string;
  duration: string;
  views: string;
  likes: string;
  comments: string;
  author: string;
  authorInitial: string;
  category: string;
}

export const REELS: Reel[] = [
  { id: "r1", title: "Quick Math Trick", description: "Multiply any number by 11 in seconds! Try this amazing shortcut.", duration: "0:45", views: "12.5K", likes: "1.2K", comments: "234", author: "Math Mentor", authorInitial: "M", category: "Mathematics" },
  { id: "r2", title: "English Vocab Boost", description: "5 powerful words to impress anyone. Level up your vocabulary today.", duration: "1:00", views: "8.2K", likes: "890", comments: "156", author: "Word Masters", authorInitial: "W", category: "English" },
  { id: "r3", title: "Science Fun Facts", description: "Did you know water can boil and freeze at the same time? Mind blown!", duration: "0:55", views: "15.3K", likes: "2.1K", comments: "412", author: "Science Pro", authorInitial: "S", category: "Science" },
  { id: "r4", title: "History in 60 sec", description: "The shortest war in history lasted only 38 minutes. Here's the story.", duration: "1:00", views: "6.1K", likes: "654", comments: "89", author: "History Hub", authorInitial: "H", category: "History" },
  { id: "r5", title: "Coding Tip", description: "One line of code that will save you hours of debugging. Must know!", duration: "0:45", views: "22.4K", likes: "3.5K", comments: "567", author: "Code Academy", authorInitial: "C", category: "Coding" },
  { id: "r6", title: "Grammar Quick Fix", description: "Never confuse 'their', 'there' & 'they're' again with this trick.", duration: "0:50", views: "9.8K", likes: "1.1K", comments: "198", author: "Learn English Hub", authorInitial: "L", category: "English" },
  { id: "r7", title: "GK Challenge", description: "Can you answer these 3 questions? Most people get #2 wrong!", duration: "1:00", views: "11.2K", likes: "1.8K", comments: "345", author: "GK Experts", authorInitial: "G", category: "GK" },
  { id: "r8", title: "Study Motivation", description: "The 2-minute rule that changed how I study forever. Game changer!", duration: "0:40", views: "18.6K", likes: "2.9K", comments: "678", author: "Sparks Academy", authorInitial: "S", category: "Motivation" },
];
