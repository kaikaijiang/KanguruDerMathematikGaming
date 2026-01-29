import { useEffect, useState } from 'react';

interface AvatarDisplayProps {
    imageUrl: string;
    state: 'idle' | 'captured' | 'escaped';
}

const AvatarDisplay = ({ imageUrl, state }: AvatarDisplayProps) => {
    const [animClass, setAnimClass] = useState('');

    useEffect(() => {
        if (state === 'captured') setAnimClass('animate-bounce'); // Success animation
        if (state === 'escaped') setAnimClass('opacity-50 blur-sm'); // Fail animation
        if (state === 'idle') setAnimClass('');
    }, [state]);

    // Helper to convert Google Drive 'view' links to 'direct' links
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

    const finalUrl = getDirectUrl(imageUrl);

    if (!finalUrl) {
        return (
            <div className={`w-full flex justify-center items-center p-4 relative min-h-[16rem]`}>
                <div className="text-gray-500 animate-pulse">Loading Avatar...</div>
            </div>
        );
    }

    return (
        <div className={`w-full h-full flex justify-center items-end relative overflow-visible transition-all duration-500`}>
            {/* Content */}
            <div className={`relative ${animClass} transition-transform duration-500 w-full h-full flex items-end justify-center`}>
                <img
                    src={finalUrl}
                    alt="Avatar"
                    className="
                        object-contain 
                        w-auto h-[90%] 
                        max-w-full 
                        drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]
                    "
                />
            </div>

            {state === 'captured' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <h2 className="text-[clamp(0.7rem,2.5vw,1.5rem)] text-green-400 font-bold drop-shadow-[0_1px_0_#000] border border-black bg-white px-1.5 md:px-2 py-0.5 md:py-1 rounded-md md:rounded-lg -rotate-12 animate-bounce whitespace-nowrap">GOCHA!</h2>
                </div>
            )}

            {state === 'escaped' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <h2 className="text-[clamp(0.7rem,2.5vw,1.5rem)] text-red-500 font-bold drop-shadow-[0_1px_0_#000] border border-black bg-white px-1.5 md:px-2 py-0.5 md:py-1 rounded-md md:rounded-lg rotate-12 whitespace-nowrap">ESCAPE</h2>
                </div>
            )}
        </div>
    );
};

export default AvatarDisplay;
