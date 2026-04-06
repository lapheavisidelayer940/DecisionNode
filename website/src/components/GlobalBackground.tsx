import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function GlobalBackground() {
    const { pathname } = useLocation();
    const isHome = pathname === '/';
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            setScrollY(window.scrollY);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <>
            {/* Interactive Mouse Glow (desktop only) */}
            <div
                className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000 hidden md:block"
                style={{
                    background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(56, 189, 248, 0.12), transparent 80%)`
                }}
            />
            {/* Parallax Background Blobs (desktop only — too heavy on mobile) */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden hidden md:block">
                {/* 1. Cyan Blob - Slow, follows scroll slightly */}
                <div
                    className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] rounded-full blur-[120px] opacity-30 mix-blend-screen"
                    style={{
                        background: 'radial-gradient(circle, rgba(56, 189, 248, 0.4) 0%, transparent 70%)',
                        transform: `translate(0, ${scrollY * 0.2}px)`
                    }}
                />

                {/* 2. Yellow/Gold Blob - Medium speed, reverse scroll direction */}
                <div
                    className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[100px] opacity-40 mix-blend-screen"
                    style={{
                        background: 'radial-gradient(circle, rgba(234, 179, 8, 0.4) 0%, transparent 70%)',
                        transform: `translate(0, ${-scrollY * 0.15}px)`
                    }}
                />

                {/* 3. Violet/Purple Blob - Fast, moves across */}
                <div
                    className="absolute top-[40%] left-[30%] w-[50vw] h-[50vw] rounded-full blur-[100px] opacity-30 mix-blend-screen"
                    style={{
                        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, transparent 70%)',
                        transform: `translate(${scrollY * 0.1}px, ${-scrollY * 0.05}px)`
                    }}
                />
            </div>

            {/* Moving Hills/Waves - ONLY ON HOME PAGE */}
            {isHome && (
                <div className="fixed bottom-0 left-0 right-0 h-[45vh] pointer-events-none z-0 overflow-hidden hidden md:block">
                    {/* Perspective gradient fade */}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent z-10" />

                    {/* Wave 1 - Back, Slowest */}
                    <div
                        className="absolute bottom-0 left-0 w-[200%] h-full transition-transform duration-1000 ease-out will-change-transform"
                        style={{ transform: `translateX(-${scrollY * 0.01}px)` }}
                    >
                        <div
                            className="w-full h-full flex items-end animate-[wave-move_120s_linear_infinite]"
                            style={{ opacity: 0.2 }}
                        >
                            <svg className="w-full h-auto text-primary-600 fill-current" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
                                <path d="M0,160 C320,300, 420,300, 720,160 C1020,20, 1120,20, 1440,160 V320 H0 Z"></path>
                            </svg>
                            <svg className="w-full h-auto text-primary-600 fill-current" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
                                <path d="M0,160 C320,300, 420,300, 720,160 C1020,20, 1120,20, 1440,160 V320 H0 Z"></path>
                            </svg>
                        </div>
                    </div>

                    {/* Wave 2 - Middle, Medium speed */}
                    <div
                        className="absolute bottom-[-10%] left-0 w-[200%] h-full transition-transform duration-1000 ease-out will-change-transform"
                        style={{ transform: `translateX(-${scrollY * 0.05}px)` }}
                    >
                        <div
                            className="w-full h-full flex items-end animate-[wave-move_90s_linear_infinite]"
                            style={{ opacity: 0.15 }}
                        >
                            <svg className="w-full h-auto text-primary-400 fill-current" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
                                <path d="M0,224 C320,100, 420,100, 720,224 C1020,350, 1120,350, 1440,224 V320 H0 Z"></path>
                            </svg>
                            <svg className="w-full h-auto text-primary-400 fill-current" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
                                <path d="M0,224 C320,100, 420,100, 720,224 C1020,350, 1120,350, 1440,224 V320 H0 Z"></path>
                            </svg>
                        </div>
                    </div>

                    {/* Wave 3 - Front, Fastest, Accent Highlight */}
                    <div
                        className="absolute bottom-[-5%] left-0 w-[200%] h-full transition-transform duration-1000 ease-out will-change-transform"
                        style={{ transform: `translateX(-${scrollY * 0.06}px)` }}
                    >
                        <div
                            className="w-full h-full flex items-end animate-[wave-move_60s_linear_infinite]"
                            style={{ opacity: 0.1 }}
                        >
                            <svg className="w-full h-auto text-accent-400 fill-current" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
                                <path d="M0,192 C320,250, 420,250, 720,192 C1020,130, 1120,130, 1440,192 V320 H0 Z"></path>
                            </svg>
                            <svg className="w-full h-auto text-accent-400 fill-current" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg">
                                <path d="M0,192 C320,250, 420,250, 720,192 C1020,130, 1120,130, 1440,192 V320 H0 Z"></path>
                            </svg>
                        </div>
                    </div>
                </div>
            )}

            <div className="fixed inset-0 bg-grid-fade z-0" />
        </>
    );
}
