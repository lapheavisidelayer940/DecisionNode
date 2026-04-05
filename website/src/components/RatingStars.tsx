import { Star } from 'lucide-react';

interface RatingStarsProps {
    rating: number;
    count?: number;
    interactive?: boolean;
    onRate?: (rating: number) => void;
}

export default function RatingStars({ rating, count, interactive, onRate }: RatingStarsProps) {
    const stars = [1, 2, 3, 4, 5];

    return (
        <div className="flex items-center gap-1">
            {stars.map(star => (
                <button
                    key={star}
                    onClick={() => interactive && onRate?.(star)}
                    disabled={!interactive}
                    className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
                >
                    <Star
                        className={`w-5 h-5 ${star <= rating
                            ? 'fill-yellow-500 text-yellow-500'
                            : 'fill-transparent text-white/20'
                            }`}
                    />
                </button>
            ))}
            {count !== undefined && (
                <span className="text-white/50 text-sm ml-2">
                    ({count} {count === 1 ? 'review' : 'reviews'})
                </span>
            )}
        </div>
    );
}
