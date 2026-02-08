/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // GitHub-inspired color palette
        github: {
          canvas: {
            default: '#ffffff',
            subtle: '#f6f8fa',
            inset: '#f6f8fa',
            dark: {
              default: '#0d1117',
              subtle: '#161b22',
              inset: '#010409',
            },
          },
          fg: {
            default: '#1f2328',
            muted: '#656d76',
            subtle: '#6e7781',
            dark: {
              default: '#e6edf3',
              muted: '#8d96a0',
              subtle: '#6e7681',
            },
          },
          border: {
            default: '#d0d7de',
            muted: '#d8dee4',
            dark: {
              default: '#30363d',
              muted: '#21262d',
            },
          },
          accent: {
            fg: '#0969da',
            emphasis: '#0969da',
            muted: '#54aeff',
            subtle: '#ddf4ff',
            dark: {
              fg: '#2f81f7',
              emphasis: '#1f6feb',
              muted: '#388bfd',
              subtle: '#161b22',
            },
          },
          success: {
            fg: '#1a7f37',
            emphasis: '#1f883d',
            muted: '#4ac26b',
            subtle: '#dafbe1',
            dark: {
              fg: '#3fb950',
              emphasis: '#238636',
              muted: '#2ea043',
              subtle: '#0d1117',
            },
          },
          attention: {
            fg: '#9a6700',
            emphasis: '#bf8700',
            muted: '#d4a72c',
            subtle: '#fff8c5',
            dark: {
              fg: '#d29922',
              emphasis: '#9e6a03',
              muted: '#bb8009',
              subtle: '#161b22',
            },
          },
          danger: {
            fg: '#d1242f',
            emphasis: '#cf222e',
            muted: '#ff6a69',
            subtle: '#ffebe9',
            dark: {
              fg: '#f85149',
              emphasis: '#da3633',
              muted: '#f47067',
              subtle: '#0d1117',
            },
          },
          neutral: {
            muted: 'rgba(175, 184, 193, 0.2)',
            dark: {
              muted: 'rgba(110, 118, 129, 0.4)',
            },
          },
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Noto Sans',
          'Helvetica',
          'Arial',
          'sans-serif',
          'Apple Color Emoji',
          'Segoe UI Emoji',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'SF Mono',
          'Menlo',
          'Consolas',
          'Liberation Mono',
          'monospace',
        ],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '18px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
      },
      borderRadius: {
        github: '6px',
      },
      keyframes: {
        'slide-up': {
          from: {
            transform: 'translateX(-50%) translateY(100%)',
            opacity: '0',
          },
          to: {
            transform: 'translateX(-50%) translateY(0)',
            opacity: '1',
          },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
