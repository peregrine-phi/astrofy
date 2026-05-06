/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			fontFamily: {
				'sans': ['"Google Sans"', '"Noto Sans SC"', 'sans-serif'],
				'serif': ['"Playfair Display"', '"Noto Serif SC"', 'serif'],
			}
		},
	},
	plugins: [require("@tailwindcss/typography"),require("daisyui")],
	daisyui: {
		themes: true,
		darkTheme: "black",
		logs: false,
	  }
}
