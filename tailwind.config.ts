import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        border: "var(--border)",
        input: "var(--input)",
        primary: "var(--primary)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        sidebar: "var(--sidebar)",
        "sidebar-border": "var(--sidebar-border)",
        "sidebar-accent": "var(--sidebar-accent)",
        "sidebar-foreground": "var(--sidebar-foreground)"
      },
      fontFamily: {
        sans: ["var(--font-geist)", "sans-serif"],
        inter: ["var(--font-inter)", "sans-serif"]
      },
      boxShadow: {
        subtle: "0 1px 0 rgba(17, 17, 17, 0.04)"
      },
      borderRadius: {
        xl2: "16px"
      }
    }
  },
  plugins: []
};

export default config;
