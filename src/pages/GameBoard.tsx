import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGameStore, useUserStore } from '../stores/useGameStore';
import { fetchQuestions, fetchSticker } from '../services/api';
import AvatarDisplay from '../components/Game/AvatarDisplay';
import QuestionCard from '../components/Game/QuestionCard';
import HintCard from '../components/Game/HintCard';
import SolutionModal from '../components/Game/SolutionModal';
import SketchOverlay from '../components/Game/SketchOverlay';
import CelebrationEffect from '../components/Game/CelebrationEffect';
import { Loader2, ChevronLeft } from 'lucide-react';
import { ImageDragProvider } from '../context/ImageDragContext';
import { ImageOverlayLayer } from '../components/Game/ImageOverlayLayer';

interface GameConfig {
    mode: 'sequential' | 'retry';
    count: number;
    startIndex: number;
    examId?: string;
    classId?: string;
}

const GameBoard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const config = location.state as GameConfig;

    const {
        questions,
        currentQuestionIndex,
        nextQuestion,
        prevQuestion,
        incrementScore,
        setQuestions,
        // score,
        pointsEarnedInRun,
    } = useGameStore();

    const { language, wrongQuestions, selectedAvatarId, selectedAvatarUrl, setActiveExamId } = useUserStore();

    const [avatarState, setAvatarState] = useState<'idle' | 'captured' | 'escaped'>('idle');
    const [isInteractionDisabled, setInteractionDisabled] = useState(false);
    const [showSolution, setShowSolution] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    const [fatalError, setFatalError] = useState<string | null>(null);

    // Avatar Logic
    const [avatarUrl, setAvatarUrl] = useState<string>('');

    // Update Store ID if provided (Ensures resume works next time)
    useEffect(() => {
        if (config?.examId) {
            setActiveExamId(config.examId);
        }
    }, [config?.examId, setActiveExamId]);

    // Load Avatar (Selected or Default)
    useEffect(() => {
        const loadAvatar = async () => {
            if (selectedAvatarUrl) {
                setAvatarUrl(selectedAvatarUrl);
            } else if (selectedAvatarId) {
                // Fallback for legacy/sync cases without URL
                const data = await fetchSticker(selectedAvatarId);
                if (data) setAvatarUrl(data.imageUrl);
            } else {
                // Default to ID 1
                const data = await fetchSticker('1');
                if (data) setAvatarUrl(data.imageUrl);
            }
        }
        loadAvatar();
    }, [selectedAvatarId, selectedAvatarUrl]);


    // Session Tracking (Using Refs to avoid stale closures in timeouts/callbacks)
    const sessionWrongIds = useRef<string[]>([]);
    const sessionCorrectedIds = useRef<string[]>([]);
    const sessionCollectedAvatars = useRef<string[]>([]);

    // Initial Fetch of Questions
    useEffect(() => {
        const load = async () => {
            // If direct access without config, redirect home
            if (!config) {
                navigate('/');
                return;
            }

            console.log("Loading Game with Config:", config);

            // Clear previous questions to prevent flash of old content
            setQuestions([]);

            try {
                let qs;
                if (config.mode === 'retry') {
                    // Fetch specific Wrong Questions
                    qs = await fetchQuestions(language, {
                        ids: wrongQuestions,
                        classId: config.classId, // Pass scope to backend
                        count: config.count
                    });

                    // Ensure we don't exceed the requested count
                    if (qs.length > config.count) {
                        qs = qs.slice(0, config.count);
                    }
                } else {
                    // Sequential
                    qs = await fetchQuestions(language, {
                        count: config.count,
                        startIndex: config.startIndex,
                        examId: config.examId // "3_4_2025"
                    });
                }

                if (!qs || qs.length === 0) {
                    // Should have been caught by NO_QUESTIONS_FOUND usually, but just in case
                    throw new Error('NO_QUESTIONS_FOUND');
                }

                setQuestions(qs);
            } catch (err: any) {
                console.error("Game Load Failed:", err);
                if (err.message === 'NO_QUESTIONS_FOUND') {
                    setFatalError("No questions found for this Exam Year! Please try another year.");
                } else {
                    setFatalError("Failed to load questions. Please check your connection.");
                }
            }
        };
        load();
    }, [config, language, navigate, setQuestions, wrongQuestions]);

    if (fatalError) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8 text-center space-y-6">
                <div className="text-6xl">⚠️</div>
                <h2 className="text-3xl text-red-500 font-bold">ERROR</h2>
                <p className="text-xl">{fatalError}</p>
                <button
                    onClick={() => navigate('/')}
                    className="bg-white text-black font-bold py-3 px-8 rounded hover:bg-gray-200"
                >
                    RETURN HOME
                </button>
            </div>
        )
    }

    const currentQ = questions[currentQuestionIndex];

    const handleAnswer = (selectedIndex: number) => {
        if (isInteractionDisabled) return;
        setInteractionDisabled(true);

        // Determine the label of the selected option
        const rawOption = currentQ.options[selectedIndex];
        const parts = rawOption.split(':');
        const hasExplicitLabel = parts.length > 1 && parts[0].length < 5;
        const selectedOptionLabel = hasExplicitLabel
            ? parts[0].trim()
            : String.fromCharCode(65 + selectedIndex);

        const isCorrect = currentQ.correctAnswer.includes(selectedOptionLabel);

        if (isCorrect) {
            setAvatarState('captured');
            setShowCelebration(true); // Trigger celebration effect
            incrementScore(currentQ.points || 10);
            // unlockAvatar(currentQ.avatarSeed); // REMOVED: No longer capturing enemy avatars
            // sessionCollectedAvatars.current.push(currentQ.avatarSeed); // REMOVED

            // If in Retry Mode, track as Corrected
            if (config?.mode === 'retry') {
                sessionCorrectedIds.current.push(currentQ.id);
            }

        } else {
            setAvatarState('escaped');
            // Track Wrong Answer
            sessionWrongIds.current.push(currentQ.id);
        }

        setTimeout(() => {
            // Use currentQuestionIndex from scope? 
            // Warning: currentQuestionIndex might be stale if it changed (it shouldn't have).
            // But questions.length is constant for the session.
            // Better to check if we are at the end.
            const isLastQuestion = currentQuestionIndex + 1 >= questions.length;

            if (isLastQuestion) {
                finishGame();
            } else {
                nextQuestion();
                setAvatarState('idle');
                setInteractionDisabled(false);
                setShowHint(false); // Reset Hint
                setShowCelebration(false); // Reset celebration
            }
        }, 2000);
    };

    const finishGame = () => {
        // Calculate new Last Index (only for sequential mode)
        let newLastIndex = undefined;
        if (config?.mode === 'sequential') {
            newLastIndex = (config.startIndex || 0) + (currentQuestionIndex + 1);
            // Note: currentQuestionIndex is 0-based index WITHIN current set. 
            // So if started at 10, and played 5 questions (index 0-4), we ended at 10+5 = 15.
        }

        // IMPORTANT: Read latest score directly from store to avoid stale closure
        const finalScore = useGameStore.getState().score;

        navigate('/results', {
            state: {
                score: finalScore,
                total: questions.length,
                sessionCollectedAvatars: sessionCollectedAvatars.current,
                sessionWrongIds: sessionWrongIds.current,
                sessionCorrectedIds: sessionCorrectedIds.current,
                newLastIndex
            }
        });
    };

    if (!currentQ) return (
        <div className="min-h-screen text-white flex items-center justify-center">
            <Loader2 className="animate-spin w-12 h-12 text-yellow-500" />
        </div>
    );

    return (
        <ImageDragProvider>
            <div className="min-h-screen text-white flex flex-col items-center py-4 px-4 relative overflow-hidden">
                <ImageOverlayLayer resetKey={currentQuestionIndex} />
                <div className="game-container flex flex-col flex-grow relative z-10 p-2 pt-2" style={{ height: '100%' }}>
                    {/* Header - Stays Top */}
                    <header className="w-full flex justify-between items-center mb-2 text-lg md:text-xl lg:text-2xl font-bold bg-black/40 p-2 rounded-lg border-2 border-white/20 backdrop-blur-md">
                        <div className="flex items-center gap-2">
                            {/* Back Button */}
                            <button
                                onClick={() => {
                                    if (currentQuestionIndex > 0) {
                                        prevQuestion();
                                        setAvatarState('idle');
                                        setShowHint(false);
                                        setShowCelebration(false);
                                        setInteractionDisabled(false);
                                    }
                                }}
                                disabled={currentQuestionIndex === 0 || isInteractionDisabled}
                                className={`p-1 md:p-2 rounded-lg border-2 transition-all ${currentQuestionIndex === 0 || isInteractionDisabled
                                    ? 'opacity-30 cursor-not-allowed border-gray-600'
                                    : 'border-white/50 hover:bg-white/20 hover:border-white active:scale-95'
                                    }`}
                                title="Go back to previous question"
                            >
                                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                            <span>Q: {currentQuestionIndex + 1} / {questions.length}</span>
                        </div>
                        <span className="text-yellow-400">SCORE: {pointsEarnedInRun}</span>
                    </header>

                    {/* Main Content Flex - Dynamic Fluid 3-Column Layout */}
                    <div className={`flex-grow flex flex-row w-full mx-auto transition-all duration-500 ease-in-out gap-4 ${showHint && currentQ.hint ? 'px-1 lg:px-2' : 'px-4 lg:px-8'}`}>

                        {/* LEFT COLUMN: AVATAR 
                            - Desktop (lg+): 15% normally, icon when hint visible
                            - Tablet/iPad: 20% always
                        */}
                        <div className={`flex flex-col justify-start items-center lg:items-start relative pt-1 transition-all duration-500 ease-in-out 
                            ${showHint && currentQ.hint
                                ? 'w-[15%] md:w-[18%] lg:w-[80px] xl:w-[100px]'
                                : 'w-[20%] lg:w-[15%]'
                            }`}>
                            <div className={`bg-gray-800/80 border-4 lg:border-8 border-gray-700 shadow-2xl overflow-hidden relative flex items-end justify-center p-0 transition-all duration-500
                                ${showHint && currentQ.hint
                                    ? 'w-full aspect-square rounded-full lg:rounded-2xl'
                                    : 'w-full aspect-[3/4] rounded-[2rem] lg:rounded-[3rem]'
                                }`}>
                                <AvatarDisplay imageUrl={avatarUrl} state={avatarState} />
                            </div>
                        </div>

                        {/* CENTER COLUMN: QUESTION (Dynamic Width) */}
                        <div className={`flex flex-col justify-start pt-1 relative z-20 h-full transition-all duration-500 ease-in-out 
                            ${showHint && currentQ.hint
                                ? 'w-[55%] md:w-[50%] lg:w-[60%]'
                                : 'w-[80%] lg:w-[85%]'
                            }`}>
                            <QuestionCard
                                title={currentQ.title}
                                options={currentQ.options}
                                disabled={isInteractionDisabled}
                                onAnswer={handleAnswer}
                                onShowSolution={() => setShowSolution(true)}
                                onShowHint={() => setShowHint(true)}
                                hasHint={!!currentQ.hint}
                            />
                        </div>

                        {/* RIGHT COLUMN: HINT (Content-adaptive or 0) */}
                        <div className={`flex flex-col justify-start pt-1 relative transition-all duration-500 ease-in-out overflow-hidden 
                            ${showHint && currentQ.hint
                                ? 'w-[30%] md:w-[32%] lg:w-[28%] opacity-100'
                                : 'w-[0%] opacity-0'
                            }`}>
                            {showHint && currentQ.hint ? (
                                <div className="w-full h-full">
                                    <HintCard
                                        hint={currentQ.hint}
                                        onClose={() => setShowHint(false)}
                                    />
                                </div>
                            ) : (
                                /* Spacer to maintain layout balance */
                                <div className="w-full h-full" />
                            )}
                        </div>

                    </div>
                </div>


                {/* Modal - Outside of transform to ensure it overlays correctly/remains interactive? 
                Actually, usually modals are portal-ed or absolute centered. 
                If we keep it inside, it will fail to cover the 'real' screen if we scaled the container. 
                But let's keep it here for now as it uses fixed positioning usually (SolutionModal implementation unknown but likely fixed).
            */}
                {showSolution && (
                    <SolutionModal
                        youtubeId={currentQ.solution.youtubeId}
                        start={currentQ.solution.start}
                        end={currentQ.solution.end}
                        onClose={() => setShowSolution(false)}
                    />
                )}

                {/* Sketch Overlay - Should probably also be scaled or it will misalign with the scaled content.
                If it's overlaying the whole screen for drawing, it needs to match the visual content.
                Putting it inside the scaled container makes sure it matches.
            */}
                <SketchOverlay resetKey={currentQuestionIndex} />

                {/* Celebration Effect for Correct Answers */}
                {showCelebration && <CelebrationEffect onComplete={() => setShowCelebration(false)} />}
            </div>
        </ImageDragProvider>
    );
};

export default GameBoard;
