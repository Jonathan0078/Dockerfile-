// Importação do jsPDF (já carregado via CDN)
const { jsPDF } = window.jspdf;

// Estado global
let systemState = { components: [] };
let componentCounter = 0;
let currentEditingComponentId = null;
let activeComponent = null;
let offsetX = 0;
let offsetY = 0;

// Função para renderizar a bancada e seus componentes
function renderWorkbench() {
    const workbench = document.querySelector('#workbench-area');
    if (!workbench) return;

    // Remove componentes antigos
    workbench.querySelectorAll('.placed-component').forEach(el => el.remove());

    // Renderiza cada componente
    systemState.components.forEach(comp => {
        const el = document.createElement('div');
        el.className = `placed-component ${comp.type}`;
        el.id = comp.id;
        el.style.left = `${comp.x}px`;
        el.style.top = `${comp.y}px`;
        el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', `${comp.type.replace(/_/g, ' ')} número ${comp.id.split('_')[1]}`);

        // Conteúdo SVG conforme tipo
        if (comp.type === 'motor') {
            el.innerHTML = `
                <svg width="60" height="60" viewBox="0 0 60 60" class="girar" aria-hidden="true" focusable="false">
                    <rect x="10" y="20" width="40" height="20" rx="8" fill="#888"/>
                    <rect x="5" y="27" width="7" height="6" fill="#555"/>
                    <rect x="48" y="27" width="7" height="6" fill="#555"/>
                    <ellipse cx="30" cy="30" rx="7" ry="10" fill="#bbb" stroke="#666" stroke-width="1"/>
                    <g>
                        <circle cx="30" cy="30" r="6" fill="#0077cc"/>
                        <g>
                            <rect x="29" y="17" width="2" height="8" fill="#fff"/>
                            <rect x="29" y="35" width="2" height="8" fill="#fff"/>
                            <rect x="17" y="29" width="8" height="2" fill="#fff"/>
                            <rect x="35" y="29" width="8" height="2" fill="#fff"/>
                        </g>
                    </g>
                </svg>`;
        } else if (comp.type.includes('polia')) {
            el.innerHTML = `
                <svg width="60" height="60" viewBox="0 0 60 60" class="girar" aria-hidden="true" focusable="false">
                    <circle cx="30" cy="30" r="25" fill="#e0c080" stroke="#b8860b" stroke-width="4"/>
                    <circle cx="30" cy="30" r="10" fill="#fff" stroke="#b8860b" stroke-width="2"/>
                    <circle cx="30" cy="30" r="4" fill="#b8860b"/>
                </svg>`;
        } else if (comp.type === 'rolamento') {
            el.innerHTML = `
                <svg width="60" height="60" viewBox="0 0 60 60" class="girar" aria-hidden="true" focusable="false">
                    <circle cx="30" cy="30" r="25" fill="#eee" stroke="#999" stroke-width="4"/>
                    <circle cx="30" cy="30" r="18" fill="#ccc" stroke="#666" stroke-width="2"/>
                    <circle cx="30" cy="30" r="10" fill="#fff" stroke="#666" stroke-width="2"/>
                    <g>
                        <circle cx="30" cy="12" r="2" fill="#888"/>
                        <circle cx="45.21" cy="18.79" r="2" fill="#888"/>
                        <circle cx="48" cy="33" r="2" fill="#888"/>
                        <circle cx="41.21" cy="45.21" r="2" fill="#888"/>
                        <circle cx="30" cy="48" r="2" fill="#888"/>
                        <circle cx="18.79" cy="45.21" r="2" fill="#888"/>
                        <circle cx="12" cy="33" r="2" fill="#888"/>
                        <circle cx="14.79" cy="18.79" r="2" fill="#888"/>
                    </g>
                </svg>`;
        }

        // Label do componente
        const label = document.createElement('div');
        label.className = 'component-label';
        label.textContent = `${comp.type.replace(/_/g, ' ')} #${comp.id.split('_')[1]}`;
        el.appendChild(label);

        // Eventos para abrir modal e drag
        el.addEventListener('click', () => {
            if (!el.classList.contains('dragging')) openModalForComponent(comp.id);
        });
        el.addEventListener('mousedown', startDrag);
        el.addEventListener('touchstart', startDrag, { passive: false });

        workbench.appendChild(el);
    });
}

