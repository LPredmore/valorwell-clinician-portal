
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				valorwell: {
					DEFAULT: '#395144',
					50: '#F7F9F7',
					100: '#E2EAE3',
					200: '#C0D1C2',
					300: '#9DB8A0',
					400: '#7B9F7F',
					500: '#59865D',
					600: '#47694A',
					700: '#395144',
					800: '#263530',
					900: '#131A17'
				},
				waiting: '#FEF7CD',
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(10px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'slide-in-left': {
					'0%': { transform: 'translateX(-100%)' },
					'100%': { transform: 'translateX(0)' }
				},
				'pulse': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.5' }
				},
				'pulse-green': {
					'0%, 100%': {
						opacity: '1',
						boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)'
					},
					'50%': {
						opacity: '0.7',
						boxShadow: '0 0 0 4px rgba(34, 197, 94, 0.3)'
					}
				},
				'pulse-blue': {
					'0%, 100%': {
						opacity: '1',
						boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)'
					},
					'50%': {
						opacity: '0.7',
						boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.3)'
					}
				},
				'pulse-red': {
					'0%, 100%': {
						opacity: '1',
						boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)'
					},
					'50%': {
						opacity: '0.7',
						boxShadow: '0 0 0 4px rgba(239, 68, 68, 0.3)'
					}
				},
				'pulse-purple': {
					'0%, 100%': {
						opacity: '1',
						boxShadow: '0 0 0 0 rgba(168, 85, 247, 0)'
					},
					'50%': {
						opacity: '0.7',
						boxShadow: '0 0 0 4px rgba(168, 85, 247, 0.3)'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'slide-in-left': 'slide-in-left 0.3s ease-out',
				'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'pulse-green': 'pulse-green 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'pulse-blue': 'pulse-blue 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'pulse-red': 'pulse-red 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'pulse-purple': 'pulse-purple 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
