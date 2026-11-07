import type { Metadata } from "next";
import "./globals.css";
import { ShieldCheck, Info } from "lucide-react";

export const metadata: Metadata = {
  title: "ClaimKavach — AI Hospital-Bill & Insurance-Deduction Audit Tool",
  description: "AI reads the bill. Verified rules judge it. Empowering Indian patients to audit hospital bills and TPA deductions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-navy text-slate-100 flex flex-col min-h-screen">
        {/* Navigation Bar */}
        <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg tracking-tight text-white">
                    Claim<span className="text-teal-400">Kavach</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-700/50 uppercase font-semibold">
                    Free Tier
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  AI reads the bill. Verified rules judge it.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                NPPA DPCO & IRDAI Norms Active
              </span>
            </div>
          </div>
        </header>

        {/* Main Application Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
          {children}
        </main>

        {/* Persistent Educational Disclaimer Footer */}
        <footer className="border-t border-slate-800/80 bg-slate-950 text-slate-400 py-6 text-xs">
          <div className="max-w-7xl mx-auto px-4 space-y-3">
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-slate-300">
                <strong className="text-teal-300 font-semibold">Mandatory Educational Disclaimer: </strong>
                ClaimKavach is an educational and analytical tool designed to help patients understand hospital bills and insurance deductions. It does not provide legal advice or medical guidance. Estimated amounts are potential grounds for query and dispute with your hospital or TPA. All calculations use deterministic NPPA and IRDAI rules with zero patient data persistence.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 pt-2">
              <div>
                © {new Date().getFullYear()} ClaimKavach. Built for Indian Families. 100% Stateless & Free Tier.
              </div>
              <div className="flex items-center gap-4 mt-2 sm:mt-0">
                <span>NPPA Price Caps</span>
                <span>•</span>
                <span>IRDAI Annexure-I</span>
                <span>•</span>
                <span>Bima Bharosa Ready</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
