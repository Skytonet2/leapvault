import { cn } from "@/lib/utils/cn";

/**
 * RWA-monitoring network background. Sits behind hero content at low opacity.
 *
 * Composition (back → front):
 *   1. Radial highlight glow
 *   2. Low-opacity grid
 *   3. Subtle skyline silhouette anchored to the bottom-right
 *   4. Agent network (central node + RWA nodes + connection paths) — pushed to
 *      the right half so the left-side hero copy stays readable
 *   5. A right-half-only gradient mask hides the network behind any content
 *      that sits on the left (text, CTAs, badges)
 *
 * Variants:
 *   - "full" (default): marketing hero
 *   - "compact": dashboard / page headers — smaller, calmer
 */
export function BackgroundAgentNetwork({
  variant = "full",
  className,
}: {
  variant?: "full" | "compact";
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      {/* Radial highlight */}
      <div className="absolute inset-0 bg-radial opacity-80" />

      {/* Grid — very faint */}
      <div
        className="absolute inset-0 opacity-[0.12] bg-grid"
        style={{ backgroundSize: "48px 48px" }}
      />

      {/* Soft horizon: bottom-up fade so the skyline melts into the page */}
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-bg-page via-bg-page/85 to-transparent" />

      {/* Skyline — pinned to bottom-right, very subtle. */}
      <div
        className="absolute bottom-0 right-0 w-[60%] h-[180px] opacity-[0.06]"
        style={{
          maskImage: "linear-gradient(to top, black 30%, transparent)",
          WebkitMaskImage: "linear-gradient(to top, black 30%, transparent)",
        }}
      >
        <Skyline />
      </div>

      {/* Agent network — right half, with a gradient mask fading it out on the left
         so it never collides with hero text. */}
      <div
        className="absolute inset-y-0 right-0 w-full sm:w-3/4 lg:w-3/5 opacity-60"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, transparent 18%, black 55%, black 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, transparent 18%, black 55%, black 100%)",
        }}
      >
        <AgentNetworkSvg />
      </div>

      {/* Floating monitor terminals removed — the HeroSidePreview card on the
         right column provides the terminal feel without crowding the SVG. */}

      {/* Final left-side scrim — ensures the hero text column always has a
         clean dark backdrop on every viewport. */}
      <div
        className="absolute inset-y-0 left-0 w-2/3 lg:w-1/2"
        style={{
          background:
            "linear-gradient(to right, rgba(7,17,15,0.92) 0%, rgba(7,17,15,0.7) 45%, rgba(7,17,15,0) 100%)",
        }}
      />
    </div>
  );
}

function AgentNetworkSvg() {
  return (
    <svg
      viewBox="0 0 1200 600"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
    >
      <defs>
        <linearGradient id="connLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(214,185,140,0)" />
          <stop offset="50%" stopColor="rgba(214,185,140,0.35)" />
          <stop offset="100%" stopColor="rgba(214,185,140,0)" />
        </linearGradient>
        <linearGradient id="connSage" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(134,185,157,0)" />
          <stop offset="50%" stopColor="rgba(134,185,157,0.3)" />
          <stop offset="100%" stopColor="rgba(134,185,157,0)" />
        </linearGradient>
        <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(245,239,226,0.7)" />
          <stop offset="40%" stopColor="rgba(214,185,140,0.45)" />
          <stop offset="100%" stopColor="rgba(214,185,140,0)" />
        </radialGradient>
      </defs>

      {/* Connection lines — all originate from the right-side central node */}
      <g strokeWidth="1" fill="none">
        <path
          d="M 820 300 C 700 280, 580 240, 480 240"
          stroke="url(#connLine)"
          strokeDasharray="3 5"
        />
        <path
          d="M 820 300 C 920 320, 1000 360, 1100 380"
          stroke="url(#connSage)"
          strokeDasharray="3 5"
        />
        <path
          d="M 820 300 C 860 220, 920 170, 1020 150"
          stroke="url(#connLine)"
          strokeDasharray="3 5"
        />
        <path
          d="M 820 300 C 760 380, 700 440, 620 470"
          stroke="url(#connSage)"
          strokeDasharray="3 5"
        />
        <path
          d="M 820 300 C 880 380, 940 440, 980 480"
          stroke="url(#connLine)"
          strokeDasharray="3 5"
        />
      </g>

      {/* Central monitor node — moved to right half */}
      <g transform="translate(820 300)">
        <circle r="40" fill="url(#nodeGlow)" opacity="0.5" />
        <circle r="22" fill="rgba(7,17,15,0.95)" stroke="rgba(214,185,140,0.55)" strokeWidth="1" />
        <circle r="3" fill="#D6B98C" />
        <circle r="11" fill="none" stroke="rgba(214,185,140,0.3)" strokeWidth="0.5" />
        <text
          x="0"
          y="55"
          textAnchor="middle"
          fontSize="9"
          letterSpacing="2"
          fill="rgba(245,239,226,0.4)"
          fontFamily="ui-monospace, SFMono-Regular, monospace"
        >
          LEAPVAULT · AGENT
        </text>
      </g>

      {/* RWA nodes — all on the right side */}
      <RwaNode x={1020} y={150} label="TREASURIES" icon="treasury" />
      <RwaNode x={1100} y={380} label="REAL ESTATE" icon="building" />
      <RwaNode x={980} y={480} label="CREDIT" icon="credit" />
      <RwaNode x={620} y={470} label="COMMODITIES" icon="commodity" />
      <RwaNode x={480} y={240} label="STABLE YIELD" icon="yield" />
    </svg>
  );
}

