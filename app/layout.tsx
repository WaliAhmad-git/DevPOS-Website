import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "DevPOS — Point of Sale for Independent Grocery Shops",
  description:
    "DevPOS is point-of-sale software built for independent grocery shops — barcode scanning, cash & card, inventory, staff, and reports. Try it free.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <a href="/" className="brand">
            <img src="/logo.jpeg" alt="DevPOS logo" />
            DevPOS
          </a>
          <nav>
            <a href="/#pricing">Pricing</a>
            <a href="/#try-now">Try it</a>
            <a href="/#download">Download</a>
            <a href="/#contact">Contact</a>
            <a href="/login">Log in</a>
            <a href="/signup" className="nav-cta">Sign up</a>
          </nav>
        </header>
        <main className="wide">{children}</main>
        <footer className="site-footer">
          © {new Date().getFullYear()} DevPOS. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
