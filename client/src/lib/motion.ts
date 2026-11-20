'use client';
/**
 * Small Web-Animations helpers (no animation library → tiny bundle, 60fps on the compositor).
 * Everything respects prefers-reduced-motion.
 */
const reduced = () => typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Flies a ghost copy of the product image into the visible bag icon, then bumps the icon. */
export function flyToCart(from: HTMLElement | null) {
  if (!from || reduced()) return;
  const target = [...document.querySelectorAll<HTMLElement>('[data-cart-target]')].find((el) => el.offsetParent !== null);
  if (!target) return;
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const img = from.querySelector('img');
  const ghost = document.createElement('div');
  ghost.setAttribute('aria-hidden', 'true');
  Object.assign(ghost.style, {
    position: 'fixed', left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`,
    zIndex: '120', borderRadius: '24px', overflow: 'hidden', pointerEvents: 'none',
    backgroundImage: img ? `url("${img.currentSrc || img.src}")` : 'none', backgroundSize: 'cover', backgroundPosition: 'center',
    boxShadow: '0 20px 50px -20px rgba(0,0,0,.5)',
  });
  document.body.appendChild(ghost);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = ghost.animate(
    [
      { transform: 'translate(0,0) scale(1)', opacity: 1, borderRadius: '24px' },
      { transform: `translate(${dx * 0.55}px, ${dy * 0.35 - 80}px) scale(.45)`, opacity: 0.95, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(.06)`, opacity: 0.4, borderRadius: '999px' },
    ],
    { duration: 850, easing: 'cubic-bezier(.5,0,.3,1)' },
  );
  anim.onfinish = () => {
    ghost.remove();
    target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25) rotate(-8deg)' }, { transform: 'scale(1)' }], { duration: 450, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  };
}

/** Shake an element (invalid form field, unselected size…). */
export function shake(el: HTMLElement | null) {
  if (!el || reduced()) return;
  el.animate([{ transform: 'none' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-3px)' }, { transform: 'none' }], { duration: 380, easing: 'ease-in-out' });
}
