/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}", // covers files in app directory
    "./components/**/*.{js,ts,jsx,tsx,mdx}", // covers files in components directory
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // if you're using src directory
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Default Tailwind font
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontSize: {
        xxs: "10px",
      }
    },
  },
  plugins: [],
};
