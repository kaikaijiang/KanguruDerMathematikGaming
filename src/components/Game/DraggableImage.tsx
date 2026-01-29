import { useRef, useEffect, useId, useState } from 'react';
import { useImageDrag } from '../../context/ImageDragContext';

interface DraggableImageProps {
    src: string;
    alt: string;
    className?: string;
    referrerPolicy?: React.HTMLAttributeReferrerPolicy;
    onError?: () => void;
}

const LONG_PRESS_DURATION = 300; // milliseconds for long press

export const DraggableImage = ({ src, alt, className, referrerPolicy, onError }: DraggableImageProps) => {
    const id = useId(); // Generate unique ID for this image instance
    const imgRef = useRef<HTMLImageElement>(null);
    const { registerImage, startDrag, images } = useImageDrag();

    const isDetached = images[id]?.detached;

    // Long press state
    const [isLongPressing, setIsLongPressing] = useState(false);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pointerStartRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);

    useEffect(() => {
        if (imgRef.current && src) {
            registerImage(id, src, imgRef.current);
        }
    }, [id, src, registerImage]);

    // Handle resize to update coordinates
    useEffect(() => {
        const handleResize = () => {
            if (imgRef.current && src) {
                registerImage(id, src, imgRef.current);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [id, src, registerImage]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
            }
        };
    }, []);

    const startPosRef = useRef<{ x: number, y: number } | null>(null);

    const handlePointerDown = (e: React.PointerEvent) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        startPosRef.current = { x: e.clientX, y: e.clientY };
        pointerStartRef.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };

        // Force update position one last time before dragging starts to ensure accuracy
        if (imgRef.current) {
            registerImage(id, src, imgRef.current);
        }

        // Check if it's a touch event (pointerType === 'touch') - use long press
        // For mouse, start drag immediately
        if (e.pointerType === 'touch') {
            // Start long press timer
            setIsLongPressing(false);
            longPressTimerRef.current = setTimeout(() => {
                setIsLongPressing(true);
                startDrag(id, e.clientX, e.clientY);
            }, LONG_PRESS_DURATION);
        } else {
            // Mouse - start drag immediately
            startDrag(id, e.clientX, e.clientY);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        // If user moves too much during long press wait, cancel the long press
        if (pointerStartRef.current && longPressTimerRef.current) {
            const dist = Math.hypot(
                e.clientX - pointerStartRef.current.x,
                e.clientY - pointerStartRef.current.y
            );
            if (dist > 10) {
                // Cancel long press - user is trying to scroll or swipe
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
                setIsLongPressing(false);
            }
        }
    };

    const handlePointerUp = () => {
        // Cancel any pending long press
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        setIsLongPressing(false);
        pointerStartRef.current = null;
    };

    const handleClick = (e: React.MouseEvent) => {
        if (startPosRef.current) {
            const dist = Math.hypot(e.clientX - startPosRef.current.x, e.clientY - startPosRef.current.y);
            if (dist > 5) {
                // It was a drag, not a click. Prevent bubbling to the button.
                e.stopPropagation();
                e.preventDefault();
            }
        }
        startPosRef.current = null;
    };

    return (
        <img
            ref={imgRef}
            src={src}
            alt={alt}
            draggable={false}
            className={`${className || ''} ${isDetached ? 'opacity-0' : 'opacity-100'} ${isLongPressing ? 'scale-105' : ''} transition-all select-none touch-none`}
            referrerPolicy={referrerPolicy}
            onError={onError}
            onLoad={() => {
                if (imgRef.current) registerImage(id, src, imgRef.current);
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onClick={handleClick}
            style={{ touchAction: 'none', cursor: 'grab' }}
        />
    );
};
