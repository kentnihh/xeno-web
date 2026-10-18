import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Xeno Entertainment — Operations",
  description: "Sistem Manajemen Acara dan Kru Xeno Entertainment",
  icons: {
    icon: [
      { url: "/icon.png" },
      { url: "/logo-xeno.png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/logo-xeno.png",
    apple: "/logo-xeno.png",
  },
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${inter.variable} ${montserrat.variable} h-full antialiased light`}
      data-theme="light"
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  localStorage.setItem('xeno-theme', 'light');
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                  document.documentElement.style.colorScheme = 'light';
                  document.documentElement.setAttribute('data-theme', 'light');
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans selection:bg-[#007aff]/30 selection:text-white bg-[#f5f5f7] text-[#1d1d1f] transition-colors duration-150">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
