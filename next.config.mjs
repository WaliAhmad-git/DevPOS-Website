/** @type {import('next').NextConfig} */

// Security headers applied to every response. The /trial page is the one
// exception that needs a scoped frame-ancestors allowance later if you
// ever embed the demo cross-origin in something other than your own
// iframe (frame-src, not frame-ancestors, governs *your* iframe embedding
// someone else — this CSP already allows that via frame-src below).
const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js needs 'unsafe-inline' for its hydration scripts in dev;
      // in production builds this can usually be tightened further with
      // a nonce-based approach if you want to go further.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.supabase.co",
      // Allows the /trial page to iframe your own demo backend host.
      // Replace with your actual demo backend origin once deployed —
      // wildcards here weaken the protection this header exists to give.
      "frame-src 'self' https://*.onrender.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
