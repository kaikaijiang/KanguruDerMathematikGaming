import { useEffect, useState, useRef } from 'react';
import SeoWrapper from '../components/SeoWrapper';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGameStore, useUserStore } from '../stores/useGameStore';
import { syncScore } from '../services/api';

interface ResultState {
    score: number;
    total: number;
    sessionCollectedAvatars: string[]; // Question IDs or Seeds
    sessionWrongIds: string[];
    sessionCorrectedIds: string[];
    newLastIndex?: number;
}

const Results = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state as ResultState;

    // Safety check for double-execution (strict mode)
    const hasSaved = useRef(false);

    const { resetGame } = useGameStore();
    const {
        playerId,
        addWrongQuestion,
        removeWrongQuestion,
        setLastIndex,
        unlockAvatar,
        addPoints
    } = useUserStore();

    const [isSyncing, setIsSyncing] = useState(true);

    useEffect(() => {
        const save = async () => {
            if (!state || hasSaved.current) return;
            hasSaved.current = true;

            // 1. Update Local Store first (Optimistic UI)
            state.sessionWrongIds.forEach(id => addWrongQuestion(id));
            state.sessionCorrectedIds.forEach(id => removeWrongQuestion(id));
            state.sessionCollectedAvatars.forEach(id => {
                removeWrongQuestion(id); // Double safety
                unlockAvatar(id);
            });
            if (state.newLastIndex !== undefined) {
                setLastIndex(state.newLastIndex);
            }

            const pointsEarned = useGameStore.getState().pointsEarnedInRun;

            // UPDATE LOCAL BALANCE
            if (pointsEarned > 0) {
                addPoints(pointsEarned);
            }

            console.log('[Results] Attempting to save...', {
                playerId,
                score: state.score,
                points: pointsEarned
            });

            // 2. Sync to Backend
            await syncScore({
                playerId,
                score: state.score,
                pointsEarned: pointsEarned,
                newAvatars: state.sessionCollectedAvatars,
                wrongAnswers: state.sessionWrongIds,
                correctedAnswers: state.sessionCorrectedIds,
                lastIndex: state.newLastIndex
            });

            setIsSyncing(false);
        };
        save();
    }, [playerId, state, addWrongQuestion, removeWrongQuestion, setLastIndex, unlockAvatar, addPoints]);

    const handleHome = () => {
        resetGame();
        navigate('/');
    };

    if (!state) {
        return <div className="p-10 text-white text-center">No Result Data. <button onClick={handleHome} className="underline">Go Home</button></div>;
    }

    const isClear = state.score >= Math.ceil(state.total / 2); // Simple 50% threshold for "Clear"



    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-white p-4">
            <SeoWrapper title="Results" description="Check your quiz results and see your score!" />
            <div className="text-center space-y-8 animate-fade-in">
                <h1 className="text-5xl md:text-7xl font-bold text-yellow-400 mb-4">
                    {isClear ? 'STAGE CLEAR!' : 'NICE TRY!'}
                </h1>

                <div className="text-2xl text-yellow-400 mt-4">
                    +{useGameStore.getState().pointsEarnedInRun} POINTS
                </div>

                <div className="w-full max-w-2xl bg-gray-800 rounded-xl p-8 mb-8">
                    <h2 className="text-3xl mb-8">COLLECTED FRIENDS</h2>
                    <p className="text-6xl text-green-400 font-mono">
                        {state.score} <span className="text-3xl text-white">/ {state.total}</span>
                    </p>
                </div>

                <div className="h-8">
                    {isSyncing ? (
                        <span className="text-blue-300 animate-pulse">SAVING TO CLOUD...</span>
                    ) : (
                        <span className="text-green-500">DATA SAVED ✅</span>
                    )}
                </div>

                <div className="flex flex-col gap-4">
                    <button
                        onClick={() => navigate('/gallery')}
                        className="bg-purple-600 hover:bg-purple-500 px-8 py-4 text-xl border-4 border-white transition-transform active:scale-95"
                    >
                        VIEW STICKER BOOK
                    </button>

                    <button
                        onClick={handleHome}
                        className="bg-blue-600 hover:bg-blue-500 px-8 py-4 text-xl border-4 border-white transition-transform active:scale-95"
                    >
                        PLAY AGAIN
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Results;
