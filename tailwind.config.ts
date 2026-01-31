import type { Config } from 'tailwindcss'

const config: Config = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-ibm-plex-sans)', 'system-ui', 'sans-serif'],
            },
            colors: {
                // Pastel Pink palette
                pink: {
                    50: '#FFF5F7',
                    100: '#FFE4E9',
                    200: '#FFCCD5',
                    300: '#FFB3C1',
                    400: '#FF8FAB',
                    500: '#FF6B8A',
                    600: '#E85A7B',
                    700: '#C44569',
                    800: '#9D3656',
                    900: '#7A2A45',
                },
                // Pastel Blue palette
                blue: {
                    50: '#F0F9FF',
                    100: '#E8F4F8',
                    200: '#D1EBF5',
                    300: '#A8D8EA',
                    400: '#7EC8E3',
                    500: '#5CB8D9',
                    600: '#40A8CC',
                    700: '#2E8DB3',
                    800: '#25708F',
                    900: '#1E5A74',
                },
                // Primary - now using pink as primary
                primary: {
                    50: '#FFF5F7',
                    100: '#FFE4E9',
                    200: '#FFCCD5',
                    300: '#FFB3C1',
                    400: '#FF8FAB',
                    500: '#FF6B8A',
                    600: '#E85A7B',
                    700: '#C44569',
                    800: '#9D3656',
                    900: '#7A2A45',
                    950: '#5A1F34',
                },
                // Neutral grays - very light, clean
                gray: {
                    50: '#FAFAFA',
                    100: '#F5F5F5',
                    200: '#E5E5E5',
                    300: '#D4D4D4',
                    400: '#A3A3A3',
                    500: '#737373',
                    600: '#525252',
                    700: '#404040',
                    800: '#262626',
                    900: '#171717',
                    950: '#0A0A0A',
                },
                // Accent colors
                success: {
                    50: '#ECFDF5',
                    100: '#D1FAE5',
                    500: '#10B981',
                    600: '#059669',
                },
                warning: {
                    50: '#FFFBEB',
                    100: '#FEF3C7',
                    500: '#F59E0B',
                    600: '#D97706',
                },
                error: {
                    50: '#FEF2F2',
                    100: '#FEE2E2',
                    200: '#FECACA',
                    500: '#EF4444',
                    600: '#DC2626',
                },
            },
            boxShadow: {
                'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.04), 0 10px 20px -2px rgba(0, 0, 0, 0.02)',
                'soft-md': '0 4px 20px -4px rgba(0, 0, 0, 0.06), 0 12px 24px -4px rgba(0, 0, 0, 0.03)',
                'soft-lg': '0 10px 40px -10px rgba(0, 0, 0, 0.08), 0 20px 40px -10px rgba(0, 0, 0, 0.04)',
                'soft-xl': '0 20px 60px -15px rgba(0, 0, 0, 0.1)',
                'card': '0 1px 3px rgba(0, 0, 0, 0.04), 0 6px 16px rgba(0, 0, 0, 0.04)',
                'card-hover': '0 4px 12px rgba(0, 0, 0, 0.06), 0 20px 40px rgba(0, 0, 0, 0.06)',
            },
            borderRadius: {
                '2xl': '1rem',
                '3xl': '1.5rem',
                '4xl': '2rem',
            },
            transitionDuration: {
                '250': '250ms',
                '400': '400ms',
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out forwards',
                'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
                'slide-up': 'slideUp 0.5s ease-out forwards',
                'slide-in-right': 'slideInRight 0.5s ease-out forwards',
                'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
                'float': 'float 6s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(30px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideInRight: {
                    '0%': { opacity: '0', transform: 'translateX(-20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                pulseSoft: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.85' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
            },
        },
    },
    plugins: [],
}
export default config
