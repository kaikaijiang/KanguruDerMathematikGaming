import { useState, useRef, useEffect } from 'react';
import { X, PlayCircle, PauseCircle } from 'lucide-react';

interface HintProps {
    hint: {
        text: string;
        type: 'gif' | 'drag-drop' | 'drag-copy-drop';
        background?: string;
        items: Array<{ id: string; src: string }>;
    };
    onClose: () => void;
}

interface DraggableItem {
    id: string; // unique instance id
    src: string;
    x: number;
    y: number;
    isDragging: boolean;
    originalId?: string; // for copy mode to track origin
}

const HintCard = ({ hint, onClose }: HintProps) => {
    // GIF State
    const [isPlaying, setIsPlaying] = useState(false);

    // Drag State
    const [items, setItems] = useState<DraggableItem[]>([]);
    const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const draggedItemId = useRef<string | null>(null);

    // Initialize Items
    useEffect(() => {
        // Map initial items
        // For 'drag-copy-drop', we show the "source" items.
        // For 'drag-drop', we show the items ready to be moved.

        // Let's create initial state. 
        // We'll place them in a grid or row initially inside the card.
        if (hint.items) {
            const initialItems = hint.items.map((item, index) => ({
                id: `init-${item.id}`,
                originalId: item.id, // Keep track of data source
                src: item.src,
                x: 20 + (index * 80), // Simple initial layout
                y: 20,
                isDragging: false
            }));
            setItems(initialItems);
        }
    }, [hint]);


    // Global Drag Handlers
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!draggedItemId.current) return;

            setItems(prev => prev.map(item => {
                if (item.id === draggedItemId.current) {
                    return {
                        ...item,
                        x: e.clientX - dragOffset.current.x,
                        y: e.clientY - dragOffset.current.y
                    };
                }
                return item;
            }));
        };

        const handleMouseUp = () => {
            if (draggedItemId.current) {
                // Stop dragging
                setItems(prev => prev.map(item =>
                    item.id === draggedItemId.current
                        ? { ...item, isDragging: false }
                        : item
                ));
                draggedItemId.current = null;
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const startDrag = (e: React.MouseEvent, item: DraggableItem, isCopyMode: boolean) => {
        e.preventDefault();
        const rect = (e.target as HTMLElement).getBoundingClientRect();

        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        if (isCopyMode && !item.id.startsWith('copy-')) {
            // Create a COPY
            const newId = `copy-${item.originalId}-${Date.now()}`;
            const newItem: DraggableItem = {
                id: newId,
                originalId: item.originalId,
                src: item.src,
                x: e.clientX - offsetX,
                y: e.clientY - offsetY,
                isDragging: true
            };

            setItems(prev => [...prev, newItem]);
            draggedItemId.current = newId;
            dragOffset.current = { x: offsetX, y: offsetY };

        } else {
            // Move Existing
            draggedItemId.current = item.id;
            dragOffset.current = { x: offsetX, y: offsetY };

            setItems(prev => prev.map(i =>
                i.id === item.id ? { ...i, isDragging: true } : i
            ));
        }
    };

    // Drive Image Helper (Duplicate from QuestionCard - should be shared util eventually)
    const getDirectImageUrl = (url: string) => {
        const trimmed = url.trim();
        let id = '';
        const fileDMatch = trimmed.match(/\/file\/d\/([^/]+)/);
        if (fileDMatch && fileDMatch[1]) id = fileDMatch[1];
        else {
            const idMatch = trimmed.match(/[?&]id=([^&]+)/);
            if (idMatch && idMatch[1]) id = idMatch[1];
        }
        if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
        return trimmed;
    };


    return (
        <div className="h-full flex flex-col bg-emerald-900/90 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl relative text-white overflow-hidden">
            {/* Header Section */}
            <div className="p-4 md:p-6 pb-3 md:pb-4 flex items-start gap-3 md:gap-4">
                {/* Icon Box */}
                <div className="bg-white rounded-xl md:rounded-2xl p-2 md:p-3 shrink-0 shadow-lg">
                    <div className="text-emerald-800">
                        {/* Using a Lightbulb or similar icon to match 'Hint' context, distinct from store icon in reference but matching style */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="md:w-8 md:h-8"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2 1.5-3.5 0-3-2.5-5.5-5-5.5S7.5 5 7.5 8c0 1.5.5 2.5 1.5 3.5.8.8 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" /></svg>
                    </div>
                </div>

                {/* Title Text */}
                <div className="flex-grow pt-1 pr-10 md:pr-12">
                    <h4 className="text-emerald-300 font-bold tracking-[0.2em] uppercase mb-1 text-[clamp(0.5rem,1vw,0.8rem)]">💡 HINT</h4>
                    <h3 className="font-bold leading-tight text-white text-[clamp(0.9rem,1.5vw,1.3rem)]">A Tip</h3>
                </div>

                {/* Close/Action Button - Absolute Position to ensure visibility */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 bg-emerald-800/80 hover:bg-emerald-700 p-2 rounded-full transition-colors text-white/80 hover:text-white border-2 border-emerald-600"
                >
                    <X size={24} className="lg:w-8 lg:h-8" />
                </button>
            </div>

            {/* Separator Line */}
            <div className="px-6">
                <div className="h-px w-full bg-white/20"></div>
            </div>

            {/* Content */}
            <div className="p-6 flex-grow flex flex-col gap-6 overflow-y-auto max-h-[80vh] scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                <p className="leading-relaxed whitespace-pre-wrap font-medium text-emerald-50 drop-shadow-sm text-[clamp(0.9rem,1.5vw,1.4rem)]">{hint.text}</p>

                {/* Interactive Area - Only show if there are items to display */}
                {hint.items && hint.items.length > 0 && (
                    <div
                        className="flex-grow bg-black/20 border-2 border-dashed border-white/30 rounded-2xl relative overflow-hidden min-h-[300px]"
                        style={{
                            backgroundImage: hint.background ? `url(${getDirectImageUrl(hint.background)})` : 'none',
                            backgroundSize: 'contain',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                        }}
                    >
                        {/* GIF MODE */}
                        {hint.type === 'gif' && hint.items.length > 0 && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div
                                    className="relative cursor-pointer group w-full h-full flex items-center justify-center"
                                    onClick={() => setIsPlaying(!isPlaying)}
                                >
                                    <img
                                        src={getDirectImageUrl(hint.items[0].src)}
                                        className={`max-w-[90%] max-h-[90%] object-contain rounded-lg shadow-lg ${isPlaying ? '' : 'grayscale opacity-80'}`}
                                        alt="Hint GIF"
                                    />
                                    {!isPlaying && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <PlayCircle size={64} className="text-white drop-shadow-2xl opacity-90 group-hover:scale-110 transition-transform" />
                                        </div>
                                    )}
                                    {isPlaying && (
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <PauseCircle size={40} className="text-white drop-shadow-lg" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* DRAG MODES */}
                        {(hint.type === 'drag-drop' || hint.type === 'drag-copy-drop') && (
                            <div className="p-4 w-full h-full">
                                {items.map(item => {
                                    const isSourceItem = !item.id.startsWith('copy-') && hint.type === 'drag-copy-drop';

                                    if (isSourceItem) {
                                        return (
                                            <div
                                                key={item.id}
                                                className="inline-block m-2 cursor-grab active:cursor-grabbing border-2 border-white/50 hover:border-white rounded-xl transition-all shadow-md bg-white/10 backdrop-blur-sm p-1"
                                                onMouseDown={(e) => startDrag(e, item, true)}
                                            >
                                                <img src={getDirectImageUrl(item.src)} className="w-20 h-20 object-contain pointer-events-none" />
                                            </div>
                                        )
                                    }

                                    return (
                                        <div
                                            key={item.id}
                                            style={{
                                                position: 'fixed',
                                                left: item.x,
                                                top: item.y,
                                                zIndex: 9999,
                                                pointerEvents: item.isDragging ? 'none' : 'auto',
                                                cursor: 'grab'
                                            }}
                                            onMouseDown={(e) => startDrag(e, item, false)}
                                        >
                                            <img src={getDirectImageUrl(item.src)} className="w-24 h-24 object-contain pointer-events-none drop-shadow-2xl" />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HintCard;
