/** Ownership of pointer event bindings and pointer capture for SVG editing. */
export function createPointerController(target, {onDown,onMove,onUp,onCancel,onWheel,onDoubleClick} = {}) {
  if (!target?.addEventListener) throw new TypeError('Pointer target required');
  const bindings = [
    ['pointerdown',onDown],['pointermove',onMove],['pointerup',onUp],
    ['pointercancel',onCancel ?? onUp],['wheel',onWheel],['dblclick',onDoubleClick]
  ].filter(([,fn])=>typeof fn==='function');
  const capture = id => { if (target.setPointerCapture) target.setPointerCapture(id); };
  const release = id => { if (target.hasPointerCapture?.(id)) target.releasePointerCapture(id); };
  let attached = false;
  return {
    capture, release,
    attach() { if (attached) return; for (const [event,fn] of bindings) target.addEventListener(event,fn,event==='wheel'?{passive:false}:undefined); attached = true; },
    detach() { if (!attached) return; for (const [event,fn] of bindings) target.removeEventListener(event,fn,event==='wheel'?{passive:false}:undefined); attached = false; },
    get attached() {return attached;}
  };
}
