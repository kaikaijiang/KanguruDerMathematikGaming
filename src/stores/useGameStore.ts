import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'de' | 'cn';

interface Question {
    id: string;
    category: string;
    imgUrl?: string; // Optional image for the question card
    answerType: 'single' | 'multi';
    title: string;
    options: string[]; // ['A: Option 1', 'B: Option 2']
    correctAnswer: string[]; // ['A', 'C']
    solution: {
        youtubeId: string;
        start: number;
        end: number;
    };
    avatarSeed: string;
    points: number;
    hint?: {
        text: string;
        type: 'gif' | 'drag-drop' | 'drag-copy-drop';
        background?: string;
        items: Array<{ id: string; src: string }>;
    };
}

interface UserState {
    playerId: string;
    language: Language;
    collectedAvatars: string[]; // List of Seeds or Question IDs
    selectedAvatarId: string | null;
    selectedAvatarUrl: string | null;
    wrongQuestions: string[]; // List of IDs
    lastQuestionIndex: number; // Last index played in sequence
    currentBalance: number;
    activeExamId: string | null; // e.g. "3_4_2025"
    setPlayerId: (id: string) => void;
    setLanguage: (lang: Language) => void;
    setSelectedAvatar: (id: string, url?: string) => void;
    unlockAvatar: (seed: string) => void;
    addWrongQuestion: (id: string) => void;
    removeWrongQuestion: (id: string) => void;
    setLastIndex: (idx: number) => void;
    setBalance: (bal: number) => void;
    setActiveExamId: (id: string) => void;
    addPoints: (amount: number) => void;
    deductPoints: (amount: number) => void;
    syncFromBackend: (data: {
        collectedAvatars: string[],
        selectedAvatarId?: string,
        selectedAvatarUrl?: string,
        wrongQuestions: string[],
        lastQuestionIndex: number,
        currentBalance: number,
        activeExamId?: string
    }) => void;
}

interface GameState {
    questions: Question[];
    currentQuestionIndex: number;
    score: number;
    pointsEarnedInRun: number; // Track points earned in current session/run
    isGameActive: boolean;
    setQuestions: (qs: Question[]) => void;
    nextQuestion: () => void;
    prevQuestion: () => void;
    incrementScore: (points: number) => void;

    resetGame: () => void;
}

// User preferences persist across sessions
export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            playerId: '',
            language: 'de',
            collectedAvatars: [],
            selectedAvatarId: null,
            selectedAvatarUrl: null,
            wrongQuestions: [],
            lastQuestionIndex: 0,
            currentBalance: 0,
            activeExamId: null,
            setPlayerId: (id) => set({ playerId: id }),

            setLanguage: (lang) => set({ language: lang }),
            setSelectedAvatar: (id, url) => set({ selectedAvatarId: id, selectedAvatarUrl: url }),
            unlockAvatar: (seed) =>
                set((state) => ({
                    collectedAvatars: state.collectedAvatars.includes(seed)
                        ? state.collectedAvatars
                        : [...state.collectedAvatars, seed],
                })),
            addWrongQuestion: (id) => set((state) => ({
                wrongQuestions: state.wrongQuestions.includes(id)
                    ? state.wrongQuestions
                    : [...state.wrongQuestions, id]
            })),
            removeWrongQuestion: (id) => set((state) => ({
                wrongQuestions: state.wrongQuestions.filter(qid => qid !== id)
            })),
            setLastIndex: (idx) => set({ lastQuestionIndex: idx }),
            setBalance: (bal) => set({ currentBalance: bal }),
            setActiveExamId: (id) => set({ activeExamId: id }),
            addPoints: (amount) => set((state) => ({ currentBalance: state.currentBalance + amount })),
            deductPoints: (amount) => set((state) => ({ currentBalance: Math.max(0, state.currentBalance - amount) })),
            syncFromBackend: (data) => {
                console.log("SYNCING STORE FROM BACKEND:", data); // DEBUG
                set({
                    collectedAvatars: data.collectedAvatars || [],
                    selectedAvatarId: data.selectedAvatarId ? String(data.selectedAvatarId) : null,
                    selectedAvatarUrl: data.selectedAvatarUrl || null,
                    wrongQuestions: data.wrongQuestions || [],
                    lastQuestionIndex: data.lastQuestionIndex || 0,
                    currentBalance: data.currentBalance || 0,
                    activeExamId: data.activeExamId || null
                })
            },

        }),
        {
            name: 'kanguru-user-storage',
        }
    )
);

// Game state resets every run
export const useGameStore = create<GameState>((set) => ({
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    pointsEarnedInRun: 0,
    isGameActive: false,
    setQuestions: (qs) => set({ questions: qs, currentQuestionIndex: 0, score: 0, pointsEarnedInRun: 0, isGameActive: true }),
    nextQuestion: () => set((state) => ({ currentQuestionIndex: state.currentQuestionIndex + 1 })),
    prevQuestion: () => set((state) => ({ currentQuestionIndex: Math.max(0, state.currentQuestionIndex - 1) })),
    incrementScore: (points) => set((state) => ({
        score: state.score + 1,
        pointsEarnedInRun: state.pointsEarnedInRun + (points || 10)
    })),
    resetGame: () => set({ currentQuestionIndex: 0, score: 0, pointsEarnedInRun: 0, isGameActive: false }),

}));
