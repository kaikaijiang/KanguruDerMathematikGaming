import { useState, useRef, useEffect } from 'react';
import { Pencil, Eraser, MousePointer2 } from 'lucide-react';

type Tool = 'select' | 'draw' | 'erase';
type BrushColor = 'black' | 'red' | 'blue' | 'green' | 'white' | 'yellow' | 'orange' | 'purple';
type BrushSize = 'small' | 'medium' | 'large';

const COLORS: Record<BrushColor, string> = {
    black: '#000000',
    red: '#EF4444',
    blue: '#3B82F6',
    green: '#22C55E',
    white: '#FFFFFF',
    yellow: '#FFFF00', // Bright Yellow
    orange: '#F97316', // Orange-500
    purple: '#A855F7'  // Purple-500
};

const SIZES: Record<BrushSize, number> = {
    small: 5,
    medium: 12,
    large: 20
};

const ERASER_SIZES: Record<BrushSize, number> = {
    small: 25,
    medium: 60,
    large: 100
};

// Cycle sequences
const COLOR_SEQUENCE: BrushColor[] = ['black', 'red', 'blue', 'green', 'white', 'yellow', 'orange', 'purple'];
const SIZE_SEQUENCE: BrushSize[] = ['small', 'medium', 'large'];

const SketchOverlay = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [tool, setTool] = useState<Tool>('select');
    const [color, setColor] = useState<BrushColor>('black');
    const [brushSize, setBrushSize] = useState<BrushSize>('small');
    const [eraserSize, setEraserSize] = useState<BrushSize>('medium');
    const [isDrawing, setIsDrawing] = useState(false);
    const [expandedTool, setExpandedTool] = useState<Tool | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

    // Toolbar dragging state
    const [toolbarPosition, setToolbarPosition] = useState<{ x: number, y: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartPos = useRef<{ x: number, y: number } | null>(null);

    // Initialize Canvas and handle resize
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const setupCanvas = (restoreContent = false) => {
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();

            let savedContent: ImageData | null = null;
            if (restoreContent && ctxRef.current) {
                try {
                    savedContent = ctxRef.current.getImageData(0, 0, canvas.width, canvas.height);
                } catch (e) {
                    console.error("Failed to save canvas content", e);
                }
            }

            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                // REMOVED ctx.scale(dpr, dpr) to avoid browser inconsistencies
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                if (savedContent) {
                    ctx.putImageData(savedContent, 0, 0);
                }

                ctxRef.current = ctx;
            }
        };

        setupCanvas(false);

        const handleResize = () => {
            setupCanvas(true);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Touch Event Handling (Manual to allow scrolling)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleTouchStart = (e: TouchEvent) => {
            // Allow 2-finger scroll, only capture 1-finger draw
            if (e.touches.length === 1 && tool !== 'select') {
                if (e.cancelable) e.preventDefault();
                startDrawing(e as any);
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 1 && tool !== 'select') {
                if (e.cancelable) e.preventDefault();
                draw(e as any);
            }
        };

        const handleTouchEnd = () => {
            stopDrawing();
        };

        // Passive: false is crucial for preventDefault to work
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd);
        canvas.addEventListener('touchcancel', handleTouchEnd);

        return () => {
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
            canvas.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [tool, isDrawing, color, brushSize, eraserSize]); // Re-bind when state changes to ensure closures are fresh

    // Helper to get current scale factor
    const getScaleFactor = () => {
        const canvas = canvasRef.current;
        if (!canvas) return 1;
        const rect = canvas.getBoundingClientRect();
        return canvas.width / rect.width;
    };

    // Drawing Logic
    const startDrawing = (e: React.MouseEvent | React.TouchEvent | any) => {
        if (tool === 'select') return;
        if (expandedTool) setExpandedTool(null);

        setIsDrawing(true);

        const { x, y } = getCoordinates(e);
        const ctx = ctxRef.current;
        if (!ctx) return;

        const scale = getScaleFactor();

        ctx.beginPath();
        ctx.moveTo(x, y);

        if (tool === 'erase') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = ERASER_SIZES[eraserSize] * scale;
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = COLORS[color];
            ctx.lineWidth = SIZES[brushSize] * scale;
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent | any) => {
        if (!isDrawing || tool === 'select') return;

        const { x, y } = getCoordinates(e);
        const ctx = ctxRef.current;
        if (!ctx) return;

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        ctxRef.current?.closePath();
    };

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent | any) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        // Calculate scale mapping
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let clientX = 0;
        let clientY = 0;

        if ('touches' in e && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if ('changedTouches' in e && e.changedTouches.length > 0) {
            // For touchend/up
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const handleToolClick = (clickedTool: Tool) => {
        setTool(clickedTool);
        if (tool === clickedTool && (clickedTool === 'draw' || clickedTool === 'erase')) {
            setExpandedTool(expandedTool === clickedTool ? null : clickedTool);
        } else {
            setExpandedTool(null);
        }
    };

    const selectColor = (c: BrushColor) => setColor(c);
    const selectBrushSize = (s: BrushSize) => setBrushSize(s);
    const selectEraserSize = (s: BrushSize) => {
        setEraserSize(s);
        setExpandedTool(null);
    };

    // Drag Logic
    const startDragging = (e: React.MouseEvent | React.TouchEvent) => {
        // Prevent dragging if clicking a button (handled by e.target check or ensure buttons stop propagation)
        // But for simplicity, we'll put the handler on the container div itself.
        // We need to differentiate between clicking a button and dragging the bg.
        // The buttons are children, so we can check e.target.
        // If e.target is a button or inside a button, don't drag?
        // Actually, the user might want to drag by grabbing the "frame".
        // Let's assume the user touches the container background.

        // Simple check: if target is a button, ignore.
        const target = e.target as HTMLElement;
        if (target.closest('button')) return;

        setIsDrawing(false); // Stop drawing if dragging toolbar (just in case)
        setIsDragging(true);

        let clientX = 0;
        let clientY = 0;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        // If we haven't positioned yet (it's centered by CSS), we need to set initial pos
        // to current rect.
        if (!toolbarPosition) {
            const toolbar = (e.currentTarget as HTMLElement);
            const rect = toolbar.getBoundingClientRect();
            dragStartPos.current = {
                x: clientX - rect.left,
                y: clientY - rect.top
            };
            setToolbarPosition({ x: rect.left, y: rect.top });
        } else {
            dragStartPos.current = {
                x: clientX - toolbarPosition.x,
                y: clientY - toolbarPosition.y
            };
        }
    };

    const onDragMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging || !dragStartPos.current) return;

        let clientX = 0;
        let clientY = 0;
        if ('touches' in e) {
            const touch = (e as TouchEvent).touches[0];
            clientX = touch.clientX;
            clientY = touch.clientY;
        } else {
            const mouse = (e as MouseEvent);
            clientX = mouse.clientX;
            clientY = mouse.clientY;
        }

        setToolbarPosition({
            x: clientX - dragStartPos.current.x,
            y: clientY - dragStartPos.current.y
        });
    };

    const stopDragging = () => {
        setIsDragging(false);
    };

    // Global listeners for drag move/up to handle dragging outside the element
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', onDragMove);
            window.addEventListener('mouseup', stopDragging);
            window.addEventListener('touchmove', onDragMove, { passive: false });
            window.addEventListener('touchend', stopDragging);
        }
        return () => {
            window.removeEventListener('mousemove', onDragMove);
            window.removeEventListener('mouseup', stopDragging);
            window.removeEventListener('touchmove', onDragMove);
            window.removeEventListener('touchend', stopDragging);
        };
    }, [isDragging, toolbarPosition]);


    return (
        <div className="absolute inset-0 z-50 pointer-events-none">
            {/* Canvas Layer */}
            <canvas
                ref={canvasRef}
                className={`absolute inset-0 w-full h-full ${tool === 'select' ? 'pointer-events-none' : 'pointer-events-auto cursor-crosshair'}`}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
            // REMOVED: onTouchStart={startDrawing} 
            // REMOVED: onTouchMove={draw}
            // REMOVED: onTouchEnd={stopDrawing}
            />

            {/* Floating Toolbar */}
            <div
                onMouseDown={startDragging}
                onTouchStart={startDragging}
                style={toolbarPosition ? {
                    left: toolbarPosition.x,
                    top: toolbarPosition.y,
                    transform: 'none', // Override the -translate-x-1/2 from CSS class if needed
                    bottom: 'auto'
                } : undefined}
                className={`fixed ${!toolbarPosition ? 'top-16 left-8' : ''} flex gap-4 bg-gray-900 border-4 border-white p-2 pointer-events-auto transition-opacity duration-300 ${tool === 'select' ? 'opacity-80 hover:opacity-100' : 'opacity-100'} cursor-move`}
            >

                {/* SELECT TOOL */}
                <button
                    onClick={() => handleToolClick('select')}
                    className={`p-2 border-2 transition-all ${tool === 'select' ? 'bg-yellow-500 border-white text-black translate-y-[-2px] shadow-[2px_2px_0_#000000]' : 'bg-gray-800 border-gray-600'}`}
                >
                    <MousePointer2 size={24} />
                    <span className="sr-only">Select</span>
                </button>

                {/* DRAW TOOL */}
                <div className="relative">
                    {/* Tray */}
                    {expandedTool === 'draw' && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-6 flex flex-col gap-4 bg-gray-800 p-4 border-2 border-white rounded-lg animate-fade-in shadow-xl items-center cursor-default w-max"
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}>
                            {/* Color Row */}
                            <div className="grid grid-cols-4 gap-2">
                                {COLOR_SEQUENCE.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => selectColor(c)}
                                        className={`w-10 h-10 rounded-full border-4 border-white hover:scale-110 transition-transform ${color === c ? 'ring-4 ring-yellow-400 scale-110' : ''}`}
                                        style={{ background: COLORS[c] }}
                                        title={c}
                                    />
                                ))}
                            </div>
                            {/* Size Row */}
                            <div className="flex gap-4 items-center justify-center w-full border-t-2 border-gray-600 pt-4">
                                {SIZE_SEQUENCE.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => selectBrushSize(s)}
                                        className={`rounded-full bg-white hover:bg-gray-200 border-2 border-transparent hover:scale-110 transition-transform ${brushSize === s ? 'border-yellow-400 scale-110' : ''}`}
                                        style={{
                                            width: s === 'large' ? 32 : s === 'medium' ? 24 : 16,
                                            height: s === 'large' ? 32 : s === 'medium' ? 24 : 16
                                        }}
                                        title={s}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => handleToolClick('draw')}
                        className={`p-2 border-2 transition-all flex flex-col items-center gap-1 ${tool === 'draw' ? 'bg-blue-600 border-white text-white translate-y-[-2px] shadow-[2px_2px_0_#000000]' : 'bg-gray-800 border-gray-600'}`}
                    >
                        <div className="relative">
                            <Pencil size={24} />
                            <div className="absolute -bottom-1 -right-1 flex gap-0.5">
                                <div className="w-3 h-3 rounded-full border border-white" style={{ background: COLORS[color] }} />
                                {/* Size indicator dot */}
                                <div className="bg-white rounded-full border border-gray-500" style={{ width: brushSize === 'large' ? 8 : brushSize === 'medium' ? 6 : 4, height: brushSize === 'large' ? 8 : brushSize === 'medium' ? 6 : 4 }} />
                            </div>
                        </div>
                    </button>
                </div>

                {/* ERASE TOOL */}
                <div className="relative">
                    {/* Tray */}
                    {expandedTool === 'erase' && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-6 flex gap-4 bg-gray-800 p-4 border-2 border-white rounded-lg animate-fade-in shadow-xl items-center cursor-default"
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}>
                            {SIZE_SEQUENCE.map(s => (
                                <button
                                    key={s}
                                    onClick={() => selectEraserSize(s)}
                                    className={`rounded-full bg-white hover:bg-gray-200 border-2 border-transparent hover:scale-110 transition-transform ${eraserSize === s ? 'border-yellow-400' : ''}`}
                                    style={{
                                        width: s === 'large' ? 32 : s === 'medium' ? 24 : 16,
                                        height: s === 'large' ? 32 : s === 'medium' ? 24 : 16
                                    }}
                                    title={s}
                                />
                            ))}
                        </div>
                    )}

                    <button
                        onClick={() => handleToolClick('erase')}
                        className={`p-2 border-2 transition-all flex flex-col items-center gap-1 ${tool === 'erase' ? 'bg-red-500 border-white text-white translate-y-[-2px] shadow-[2px_2px_0_#000000]' : 'bg-gray-800 border-gray-600'}`}
                    >
                        <div className="relative">
                            <Eraser size={24} />
                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full" style={{ width: eraserSize === 'large' ? 12 : eraserSize === 'medium' ? 8 : 4, height: eraserSize === 'large' ? 12 : eraserSize === 'medium' ? 8 : 4 }} />
                        </div>
                    </button>
                </div>
            </div>

            {/* Scroll Zone (Right Side) - Allows scrolling when drawing tools are active */}
            {tool !== 'select' && (
                <div
                    className="fixed top-0 bottom-0 right-0 w-12 z-[60] bg-white/5 backdrop-blur-[1px] border-l border-white/10 pointer-events-auto flex flex-col items-center justify-center gap-8 touch-pan-y"
                    title="Scroll Zone"
                >
                    {/* Visual indicators */}
                    <div className="w-1 h-12 bg-white/20 rounded-full" />
                    <div className="writing-vertical-rl text-xs text-white/30 uppercase tracking-widest select-none">Scroll</div>
                    <div className="w-1 h-12 bg-white/20 rounded-full" />
                </div>
            )}
        </div>
    );
};

export default SketchOverlay;
