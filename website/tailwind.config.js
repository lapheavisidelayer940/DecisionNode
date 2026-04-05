/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // "Void" base
                background: '#050505',
                // Custom Zinc scale for surface layering
                zinc: {
                    850: '#1f1f22',
                    900: '#18181b', // Standard tailwind zinc-900
                    950: '#09090b', // Standard tailwind zinc-950
                },
                primary: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9', // Electric Blue
                    600: '#0284c7',
                    700: '#0369a1',
                    800: '#075985',
                    900: '#0c4a6e',
                },
                accent: {
                    300: '#fde047',
                    400: '#facc15',
                    500: '#eab308', // Yellow-500
                    600: '#ca8a04',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'Menlo', 'monospace'], // Tech feel
            },
            backgroundImage: {
                'grid-pattern': "linear-gradient(to right, #1f1f22 1px, transparent 1px), linear-gradient(to bottom, #1f1f22 1px, transparent 1px)",
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
            },
            backgroundSize: {
                'grid-pattern': '4rem 4rem',
            },
            animation: {
                'fade-in': 'fadeIn 0.7s ease-out forwards',
                'slide-up': 'slideUp 0.5s ease-out forwards',
                'scale-in': 'scaleIn 0.1s ease-out forwards',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
                'wave-slow': 'wave 15s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { transform: 'translateY(0)' },
                },
                scaleIn: {
                    '0%': { opacity: '0.5', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                glow: {
                    '0%': { textShadow: '0 0 10px rgba(234, 179, 8, 0.5)' },
                    '100%': { textShadow: '0 0 20px rgba(234, 179, 8, 0.8), 0 0 30px rgba(56, 189, 248, 0.6)' },
                },
                wave: {
                    '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
                    '33%': { transform: 'translate(30px, -50px) rotate(2deg)' },
                    '66%': { transform: 'translate(-20px, 20px) rotate(-1deg)' },
                }
            }
        },
    },
    plugins: [],
}
