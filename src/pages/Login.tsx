import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Language } from '../stores/useGameStore';
import { useUserStore } from '../stores/useGameStore';
import { fetchExamConfig, fetchPlayer } from '../services/api';
import type { ExamConfig } from '../services/api';
import { Loader2 } from 'lucide-react';



const Login = () => {
    const navigate = useNavigate();
    const [localId, setLocalId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [checkError, setCheckError] = useState('');
    const [questionCount, setQuestionCount] = useState(10);
    const [isProfileLoaded, setIsProfileLoaded] = useState(false);

    // Exam Config State
    const [examConfigs, setExamConfigs] = useState<ExamConfig[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('3_4');
    const [selectedYear, setSelectedYear] = useState<string>('2025');
    const [isConfigLoading, setIsConfigLoading] = useState(true);

    const { setPlayerId, setLanguage, syncFromBackend, wrongQuestions, lastQuestionIndex, activeExamId, clearUserSession } = useUserStore();
    const { playerId } = useUserStore();

    // 1. Fetch Exam Config on Mount
    useEffect(() => {
        const loadConfigs = async () => {
            setIsConfigLoading(true);
            const configs = await fetchExamConfig();
            setExamConfigs(configs);
            setIsConfigLoading(false);
        };
        loadConfigs();
    }, []);

    // 2. Auto-login if persisted
    useEffect(() => {
        if (playerId && !isProfileLoaded) {
            setLocalId(playerId);
            setIsProfileLoaded(true);
        }
    }, [playerId, isProfileLoaded]);

    // 3. Auto-Select Dropdowns based on activeExamId (on login)
    useEffect(() => {
        if (isProfileLoaded && activeExamId) {
            // activeExamId format: "3_4_2025"
            // We need to parse this.
            // Be careful if class has underscores.
            // Assumption: Year is always last part (4 digits).
            const parts = activeExamId.split('_');
            const year = parts[parts.length - 1];
            // Class is everything else joined back
            const classId = parts.slice(0, parts.length - 1).join('_');

            if (year && classId) {
                // Verify if strictly valid in config? Or just set it.
                // Just set it, if it exists in list it will show, else default.
                setSelectedClass(classId);
                setSelectedYear(year);
                console.log("Restoring Exam Selection:", classId, year);
            }
        }
    }, [isProfileLoaded, activeExamId]);


    const handleCheckId = async () => {
        if (!localId.trim()) return;
        setIsLoading(true);
        setCheckError('');

        try {
            if (!import.meta.env.VITE_GOOGLE_APP_SCRIPT_URL) {
                // Mock behavior
                await new Promise(r => setTimeout(r, 500));
                setPlayerId(localId);
                setIsProfileLoaded(true);
                setIsLoading(false);
                return;
            }

            const data = await fetchPlayer(localId);

            // Detect New Player (Backend returns totalPlayed: 0 for non-existent users)
            if (data.totalPlayed === 0) {
                setCheckError('Could not load profile. New Player!');
            } else {
                setCheckError('');
            }


            console.log("LOGIN SUCCESS: ", data); // DEBUG

            // Update Store
            syncFromBackend({
                collectedAvatars: data.collectedAvatars,
                selectedAvatarId: data.selectedAvatarId,
                wrongQuestions: data.wrongQuestions,
                lastQuestionIndex: data.lastQuestionIndex,
                currentBalance: data.currentBalance,
                activeExamId: data.activeExamId
            });
            setPlayerId(localId);
            setIsProfileLoaded(true);

        } catch (err) {
            console.error(err);
            setCheckError('Could not load profile. New Player!');
            clearUserSession(); // Ensure no stale data from previous user
            setPlayerId(localId);
            setIsProfileLoaded(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStart = async (lang: Language, mode: 'sequential' | 'retry') => {
        if (!localId.trim()) return alert('Please enter an ID');

        setLanguage(lang);

        // Construct Param for GameBoard
        // Standard: needs examId (e.g. "3_4_2025")
        // Retry: needs classId (e.g. "3_4")
        const examId = `${selectedClass}_${selectedYear}`;

        // FIX: If switching to a NEW exam (or first run), Start Index should be 0.
        // If resuming the SAME exam, use the stored lastQuestionIndex.
        const isSameExam = activeExamId === examId;
        const effectiveStartIndex = (mode === 'sequential' && isSameExam) ? lastQuestionIndex : 0;

        console.log(`[Login] Starting Game. Same Exam? ${isSameExam} (${activeExamId} vs ${examId}) -> StartIndex: ${effectiveStartIndex}`);

        // Navigate with Game Config
        navigate('/game', {
            state: {
                mode: mode,
                count: questionCount,
                startIndex: effectiveStartIndex,
                examId: examId,     // Passed for Standard Mode
                classId: selectedClass // Passed for Retry Mode scope
            }
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isProfileLoaded) {
            handleCheckId();
        }
    };

    // Helper to get years for selected class
    const availableYears = examConfigs.find(c => c.class === selectedClass)?.years || [];

    // Ensure selectedYear is valid (if class changed)
    useEffect(() => {
        if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
            setSelectedYear(availableYears[0]);
        }
    }, [selectedClass, availableYears, selectedYear]);


    return (
        <div className="min-h-screen text-white flex flex-col items-center justify-center p-2 md:p-4 lg:p-8">
            <div className="text-center space-y-3 md:space-y-4 lg:space-y-6 max-w-sm md:max-w-md lg:max-w-2xl xl:max-w-3xl w-full animate-fade-in">
                <h1 className="text-[clamp(1.5rem,4vw,4rem)] text-yellow-500 font-bold mb-2 md:mb-4 lg:mb-6 drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">
                    MATHE KANGURU
                </h1>

                {/* ID INPUT SECTION */}
                <div className="space-y-2 md:space-y-3">
                    <label className="block text-base md:text-lg lg:text-2xl xl:text-3xl">WHO ARE YOU?</label>
                    <div className="flex flex-col gap-2 md:gap-3 relative">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="ENTER ID..."
                                value={localId}
                                onChange={(e) => {
                                    setLocalId(e.target.value);
                                    setIsProfileLoaded(false); // Reset if ID changes
                                }}
                                onKeyDown={handleKeyDown}
                                disabled={isLoading || isProfileLoaded}
                                className={`w-full text-[clamp(1rem,2vw,1.6rem)] p-2 md:p-3 lg:p-5 bg-black text-white border-3 md:border-4 ${isProfileLoaded ? 'border-green-500 text-green-500' : 'border-white'} text-center focus:outline-none focus:border-yellow-400 placeholder-gray-600 disabled:opacity-50`}
                            />
                            {isProfileLoaded && (
                                <button
                                    onClick={() => {
                                        clearUserSession(); // Fully reset store
                                        setLocalId('');
                                        setIsProfileLoaded(false);
                                    }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold py-2 px-4 border-2 border-red-800 shadow-md"
                                >
                                    LOGOUT
                                </button>
                            )}
                        </div>

                        {!isProfileLoaded && (
                            <button
                                onClick={handleCheckId}
                                disabled={!localId.trim() || isLoading}
                                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 border-4 border-gray-500 md:text-2xl"
                            >
                                {isLoading ? <Loader2 className="animate-spin mx-auto" /> : 'LOAD PROFILE'}
                            </button>
                        )}
                        {checkError && <p className="text-red-500">{checkError}</p>}
                    </div>
                </div>

                {/* GAME OPTIONS - ONLY SHOW AFTER LOAD */}
                {isProfileLoaded && (
                    <div className="space-y-3 md:space-y-4 lg:space-y-6 animate-fade-in-up">

                        {/* EXAM SELECTION (CLASS & YEAR) */}
                        <div className="bg-gray-800 p-2 md:p-3 lg:p-4 border-3 md:border-4 border-purple-500 space-y-2 md:space-y-3 min-h-[100px] md:min-h-[120px] lg:min-h-[140px] flex flex-col justify-center rounded-lg">
                            <h3 className="text-sm md:text-base lg:text-lg text-purple-300 uppercase tracking-widest">Select Exam</h3>

                            {isConfigLoading ? (
                                <div className="flex flex-col items-center justify-center gap-4 py-4">
                                    <Loader2 className="animate-spin w-8 h-8 text-purple-400" />
                                    <span className="text-gray-400 animate-pulse">Loading Options...</span>
                                </div>
                            ) : (
                                <div className="flex gap-4 animate-fade-in">
                                    {/* CLASS SELECT */}
                                    <div className="flex-1 space-y-1">
                                        <label className="text-xs md:text-sm text-gray-400">CLASS</label>
                                        <select
                                            value={selectedClass}
                                            onChange={(e) => setSelectedClass(e.target.value)}
                                            className="w-full bg-black text-white text-base md:text-lg lg:text-xl p-2 md:p-3 border-2 border-white focus:border-purple-400 focus:outline-none rounded"
                                        >
                                            {examConfigs.map(c => (
                                                <option key={c.class} value={c.class}>{c.class}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* YEAR SELECT */}
                                    <div className="flex-1 space-y-1">
                                        <label className="text-xs md:text-sm text-gray-400">YEAR</label>
                                        <select
                                            value={selectedYear}
                                            onChange={(e) => setSelectedYear(e.target.value)}
                                            className="w-full bg-black text-white text-base md:text-lg lg:text-xl p-2 md:p-3 border-2 border-white focus:border-purple-400 focus:outline-none rounded"
                                        >
                                            {availableYears.map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* QUESTION COUNT */}
                        <div className="bg-gray-800 p-2 md:p-3 lg:p-4 border-3 md:border-4 border-blue-500 rounded-lg">
                            <label className="block text-sm md:text-base lg:text-lg mb-1 md:mb-2 text-blue-300">QUESTION COUNT</label>
                            <div className="flex items-center justify-center gap-3 md:gap-4">
                                <button
                                    onClick={() => setQuestionCount(Math.max(5, questionCount - 1))}
                                    className="p-1 md:p-2 border-2 border-white bg-black hover:bg-gray-700 w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 flex items-center justify-center text-lg md:text-xl lg:text-2xl rounded"
                                >-</button>
                                <span className="text-2xl md:text-3xl lg:text-4xl font-mono min-w-[3ch]">{questionCount}</span>
                                <button
                                    onClick={() => setQuestionCount(Math.min(24, questionCount + 1))}
                                    className="p-1 md:p-2 border-2 border-white bg-black hover:bg-gray-700 w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 flex items-center justify-center text-lg md:text-xl lg:text-2xl rounded"
                                >+</button>
                            </div>
                        </div>

                        {/* MODE SELECTION */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 lg:gap-4">
                            {/* STANDARD MODE */}
                            <div className="space-y-2 md:space-y-3">
                                <h3 className="text-base md:text-lg lg:text-xl text-yellow-400">STANDARD RUN</h3>
                                <button
                                    onClick={() => handleStart('de', 'sequential')}
                                    disabled={isConfigLoading}
                                    className={`w-full ${isConfigLoading ? 'bg-gray-600 cursor-not-allowed opacity-50' : 'bg-red-600 hover:bg-red-500'} text-white text-sm md:text-base lg:text-lg py-2 md:py-3 lg:py-4 border-3 md:border-4 border-white shadow-[3px_3px_0_#000000] active:translate-y-1 active:shadow-none rounded-lg`}
                                >
                                    DEUTSCH START
                                </button>
                                <button
                                    onClick={() => handleStart('cn', 'sequential')}
                                    disabled={isConfigLoading}
                                    className={`w-full ${isConfigLoading ? 'bg-gray-600 cursor-not-allowed opacity-50' : 'bg-blue-600 hover:bg-blue-500'} text-white text-sm md:text-base lg:text-lg py-2 md:py-3 lg:py-4 border-3 md:border-4 border-white shadow-[3px_3px_0_#000000] active:translate-y-1 active:shadow-none rounded-lg`}
                                >
                                    中文 START
                                </button>
                                <p className="text-xs md:text-sm text-gray-400">
                                    Resumes from Q{lastQuestionIndex + 1}<br />
                                    <span className="text-xs text-gray-500">(For selected exam)</span>
                                </p>
                            </div>

                            {/* RETRY MODE */}
                            <div className="space-y-2 md:space-y-3 opacity-90">
                                <h3 className="text-base md:text-lg lg:text-xl text-pink-500">RETRY MISTAKES</h3>
                                <p className="text-xs text-pink-300 font-mono -mt-1">Scope: Class {selectedClass} (All Years)</p>
                                <button
                                    onClick={() => handleStart('de', 'retry')}
                                    disabled={wrongQuestions.length === 0 || isConfigLoading}
                                    className={`w-full ${wrongQuestions.length === 0 || isConfigLoading ? 'bg-gray-800 cursor-not-allowed opacity-50' : 'bg-gray-700 hover:bg-gray-600'} text-white text-sm md:text-base lg:text-lg py-2 md:py-3 lg:py-4 border-3 md:border-4 border-gray-500 shadow-[3px_3px_0_#000000] active:translate-y-1 active:shadow-none rounded-lg`}
                                >
                                    DEUTSCH RETRY ({wrongQuestions.length})
                                </button>
                                <button
                                    onClick={() => handleStart('cn', 'retry')}
                                    disabled={wrongQuestions.length === 0 || isConfigLoading}
                                    className={`w-full ${wrongQuestions.length === 0 || isConfigLoading ? 'bg-gray-800 cursor-not-allowed opacity-50' : 'bg-gray-700 hover:bg-gray-600'} text-white text-sm md:text-base lg:text-lg py-2 md:py-3 lg:py-4 border-3 md:border-4 border-gray-500 shadow-[3px_3px_0_#000000] active:translate-y-1 active:shadow-none rounded-lg`}
                                >
                                    中文 RETRY ({wrongQuestions.length})
                                </button>
                                {wrongQuestions.length === 0 && <p className="text-xs md:text-sm text-gray-500">No mistakes to fix!</p>}
                            </div>
                        </div>

                        {/* STORE & GALLERY */}
                        <div className="grid grid-cols-2 gap-2 md:gap-3 lg:gap-4 pt-2 md:pt-3 lg:pt-4 border-t-2 border-gray-700">
                            <div className="text-center">
                                <p className="text-xs md:text-sm text-gray-400 mb-1">BALANCE</p>
                                <p className="text-xl md:text-2xl lg:text-3xl text-yellow-400 font-bold">{useUserStore.getState().currentBalance} PTS</p>
                            </div>
                            <button
                                onClick={() => navigate('/store')}
                                className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-1 md:py-2 px-2 md:px-4 rounded border-2 border-yellow-400 flex items-center justify-center gap-1 md:gap-2 text-xs md:text-sm lg:text-base"
                            >
                                <span>🛍️</span> STORE
                            </button>
                        </div>
                    </div>
                )}

                <div className="pt-3 md:pt-4 lg:pt-6">
                    <button
                        onClick={() => navigate('/gallery')}
                        className="text-white hover:text-yellow-400 underline decoration-2 underline-offset-8 text-lg md:text-xl lg:text-2xl font-bold tracking-wide"
                    >
                        View Your Sticker Book
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
