/**
 * Capito mascot — transparent PNG in web/public/capito.png (from repo Capito.png).
 */

type CapitoAvatarProps = {
  size?: number;
  className?: string;
};

export function CapitoAvatar({ size = 56, className = "" }: CapitoAvatarProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/capito.png"
      alt=""
      width={size}
      height={size}
      className={`pointer-events-none shrink-0 object-contain ${className}`}
      draggable={false}
    />
  );
}
