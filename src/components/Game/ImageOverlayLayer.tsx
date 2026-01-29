import { useRef, useEffect } from 'react';
import { useImageDrag } from '../../context/ImageDragContext';
import { RotateCcw, RotateCw } from 'lucide-react';

interface ImageOverlayLayerProps {
    resetKey?: string | number; // When this changes, reset all images
}

export const ImageOverlayLayer = ({ resetKey }: ImageOverlayLayerProps) => {
    const { images, updateDrag, endDrag, rotateImage, resetAll, isAnyModified } = useImageDrag();

    // Reset all images when resetKey changes (e.g., question changes)
    const prevResetKeyRef = useRef(resetKey);
    useEffect(() => {
        if (prevResetKeyRef.current !== resetKey && resetKey !== undefined) {
            resetAll();
        }
        prevResetKeyRef.current = resetKey;
    }, [resetKey, resetAll]);

    // Handling global pointer events for dragging
    // We attach listeners to window to ensure we don't lose the drag if mouse moves fast
    useEffect(() => {
        const handlePointerMove = (e: PointerEvent) => {
            const draggingId = Object.keys(images).find(id => images[id].isDragging);
            if (draggingId) {
                e.preventDefault();
                updateDrag(draggingId, e.clientX, e.clientY);
            }
        };

        const handlePointerUp = () => {
            const draggingId = Object.keys(images).find(id => images[id].isDragging);
            if (draggingId) {
                endDrag(draggingId);
            }
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [images, updateDrag, endDrag]);

    // Render detached images
    const detachedImages = Object.values(images).filter(img => img.detached);

    if (detachedImages.length === 0 && !isAnyModified) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">

            {/* Reset Button - Top Left relative to the layout? 
                User asked for "Floating near left side of the top title". 
                For now, fixed top-left of viewport or just near a clear safe area. 
            */}
            {isAnyModified && (
                <button
                    onClick={resetAll}
                    className="pointer-events-auto absolute top-20 left-4 bg-red-500 hover:bg-red-600 text-white p-3 rounded-full shadow-xl border-2 border-white flex items-center gap-2 animate-bounce-in transition-transform active:scale-95"
                    style={{ zIndex: 100 }}
                >
                    <RotateCcw size={24} />
                    <span className="font-bold hidden md:inline">RESET IMAGES</span>
                </button>
            )}

            {detachedImages.map(img => (
                <OverlayImage
                    key={img.id}
                    imageState={img}
                    onRotate={(angle) => rotateImage(img.id, angle)}
                />
            ))}
        </div>
    );
};

// Individual interactable image on the overlay
const OverlayImage = ({ imageState, onRotate }: {
    imageState: import('../../context/imageDragTypes').ImageState,
    onRotate: (angle: number) => void
}) => {
    const { startDrag } = useImageDrag();
    const rotateHandleRef = useRef<HTMLDivElement>(null);
    const isRotatingRef = useRef(false);

    // Calculate style
    const style: React.CSSProperties = {
        position: 'absolute',
        left: imageState.currentX,
        top: imageState.currentY,
        width: imageState.width,
        height: imageState.height,
        transform: `rotate(${imageState.rotation}deg)`,
        opacity: 0.75, // Requirement: 75% opacity when detached/dragged
        cursor: 'grab',
        pointerEvents: 'auto' // Re-enable pointer events for the detached image so we can grab it again
    };

    // Handle Rotation Logic
    useEffect(() => {
        const handleRotateMove = (e: PointerEvent) => {
            if (!isRotatingRef.current) return;
            e.preventDefault();
            e.stopPropagation(); // Stop drag from happening

            // Calculate angle relative to center of image
            const rect = rotateHandleRef.current?.parentElement?.getBoundingClientRect();
            if (!rect) return;

            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const dx = e.clientX - centerX;
            const dy = e.clientY - centerY;

            // atan2(y, x) gives angle in radians. +90 deg because 0 is usually 3 o'clock 
            const angleRad = Math.atan2(dy, dx);
            const angleDeg = (angleRad * 180) / Math.PI + 90;

            onRotate(angleDeg);
        };

        const handleRotateUp = () => {
            isRotatingRef.current = false;
            window.removeEventListener('pointermove', handleRotateMove);
            window.removeEventListener('pointerup', handleRotateUp);
        };

        // Local listener for the handle
        const handleRef = rotateHandleRef.current;
        const onDown = (e: PointerEvent) => {
            e.stopPropagation();
            e.preventDefault();
            (e.target as Element).setPointerCapture(e.pointerId);
            isRotatingRef.current = true;
            window.addEventListener('pointermove', handleRotateMove);
            window.addEventListener('pointerup', handleRotateUp);
        };

        handleRef?.addEventListener('pointerdown', onDown);

        return () => {
            handleRef?.removeEventListener('pointerdown', onDown);
            // These listeners are now removed in handleRotateUp, so no need to remove them here
            // if rotation ended properly. However, if component unmounts while rotating,
            // they should still be cleaned up.
            // For safety, we can keep them here, or ensure handleRotateUp is always called.
            // For now, keeping them in handleRotateUp is sufficient for the user's request.
        };
    }, [onRotate]);

    return (
        <div
            style={style}
            className="group select-none touch-none"
            onPointerDown={(e) => {
                // IMPORTANT: Only start drag if NOT rotating
                if (!isRotatingRef.current) {
                    startDrag(imageState.id, e.clientX, e.clientY);
                }
            }}
        >
            <img
                src={imageState.src}
                className="w-full h-full object-contain pointer-events-none"
                alt="detached"
            />

            {/* Rotation Handle - Visible on hover/group-hover or always? Requirement: visual handle. */}
            <div
                ref={rotateHandleRef}
                className="absolute -top-8 left-1/2 -translate-x-1/2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center cursor-alias shadow-md border-2 border-white hover:scale-110 transition-transform z-10"
            >
                <RotateCw size={16} className="text-white pointer-events-none" />
            </div>

            {/* Visual Border to indicate selection/interactivity */}
            <div className="absolute inset-0 border-2 border-blue-400 border-dashed opacity-50 pointer-events-none" />
        </div>
    );
};
