import { useEffect, useState } from 'react';

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

    useEffect(() => {
        // Generate random particles
        const newParticles: Particle[] = [];
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
        setParticles(newParticles);

        // Play celebration sound
        try {
            const audio = new Audio(import.meta.env.BASE_URL + 'sounds/celebration.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {
                // Audio play failed (likely no sound file or autoplay blocked)
                console.log('Celebration sound not available');
            });
        } catch {
            // Audio not supported
        }

        // Auto-hide after animation
        const timer = setTimeout(() => {
            setIsVisible(false);
            onComplete?.();
        }, 2000);

        return () => clearTimeout(timer);
    }, [onComplete]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {particles.map((particle) => (
                <div
                    key={particle.id}
                    className="absolute animate-celebration-fall"
                    style={{
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                        transform: `rotate(${particle.rotation}deg)`,
                        animationDelay: `${Math.random() * 0.5}s`,
                        animationDuration: `${1.5 + Math.random()}s`,
                    }}
                >
                    {particle.type === 'confetti' && (
                        <div
                            className="rounded-sm"
                            style={{
                                width: particle.size,
                                height: particle.size * 0.6,
                                backgroundColor: particle.color,
                            }}
                        />
                    )}
                    {particle.type === 'star' && (
                        <span
                            style={{
                                fontSize: particle.size,
                                color: particle.color,
                                textShadow: `0 0 ${particle.size / 2}px ${particle.color}`,
                            }}
                        >
                            ★
                        </span>
                    )}
                    {particle.type === 'sparkle' && (
                        <span
                            style={{
                                fontSize: particle.size,
                                color: particle.color,
                            }}
                        >
                            ✨
                        </span>
                    )}
                </div>
            ))}

            {/* Central burst text */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-bounce text-6xl md:text-8xl font-bold text-yellow-400 drop-shadow-[0_4px_0_#000]">
                    🎉
                </div>
            </div>
        </div>
    );
};

export default CelebrationEffect;
