// Estado dos componentes
let systemState = { components: [] };
let dragInfo = null;
let simulationActive = false;
let animationFrameId = null;

// SVGs realistas para cada tipo de componente
function getComponentSVG(type) {
  if (type === "motor") {
    return `
      <svg width="80" height="60" viewBox="0 0 80 60">
        <rect x="10" y="20" width="60" height="30" rx="8" fill="#666"/>
        <rect x="60" y="30" width="15" height="10" rx="3" fill="#888"/>
        <circle cx="75" cy="35" r="4" fill="#333"/>
        <rect x="5" y="30" width="10" height="10" rx="3" fill="#444"/>
        <rect x="25" y="10" width="30" height="10" rx="5" fill="#999"/>
        <text x="40" y="40" text-anchor="middle" font-size="10" fill="#fff" font-family="Arial">MOTOR</text>
      </svg>
    `;
  }
  if (type === "polia_motora") {
    return `
      <svg width="60" height="60" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="28" fill="#b3b3b3" stroke="#666" stroke-width="4"/>
        <circle cx="30" cy="30" r="12" fill="#fff" stroke="#666" stroke-width="2"/>
        <circle cx="30" cy="30" r="4" fill="#666"/>
        <ellipse cx="30" cy="30" rx="24" ry="6" fill="rgba(120,120,120,0.18)"/>
        <text x="30" y="54" text-anchor="middle" font-size="9" fill="#444" font-family="Arial">P. MOTORA</text>
      </svg>
    `;
  }
  if (type === "polia_movida") {
    return `
      <svg width="60" height="60" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="28" fill="#d5b3b3" stroke="#666" stroke-width="4"/>
        <circle cx="30" cy="30" r="12" fill="#fff" stroke="#666" stroke-width="2"/>
        <circle cx="30" cy="30" r="4" fill="#666"/>
        <ellipse cx="30" cy="30" rx="24" ry="6" fill="rgba(180,120,120,0.18)"/>
        <text x="30" y="54" text-anchor="middle" font-size="9" fill="#444" font-family="Arial">P. MOVIDA</text>
      </svg>
    `;
  }
  if (type === "rolamento") {
    return `
      <svg width="50" height="50" viewBox="0 0 50 50">
        <circle cx="25" cy="25" r="22" fill="#bbb" stroke="#888" stroke-width="3"/>
        <circle cx="25" cy="25" r="14" fill="#fff" stroke="#888" stroke-width="2"/>
        <circle cx="25" cy="7" r="2" fill="#888"/>
        <circle cx="41" cy="25" r="2" fill="#888"/>
        <circle cx="25" cy="43" r="2" fill="#888"/>
        <circle cx="9" cy="25" r="2" fill="#888"/>
        <circle cx="36" cy="14" r="2" fill="#888"/>
        <circle cx="14" cy="14" r="2" fill="#888"/>
        <circle cx="36" cy="36" r="2" fill="#888"/>
        <circle cx="14" cy="36" r="2" fill="#888"/>
        <text x="25" y="48" text-anchor="middle" font-size="9" fill="#444" font-family="Arial">ROLAMENTO</text>
      </svg>
    `;
  }
  return "";
}

// Adiciona um componente à bancada
function adicionarComponente(type) {
  const comp = {
    id: type + "_" + (systemState.components.length + 1),
    type: type,
    x: 60 + Math.random() * 300,
    y: 80 + Math.random() * 180
  };
  systemState.components.push(comp);
  renderWorkbench();
}

function labelComponent(comp) {
  if (comp.type === "polia_motora") return "Polia Motora";
  if (comp.type === "polia_movida") return "Polia Movida";
  return comp.type.charAt(0).toUpperCase() + comp.type.slice(1);
}

