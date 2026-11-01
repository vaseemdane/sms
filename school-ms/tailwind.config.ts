import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ─── Design tokens ───────────────────────────────────────────────
        background: "#F7F3EC",
        "background-secondary": "#FBF9F5",
        surface: "#FFFFFF",
        "warm-ivory": "#F2EDE4",
        "purple-primary": "#7657A8",
        "purple-soft": "#A98BCF",
        lavender: "#DCD0EB",
        "purple-tint": "#F1EBF7",
        "warm-beige": "#D8C7AE",
        "text-primary": "#3F3A43",
        "text-secondary": "#77717B",
        border: "#E7DFD3",

        // ─── shadcn/ui compatible aliases ────────────────────────────────
        primary: {
          DEFAULT: "#7657A8",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#F1EBF7",
          foreground: "#7657A8",
        },
        muted: {
          DEFAULT: "#FBF9F5",
          foreground: "#77717B",
        },
        accent: {
          DEFAULT: "#DCD0EB",
          foreground: "#3F3A43",
        },
        destructive: {
          DEFAULT: "#DC2626",
          foreground: "#FFFFFF",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#3F3A43",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#3F3A43",
        },
        input: "#E7DFD3",
        ring: "#7657A8",
        foreground: "#3F3A43",
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
        xl: "1rem",
        "2xl": "1.25rem",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Typography scale
        display: ["2.25rem", { lineHeight: "2.75rem", fontWeight: "700" }],
        "page-heading": ["1.75rem", { lineHeight: "2.25rem", fontWeight: "700" }],
        "section-heading": ["1.25rem", { lineHeight: "1.75rem", fontWeight: "600" }],
        body: ["0.9375rem", { lineHeight: "1.625rem", fontWeight: "400" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5rem", fontWeight: "400" }],
        caption: ["0.75rem", { lineHeight: "1.25rem", fontWeight: "400" }],
        label: ["0.875rem", { lineHeight: "1.25rem", fontWeight: "500" }],
      },
      spacing: {
        "sidebar-w": "260px",
        "header-h": "64px",
      },
      boxShadow: {
        card: "0 1px 4px 0 rgba(63,58,67,0.06), 0 0 0 1px rgba(231,223,211,0.8)",
        glass: "0 2px 12px 0 rgba(118,87,168,0.08), 0 0 0 1px rgba(220,208,235,0.4)",
        modal: "0 8px 32px 0 rgba(63,58,67,0.12)",
        sm: "0 1px 2px 0 rgba(63,58,67,0.05)",
      },
      backdropBlur: {
        glass: "12px",
      },
      keyframes: {
        "slide-in-from-top": {
          from: { transform: "translateY(-8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "slide-in-from-bottom": {
          from: { transform: "translateY(8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "slide-in-top": "slide-in-from-top 0.2s ease-out",
        "slide-in-bottom": "slide-in-from-bottom 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        shimmer: "shimmer 1.8s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
