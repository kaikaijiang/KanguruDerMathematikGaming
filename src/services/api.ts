import type { Language } from '../stores/useGameStore';

const GAS_URL = import.meta.env.VITE_GOOGLE_APP_SCRIPT_URL;


// MOCK DATA FALLBACK (In case API fails or is not set)
const MOCK_QUESTIONS = [
    {
        id: 'QMock1',
        category: 'Level 3',
        answerType: 'single' as const,
        title: '[MOCK] Welches Tier ist KEIN Säugetier?',
        options: ['A: Hund', 'B: Katze', 'C: Fisch', 'D: Wal'],
        correctAnswer: ['C'],
        solution: { youtubeId: 'dQw4w9WgXcQ', start: 0, end: 10 },
        avatarSeed: 'felix',
        points: 5,
    },
    {
        id: 'QMock2',
        category: 'Level 3',
        answerType: 'single' as const,
        title: '2 + 2 = ?',
        options: ['A: 3', 'B: 4', 'C: 5', 'D: 6'],
        correctAnswer: ['B'],
        solution: { youtubeId: 'dQw4w9WgXcQ', start: 10, end: 20 },
        avatarSeed: 'luna',
        points: 10,
    },
    {
        id: 'QMock3',
        category: 'Level 3',
        answerType: 'single' as const,
        title: '[MOCK] Which is a Static Sticker?',
        options: ['A: This One', 'B: Not This', 'C: Nope', 'D: Nada'],
        correctAnswer: ['A'],
        solution: { youtubeId: 'dQw4w9WgXcQ', start: 0, end: 10 },
        avatarSeed: 'https://placecats.com/300/300', // Test URL
        points: 20,
    },
];


export interface ExamConfig {
    class: string;
    years: string[];
}

