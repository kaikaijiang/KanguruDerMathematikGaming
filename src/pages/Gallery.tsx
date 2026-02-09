import { useEffect, useState } from 'react';
import SeoWrapper from '../components/SeoWrapper';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../stores/useGameStore';
import { fetchGallery, syncScore, type GalleyItem } from '../services/api';
import { ArrowLeft, Loader2 } from 'lucide-react';

const RARITY_ORDER = ['göttlich', 'mythisch', 'legendär', 'episch', 'selten', 'ungewöhnlich', 'Adventure'];

const Gallery = () => {
    const navigate = useNavigate();
    const { playerId, selectedAvatarId, setSelectedAvatar } = useUserStore();
    const [items, setItems] = useState<GalleyItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const handleSelect = async (id: string, url: string) => {
        setSelectedAvatar(id, url);
        // Persist immediately to backend
        await syncScore({
            playerId,
            score: 0, // Placeholder, won't overwrite unless backend handles it carefully. Ideally backend merges.
            newAvatars: [],
            selectedAvatarId: id,
            // Assuming backend will update selectedAvatarId even if other fields are empty/partial
        });
    };

    useEffect(() => {
        if (!playerId) {
            navigate('/');
            return;
        }

        const load = async () => {
            setIsLoading(true);
            const data = await fetchGallery(playerId);
            if (data && data.gallery) {
                setItems(data.gallery);
            }
            setIsLoading(false);
        };
        load();
    }, [playerId, navigate]);

    // Grouping
    const grouped = items.reduce((acc, item) => {
        const r = item.rarity || 'Common';
        if (!acc[r]) acc[r] = [];
        acc[r].push(item);
        return acc;
    }, {} as Record<string, GalleyItem[]>);

    // Sort Keys by Rarity Priority
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
        const idxA = RARITY_ORDER.indexOf(a.toLowerCase());
        const idxB = RARITY_ORDER.indexOf(b.toLowerCase());
        // If one is not found (e.g. unknown rarity), put it at the end
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
    });

    const getDirectUrl = (rawUrl: string) => {
        if (!rawUrl) return '';
        if (rawUrl.includes('drive.google.com') && rawUrl.includes('/file/d/')) {
            const matches = rawUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (matches && matches[1]) {
                return `https://drive.google.com/thumbnail?id=${matches[1]}&sz=w1000`;
            }
        }
        return rawUrl;
    };

    return (
        <div className="min-h-screen text-white p-4 font-vt323">
            <SeoWrapper title="Sticker Gallery" description="View your collection of stickers and achievements." />
            <header className="flex items-center gap-4 mb-8 border-b-4 border-gray-700 pb-4 sticky top-0 bg-gray-900 z-10">
                <button
                    onClick={() => navigate('/')}
                    className="p-2 hover:bg-gray-800 rounded transition-colors"
                >
                    <ArrowLeft size={32} />
                </button>
                <div>
                    <h1 className="text-4xl text-yellow-500 drop-shadow-md">STICKER COLLECTION</h1>
                    <p className="text-gray-400 text-xl uppercase tracking-widest">{playerId}</p>
                </div>
                <div className="ml-auto flex items-center gap-4">
                    <button
                        onClick={() => navigate('/store')}
                        className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded border-2 border-green-400 flex items-center gap-2"
                    >
                        <span>🛍️</span> STORE
                    </button>
                    <div className="bg-gray-800 px-6 py-2 rounded-full border-2 border-yellow-600">
                        <span className="text-2xl text-yellow-400 font-bold">{items.length} FOUND</span>
                    </div>
                </div>
            </header>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-yellow-500 w-16 h-16" />
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-20 opacity-50">
                    <p className="text-4xl mb-4">NO STICKERS YET...</p>
                    <button
                        onClick={() => navigate('/store')}
                        className="bg-yellow-600 text-white px-8 py-3 rounded text-2xl hover:bg-yellow-500"
                    >
                        GO TO SHOP
                    </button>
                </div>
            ) : (
                <div className="space-y-12 pb-20">
                    {sortedKeys.map(rarity => (
                        <div key={rarity} className="animate-fade-in-up">
                            <h2 className="text-3xl mb-6 border-l-8 border-yellow-500 pl-4 uppercase font-bold text-gray-200">
                                {rarity} Collection
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                                {grouped[rarity].map((item, idx) => (
                                    <div key={item.id + idx}
                                        onClick={() => handleSelect(item.id, item.imageUrl || `https://api.dicebear.com/9.x/pixel-art/svg?seed=${item.id}`)}
                                        className={`
                                            relative group
                                            flex flex-col items-center
                                            rounded-xl overflow-hidden
                                            transition-all duration-300
                                            cursor-pointer
                                            ${String(selectedAvatarId) === String(item.id)
                                                ? 'ring-4 ring-green-500 scale-105 z-20 shadow-[0_0_20px_rgba(34,197,94,0.6)]'
                                                : 'hover:scale-105 hover:z-10'
                                            }
                                            ${item.type === 'sticker'
                                                ? 'bg-gradient-to-b from-gray-800 to-black border-2 border-gray-700 shadow-xl'
                                                : 'bg-black border border-gray-800'}
                                        `}
                                    >
                                        {String(selectedAvatarId) === String(item.id) && (
                                            <div className="absolute top-2 right-2 z-30 bg-green-500 text-black text-xs font-bold px-2 py-1 rounded-full shadow">
                                                SELECTED
                                            </div>
                                        )}

                                        <div className="w-full aspect-[3/4] p-4 flex items-center justify-center relative">
                                            {/* Glow Effect for high rarity */}
                                            {['mythisch', 'göttlich', 'legendär'].includes(item.rarity.toLowerCase()) && (
                                                <div className="absolute inset-0 bg-yellow-400/10 blur-xl rounded-full scale-0 group-hover:scale-100 transition-transform duration-500" />
                                            )}

                                            <img
                                                src={item.type === 'sticker' && item.imageUrl
                                                    ? getDirectUrl(item.imageUrl)
                                                    : `https://api.dicebear.com/9.x/pixel-art/svg?seed=${item.id}`
                                                }
                                                alt={item.id}
                                                className={`
                                                    object-contain max-h-full max-w-full drop-shadow-lg
                                                    ${item.type === 'avatar' ? 'image-pixelated opacity-80' : ''}
                                                `}
                                            />
                                        </div>

                                        <div className="w-full py-2 bg-black/50 text-center border-t border-gray-800">
                                            <span className={`
                                                text-sm uppercase tracking-wider
                                                ${item.type === 'sticker' ? 'text-yellow-500 font-bold' : 'text-gray-500'}
                                            `}>
                                                {item.name || (item.type === 'sticker' ? 'Sticker' : 'Pixel Art')}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Gallery;
