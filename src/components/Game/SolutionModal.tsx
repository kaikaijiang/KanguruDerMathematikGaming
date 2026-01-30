import { X } from 'lucide-react';

interface SolutionModalProps {
    youtubeId: string;
    start: number;
    end: number;
    onClose: () => void;
}

const SolutionModal = ({ youtubeId, start, end, onClose }: SolutionModalProps) => {
    // Construct embed URL with start/end parameters
    // Use youtube-nocookie to reduce tracking/cookie warnings
    const embedUrl = `https://www.youtube-nocookie.com/embed/${youtubeId}?start=${start}&end=${end}&autoplay=1&rel=0`;

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 p-2 border-4 border-white w-full max-w-4xl relative">
                <button
                    onClick={onClose}
                    className="absolute -top-6 -right-6 bg-red-600 border-2 border-white p-2 hover:bg-red-500 rounded-full"
                >
                    <X color="white" />
                </button>

                <div className="aspect-video w-full">
                    <iframe
                        width="100%"
                        height="100%"
                        src={embedUrl}
                        title="Solution Video"
                        allowFullScreen
                        className="border-2 border-gray-700"
                    ></iframe>
                </div>
            </div>
        </div>
    );
};

export default SolutionModal;
