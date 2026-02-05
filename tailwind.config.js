/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // GitHub-inspired color palette
        github: {
          canvas: {
            default: '#ffffff',
            subtle: '#f6f8fa',
            inset: '#f6f8fa',
          },
          fg: {
            default: '#1f2328',
            muted: '#656d76',
            subtle: '#6e7781',
          },
          border: {
            default: '#d0d7de',
            muted: '#d8dee4',
          },
          accent: {
            fg: '#0969da',
            emphasis: '#0969da',
            muted: '#54aeff',
            subtle: '#ddf4ff',
          },
          success: {
            fg: '#1a7f37',
            emphasis: '#1f883d',
            muted: '#4ac26b',
            subtle: '#dafbe1',
          },
          attention: {
            fg: '#9a6700',
            emphasis: '#bf8700',
            muted: '#d4a72c',
            subtle: '#fff8c5',
          },
          danger: {
            fg: '#d1242f',
            emphasis: '#cf222e',
            muted: '#ff6a69',
            subtle: '#ffebe9',
          },
          neutral: {
            muted: 'rgba(175, 184, 193, 0.2)',
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
    },
  },
  plugins: [],
}
