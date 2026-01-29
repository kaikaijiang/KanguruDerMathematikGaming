/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { ImageState } from './imageDragTypes';

interface ImageDragContextType {
    images: Record<string, ImageState>;
    registerImage: (id: string, src: string, element: HTMLImageElement | null) => void;
    startDrag: (id: string, startX: number, startY: number) => void;
    updateDrag: (id: string, deltaX: number, deltaY: number) => void;
    endDrag: (id: string) => void;
    rotateImage: (id: string, angle: number) => void;
    resetAll: () => void;
    isAnyModified: boolean;
}

const ImageDragContext = createContext<ImageDragContextType | null>(null);

export const ImageDragProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [images, setImages] = useState<Record<string, ImageState>>({});
    const dragStartRef = useRef<{ id: string, startX: number, startY: number, initialImgX: number, initialImgY: number } | null>(null);

    const registerImage = useCallback((id: string, src: string, element: HTMLImageElement | null) => {
        if (!element) return;
        const rect = element.getBoundingClientRect();

        setImages(prev => {
            const existing = prev[id];

            // If exists and dimensions/pos are roughly the same, skip update to avoid loops
            if (existing &&
                Math.abs((existing.originalRect?.left ?? 0) - rect.left) < 1 &&
                Math.abs((existing.originalRect?.top ?? 0) - rect.top) < 1 &&
                Math.abs(existing.width - rect.width) < 1 &&
                Math.abs(existing.height - rect.height) < 1
            ) {
                return prev;
            }

            // If src changed (e.g. new question loaded reusing the same component), reset state
            const isNewSource = existing && existing.src !== src;

            return {
                ...prev,
                [id]: {
                    id,
                    originalRect: rect,
                    currentX: rect.left,
                    currentY: rect.top,
                    rotation: (existing && !isNewSource) ? existing.rotation : 0,
                    isDragging: (existing && !isNewSource) ? existing.isDragging : false,
                    src,
                    detached: (existing && !isNewSource) ? existing.detached : false,
                    width: rect.width,
                    height: rect.height
                }
            };
        });
    }, []);

    const startDrag = useCallback((id: string, clientX: number, clientY: number) => {
        setImages(prev => {
            const img = prev[id];
            if (!img) return prev;

            dragStartRef.current = {
                id,
                startX: clientX,
                startY: clientY,
                initialImgX: img.currentX,
                initialImgY: img.currentY
            };

            return {
                ...prev,
                [id]: { ...img, isDragging: true, detached: true }
            };
        });
    }, []);

    const updateDrag = useCallback((id: string, clientX: number, clientY: number) => {
        // We rely on the dragStartRef for delta calculation to avoid stale closures if we used state directly
        if (!dragStartRef.current || dragStartRef.current.id !== id) return;

        const { startX, startY, initialImgX, initialImgY } = dragStartRef.current;
        const deltaX = clientX - startX;
        const deltaY = clientY - startY;

        setImages(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                currentX: initialImgX + deltaX,
                currentY: initialImgY + deltaY
            }
        }));
    }, []);

    const endDrag = useCallback((id: string) => {
        dragStartRef.current = null;
        setImages(prev => ({
            ...prev,
            [id]: { ...prev[id], isDragging: false }
        }));
    }, []);

    const rotateImage = useCallback((id: string, angle: number) => {
        setImages(prev => ({
            ...prev,
            [id]: { ...prev[id], rotation: angle, detached: true }
        }));
    }, []);

    const resetAll = useCallback(() => {
        setImages(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(key => {
                const img = next[key];
                // We don't really 'move' the original rect, but we reset current pos to it
                if (img.originalRect) {
                    next[key] = {
                        ...img,
                        currentX: img.originalRect.left,
                        currentY: img.originalRect.top,
                        rotation: 0,
                        detached: false,
                        isDragging: false
                    };
                }
            });
            return next;
        });
    }, []);

    // Check if any image is detached or rotated != 0
    const isAnyModified = Object.values(images).some(img => img.detached || img.rotation !== 0);

    return (
        <ImageDragContext.Provider value={{
            images,
            registerImage,
            startDrag,
            updateDrag,
            endDrag,
            rotateImage,
            resetAll,
            isAnyModified
        }}>
            {children}
        </ImageDragContext.Provider>
    );
};

export const useImageDrag = () => {
    const context = useContext(ImageDragContext);
    if (!context) throw new Error("useImageDrag must be used within ImageDragProvider");
    return context;
};