// Cria novo componente na bancada
function createComponent(type, x = 50, y = 50) {
    componentCounter++;
    const id = `comp_${componentCounter}`;
    const defaultSize = 80;
    const newComponent = { id, type, x, y, width: defaultSize, height: defaultSize, data: {} };
    systemState.components.push(newComponent);
    renderWorkbench();
    openModalForComponent(id);
}

// Drag & drop
function startDrag(e) {
    e.preventDefault();
    activeComponent = e.currentTarget;
    activeComponent.classList.add('dragging');

    const rect = activeComponent.getBoundingClientRect();
    const touch = e.type === 'touchstart' ? e.touches[0] : e;
    offsetX = touch.clientX - rect.left;
    offsetY = touch.clientY - rect.top;

    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', endDrag);
}

function drag(e) {
    if (!activeComponent) return;
    e.preventDefault();

    const workbench = document.querySelector('#workbench-area');
    if (!workbench) return;

    const touch = e.type === 'touchmove' ? e.touches[0] : e;
    const workbenchRect = workbench.getBoundingClientRect();

    let newX = touch.clientX - workbenchRect.left - offsetX;
    let newY = touch.clientY - workbenchRect.top - offsetY;

    // Limita dentro da bancada
    newX = Math.max(0, Math.min(newX, workbenchRect.width - activeComponent.offsetWidth));
    newY = Math.max(0, Math.min(newY, workbenchRect.height - activeComponent.offsetHeight));

    activeComponent.style.left = `${newX}px`;
    activeComponent.style.top = `${newY}px`;
}

function endDrag() {
    if (!activeComponent) return;

    const componentState = systemState.components.find(c => c.id === activeComponent.id);
    if (componentState) {
        componentState.x = parseFloat(activeComponent.style.left);
        componentState.y = parseFloat(activeComponent.style.top);
    }

    activeComponent.classList.remove('dragging');
    activeComponent = null;

    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchmove', drag);
    document.removeEventListener('touchend', endDrag);

    // Atualiza render para garantir estado consistente
    requestAnimationFrame(renderWorkbench);
}

// Abre modal para editar componente
function openModalForComponent(id) {
    currentEditingComponentId = id;
    const component = systemState.components.find(c => c.id === id);
    if (!component) return;

    const modal = document.getElementById('component-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalFields = document.getElementById('modal-fields');
    if (!modal || !modalTitle || !modalFields) return;

    modalTitle.textContent = `Configurar ${component.type.replace(/_/g, ' ')}`;

    const data = component.data || {};
    let fieldsHtml = '';

    switch (component.type) {
        case 'motor':
            fieldsHtml = `
                <div class="input-group">
                    <label for="power_kw">Potência (kW)</label>
                    <input type="number" id="power_kw" name="power_kw" step="any" required value="${data.power_kw || ''}" />
                </div>
                <div class="input-group">
                    <label for="rpm">Rotação (RPM)</label>
                    <input type="number" id="rpm" name="rpm" step="any" required value="${data.rpm || ''}" />
                </div>`;
            break;
        case 'polia_motora':
        case 'polia_movida':
            fieldsHtml = `
                <div class="input-group">
                    <label for="diameter">Diâmetro (mm)</label>
                    <input type="number" id="diameter" name="diameter" required value="${data.diameter || ''}" />
                </div>`;
            break;
        case 'rolamento':
            fieldsHtml = `
                <div class="input-group">
                    <label for="modelo">Modelo</label>
                    <input type="text" id="modelo" name="modelo" required value="${data.modelo || ''}" />
                </div>
                <div class="input-group">
                    <label for="bearing_type">Tipo de Rolamento</label>
                    <input type="text" id="bearing_type" name="bearing_type" required value="${data.bearing_type || ''}" />
                </div>
                <div class="input-group">
                    <label for="dynamic_load_c">Carga Dinâmica C (N)</label>
                    <input type="number" id="dynamic_load_c" name="dynamic_load_c" required value="${data.dynamic_load_c || ''}" />
                </div>`;
            break;
        default:
            fieldsHtml = '<p>Tipo de componente desconhecido.</p>';
    }

    modalFields.innerHTML = fieldsHtml;
    modal.classList.remove('hidden');
    modal.querySelector('input, select, textarea')?.focus();
}

// Submissão do formulário do modal
function handleModalSubmit(e) {
    e.preventDefault();
    const modalForm = e.target;
    const formData = new FormData(modalForm);
    const component = systemState.components.find(c => c.id === currentEditingComponentId);
    if (!component) return;

    for (let [key, value] of formData.entries()) {
        component.data[key] = value;
    }

    document.getElementById('component-modal').classList.add('hidden');
    renderWorkbench();
}

// Fecha modais
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
}

