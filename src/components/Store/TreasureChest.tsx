import { useState, useEffect } from 'react';

interface TreasureChestProps {
    isOpen: boolean;
    onOpen: () => void;
    onReset?: () => void;
    resultType?: 'new' | 'duplicate' | null;
    prizeImage?: string;
    rarity?: string;
}

const TreasureChest = ({ isOpen, onOpen, onReset, resultType, prizeImage, rarity }: TreasureChestProps) => {
    const [animState, setAnimState] = useState<'idle' | 'shaking' | 'open'>('idle');

    useEffect(() => {
        if (isOpen && animState === 'idle') {
            setAnimState('shaking');
            // Shake for 1.5s then open
            const timer = setTimeout(() => {
                setAnimState('open');
                if (onOpen) onOpen();
            }, 1500);
            return () => clearTimeout(timer);
        }
        if (!isOpen && animState !== 'idle') {
            setAnimState('idle');
        }
    }, [isOpen]);

    return (
        <div className="flex flex-col items-center justify-center p-8 min-h-[400px]">
            {/* Chest Animation Container */}
            <div className={`
                relative w-64 h-64 transition-transform duration-300
                ${animState === 'shaking' ? 'animate-shake' : ''}
            `}>
                {animState !== 'open' ? (
                    // CLOSED CHEST (Pixel Art)
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="w-48 h-32 bg-yellow-700 border-4 border-yellow-900 shadow-xl relative cursor-pointer"
                            onClick={() => {/* Trigger via parent */ }}>
                            {/* Lid */}
                            <div className="absolute -top-12 left-0 w-full h-12 bg-yellow-600 border-4 border-yellow-900 rounded-t-lg"></div>
                            {/* Lock */}
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-10 bg-yellow-400 border-2 border-black"></div>
                        </div>
                    </div>
                ) : (
                    // OPEN CHEST - SCALED UP CONTENT
                    <div className="relative w-full h-full flex flex-col items-center animate-pop-in">
                        {/* Light Beams */}
                        <div className="absolute inset-0 bg-yellow-400/20 blur-xl scale-[3] animate-pulse rounded-full"></div>

                        {/* Result Content */}
                        <div className="z-10 flex flex-col items-center min-w-[600px] -mt-32">
                            {resultType === 'new' && prizeImage && (
                                <>
                                    <h3 className="text-6xl text-yellow-300 font-bold mb-8 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] animate-bounce-slow text-center tracking-wider">
                                        NEW FRIEND!
                                    </h3>

                                    <div className="relative group perspective-1000">
                                        <img
                                            src={(() => {
                                                const rawUrl = prizeImage;
                                                if (rawUrl.includes('drive.google.com') && rawUrl.includes('/file/d/')) {
                                                    const matches = rawUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
                                                    if (matches && matches[1]) {
                                                        return `https://drive.google.com/thumbnail?id=${matches[1]}&sz=w1000`;
                                                    }
                                                }
                                                return rawUrl;
                                            })()}
                                            className="w-[28rem] h-[36rem] object-contain border-8 border-white shadow-2xl rounded-2xl bg-black/50 transform transition-transform duration-500 hover:scale-105"
                                            alt="Prize"
                                        />
                                        {/* Shine effect */}
                                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/20 to-transparent pointer-events-none"></div>
                                    </div>

                                    {rarity && (
                                        <div className="mt-8 px-8 py-3 bg-black/60 border-2 border-yellow-500 rounded-full backdrop-blur-sm">
                                            <span className="text-4xl text-yellow-400 font-vt323 tracking-widest uppercase drop-shadow-md">
                                                {rarity}
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}

                            {resultType === 'duplicate' && (
                                <div className="text-center mt-12">
                                    <h3 className="text-5xl text-gray-400 font-bold mb-6">DUPLICATE...</h3>
                                    <div className="text-9xl animate-pulse my-8">💨</div>
                                    <p className="text-3xl text-white mt-4 font-vt323">The chest was empty!</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Close Button when done */}
            {
                animState === 'open' && (
                    <button
                        onClick={onReset}
                        className="mt-[28rem] px-12 py-4 bg-red-600 text-white text-2xl font-bold border-4 border-red-800 hover:bg-red-500 active:translate-y-1 transition-all shadow-lg rounded"
                    >
                        CLOSE
                    </button>
                )
            }

            <style>{`
                @keyframes shake {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(-5deg); }
                    75% { transform: rotate(5deg); }
                }
                .animate-shake {
                    animation: shake 0.2s cubic-bezier(.36,.07,.19,.97) both infinite;
                }
                .animate-pop-in {
                    animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                }
                @keyframes popIn {
                    from { transform: scale(0); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-bounce-slow {
                    animation: bounce 2s infinite;
                }
            `}</style>
        </div >
    );
};

export default TreasureChest;