export const fetchExamConfig = async (): Promise<ExamConfig[]> => {
    if (!GAS_URL) {
        // Mock Config
        return [
            { class: '3_4', years: ['2025', '2024'] },
            { class: '5_6', years: ['2024'] }
        ];
    }
    try {
        const res = await fetch(`${GAS_URL}?action=getExamConfig`);
        if (!res.ok) throw new Error('Network error');
        const data = await res.json();

        // Robust parsing: Backend might return "years" as a JSON string or already an Array
        return data.map((item: any) => {
            let years = Array.isArray(item.years) ? item.years : JSON.parse(item.years || '[]');
            // Extra safety: If backend split a JSON string by comma, we get ["2025", "2024"]. 
            // We need to clean brackets and quotes from EACH element just in case.
            years = years.map((y: string) => String(y).replace(/[\[\]"']/g, '').trim());
            return {
                class: item.class,
                years: years
            };
        });
    } catch (err) {
        console.warn("Fetch Config Failed", err);
        return [{ class: '3_4', years: ['2025'] }]; // Fallback
    }
};

export const fetchQuestions = async (lang: Language, options: FetchOptions = {}) => {
    if (!GAS_URL) {
        console.warn("VITE_GOOGLE_APP_SCRIPT_URL is not set. Using Mock Data.");
        return mockFetch(lang);
    }

    try {
        const count = options.count || import.meta.env.VITE_QUESTION_COUNT || 10;
        let query = `${GAS_URL}?action=getQuestions&count=${count}&lang=${lang}`;

        if (options.startIndex !== undefined) {
            query += `&startIndex=${options.startIndex}`;
        }
        if (options.ids && options.ids.length > 0) {
            query += `&ids=${options.ids.join(',')}`;
            // If we have IDs (Retry Mode), we also need the Class ID scope
            if (options.classId) {
                query += `&classId=${options.classId}`;
            }
        }
        // Standard Mode
        if (options.examId) {
            query += `&examId=${options.examId}`;
        }

        const response = await fetch(query);
        if (!response.ok) throw new Error('Network error');

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.map((q: any) => ({
            id: q.id,
            category: q.category,
            answerType: q.answerType || 'single',
            title: q.title,
            options: q.options,
            correctAnswer: q.correctAnswer,
            solution: {
                ...q.solution,
                youtubeId: extractYoutubeId(q.solution.youtubeId)
            },
            avatarSeed: q.avatarSeed,
            points: q.points,
            hint: q.hint
        }));

    } catch (err) {
        console.error("API Fetch Failed - Falling back to Mocks", err);
        // If it's the specific "NO_QUESTIONS_FOUND" error, rethrow it so UI can handle it
        if (err instanceof Error && err.message === 'NO_QUESTIONS_FOUND') {
            throw err;
        }
        return mockFetch(lang);
    }
};

interface FetchOptions {
    count?: number;
    startIndex?: number;
    ids?: string[];
    examId?: string; // For Standard Mode: "3_4_2025"
    classId?: string; // For Retry Mode: "3_4"
}
interface SyncData {
    playerId: string;
    score: number;
    newAvatars: string[];
    selectedAvatarId?: string;
    wrongAnswers?: string[];
    correctedAnswers?: string[];
    lastIndex?: number;
    pointsEarned?: number;
    activeExamId?: string;
}

export const syncScore = async (data: SyncData) => {
    if (!GAS_URL) {
        console.log('[MOCK] Syncing to GAS:', data);
        return true;
    }

    try {
        const payload = JSON.stringify(data);

        console.log('[API] Sending syncScore request to:', GAS_URL);
        const res = await fetch(`${GAS_URL}?action=syncScore`, {
            method: 'POST',
            headers: { "Content-Type": "text/plain" },
            body: payload
        });
        const text = await res.text();
        console.log('[API] syncScore response:', res.status, text);
        return true;
    } catch (err) {
        console.error("Sync Failed", err);
        return false;
    }
};

export interface PurchaseResult {
    success: boolean;
    outcome?: 'new' | 'duplicate';
    sticker?: {
        id: string;
        rarity: string;
        imageUrl: string;
    };
    remainingBalance?: number;
    error?: string;
}

export const buySticker = async (playerId: string, rarity: string): Promise<PurchaseResult> => {
    if (!GAS_URL) {
        console.log('[MOCK] Buying Sticker:', rarity);
        await new Promise(r => setTimeout(r, 1000));
        return {
            success: true,
            outcome: Math.random() > 0.3 ? 'new' : 'duplicate',
            sticker: {
                id: 'mock_sticker_' + Date.now(),
                rarity: rarity,
                imageUrl: 'https://placecats.com/400/400'
            },
            remainingBalance: 100
        };
    }

    try {
        const payload = JSON.stringify({ playerId, rarity });
        const res = await fetch(`${GAS_URL}?action=buySticker`, {
            method: 'POST',
            headers: { "Content-Type": "text/plain" },
            body: payload
        });
        const data = await res.json();
        return data;
    } catch (err) {
        console.error("Purchase Failed", err);
        return { success: false, error: "Network Error" };
    }
};

export const fetchSticker = async (id: string): Promise<{ id: string; imageUrl: string; } | null> => {
    // Determine the 'default default' just in case everything fails
    const DEFAULT_STICKER_IMG = "https://placecats.com/300/300"; // Fallback cat

    if (!GAS_URL) {
        // [MOCK]
        console.log('[MOCK] Fetching Sticker Info:', id);
        await new Promise(r => setTimeout(r, 200));

        if (id === '1') {
            return { id: '1', imageUrl: 'https://img.freepik.com/premium-vector/cute-pixel-art-dragon-fantasy-game-character_360488-842.jpg' }; // A mock Dragon for ID 1
        }

        return {
            id,
            imageUrl: DEFAULT_STICKER_IMG
        };
    }

    try {
        const res = await fetch(`${GAS_URL}?action=getSticker&id=${id}`);
        if (!res.ok) throw new Error('Network error');

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        return {
            id: data.id,
            imageUrl: data.imageUrl
        };

    } catch (err) {
        console.warn("fetchSticker Failed (Backend implementation missing?)", err);
        // Fallback for ANY failure (e.g. backend missing 'getSticker' action)
        // Return a safe default so the user always sees an avatar
        return {
            id: id,
            imageUrl: 'https://cdn.pixabay.com/photo/2017/01/03/17/04/dragon-1949141_1280.png'
        };
    }
};

export interface GalleyItem {
    id: string;
    type: 'sticker' | 'avatar';
    rarity: string;
    imageUrl?: string;
    name?: string;
}

export const fetchGallery = async (playerId: string): Promise<{ gallery: GalleyItem[] }> => {
    if (!GAS_URL) {
        // Mock
        return {
            gallery: [
                { id: 'mock1', type: 'sticker', rarity: 'Legendary', imageUrl: 'https://placecats.com/300/300' },
                { id: 'q_1', type: 'avatar', rarity: 'Adventure', name: 'Pixel Friend' }
            ]
        };
    }

    try {
        const res = await fetch(`${GAS_URL}?action=getGallery&playerId=${playerId}`);
        if (!res.ok) throw new Error('Network error');
        const data = await res.json();
        return data;
    } catch (err) {
        console.error("Gallery Fetch Failed", err);
        return { gallery: [] };
    }
};

const mockFetch = async (_lang: Language) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    // Simulated Mock Logic for the new structure
    return MOCK_QUESTIONS.map(q => ({
        ...q,
        // Mock data is static, so we just return the same object, 
        // but in real code we'd filter mocks by lang too if we cared about mocks.
    }));
};

const extractYoutubeId = (urlOrId: string) => {
    if (!urlOrId) return '';
    // Handle standard URL, Short URL, and already extracted ID
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = urlOrId.match(regExp);
    return (match && match[2].length === 11) ? match[2] : urlOrId;
};

