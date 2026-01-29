export interface ImageState {
    id: string;
    originalRect: DOMRect | null;
    currentX: number;
    currentY: number;
    rotation: number;
    isDragging: boolean;
    src: string;
    detached: boolean; // True if it has been moved from original spot
    width: number;
    height: number;
}
