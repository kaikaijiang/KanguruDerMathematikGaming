import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../stores/useGameStore';
import { buySticker } from '../../services/api';
import TreasureChest from './TreasureChest';

const RARITIES = [
    { id: 'ungewöhnlich', label: 'Common', price: 5, color: 'bg-green-600 border-green-800' },
    { id: 'selten', label: 'Rare', price: 15, color: 'bg-blue-600 border-blue-800' },
    { id: 'episch', label: 'Epic', price: 30, color: 'bg-purple-600 border-purple-800' },
    { id: 'legendär', label: 'Legendary', price: 25, color: 'bg-orange-500 border-orange-700', isLottery: true },
    { id: 'mythisch', label: 'Mythic', price: 30, color: 'bg-red-600 border-red-800', isLottery: true },
    { id: 'göttlich', label: 'Godly', price: 50, color: 'bg-yellow-500 border-yellow-700', isLottery: true },
];

const StickerStore = ({ onClose }: { onClose: () => void }) => {
    const navigate = useNavigate();
    const { currentBalance, setBalance, unlockAvatar, playerId } = useUserStore();
    const [buyingId, setBuyingId] = useState<string | null>(null);
    const [chestData, setChestData] = useState<{ isOpen: boolean, result?: 'new' | 'duplicate', image?: string, rarity?: string } | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    const handleBuy = async (rarityId: string, price: number) => {
        if (currentBalance < price) {
            setErrorMsg("Not enough points!");
            setTimeout(() => setErrorMsg(''), 2000);
            return;
        }

        setBuyingId(rarityId);

        // Call API
        const res = await buySticker(playerId, rarityId);

        if (res.success) {
            // Deduct Points immediately (visual sync)
            if (typeof res.remainingBalance === 'number') {
                setBalance(res.remainingBalance);
            }

            // Show Chest
            setChestData({
                isOpen: true,
                result: res.outcome,
                image: res.sticker?.imageUrl,
                rarity: res.sticker?.rarity
            });

            // If new, unlock it
            if (res.outcome === 'new' && res.sticker) {
                unlockAvatar(res.sticker.id);
            }
        } else {
            setErrorMsg(res.error || "Purchase failed");
        }
        setBuyingId(null);
    };

    const handleReset = () => {
        setChestData(null);
    };

    // If chest is open, show full screen overlay
    if (chestData) {
        return (
            <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
                <TreasureChest
                    isOpen={chestData.isOpen}
                    onOpen={() => { }}
                    onReset={handleReset}
                    resultType={chestData.result}
                    prizeImage={chestData.image}
                    rarity={chestData.rarity}
                />
            </div>
        );
    }

    return (
        <div className="p-4 w-full h-full overflow-y-auto text-white font-vt323">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 sticky top-0 bg-gray-900/90 backdrop-blur pb-4 border-b border-gray-700 z-10">
                <h1 className="text-4xl text-yellow-400 drop-shadow-[2px_2px_0px_#b91c1c]">STICKER SHOP</h1>
                <div className="flex items-center gap-4">
                    <div className="bg-gray-800 px-4 py-2 rounded border-2 border-yellow-600 flex items-center gap-2">
                        <span className="text-yellow-400 text-2xl">★</span>
                        <span className="text-2xl">{currentBalance}</span>
                    </div>
                    <button onClick={() => navigate('/gallery')} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-xl border-2 border-blue-400 mr-2">
                        STICKERS
                    </button>
                    <button onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xl">
                        EXIT
                    </button>
                </div>
            </div>

            {errorMsg && (
                <div className="bg-red-600 text-white p-4 rounded mb-4 text-center animate-pulse text-xl">
                    {errorMsg}
                </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {RARITIES.map((tier) => (
                    <div
                        key={tier.id}
                        className={`
                            relative overflow-hidden group
                            p-6 rounded-xl border-4 shadow-xl transition-all
                            ${tier.color}
                            ${currentBalance < tier.price ? 'opacity-50 grayscale' : 'hover:scale-105 active:scale-95 cursor-pointer'}
                        `}
                        onClick={() => currentBalance >= tier.price && !buyingId && handleBuy(tier.id, tier.price)}
                    >
                        {/* Background Effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

                        <div className="flex flex-col items-center relative z-10">
                            <h2 className="text-3xl font-bold uppercase mb-2 drop-shadow-md tracking-wider">{tier.label}</h2>

                            {/* Icon Placeholder (Chest or Pack) */}
                            <div className="text-6xl mb-4 drop-shadow-lg">
                                {tier.isLottery ? '🎁' : '📦'}
                            </div>

                            <div className="bg-black/40 px-6 py-2 rounded-full border border-white/20 backdrop-blur-sm">
                                <span className="text-yellow-300 font-bold text-2xl">{tier.price} PTS</span>
                            </div>

                            {tier.isLottery && (
                                <div className="mt-4 text-sm bg-black/30 px-2 py-1 rounded text-center">
                                    Contains mixed rarities!
                                </div>
                            )}
                        </div>

                        {buyingId === tier.id && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                                <div className="animate-spin text-4xl">⌛</div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-12 text-center text-gray-400">
                <p>Collect points by answering questions correctly!</p>
                <p>Duplicate stickers grant nothing but sadness.</p>
            </div>
        </div>
    );
};

export default StickerStore;
