import { ImageResponse } from "next/og";

/** Ícono de la app: huella blanca sobre naranja. Sin emojis para no depender de fuentes externas. */
export function pawIcon(size: number, { maskable = false, mono = false } = {}) {
  const s = size / 100;
  const pad = maskable ? 0.72 : 1; // zona segura para íconos adaptables de Android
  const pad2 = (n: number) => n * s * pad;
  const off = (size - size * pad) / 2;
  const toe = (x: number, y: number, w: number, h: number) => (
    <div
      style={{
        position: "absolute",
        left: off + pad2(x),
        top: off + pad2(y),
        width: pad2(w),
        height: pad2(h),
        borderRadius: "50%",
        background: mono ? "#000" : "#F2F1EA",
      }}
    />
  );
  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: mono ? "transparent" : "#1E3A2B",
          borderRadius: maskable || mono ? 0 : size * 0.22,
          display: "flex",
          position: "relative",
        }}
      >
        {toe(20, 30, 15, 20)}
        {toe(36, 17, 14, 19)}
        {toe(52, 17, 14, 19)}
        {toe(67, 30, 15, 20)}
        <div
          style={{
            position: "absolute",
            left: off + pad2(30),
            top: off + pad2(45),
            width: pad2(42),
            height: pad2(36),
            borderRadius: `${pad2(20)}px ${pad2(20)}px ${pad2(18)}px ${pad2(18)}px`,
            background: mono ? "#000" : "#F2F1EA",
          }}
        />
      </div>
    ),
    { width: size, height: size },
  );
}
