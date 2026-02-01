import { PlayCircle, Volume2, VolumeX } from 'lucide-react';
import { useUserStore } from '../../stores/useGameStore';
import { useState, useEffect } from 'react';

interface QuestionCardProps {
    title: string;
    options: string[];
    disabled: boolean;
    onAnswer: (index: number) => void;
    onShowSolution?: () => void;
    onShowHint?: () => void;
    hasHint?: boolean;
    selectedAnswers?: number[]; // indices
}

import { DraggableImage } from './DraggableImage';

const DriveImage = ({ url, alt, className }: { url: string; alt: string; className?: string }) => {
    const [imgSrc, setImgSrc] = useState(url);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setImgSrc(url);
        setHasError(false);
    }, [url]);

    const handleError = () => {
        if (!hasError) {
            const idMatch = url.match(/id=([^&]+)/);
            if (idMatch && idMatch[1]) {
                setImgSrc(`https://drive.google.com/uc?export=view&id=${idMatch[1]}`);
                setHasError(true);
            }
        }
    };

    return (
        <DraggableImage
            src={imgSrc}
            alt={alt}
            className={className}
            referrerPolicy="no-referrer"
            onError={handleError}
        />
    );
};

const QuestionCard = ({
    title,
    options,
    disabled,
    onAnswer,
    onShowSolution,
    onShowHint,
    hasHint,
    selectedAnswers
}: QuestionCardProps) => {
    const { isSoundEnabled, toggleSound } = useUserStore();

    // Helper: Convert Google Drive links to direct image sources
    const getDirectImageUrl = (url: string) => {
        const trimmed = url.trim();

        // Pattern 1: /file/d/ID/...
        // Pattern 2: id=ID (query param)
        let id = '';
        const fileDMatch = trimmed.match(/\/file\/d\/([^/]+)/);
        if (fileDMatch && fileDMatch[1]) {
            id = fileDMatch[1];
        } else {
            const idMatch = trimmed.match(/[?&]id=([^&]+)/);
            if (idMatch && idMatch[1]) {
                id = idMatch[1];
            }
        }

        if (id) {
            return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
        }

        return trimmed;
    };

    return (
        <div className="flex flex-col gap-4 w-full h-full">
            {/* Question Box - Keep reasonable size */}
            <div className="bg-blue-900 border-4 border-white p-6 shadow-lg relative shrink-0">
                {/* Title Parsing: Splits by newline. Checks if line is an image URL. */}
                <div className="text-xl md:text-2xl lg:text-4xl xl:text-6xl leading-relaxed space-y-4">
                    {title.split('\n').map((line, i) => {
                        const trimmed = line.trim();
                        // Use helper
                        const imageUrl = getDirectImageUrl(trimmed);

                        const isImage = trimmed.length > 5 && (
                            imageUrl !== trimmed ||
                            trimmed.match(/\.(jpeg|jpg|gif|png|webp)$/i) ||
                            trimmed.includes('images') ||
                            trimmed.includes('drive.google.com')
                        );

                        if (isImage) {
                            return (
                                <DriveImage
                                    key={i}
                                    url={imageUrl}
                                    alt="Question Attachment"
                                    className="max-h-[20vh] w-auto max-w-[60%] object-contain rounded-md border-2 border-blue-400 mx-auto"
                                />
                            );
                        }
                        return <p key={i} className="text-[clamp(1rem,2vw,1.8rem)]">{line}</p>;
                    })}
                </div>

                {/* Top Right Actions Container */}
                <div className="absolute top-[-20px] right-[-10px] flex gap-2">

                    {/* Sound Toggle */}
                    <button
                        onClick={toggleSound}
                        className={`bg-green-500 text-white px-3 py-1 border-2 border-white flex items-center justify-center p-2 hover:scale-105 active:scale-95 transition-transform ${!isSoundEnabled ? 'bg-gray-500' : ''}`}
                        title={isSoundEnabled ? "Mute Sound" : "Enable Sound"}
                    >
                        {isSoundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
                    </button>

                    {/* Hint Button */}
                    {hasHint && onShowHint && (
                        <button
                            onClick={onShowHint}
                            className={`bg-purple-500 text-white px-3 py-1 border-2 border-white flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform`}
                        >
                            <span className="text-xl font-bold">?</span>
                            <span className="hidden md:inline">HINT</span>
                        </button>
                    )}

                    {/* Solution Button (Audit Mode) */}
                    {onShowSolution && (
                        <button
                            onClick={onShowSolution}
                            className="bg-yellow-400 text-black px-3 py-1 border-2 border-white flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform"
                        >
                            <PlayCircle size={16} />
                            <span className="hidden md:inline">VIDEO</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Options Grid - Grow to fill remaining space */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 lg:gap-4 flex-grow min-h-0">
                {options.map((opt, idx) => {
                    const isSelected = selectedAnswers?.includes(idx);

                    // 1. Detect Label (A:, B:, etc.) within the content
                    const parts = opt.split(':');
                    const likelyHasLabel = parts.length > 1 && parts[0].length < 5;

                    let label = '';
                    let content = opt;

                    if (likelyHasLabel) {
                        label = parts[0] + ':';
                        content = parts.slice(1).join(':').trim();
                    } else {
                        // AUTO-LABEL: Generate A, B, C... if missing
                        label = String.fromCharCode(65 + idx) + ':'; // 65 is 'A'
                    }

                    // 2. Colorful borders per option (child-friendly)
                    const optionColors = [
                        'border-red-500 hover:border-red-400 hover:shadow-red-500/30',      // A
                        'border-blue-500 hover:border-blue-400 hover:shadow-blue-500/30',   // B
                        'border-green-500 hover:border-green-400 hover:shadow-green-500/30', // C
                        'border-orange-500 hover:border-orange-400 hover:shadow-orange-500/30', // D
                        'border-purple-500 hover:border-purple-400 hover:shadow-purple-500/30'  // E
                    ];
                    const labelColors = [
                        'text-red-400',    // A
                        'text-blue-400',   // B
                        'text-green-400',  // C
                        'text-orange-400', // D
                        'text-purple-400'  // E
                    ];
                    const colorClass = optionColors[idx % optionColors.length];
                    const labelColor = labelColors[idx % labelColors.length];

                    // 3. Visual Styles
                    let bgClass = "bg-gray-800/90 hover:bg-gray-700/90";
                    if (isSelected) bgClass = "bg-blue-600";

                    return (
                        <button
                            key={idx}
                            disabled={disabled}
                            onClick={() => onAnswer(idx)}
                            className={`
                                p-1.5 md:p-2 lg:p-3 xl:p-4 text-left border-3 md:border-4 rounded-lg md:rounded-xl
                                transition-all duration-200
                                ${bgClass}
                                ${colorClass}
                                ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] hover:shadow-lg active:scale-95'}
                                flex flex-row items-center gap-2 md:gap-3 h-full
                            `}
                        >
                            {/* Label on the LEFT side */}
                            {label && (
                                <span className={`font-bold text-[clamp(0.9rem,1.8vw,1.8rem)] ${labelColor} shrink-0`}>
                                    {label}
                                </span>
                            )}

                            {/* Content takes remaining space */}
                            <div className="flex-grow flex flex-col items-center justify-center gap-1">
                                {content.split('\n').map((line, i) => {
                                    const trimmed = line.trim();
                                    const imageUrl = getDirectImageUrl(trimmed);

                                    const isImage = trimmed.length > 5 && (
                                        imageUrl !== trimmed || // It was converted by getDirectImageUrl
                                        trimmed.match(/\.(jpeg|jpg|gif|png|webp)$/i) ||
                                        trimmed.includes('images')
                                    );

                                    if (isImage) {
                                        return (
                                            <DriveImage
                                                key={i}
                                                url={imageUrl}
                                                alt={`Option ${idx} part ${i}`}
                                                className="max-h-24 md:max-h-28 lg:max-h-40 xl:max-h-64 object-contain rounded-lg border-2 border-white/20"
                                            />
                                        );
                                    }
                                    return <span key={i} className="text-center w-full text-[clamp(0.7rem,1.3vw,1.3rem)]">{line}</span>;
                                })}
                            </div>
                        </button>
                    );
                })}
            </div>

        </div>
    );
};

export default QuestionCard;