// Configura botões para adicionar componentes
function setupAddComponentButtons() {
    document.querySelectorAll('.add-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.getAttribute('data-type');
            createComponent(type, 50, 50);
        });
    });
}

// Função para limpar a bancada
function clearWorkbench() {
    if (confirm('Tem certeza que deseja limpar a bancada? Todos os componentes serão removidos.')) {
        systemState.components = [];
        componentCounter = 0;
        renderWorkbench();
        closeModal('component-modal');
        closeModal('optimize-modal');
        closeModal('save-project-modal');
        document.getElementById('results-panel').classList.add('hidden');
    }
}

// Função para salvar projeto (placeholder)
async function handleSaveProject(e) {
    e.preventDefault();
    const projectNameInput = document.getElementById('project-name');
    if (!projectNameInput || !projectNameInput.value.trim()) {
        alert('Por favor, dê um nome ao seu projeto.');
        projectNameInput?.focus();
        return;
    }
    const projectName = projectNameInput.value.trim();

    // Exemplo de payload
    const payload = {
        project_name: projectName,
        system_state: systemState
    };

    try {
        // Exemplo de chamada POST para backend
        const response = await fetch('/save_project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.success) {
            alert('Projeto salvo com sucesso!');
            closeModal('save-project-modal');
            // Atualizar lista de projetos se necessário
        } else {
            throw new Error(result.error || 'Falha ao salvar o projeto.');
        }
    } catch (error) {
        alert(`Erro ao salvar projeto: ${error.message}`);
    }
}

// Função para abrir modal salvar projeto
function openSaveProjectModal() {
    document.getElementById('save-project-modal').classList.remove('hidden');
    document.getElementById('project-name').value = '';
    document.getElementById('project-name').focus();
}

