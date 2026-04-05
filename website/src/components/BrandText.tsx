// Branded text component - "Decision" in primary color, "Node" in white
interface BrandTextProps {
    className?: string;
}

export function BrandText({ className = '' }: BrandTextProps) {
    return (
        <span className={className}>
            <span className="text-primary-400 text-glow">Decision</span>
            <span className="text-accent-500 text-glow-accent">Node</span>
        </span>
    );
}

// For use in page titles and headers where you want full control
export function BrandTextInline() {
    return (
        <>
            <span className="text-primary-400 text-glow">Decision</span>
            <span className="text-accent-500 text-glow-accent">Node</span>
        </>
    );
}