// Renderiza componentes na bancada com SVG realista
function renderWorkbench() {
  const workbench = document.getElementById('workbench-area');
  Array.from(workbench.querySelectorAll('.placed-component')).forEach(el => el.remove());
  systemState.components.forEach(comp => {
    const el = document.createElement('div');
    el.className = `placed-component ${comp.type}`;
    el.id = comp.id;
    el.style.left = `${comp.x}px`;
    el.style.top = `${comp.y}px`;
    el.style.position = "absolute";
    el.innerHTML = getComponentSVG(comp.type) + `<div class="component-label">${labelComponent(comp)}</div>`;
    workbench.appendChild(el);
    el.addEventListener('mousedown', e => startDrag(e, comp.id));
    el.addEventListener('touchstart', e => startDrag(e, comp.id), {passive: false});
  });
}

// Drag & drop funcional
function startDrag(e, id) {
  e.preventDefault();
  dragInfo = {
    id: id,
    offsetX: (e.touches ? e.touches[0].clientX : e.clientX) - systemState.components.find(c => c.id === id).x,
    offsetY: (e.touches ? e.touches[0].clientY : e.clientY) - systemState.components.find(c => c.id === id).y
  };
  document.addEventListener('mousemove', doDrag);
  document.addEventListener('mouseup', endDrag);
  document.addEventListener('touchmove', doDrag, {passive: false});
  document.addEventListener('touchend', endDrag);
}
function doDrag(e) {
  if (!dragInfo) return;
  const comp = systemState.components.find(c => c.id === dragInfo.id);
  comp.x = (e.touches ? e.touches[0].clientX : e.clientX) - dragInfo.offsetX;
  comp.y = (e.touches ? e.touches[0].clientY : e.clientY) - dragInfo.offsetY;
  renderWorkbench();
}
function endDrag() {
  dragInfo = null;
  document.removeEventListener('mousemove', doDrag);
  document.removeEventListener('mouseup', endDrag);
  document.removeEventListener('touchmove', doDrag);
  document.removeEventListener('touchend', endDrag);
}

// Animação de simulação
function startSimulation() {
  simulationActive = true;
  document.getElementById('simulate-btn').style.display = 'none';
  document.getElementById('stop-sim-btn').style.display = '';
  animateComponents();
}

function stopSimulation() {
  simulationActive = false;
  document.getElementById('simulate-btn').style.display = '';
  document.getElementById('stop-sim-btn').style.display = 'none';
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  resetComponentTransforms();
}

function animateComponents() {
  if (!simulationActive) return;
  const now = performance.now();
  // Simulação básica: polias giram, motora mais rápido
  document.querySelectorAll('.placed-component.polia_motora').forEach((el, idx) => {
    el.style.transform = `rotate(${(now/4)%360}deg)`;
    el.style.transformOrigin = '50% 50%';
  });
  document.querySelectorAll('.placed-component.polia_movida').forEach((el, idx) => {
    el.style.transform = `rotate(-${(now/8)%360}deg)`;
    el.style.transformOrigin = '50% 50%';
  });
  // Motor pode pulsar para indicar funcionamento:
  document.querySelectorAll('.placed-component.motor').forEach(el => {
    const scale = 1.0 + 0.04*Math.sin(now/120);
    el.style.transform = `scale(${scale})`;
    el.style.transformOrigin = '50% 50%';
  });
  animationFrameId = requestAnimationFrame(animateComponents);
}

function resetComponentTransforms() {
  document.querySelectorAll('.placed-component').forEach(el => {
    el.style.transform = '';
  });
}

// Ativa botões da biblioteca
function setupLibraryButtons() {
  document.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', () => adicionarComponente(btn.dataset.type));
  });
}

// Eventos dos botões de simulação
function setupSimButtons() {
  const simBtn = document.getElementById('simulate-btn');
  const stopBtn = document.getElementById('stop-sim-btn');
  if (simBtn) simBtn.onclick = startSimulation;
  if (stopBtn) stopBtn.onclick = stopSimulation;
}

// Inicialização
window.addEventListener('DOMContentLoaded', () => {
  setupLibraryButtons();
  setupSimButtons();
  renderWorkbench();
});
