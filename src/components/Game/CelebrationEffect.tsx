import { useEffect, useState } from 'react';
import { useUserStore } from '../../stores/useGameStore';

interface CelebrationEffectProps {
    onComplete?: () => void;
}

// Particle type for confetti
interface Particle {
    id: number;
    x: number;
    y: number;
    color: string;
    size: number;
    rotation: number;
    velocityX: number;
    velocityY: number;
    type: 'confetti' | 'star' | 'sparkle';
}

const COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#F97316', '#A855F7', '#FFCE00', '#00E5FF'];

const CelebrationEffect = ({ onComplete }: CelebrationEffectProps) => {
    const [particles, setParticles] = useState<Particle[]>([]);
    const [isVisible, setIsVisible] = useState(true);
    const [variant, setVariant] = useState<'classic' | 'fireworks' | 'emojis'>('classic');

    useEffect(() => {
        // 1. Randomize Variant
        const variants: ('classic' | 'fireworks' | 'emojis')[] = ['classic', 'fireworks', 'emojis'];
        const selectedVariant = variants[Math.floor(Math.random() * variants.length)];
        setVariant(selectedVariant);

        // 2. Generate Particles based on Variant
        const newParticles: Particle[] = [];

        if (selectedVariant === 'classic') {
            const types: ('confetti' | 'star' | 'sparkle')[] = ['confetti', 'star', 'sparkle'];
            for (let i = 0; i < 50; i++) {
                newParticles.push({
                    id: i,
                    x: Math.random() * 100,
                    y: -10 - Math.random() * 20,
                    color: COLORS[Math.floor(Math.random() * COLORS.length)],
                    size: 8 + Math.random() * 16,
                    rotation: Math.random() * 360,
                    velocityX: (Math.random() - 0.5) * 4,
                    velocityY: 2 + Math.random() * 3,
                    type: types[Math.floor(Math.random() * types.length)],
                });
            }
        } else if (selectedVariant === 'fireworks') {
            // Center Burst
            for (let i = 0; i < 60; i++) {
                const angle = Math.random() * Math.PI * 2;
                const velocity = 2 + Math.random() * 6;
                newParticles.push({
                    id: i,
                    x: 50, // Start center
                    y: 50,
                    color: COLORS[Math.floor(Math.random() * COLORS.length)],
                    size: 5 + Math.random() * 10,
                    rotation: Math.random() * 360,
                    velocityX: Math.cos(angle) * velocity,
                    velocityY: Math.sin(angle) * velocity,
                    type: 'sparkle',
                });
            }
        } else if (selectedVariant === 'emojis') {
            // Floating Emojis
            const emojis = ['🎉', '🥳', '⭐', '🏆', '💯', '🚀', '🐱'];
            for (let i = 0; i < 20; i++) {
                newParticles.push({
                    id: i,
                    x: Math.random() * 100,
                    y: 110, // Start bottom
                    color: '#FFF',
                    size: 24 + Math.random() * 24,
                    rotation: (Math.random() - 0.5) * 20,
                    velocityX: (Math.random() - 0.5) * 2,
                    velocityY: -2 - Math.random() * 4, // Float UP
                    type: 'star', // reusing structure, but will render as text
                    emoji: emojis[Math.floor(Math.random() * emojis.length)]
                } as any);
            }
        }

        setParticles(newParticles);
        console.log('[Celebration] Variant:', selectedVariant);

        // 3. Play Random Sound IF Enabled
        // Access store directly to avoid hook in loop/logic, though we are in useEffect so getState is fine.
        const isSoundEnabled = useUserStore.getState().isSoundEnabled;

        if (isSoundEnabled) {
            const SOUNDS = [
                'celebration.mp3', 'ce2.mp3', 'ce3.mp3', 'ce4.mp3', 'ce5.mp3'
            ];
            const randomSound = SOUNDS[Math.floor(Math.random() * SOUNDS.length)];
            console.log('[Celebration] Playing Sound:', randomSound);

            try {
                const audio = new Audio(import.meta.env.BASE_URL + 'sounds/' + randomSound);
                audio.volume = 0.5;
                audio.play().catch(e => console.log('Audio play failed', e));
            } catch (e) {
                console.warn('Audio not supported');
            }
        } else {
            console.log('[Celebration] Sound Muted by User Preference');
        }

        // Auto-hide
        const timer = setTimeout(() => {
            setIsVisible(false);
            onComplete?.();
        }, 2500);

        return () => clearTimeout(timer);
    }, [onComplete]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {particles.map((particle) => (
                <div
                    key={particle.id}
                    className="absolute"
                    style={{
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                        transform: `rotate(${particle.rotation}deg)`,
                        animation: variant === 'fireworks'
                            ? `firework-expand 1s ease-out forwards`
                            : variant === 'emojis'
                                ? `emoji-float 2s linear forwards`
                                : `celebration-fall 2s ease-out forwards`,
                    }}
                >
                    {/* Render Logic */}
                    {(variant === 'emojis' && (particle as any).emoji) ? (
                        <span style={{ fontSize: particle.size }}>{(particle as any).emoji}</span>
                    ) : (
                        <>
                            {particle.type === 'confetti' && (
                                <div className="rounded-sm" style={{ width: particle.size, height: particle.size * 0.6, backgroundColor: particle.color }} />
                            )}
                            {particle.type === 'star' && (
                                <span style={{ fontSize: particle.size, color: particle.color }}>★</span>
                            )}
                            {particle.type === 'sparkle' && (
                                <span style={{ fontSize: particle.size, color: particle.color }}>✨</span>
                            )}
                        </>
                    )}
                </div>
            ))}

            {/* Center Text */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-bounce text-6xl md:text-8xl font-bold text-yellow-400 drop-shadow-[0_4px_0_#000]">
                    {variant === 'emojis' ? '🌟' : '🎉'}
                </div>
            </div>
        </div>
    );
};

export default CelebrationEffect;