// Função para otimizar sistema (placeholder)
async function handleOptimizeSubmit(e) {
    e.preventDefault();

    if (systemState.components.length < 5) {
        alert("Para otimizar, o sistema precisa ter pelo menos um motor, duas polias e dois rolamentos.");
        return;
    }

    const selectedGoalInput = document.querySelector('input[name="optimization_goal"]:checked');
    if (!selectedGoalInput) {
        alert("Por favor, selecione um objetivo de otimização.");
        return;
    }
    const goal = selectedGoalInput.value;

    const payload = { system: systemState, goal };

    const resultsPanel = document.getElementById('results-panel');
    const resultsContent = document.getElementById('results-content');

    try {
        resultsContent.innerHTML = '<div class="loading-message">Otimizando... Isso pode levar um momento.</div>';
        resultsPanel.classList.remove('hidden');

        const response = await fetch('/optimize_system', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const results = await response.json();

        if (results.error) throw new Error(results.error);

        displayOptimizationResults(results, goal);
        closeModal('optimize-modal');
    } catch (error) {
        resultsContent.innerHTML = `<div style="color: var(--cor-erro);"><strong>Erro na otimização:</strong> ${error.message}</div>`;
    }
}

// Função para analisar sistema (placeholder)
async function handleAnalyzeClick() {
    if (systemState.components.length === 0) {
        alert("Bancada de trabalho vazia. Adicione componentes para analisar.");
        return;
    }

    const payload = { components: systemState.components, connections: [] };

    const resultsPanel = document.getElementById('results-panel');
    const resultsContent = document.getElementById('results-content');

    try {
        resultsContent.innerHTML = '<div class="loading-message">Analisando...</div>';
        resultsPanel.classList.remove('hidden');

        const response = await fetch('/analyze_system', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const results = await response.json();

        if (results.error) throw new Error(results.error);

        displayResults(results);
    } catch (error) {
        resultsContent.innerHTML = `<div style="color: var(--cor-erro);"><strong>Erro na análise:</strong> ${error.message}</div>`;
    }
}

// Exibe resultados da análise (exemplo simples)
function displayResults(results) {
    const resultsContent = document.getElementById('results-content');
    if (!resultsContent) return;

    let html = '<h3>Resultados</h3><ul>';
    for (const [key, value] of Object.entries(results)) {
        html += `<li>${key.replace(/_/g, ' ')}: <strong>${value}</strong></li>`;
    }
    html += '</ul>';

    resultsContent.innerHTML = html;
}

// Exibe resultados da otimização (exemplo simples)
function displayOptimizationResults(results, goal) {
    const resultsContent = document.getElementById('results-content');
    if (!resultsContent) return;

    let html = `<h3>Resultados da Otimização - Objetivo: ${goal}</h3><ul>`;
    for (const [key, value] of Object.entries(results)) {
        html += `<li>${key.replace(/_/g, ' ')}: <strong>${value}</strong></li>`;
    }
    html += '</ul>';

    resultsContent.innerHTML = html;
}

// Configura eventos dos botões principais
function setupMainButtons() {
    document.getElementById('desktop-save-btn')?.addEventListener('click', openSaveProjectModal);
    document.getElementById('desktop-clear-btn')?.addEventListener('click', clearWorkbench);
    document.getElementById('desktop-settings-btn')?.addEventListener('click', () => {
        document.getElementById('optimize-modal').classList.remove('hidden');
    });
    document.getElementById('desktop-analyze-btn')?.addEventListener('click', handleAnalyzeClick);

    // Mobile buttons
    document.getElementById('save-button')?.addEventListener('click', openSaveProjectModal);
    document.getElementById('clear-button')?.addEventListener('click', clearWorkbench);
    document.getElementById('settings-button')?.addEventListener('click', () => {
        document.getElementById('optimize-modal').classList.remove('hidden');
    });
    document.getElementById('analyze-button-mobile')?.addEventListener('click', handleAnalyzeClick);
}

// Configura fechamento dos modais
function setupModalCloseButtons() {
    document.getElementById('modal-close-btn')?.addEventListener('click', () => closeModal('component-modal'));
    document.getElementById('save-modal-close-btn')?.addEventListener('click', () => closeModal('save-project-modal'));
    document.getElementById('optimize-modal-close-btn')?.addEventListener('click', () => closeModal('optimize-modal'));
}

// Inicialização principal
document.addEventListener('DOMContentLoaded', () => {
    setupAddComponentButtons();
    setupMainButtons();
    setupModalCloseButtons();

    // Form submits
    document.getElementById('modal-form')?.addEventListener('submit', handleModalSubmit);
    document.getElementById('save-project-form')?.addEventListener('submit', handleSaveProject);
    document.getElementById('optimize-form')?.addEventListener('submit', handleOptimizeSubmit);

    renderWorkbench();
});
