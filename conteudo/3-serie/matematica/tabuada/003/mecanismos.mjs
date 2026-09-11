// The control on each physical face is the only submission affordance.
export const TURN_TO_CHECK = Math.PI / 4;
export const MECHANISMS = Object.freeze({
  purple: { kind: 'button', label: 'Botão verde do lado roxo', instruction: 'Clique no botão verde no canto inferior direito da face roxa.' },
  yellow: { kind: 'button', label: 'Botão central do lado amarelo', instruction: 'Clique no botão amarelo no centro da face amarela.' },
  red: { kind: 'gear', label: 'Engrenagem pequena do lado vermelho', instruction: 'Arraste para girar a engrenagem pequena no canto inferior esquerdo da face vermelha.' },
  blue: { kind: 'gear', label: 'Engrenagem central do lado azul', instruction: 'Arraste para girar a engrenagem central da face azul.' }
});
export function angleDelta(previous, current, center) {
  const a = { x: previous.x - center.x, y: previous.y - center.y };
  const b = { x: current.x - center.x, y: current.y - center.y };
  // Near the axle, a sideways drag is easier than requiring a precise circular motion.
  if (Math.min(Math.hypot(a.x, a.y), Math.hypot(b.x, b.y)) < Math.max(7, center.radius * .32))
    return (current.x - previous.x) / Math.max(22, center.radius);
  let delta = Math.atan2(b.y, b.x) - Math.atan2(a.y, a.x);
  if (delta > Math.PI) delta -= 2 * Math.PI;
  if (delta < -Math.PI) delta += 2 * Math.PI;
  return delta;
}
export const hasTurned = angle => Math.abs(angle) >= TURN_TO_CHECK;

