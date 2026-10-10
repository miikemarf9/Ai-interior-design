/** Map original photograph coordinates through the shared cover crop and camera zoom. */
export function heroPoint(width: number, height: number, x: number, y: number, reduced: boolean) {
  const mobile = width <= 680;
  const cover = Math.max(width / 1672, height / 941);
  const zoom = reduced ? 1 : mobile ? 1.065 : 1.085;
  const px = reduced ? (mobile ? .61 : .5) : mobile ? .68 : .66;
  const py = reduced ? .5 : mobile ? .38 : .31;
  const ox = width * (mobile ? .76 : .72);
  const oy = height * (mobile ? .30 : .24);
  return {
    x: ((width - 1672 * cover) * px + x * 1672 * cover - ox) * zoom + ox,
    y: ((height - 941 * cover) * py + y * 941 * cover - oy) * zoom + oy,
  };
}

export type HeroRect = { left: number; top: number; right: number; bottom: number };
export function clearHeroRect(rect: HeroRect, obstacles: HeroRect[], width: number, height: number) {
  const gap = 10;
  return rect.left >= gap && rect.right <= width - gap && rect.top >= gap && rect.bottom <= height - gap &&
    obstacles.every(other => rect.right + gap <= other.left || rect.left - gap >= other.right ||
      rect.bottom + gap <= other.top || rect.top - gap >= other.bottom);
}