function RwaNode({
  x,
  y,
  label,
  icon,
}: {
  x: number;
  y: number;
  label: string;
  icon: "treasury" | "building" | "credit" | "commodity" | "yield" | "wallet";
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="22" fill="url(#nodeGlow)" opacity="0.18" />
      <circle r="13" fill="rgba(16,27,24,0.95)" stroke="rgba(134,185,157,0.35)" strokeWidth="1" />
      <g transform="translate(-6 -6)" stroke="rgba(245,239,226,0.6)" strokeWidth="0.8" fill="none">
        <NodeIcon icon={icon} />
      </g>
      <text
        x="0"
        y="34"
        textAnchor="middle"
        fontSize="8"
        letterSpacing="1.4"
        fill="rgba(245,239,226,0.38)"
        fontFamily="ui-monospace, SFMono-Regular, monospace"
      >
        {label}
      </text>
    </g>
  );
}

function NodeIcon({ icon }: { icon: string }) {
  switch (icon) {
    case "treasury":
      return (
        <>
          <rect x="2" y="3" width="8" height="1.5" />
          <rect x="2" y="5" width="1.5" height="5" />
          <rect x="5" y="5" width="1.5" height="5" />
          <rect x="8" y="5" width="1.5" height="5" />
          <rect x="0" y="10" width="12" height="1.5" />
        </>
      );
    case "building":
      return (
        <>
          <rect x="2" y="1" width="8" height="11" />
          <rect x="3.5" y="2.5" width="1.2" height="1.2" fill="rgba(245,239,226,0.6)" stroke="none" />
          <rect x="7" y="2.5" width="1.2" height="1.2" fill="rgba(245,239,226,0.6)" stroke="none" />
          <rect x="3.5" y="5.5" width="1.2" height="1.2" fill="rgba(245,239,226,0.6)" stroke="none" />
          <rect x="7" y="5.5" width="1.2" height="1.2" fill="rgba(245,239,226,0.6)" stroke="none" />
          <rect x="5" y="9" width="1.5" height="3" fill="rgba(245,239,226,0.6)" stroke="none" />
        </>
      );
    case "credit":
      return (
        <>
          <rect x="0" y="3" width="12" height="7" rx="1" />
          <rect x="0" y="5" width="12" height="1.5" fill="rgba(245,239,226,0.6)" stroke="none" />
        </>
      );
    case "commodity":
      return (
        <>
          <circle cx="6" cy="6" r="4" />
          <path d="M 3.5 6 L 6 3.5 L 8.5 6 L 6 8.5 Z" />
        </>
      );
    case "yield":
      return (
        <>
          <path d="M 1 10 L 4 7 L 7 8.5 L 11 3" />
          <circle cx="11" cy="3" r="1.2" fill="rgba(245,239,226,0.6)" stroke="none" />
        </>
      );
    case "wallet":
      return (
        <>
          <rect x="1" y="3" width="10" height="7" rx="0.8" />
          <rect x="8" y="5.5" width="2.5" height="2.5" rx="0.4" />
        </>
      );
  }
  return null;
}

function Skyline() {
  return (
    <svg
      viewBox="0 0 1200 180"
      preserveAspectRatio="xMaxYMax slice"
      className="h-full w-full"
    >
      <g fill="rgba(134,185,157,1)">
        <rect x="0" y="120" width="80" height="60" />
        <rect x="84" y="90" width="36" height="90" />
        <rect x="124" y="105" width="50" height="75" />
        <rect x="180" y="80" width="46" height="100" />
        <rect x="230" y="100" width="32" height="80" />
        <rect x="266" y="75" width="60" height="105" />
        <rect x="330" y="95" width="44" height="85" />
        <rect x="378" y="80" width="40" height="100" />
        <rect x="422" y="100" width="56" height="80" />
        <rect x="482" y="85" width="34" height="95" />
        <rect x="520" y="75" width="48" height="105" />
        <rect x="572" y="95" width="42" height="85" />
        <rect x="618" y="80" width="58" height="100" />
        <rect x="680" y="100" width="36" height="80" />
        <rect x="720" y="70" width="52" height="110" />
        <rect x="776" y="90" width="40" height="90" />
        <rect x="820" y="80" width="48" height="100" />
        <rect x="872" y="100" width="42" height="80" />
        <rect x="918" y="85" width="52" height="95" />
        <rect x="974" y="75" width="38" height="105" />
        <rect x="1016" y="95" width="48" height="85" />
        <rect x="1068" y="80" width="46" height="100" />
        <rect x="1118" y="105" width="42" height="75" />
        <rect x="1164" y="90" width="36" height="90" />
      </g>
    </svg>
  );
}

