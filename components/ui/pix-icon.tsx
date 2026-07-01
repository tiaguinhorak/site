import { cn } from "@/lib/utils";

/** Verde Pix oficial (BACEN). */
const PIX_BRAND = "#32BCAD";

/** Centro visual do símbolo Pix (bbox dos 3 paths oficiais). */
const PIX_SYMBOL_CX = 574.5;
const PIX_SYMBOL_CY = 66;
/** Escala para caber centralizado no tile 32×32 (área útil ~22px). */
const PIX_SYMBOL_SCALE = 0.30;

const PIX_SYMBOL_PATHS = [
  "m 596.82737,86.620206 c -3.08045,0 -5.97782,-1.19944 -8.15622,-3.37679 l -11.77678,-11.77713 c -0.82691,-0.82903 -2.26801,-0.82656 -3.09456,0 l -11.81982,11.82017 c -2.17841,2.17734 -5.07577,3.37679 -8.15623,3.37679 h -2.32092 l 14.9158,14.915444 c 4.65807,4.65808 12.21069,4.65808 16.86912,0 l 14.95813,-14.958484 z",
  "m 553.82362,44.963326 c 3.08046,0 5.97782,1.19944 8.15622,3.37679 l 11.81982,11.82193 c 0.85125,0.85161 2.2412,0.85479 3.09457,-10e-4 l 11.77678,-11.77784 c 2.1784,-2.17735 5.07576,-3.37679 8.15622,-3.37679 h 1.41852 l -14.95778,-14.95813 c -4.65878,-4.658432 -12.2114,-4.658432 -16.86948,0 l -14.91509,14.91509 z",
  "m 610.61844,57.378776 -9.03922,-9.03922 c -0.19897,0.0797 -0.41452,0.12946 -0.64206,0.12946 h -4.10986 c -2.12478,0 -4.20476,0.86184 -5.70618,2.36432 l -11.77643,11.77678 c -1.10207,1.10208 -2.55022,1.65347 -3.99697,1.65347 -1.44815,0 -2.89524,-0.55139 -3.99697,-1.65241 l -11.82088,-11.82088 c -1.50142,-1.50283 -3.5814,-2.36431 -5.70618,-2.36431 h -5.05354 c -0.21555,0 -0.41698,-0.0508 -0.60713,-0.12242 l -9.07521,9.07521 c -4.65843,4.65843 -4.65843,12.2107 0,16.86913 l 9.07486,9.07485 c 0.1905,-0.0716 0.39193,-0.12241 0.60748,-0.12241 h 5.05354 c 2.12478,0 4.20476,-0.86148 5.70618,-2.36396 l 11.81982,-11.81982 c 2.13643,-2.13466 5.8607,-2.13537 7.995,0.001 l 11.77643,11.77573 c 1.50142,1.50248 3.5814,2.36431 5.70618,2.36431 h 4.10986 c 0.22754,0 0.44309,0.0497 0.64206,0.12947 l 9.03922,-9.03922 c 4.65808,-4.65843 4.65808,-12.2107 0,-16.86913",
] as const;

type PixIconProps = {
  className?: string;
  /** `symbol` = tile verde + diamante; `logo` = marca completa. */
  variant?: "symbol" | "logo";
  size?: number;
};

function PixSymbolTile({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={cn("block shrink-0", className)}
      role="img"
      aria-label="Pix"
    >
      <rect width="32" height="32" rx="7" fill={PIX_BRAND} />
      <g transform={`translate(16 16) scale(${PIX_SYMBOL_SCALE}) translate(${-PIX_SYMBOL_CX} ${-PIX_SYMBOL_CY})`}>
        {PIX_SYMBOL_PATHS.map((d) => (
          <path key={d.slice(0, 24)} fill="#FFFFFF" d={d} />
        ))}
      </g>
    </svg>
  );
}

/** Ícone Pix — tile verde + diamante branco centralizado. */
export function PixIcon({ className, variant = "symbol", size = 24 }: PixIconProps) {
  if (variant === "logo") {
    const width = Math.round(size * 2.8);
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/icons/pix-logo.svg"
        alt="Pix"
        width={width}
        height={size}
        className={cn("h-auto w-auto object-contain", className)}
        draggable={false}
      />
    );
  }

  return <PixSymbolTile size={size} className={className} />;
}

export { PIX_BRAND };
