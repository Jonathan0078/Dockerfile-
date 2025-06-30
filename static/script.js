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

const { jsPDF } = window.jspdf;

// Estado global
let systemState = { components: [], connections: [] };
let componentCounter = 0;
let currentEditingComponentId = null;
let lastResults = {};
let componentDatabase = {};
let activeComponent = null;
let offsetX = 0;
let offsetY = 0;

async function initializeData() {
    const welcomeMessage = document.getElementById('welcome-message');
    const projectList = document.getElementById('project-list');

    try {
        // Agora busca direto do arquivo estático database.json
        const response = await fetch('/database.json');
        if (!response.ok) throw new Error('Falha ao carregar database.json');
        componentDatabase = await response.json();
        if (!componentDatabase.rolamentos) componentDatabase.rolamentos = [];
    } catch (error) {
        alert("Não foi possível carregar o banco de dados de componentes.");
        componentDatabase = { rolamentos: [] };
    }

    try {
        if (projectList) await fetchAndDisplayProjects();
    } catch (error) {
        console.error("Erro ao carregar projetos:", error);
    }

    if (welcomeMessage) welcomeMessage.textContent = 'Bem-vindo!';
}

async function fetchAndDisplayProjects() {
    const projectList = document.getElementById('project-list');
    if (!projectList) return;
    try {
        const response = await fetch('/get_projects');
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        const projects = await response.json();
        projectList.innerHTML = '';
        if (projects.length === 0) {
            projectList.innerHTML = '<li>Nenhum projeto salvo.</li>';
        } else {
            projects.forEach(project => {
                const li = document.createElement('li');
                li.textContent = project.name;
                li.dataset.projectId = project.id;
                li.addEventListener('click', () => loadProject(project.id));
                projectList.appendChild(li);
            });
        }
    } catch {
        projectList.innerHTML = '<li>Erro ao carregar projetos.</li>';
    }
}

async function loadProject(projectId) {
    alert('Funcionalidade de carregar projeto ainda não implementada!');
}

async function handleSaveProject(e) {
    e.preventDefault();
    const projectName = document.getElementById('project-name').value;
    if (!projectName) {
        alert('Por favor, dê um nome ao seu projeto.');
        return;
    }
    const payload = { project_name: projectName, system_state: systemState };
    try {
        const response = await fetch('/save_project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (result.success) {
            alert('Projeto salvo com sucesso!');
            document.getElementById('save-project-modal').classList.add('hidden');
            await fetchAndDisplayProjects();
        } else {
            throw new Error(result.error || 'Falha ao salvar o projeto.');
        }
    } catch (error) {
        alert(`Erro ao salvar: ${error.message}`);
    }
}

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

    const resultsMobileContent = document.getElementById('results-mobile-content');
    const resultsMobileModal = document.getElementById('results-mobile-modal');
    const resultsContent = document.getElementById('results-content');
    const resultsPanel = document.getElementById('results-panel');
    const generatePdfBtn = document.getElementById('generate-pdf-btn');

    try {
        if (window.innerWidth <= 768 && resultsMobileContent && resultsMobileModal) {
            resultsMobileContent.innerHTML = '<div class="loading-message">Otimizando... Isso pode levar um momento.</div>';
            resultsMobileModal.classList.remove('hidden');
            document.getElementById('results-mobile-title').textContent = "Resultados da Otimização";
        } else if (resultsContent && resultsPanel) {
            resultsContent.innerHTML = '<div class="loading-message">Otimizando... Isso pode levar um momento.</div>';
            resultsPanel.classList.remove('hidden');
        } else {
            alert("Otimizando... Isso pode levar um momento.");
            return;
        }

        const response = await fetch('/optimize_system', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const results = await response.json();
        if (results.error) throw new Error(results.error);
        displayOptimizationResults(results, goal);
        document.getElementById('optimize-modal').classList.add('hidden');
    } catch (error) {
        const errorMessage = `<div style="color: var(--cor-erro);"><strong>Erro na otimização:</strong> ${error.message}</div>`;
        if (window.innerWidth <= 768 && resultsMobileContent && resultsMobileModal) {
            resultsMobileContent.innerHTML = errorMessage;
            resultsMobileModal.classList.remove('hidden');
        } else if (resultsContent && resultsPanel) {
            resultsContent.innerHTML = errorMessage;
            resultsPanel.classList.remove('hidden');
        } else {
            alert(`Erro na otimização: ${error.message}`);
        }
    }
}

async function handleAnalyzeClick() {
    if (systemState.components.length === 0) {
        alert("Bancada de trabalho vazia. Adicione componentes para analisar.");
        return;
    }
    const payload = { components: systemState.components, connections: [] };
    try {
        const resultsMobileContent = document.getElementById('results-mobile-content');
        const resultsMobileModal = document.getElementById('results-mobile-modal');
        const resultsContent = document.getElementById('results-content');
        const resultsPanel = document.getElementById('results-panel');

        if (window.innerWidth <= 768 && resultsMobileContent && resultsMobileModal) {
            resultsMobileContent.innerHTML = '<div class="loading-message">Analisando...</div>';
            resultsMobileModal.classList.remove('hidden');
            document.getElementById('results-mobile-title').textContent = "Resultados da Análise";
        } else if (resultsContent && resultsPanel) {
            resultsContent.innerHTML = '<div class="loading-message">Analisando...</div>';
            resultsPanel.classList.remove('hidden');
        } else {
            alert("Analisando... Isso pode levar um momento.");
            return;
        }

        const response = await fetch('/analyze_system', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const results = await response.json();
        if (results.error) throw new Error(results.error);
        lastResults = results;
        displayResults(results);
    } catch (error) {
        const errorMessage = `<div style="color: var(--cor-erro);"><strong>Erro na análise:</strong> ${error.message}</div>`;
        const resultsMobileContent = document.getElementById('results-mobile-content');
        const resultsMobileModal = document.getElementById('results-mobile-modal');
        const resultsContent = document.getElementById('results-content');
        const resultsPanel = document.getElementById('results-panel');

        if (window.innerWidth <= 768 && resultsMobileContent && resultsMobileModal) {
            resultsMobileContent.innerHTML = errorMessage;
            resultsMobileModal.classList.remove('hidden');
        } else if (resultsContent && resultsPanel) {
            resultsContent.innerHTML = errorMessage;
            resultsPanel.classList.remove('hidden');
        } else {
            alert(`Erro na análise: ${error.message}`);
        }
    }
}

function displayResults(results) {
    let targetContentElement;
    let targetPanelElement;
    let isMobileView = window.innerWidth <= 768;

    const resultsMobileContent = document.getElementById('results-mobile-content');
    const resultsMobileModal = document.getElementById('results-mobile-modal');
    const resultsContent = document.getElementById('results-content');
    const resultsPanel = document.getElementById('results-panel');
    const generatePdfBtn = document.getElementById('generate-pdf-btn');

    if (isMobileView && resultsMobileContent && resultsMobileModal) {
        targetContentElement = resultsMobileContent;
        targetPanelElement = resultsMobileModal;
        document.getElementById('results-mobile-title').textContent = "Resultados da Análise";
    } else if (resultsContent && resultsPanel) {
        targetContentElement = resultsContent;
        targetPanelElement = resultsPanel;
    } else {
        return;
    }

    let html = '';
    if (results.financeiro_energetico) {
        const fin = results.financeiro_energetico;
        html += `<h3>Análise Financeira e Energética</h3><ul>
            <li>Eficiência da Transmissão: <strong>${fin.eficiencia_transmissao}</strong></li>
            <li>Potência Perdida: <strong>${fin.potencia_perdida_watts} Watts</strong></li>
            <li>Consumo Anual: <strong>${fin.consumo_anual_kwh.toLocaleString('pt-BR')} kWh</strong></li>
            <li>Custo Anual (R$): <strong>${fin.custo_operacional_anual_brl.toLocaleString('pt-BR')}</strong></li>
        </ul>`;
    }
    html += '<h3>Resultados Técnicos</h3><ul>';
    for (const [key, value] of Object.entries(results.sistema)) {
        html += `<li>${key.replace(/_/g, ' ')}: <strong>${value}</strong></li>`;
    }
    html += '</ul>';

    let componentLifespans = [];
    let componentHtml = '<h3>Análise de Vida Útil</h3><ul>';
    let hasLifeData = false;
    for (const [id, data] of Object.entries(results)) {
        if (id.startsWith('comp_') && data.tipo === 'Rolamento') {
            hasLifeData = true;
            componentHtml += `<li>Vida Útil L10h (${id}): <strong>${data.vida_util_l10h.toLocaleString('pt-BR')} horas</strong></li>`;
            componentLifespans.push({ id, life: data.vida_util_l10h });
        }
    }
    componentHtml += '</ul>';
    if (hasLifeData) {
        html += componentHtml;
        componentLifespans.sort((a, b) => a.life - b.life);
        const weakestLink = componentLifespans[0];
        html += `<h3 class="weakest-link">Elo Mais Fraco: ${weakestLink.id}</h3>`;
    }
    targetContentElement.innerHTML = html;
    targetPanelElement.classList.remove('hidden');
    if (generatePdfBtn) {
        if (isMobileView) generatePdfBtn.classList.add('hidden');
        else generatePdfBtn.classList.remove('hidden');
    }
}

function displayOptimizationResults(results, goal) {
    let targetContentElement;
    let targetPanelElement;
    let isMobileView = window.innerWidth <= 768;

    const resultsMobileContent = document.getElementById('results-mobile-content');
    const resultsMobileModal = document.getElementById('results-mobile-modal');
    const resultsContent = document.getElementById('results-content');
    const resultsPanel = document.getElementById('results-panel');
    const generatePdfBtn = document.getElementById('generate-pdf-btn');

    if (isMobileView && resultsMobileContent && resultsMobileModal) {
        targetContentElement = resultsMobileContent;
        targetPanelElement = resultsMobileModal;
        document.getElementById('results-mobile-title').textContent = `Soluções de Otimização (${goal.toUpperCase()})`;
    } else if (resultsContent && resultsPanel) {
        targetContentElement = resultsContent;
        targetPanelElement = resultsPanel;
    } else {
        return;
    }

    let html = '';
    if (!results || results.length === 0) {
        html += '<p>Nenhuma solução otimizada encontrada.</p>';
    } else {
        html += '<ul class="optimization-list">';
        results.forEach((sol, index) => {
            html += `<li>
                <strong>Solução ${index + 1}:</strong> ${sol.config}<br>
                Custo Anual: R$ ${sol.cost.toLocaleString('pt-BR')}<br>
                Eficiência: ${sol.efficiency}%<br>
                Vida Útil Mínima: ${sol.min_life.toLocaleString('pt-BR')} horas
            </li>`;
        });
        html += '</ul>';
    }
    targetContentElement.innerHTML = html;
    targetPanelElement.classList.remove('hidden');
    if (generatePdfBtn) {
        if (isMobileView) generatePdfBtn.classList.add('hidden');
        else generatePdfBtn.classList.remove('hidden');
    }
}

// Bancada de trabalho e componentes
function createComponent(type, x, y) {
    componentCounter++;
    const id = `comp_${componentCounter}`;
    const defaultSize = (type.includes('polia')) ? 100 : 80;
    const newComponent = { id, type, x, y, width: defaultSize, height: defaultSize, data: {} };
    systemState.components.push(newComponent);
    renderWorkbench();
    openModalForComponent(id);
}

function renderWorkbench() {
    const workbench = document.getElementById('main-workbench')?.querySelector('#workbench-area');
    if (!workbench) return;
    workbench.querySelectorAll('.placed-component').forEach(el => el.remove());

    systemState.components.forEach(comp => {
        const el = document.createElement('div');
        el.className = `placed-component ${comp.type}`;
        el.id = comp.id;
        el.style.position = 'absolute';
        el.style.left = `${comp.x}px`;
        el.style.top = `${comp.y}px`;
        if (comp.type.includes('polia') && comp.data.diameter) {
            const scaleFactor = 0.8;
            el.style.width = `${Math.max(40, comp.data.diameter * scaleFactor)}px`;
            el.style.height = `${Math.max(40, comp.data.diameter * scaleFactor)}px`;
        } else {
            el.style.width = `${comp.width}px`;
            el.style.height = `${comp.height}px`;
        }
        el.setAttribute('tabindex', '0'); // Acessibilidade

        const label = document.createElement('div');
        label.className = 'component-label';
        label.textContent = `${comp.type.replace(/_/g, ' ')} #${comp.id.split('_')[1]}`;
        el.appendChild(label);
        workbench.appendChild(el);

        el.addEventListener('click', () => {
            if (!el.classList.contains('dragging')) openModalForComponent(comp.id);
        });
        el.addEventListener('mousedown', startDrag);
        el.addEventListener('touchstart', startDrag, { passive: false });
    });
    drawConnections();
}

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
    const workbench = document.getElementById('main-workbench')?.querySelector('#workbench-area');
    if (activeComponent && workbench) {
        e.preventDefault();
        const touch = e.type === 'touchmove' ? e.touches[0] : e;
        const workbenchRect = workbench.getBoundingClientRect();
        let newX = touch.clientX - workbenchRect.left - offsetX;
        let newY = touch.clientY - workbenchRect.top - offsetY;
        newX = Math.max(0, Math.min(newX, workbenchRect.width - activeComponent.offsetWidth));
        newY = Math.max(0, Math.min(newY, workbenchRect.height - activeComponent.offsetHeight));
        activeComponent.style.left = `${newX}px`;
        activeComponent.style.top = `${newY}px`;
        drawConnections();
    }
}

function endDrag() {
    if (activeComponent) {
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
        requestAnimationFrame(() => renderWorkbench());
    }
}

function openModalForComponent(id) {
    currentEditingComponentId = id;
    const component = systemState.components.find(c => c.id === id);
    if (!component) return;
    const modal = document.getElementById('component-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalFields = document.getElementById('modal-fields');
    if (!modal || !modalTitle || !modalFields) return;

    modalTitle.textContent = `Configurar ${component.type.replace(/_/g, ' ')}`;
    let fieldsHtml = '';
    const data = component.data;
    switch (component.type) {
        case 'motor':
            fieldsHtml = `
                <div class="input-group"><label>Potência (kW)</label><input type="number" step="any" name="power_kw" required value="${data.power_kw || ''}"></div>
                <div class="input-group"><label>Rotação (RPM)</label><input type="number" step="any" name="rpm" required value="${data.rpm || ''}"></div>
                <hr>
                <div class="input-group"><label>Eficiência do Motor (%)</label><input type="number" step="any" name="efficiency" value="${data.efficiency || '95'}"></div>
                <div class="input-group"><label>Custo Energia (R$/kWh)</label><input type="number" step="any" name="cost_per_kwh" value="${data.cost_per_kwh || '0.75'}"></div>
                <div class="input-group"><label>Horas de Operação/Dia</label><input type="number" step="any" name="operating_hours" value="${data.operating_hours || '8'}"></div>
            `;
            break;
        case 'polia_motora':
        case 'polia_movida':
            fieldsHtml = `<div class="input-group"><label>Diâmetro (mm)</label><input type="number" name="diameter" required value="${data.diameter || ''}"></div>`;
            if (component.type === 'polia_motora') {
                fieldsHtml += `
                    <div class="input-group">
                        <label>Tipo de Correia</label>
                        <select name="belt_type">
                            <option value="V" ${data.belt_type === 'V' ? 'selected' : ''}>Em V</option>
                            <option value="sincronizadora" ${data.belt_type === 'sincronizadora' ? 'selected' : ''}>Sincronizadora</option>
                            <option value="plana" ${data.belt_type === 'plana' ? 'selected' : ''}>Plana</option>
                        </select>
                    </div>
                `;
            }
            break;
        

    }
    modalFields.innerHTML = fieldsHtml;

    const modeloSelect = document.getElementById('rolamento-modelo-select');
    if (modeloSelect) {
        modeloSelect.addEventListener('change', e => {
            const selectedModelo = e.target.value;
            const rolamentoData = (componentDatabase.rolamentos || []).find(r => r.modelo === selectedModelo);
            if (rolamentoData) {
                document.getElementById('rolamento-tipo-input').value = rolamentoData.tipo;
                document.getElementById('rolamento-carga-c-input').value = rolamentoData.carga_c;
            } else {
                document.getElementById('rolamento-tipo-input').value = '';
                document.getElementById('rolamento-carga-c-input').value = '';
            }case 'rolamento':
    fieldsHtml = `
        <div class="input-group">
            <label>Modelo</label>
            <input type="text" name="modelo" value="${data.modelo || ''}" required>
        </div>
        <div class="input-group">
            <label>Tipo de Rolamento</label>
            <input type="text" name="bearing_type" value="${data.bearing_type || ''}" required>
        </div>
        <div class="input-group">
            <label>Carga Dinâmica C (N)</label>
            <input type="number" name="dynamic_load_c" required value="${data.dynamic_load_c || ''}">
        </div>
    `;
    break;

        });
    }
    modal.classList.remove('hidden');
}

function handleModalSubmit(e) {
    e.preventDefault();
    const modalForm = document.getElementById('modal-form');
    const formData = new FormData(modalForm);
    const component = systemState.components.find(c => c.id === currentEditingComponentId);
    if (component) {
        for (let [key, value] of formData.entries()) {
            component.data[key] = value;
        }
    }
    document.getElementById('component-modal').classList.add('hidden');
    renderWorkbench();
}

function clearWorkbench() {
    systemState.components = [];
    renderWorkbench();
    const resultsPanel = document.getElementById('results-panel');
    const resultsMobileModal = document.getElementById('results-mobile-modal');
    const generatePdfBtn = document.getElementById('generate-pdf-btn');
    if (resultsPanel) resultsPanel.classList.add('hidden');
    if (resultsMobileModal) resultsMobileModal.classList.add('hidden');
    if (generatePdfBtn) generatePdfBtn.classList.add('hidden');
}

async function generatePDF() {
    const workbench = document.getElementById('main-workbench')?.querySelector('#workbench-area');
    if (!workbench) {
        alert("A área de trabalho não está visível para gerar o PDF.");
        return;
    }
    const doc = new jsPDF();
    const workbenchImage = await html2canvas(workbench, { backgroundColor: "#ffffff", scale: 2 });
    const imgData = workbenchImage.toDataURL('image/png');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('Relatório de Análise de Sistema Mecânico', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 105, 30, { align: 'center' });
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Layout do Sistema', 14, 50);
    doc.addImage(imgData, 'PNG', 14, 60, 180, 120);
    doc.addPage();
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Análise Detalhada', 14, 20);
    let currentY = 30;
    function addSection(title, data) {
        if (!data || Object.keys(data).length === 0) return;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 14, currentY);
        currentY += 8;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        for (const [key, value] of Object.entries(data)) {
            let label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            doc.text(`${label}:`, 16, currentY);
            doc.text(String(value), 100, currentY);
            currentY += 7;
            if (currentY > 280) {
                doc.addPage();
                currentY = 20;
            }
        }
        currentY += 5;
    }
    addSection('Resultados Técnicos', lastResults.sistema);
    addSection('Análise Financeira e Energética', lastResults.financeiro_energetico);
    const lifeData = {};
    for (const [id, data] of Object.entries(lastResults)) {
        if (id.startsWith('comp_') && data.tipo === 'Rolamento') {
            lifeData[`Vida Util L10h (${id})`] = `${data.vida_util_l10h.toLocaleString('pt-BR')} horas`;
        }
    }
    addSection('Análise de Vida Útil dos Componentes', lifeData);
    doc.save(`relatorio-sistema-${Date.now()}.pdf`);
}

function drawConnections() {
    const connectionCanvas = document.getElementById('connection-canvas');
    if (!connectionCanvas) return;

    connectionCanvas.innerHTML = '';

    const p1Element = document.querySelector('.placed-component.polia_motora');
    const p2Element = document.querySelector('.placed-component.polia_movida');
    if (!p1Element || !p2Element) return;

    const r1 = p1Element.offsetWidth / 2;
    const c1x = parseFloat(p1Element.style.left) + r1;
    const c1y = parseFloat(p1Element.style.top) + r1;

    const r2 = p2Element.offsetWidth / 2;
    const c2x = parseFloat(p2Element.style.left) + r2;
    const c2y = parseFloat(p2Element.style.top) + r2;

    const dx = c2x - c1x;
    const dy = c2y - c1y;
    const d = Math.sqrt(dx * dx + dy * dy);

    if (d > r1 + r2) {
        const angle = Math.atan2(dy, dx);
        const alpha = Math.acos((r1 - r2) / d);
        const t1x_upper = c1x + r1 * Math.cos(angle - alpha);
        const t1y_upper = c1y + r1 * Math.sin(angle - alpha);
        const t1x_lower = c1x + r1 * Math.cos(angle + alpha);
        const t1y_lower = c1y + r1 * Math.sin(angle + alpha);
        const t2x_upper = c2x + r2 * Math.cos(angle - alpha);
        const t2y_upper = c2y + r2 * Math.sin(angle - alpha);
        const t2x_lower = c2x + r2 * Math.cos(angle + alpha);
        const t2y_lower = c2y + r2 * Math.sin(angle + alpha);

        const pathData = `M ${t1x_upper} ${t1y_upper} L ${t2x_upper} ${t2y_upper} M ${t1x_lower} ${t1y_lower} L ${t2x_lower} ${t2y_lower}`;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('class', 'belt-line');
        connectionCanvas.appendChild(path);
    }
}

// Fechar modais
function setupModalCloseButtons() {
    document.getElementById('save-modal-close-btn')?.addEventListener('click', () => {
        document.getElementById('save-project-modal').classList.add('hidden');
    });
    document.getElementById('modal-close-btn')?.addEventListener('click', () => {
        document.getElementById('component-modal').classList.add('hidden');
    });
    document.getElementById('optimize-modal-close-btn')?.addEventListener('click', () => {
        document.getElementById('optimize-modal').classList.add('hidden');
    });
}

// Botões adicionar componentes biblioteca
function setupAddComponentButtons() {
    document.querySelectorAll('.add-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            createComponent(type, 50, 50);
        });
    });
}

// Botões desktop e mobile sincronizados
function setupActionButtons() {
    // Desktop
    document.getElementById('desktop-save-btn')?.addEventListener('click', () => {
        document.getElementById('save-project-modal').classList.remove('hidden');
    });
    document.getElementById('desktop-clear-btn')?.addEventListener('click', clearWorkbench);
    document.getElementById('desktop-settings-btn')?.addEventListener('click', () => {
        document.getElementById('optimize-modal').classList.remove('hidden');
const { jsPDF } = window.jspdf;

// Estado global
let systemState = { components: [], connections: [] };
let componentCounter = 0;
let currentEditingComponentId = null;
let lastResults = {};
let componentDatabase = {};
let activeComponent = null;
let offsetX = 0;
let offsetY = 0;

async function initializeData() {
    const welcomeMessage = document.getElementById('welcome-message');
    const projectList = document.getElementById('project-list');

    try {
        const response = await fetch('/get_component_database');
        if (!response.ok) throw new Error('Falha ao carregar banco de dados.');
        componentDatabase = await response.json();
        if (!componentDatabase.rolamentos) componentDatabase.rolamentos = [];
    } catch (error) {
        alert("Não foi possível carregar o banco de dados de componentes.");
        componentDatabase.rolamentos = [];
    }

    try {
        if (projectList) await fetchAndDisplayProjects();
    } catch (error) {
        console.error("Erro ao carregar projetos:", error);
    }

    if (welcomeMessage) welcomeMessage.textContent = 'Bem-vindo!';
}

async function fetchAndDisplayProjects() {
    const projectList = document.getElementById('project-list');
    if (!projectList) return;
    try {
        const response = await fetch('/get_projects');
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        const projects = await response.json();
        projectList.innerHTML = '';
        if (projects.length === 0) {
            projectList.innerHTML = '<li>Nenhum projeto salvo.</li>';
        } else {
            projects.forEach(project => {
                const li = document.createElement('li');
                li.textContent = project.name;
                li.dataset.projectId = project.id;
                li.addEventListener('click', () => loadProject(project.id));
                projectList.appendChild(li);
            });
        }
    } catch {
        projectList.innerHTML = '<li>Erro ao carregar projetos.</li>';
    }
}

async function loadProject(projectId) {
    alert('Funcionalidade de carregar projeto ainda não implementada!');
}

async function handleSaveProject(e) {
    e.preventDefault();
    const projectName = document.getElementById('project-name').value;
    if (!projectName) {
        alert('Por favor, dê um nome ao seu projeto.');
        return;
    }
    const payload = { project_name: projectName, system_state: systemState };
    try {
        const response = await fetch('/save_project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (result.success) {
            alert('Projeto salvo com sucesso!');
            document.getElementById('save-project-modal').classList.add('hidden');
            await fetchAndDisplayProjects();
        } else {
            throw new Error(result.error || 'Falha ao salvar o projeto.');
        }
    } catch (error) {
        alert(`Erro ao salvar: ${error.message}`);
    }
}

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

    const resultsMobileContent = document.getElementById('results-mobile-content');
    const resultsMobileModal = document.getElementById('results-mobile-modal');
    const resultsContent = document.getElementById('results-content');
    const resultsPanel = document.getElementById('results-panel');
    const generatePdfBtn = document.getElementById('generate-pdf-btn');

    try {
        if (window.innerWidth <= 768 && resultsMobileContent && resultsMobileModal) {
            resultsMobileContent.innerHTML = '<div class="loading-message">Otimizando... Isso pode levar um momento.</div>';
            resultsMobileModal.classList.remove('hidden');
            document.getElementById('results-mobile-title').textContent = "Resultados da Otimização";
        } else if (resultsContent && resultsPanel) {
            resultsContent.innerHTML = '<div class="loading-message">Otimizando... Isso pode levar um momento.</div>';
            resultsPanel.classList.remove('hidden');
        } else {
            alert("Otimizando... Isso pode levar um momento.");
            return;
        }

        const response = await fetch('/optimize_system', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const results = await response.json();
        if (results.error) throw new Error(results.error);
        displayOptimizationResults(results, goal);
        document.getElementById('optimize-modal').classList.add('hidden');
    } catch (error) {
        const errorMessage = `<div style="color: var(--cor-erro);"><strong>Erro na otimização:</strong> ${error.message}</div>`;
        if (window.innerWidth <= 768 && resultsMobileContent && resultsMobileModal) {
            resultsMobileContent.innerHTML = errorMessage;
            resultsMobileModal.classList.remove('hidden');
        } else if (resultsContent && resultsPanel) {
            resultsContent.innerHTML = errorMessage;
            resultsPanel.classList.remove('hidden');
        } else {
            alert(`Erro na otimização: ${error.message}`);
        }
    }
}

async function handleAnalyzeClick() {
    if (systemState.components.length === 0) {
        alert("Bancada de trabalho vazia. Adicione componentes para analisar.");
        return;
    }
    const payload = { components: systemState.components, connections: [] };
    try {
        const resultsMobileContent = document.getElementById('results-mobile-content');
        const resultsMobileModal = document.getElementById('results-mobile-modal');
        const resultsContent = document.getElementById('results-content');
        const resultsPanel = document.getElementById('results-panel');

        if (window.innerWidth <= 768 && resultsMobileContent && resultsMobileModal) {
            resultsMobileContent.innerHTML = '<div class="loading-message">Analisando...</div>';
            resultsMobileModal.classList.remove('hidden');
            document.getElementById('results-mobile-title').textContent = "Resultados da Análise";
        } else if (resultsContent && resultsPanel) {
            resultsContent.innerHTML = '<div class="loading-message">Analisando...</div>';
            resultsPanel.classList.remove('hidden');
        } else {
            alert("Analisando... Isso pode levar um momento.");
            return;
        }

        const response = await fetch('/analyze_system', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const results = await response.json();
        if (results.error) throw new Error(results.error);
        lastResults = results;
        displayResults(results);
    } catch (error) {
        const errorMessage = `<div style="color: var(--cor-erro);"><strong>Erro na análise:</strong> ${error.message}</div>`;
        const resultsMobileContent = document.getElementById('results-mobile-content');
        const resultsMobileModal = document.getElementById('results-mobile-modal');
        const resultsContent = document.getElementById('results-content');
        const resultsPanel = document.getElementById('results-panel');

        if (window.innerWidth <= 768 && resultsMobileContent && resultsMobileModal) {
            resultsMobileContent.innerHTML = errorMessage;
            resultsMobileModal.classList.remove('hidden');
        } else if (resultsContent && resultsPanel) {
            resultsContent.innerHTML = errorMessage;
            resultsPanel.classList.remove('hidden');
        } else {
            alert(`Erro na análise: ${error.message}`);
        }
    }
}

function displayResults(results) {
    let targetContentElement;
    let targetPanelElement;
    let isMobileView = window.innerWidth <= 768;

    const resultsMobileContent = document.getElementById('results-mobile-content');
    const resultsMobileModal = document.getElementById('results-mobile-modal');
    const resultsContent = document.getElementById('results-content');
    const resultsPanel = document.getElementById('results-panel');
    const generatePdfBtn = document.getElementById('generate-pdf-btn');

    if (isMobileView && resultsMobileContent && resultsMobileModal) {
        targetContentElement = resultsMobileContent;
        targetPanelElement = resultsMobileModal;
        document.getElementById('results-mobile-title').textContent = "Resultados da Análise";
    } else if (resultsContent && resultsPanel) {
        targetContentElement = resultsContent;
        targetPanelElement = resultsPanel;
    } else {
        return;
    }

    let html = '';
    if (results.financeiro_energetico) {
        const fin = results.financeiro_energetico;
        html += `<h3>Análise Financeira e Energética</h3><ul>
            <li>Eficiência da Transmissão: <strong>${fin.eficiencia_transmissao}</strong></li>
            <li>Potência Perdida: <strong>${fin.potencia_perdida_watts} Watts</strong></li>
            <li>Consumo Anual: <strong>${fin.consumo_anual_kwh.toLocaleString('pt-BR')} kWh</strong></li>
            <li>Custo Anual (R$): <strong>${fin.custo_operacional_anual_brl.toLocaleString('pt-BR')}</strong></li>
        </ul>`;
    }
    html += '<h3>Resultados Técnicos</h3><ul>';
    for (const [key, value] of Object.entries(results.sistema)) {
        html += `<li>${key.replace(/_/g, ' ')}: <strong>${value}</strong></li>`;
    }
    html += '</ul>';

    let componentLifespans = [];
    let componentHtml = '<h3>Análise de Vida Útil</h3><ul>';
    let hasLifeData = false;
    for (const [id, data] of Object.entries(results)) {
        if (id.startsWith('comp_') && data.tipo === 'Rolamento') {
            hasLifeData = true;
            componentHtml += `<li>Vida Útil L10h (${id}): <strong>${data.vida_util_l10h.toLocaleString('pt-BR')} horas</strong></li>`;
            componentLifespans.push({ id, life: data.vida_util_l10h });
        }
    }
    componentHtml += '</ul>';
    if (hasLifeData) {
        html += componentHtml;
        componentLifespans.sort((a, b) => a.life - b.life);
        const weakestLink = componentLifespans[0];
        html += `<h3 class="weakest-link">Elo Mais Fraco: ${weakestLink.id}</h3>`;
    }
    targetContentElement.innerHTML = html;
    targetPanelElement.classList.remove('hidden');
    if (generatePdfBtn) {
        if (isMobileView) generatePdfBtn.classList.add('hidden');
        else generatePdfBtn.classList.remove('hidden');
    }
}

function displayOptimizationResults(results, goal) {
    let targetContentElement;
    let targetPanelElement;
    let isMobileView = window.innerWidth <= 768;

    const resultsMobileContent = document.getElementById('results-mobile-content');
    const resultsMobileModal = document.getElementById('results-mobile-modal');
    const resultsContent = document.getElementById('results-content');
    const resultsPanel = document.getElementById('results-panel');
    const generatePdfBtn = document.getElementById('generate-pdf-btn');

    if (isMobileView && resultsMobileContent && resultsMobileModal) {
        targetContentElement = resultsMobileContent;
        targetPanelElement = resultsMobileModal;
        document.getElementById('results-mobile-title').textContent = `Soluções de Otimização (${goal.toUpperCase()})`;
    } else if (resultsContent && resultsPanel) {
        targetContentElement = resultsContent;
        targetPanelElement = resultsPanel;
    } else {
        return;
    }

    let html = '';
    if (!results || results.length === 0) {
        html += '<p>Nenhuma solução otimizada encontrada.</p>';
    } else {
        html += '<ul class="optimization-list">';
        results.forEach((sol, index) => {
            html += `<li>
                <strong>Solução ${index + 1}:</strong> ${sol.config}<br>
                Custo Anual: R$ ${sol.cost.toLocaleString('pt-BR')}<br>
                Eficiência: ${sol.efficiency}%<br>
                Vida Útil Mínima: ${sol.min_life.toLocaleString('pt-BR')} horas
            </li>`;
        });
        html += '</ul>';
    }
    targetContentElement.innerHTML = html;
    targetPanelElement.classList.remove('hidden');
    if (generatePdfBtn) {
        if (isMobileView) generatePdfBtn.classList.add('hidden');
        else generatePdfBtn.classList.remove('hidden');
    }
}

// Bancada de trabalho e componentes
function createComponent(type, x, y) {
    componentCounter++;
    const id = `comp_${componentCounter}`;
    const defaultSize = (type.includes('polia')) ? 100 : 80;
    const newComponent = { id, type, x, y, width: defaultSize, height: defaultSize, data: {} };
    systemState.components.push(newComponent);
    renderWorkbench();
    openModalForComponent(id);
}

function renderWorkbench() {
    const workbench = document.getElementById('main-workbench')?.querySelector('#workbench-area');
    if (!workbench) return;
    workbench.querySelectorAll('.placed-component').forEach(el => el.remove());

    systemState.components.forEach(comp => {
        const el = document.createElement('div');
        el.className = `placed-component ${comp.type}`;
        el.id = comp.id;
        el.style.position = 'absolute';
        el.style.left = `${comp.x}px`;
        el.style.top = `${comp.y}px`;
        if (comp.type.includes('polia') && comp.data.diameter) {
            const scaleFactor = 0.8;
            el.style.width = `${Math.max(40, comp.data.diameter * scaleFactor)}px`;
            el.style.height = `${Math.max(40, comp.data.diameter * scaleFactor)}px`;
        } else {
            el.style.width = `${comp.width}px`;
            el.style.height = `${comp.height}px`;
        }
        el.setAttribute('tabindex', '0'); // <-- Aqui adicionamos tabindex para acessibilidade

        const label = document.createElement('div');
        label.className = 'component-label';
        label.textContent = `${comp.type.replace(/_/g, ' ')} #${comp.id.split('_')[1]}`;
        el.appendChild(label);
        workbench.appendChild(el);

        el.addEventListener('click', () => {
            if (!el.classList.contains('dragging')) openModalForComponent(comp.id);
        });
        el.addEventListener('mousedown', startDrag);
        el.addEventListener('touchstart', startDrag, { passive: false });
    });
    drawConnections();
}

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
    const workbench = document.getElementById('main-workbench')?.querySelector('#workbench-area');
    if (activeComponent && workbench) {
        e.preventDefault();
        const touch = e.type === 'touchmove' ? e.touches[0] : e;
        const workbenchRect = workbench.getBoundingClientRect();
        let newX = touch.clientX - workbenchRect.left - offsetX;
        let newY = touch.clientY - workbenchRect.top - offsetY;
        newX = Math.max(0, Math.min(newX, workbenchRect.width - activeComponent.offsetWidth));
        newY = Math.max(0, Math.min(newY, workbenchRect.height - activeComponent.offsetHeight));
        activeComponent.style.left = `${newX}px`;
        activeComponent.style.top = `${newY}px`;
        drawConnections();
    }
}

function endDrag() {
    if (activeComponent) {
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
        requestAnimationFrame(() => renderWorkbench());
    }
}

function openModalForComponent(id) {
    currentEditingComponentId = id;
    const component = systemState.components.find(c => c.id === id);
    if (!component) return;
    const modal = document.getElementById('component-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalFields = document.getElementById('modal-fields');
    if (!modal || !modalTitle || !modalFields) return;

    modalTitle.textContent = `Configurar ${component.type.replace(/_/g, ' ')}`;
    let fieldsHtml = '';
    const data = component.data;
    switch (component.type) {
        case 'motor':
            fieldsHtml = `
                <div class="input-group"><label>Potência (kW)</label><input type="number" step="any" name="power_kw" required value="${data.power_kw || ''}"></div>
                <div class="input-group"><label>Rotação (RPM)</label><input type="number" step="any" name="rpm" required value="${data.rpm || ''}"></div>
                <hr>
                <div class="input-group"><label>Eficiência do Motor (%)</label><input type="number" step="any" name="efficiency" value="${data.efficiency || '95'}"></div>
                <div class="input-group"><label>Custo Energia (R$/kWh)</label><input type="number" step="any" name="cost_per_kwh" value="${data.cost_per_kwh || '0.75'}"></div>
                <div class="input-group"><label>Horas de Operação/Dia</label><input type="number" step="any" name="operating_hours" value="${data.operating_hours || '8'}"></div>
            `;
            break;
        case 'polia_motora':
        case 'polia_movida':
            fieldsHtml = `<div class="input-group"><label>Diâmetro (mm)</label><input type="number" name="diameter" required value="${data.diameter || ''}"></div>`;
            if (component.type === 'polia_motora') {
                fieldsHtml += `
                    <div class="input-group">
                        <label>Tipo de Correia</label>
                        <select name="belt_type">
                            <option value="V" ${data.belt_type === 'V' ? 'selected' : ''}>Em V</option>
                            <option value="sincronizadora" ${data.belt_type === 'sincronizadora' ? 'selected' : ''}>Sincronizadora</option>
                            <option value="plana" ${data.belt_type === 'plana' ? 'selected' : ''}>Plana</option>
                        </select>
                    </div>
                `;
            }
            break;
        case 'rolamento':
            let options = (componentDatabase.rolamentos || []).map(r => `<option value="${r.modelo}" ${data.modelo === r.modelo ? 'selected' : ''}>${r.modelo}</option>`).join('');
            fieldsHtml = `
                <div class="input-group">
                    <label>Selecione o Modelo</label>
                    <select id="rolamento-modelo-select" name="modelo">
                        <option value="">-- Escolha um modelo --</option>
                        ${options}
                    </select>
                </div>
                <div class="input-group"><label>Tipo de Rolamento</label><input type="text" id="rolamento-tipo-input" name="bearing_type" value="${data.bearing_type || ''}"></div>
                <div class="input-group"><label>Carga Dinâmica C (N)</label><input type="number" id="rolamento-carga-c-input" name="dynamic_load_c" required value="${data.dynamic_load_c || ''}"></div>
            `;
            break;
    }
    modalFields.innerHTML = fieldsHtml;

    const modeloSelect = document.getElementById('rolamento-modelo-select');
    if (modeloSelect) {
        modeloSelect.addEventListener('change', e => {
            const selectedModelo = e.target.value;
            const rolamentoData = (componentDatabase.rolamentos || []).find(r => r.modelo === selectedModelo);
            if (rolamentoData) {
                document.getElementById('rolamento-tipo-input').value = rolamentoData.tipo;
                document.getElementById('rolamento-carga-c-input').value = rolamentoData.carga_c;
            } else {
                document.getElementById('rolamento-tipo-input').value = '';
                document.getElementById('rolamento-carga-c-input').value = '';
            }
        });
    }
    modal.classList.remove('hidden');
}

function handleModalSubmit(e) {
    e.preventDefault();
    const modalForm = document.getElementById('modal-form');
    const formData = new FormData(modalForm);
    const component = systemState.components.find(c => c.id === currentEditingComponentId);
    if (component) {
        for (let [key, value] of formData.entries()) {
            component.data[key] = value;
        }
    }
    document.getElementById('component-modal').classList.add('hidden');
    renderWorkbench();
}

function clearWorkbench() {
    systemState.components = [];
    renderWorkbench();
    const resultsPanel = document.getElementById('results-panel');
    const resultsMobileModal = document.getElementById('results-mobile-modal');
    const generatePdfBtn = document.getElementById('generate-pdf-btn');
    if (resultsPanel) resultsPanel.classList.add('hidden');
    if (resultsMobileModal) resultsMobileModal.classList.add('hidden');
    if (generatePdfBtn) generatePdfBtn.classList.add('hidden');
}

async function generatePDF() {
    const workbench = document.getElementById('main-workbench')?.querySelector('#workbench-area');
    if (!workbench) {
        alert("A área de trabalho não está visível para gerar o PDF.");
        return;
    }
    const doc = new jsPDF();
    const workbenchImage = await html2canvas(workbench, { backgroundColor: "#ffffff", scale: 2 });
    const imgData = workbenchImage.toDataURL('image/png');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('Relatório de Análise de Sistema Mecânico', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 105, 30, { align: 'center' });
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Layout do Sistema', 14, 50);
    doc.addImage(imgData, 'PNG', 14, 60, 180, 120);
    doc.addPage();
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Análise Detalhada', 14, 20);
    let currentY = 30;
    function addSection(title, data) {
        if (!data || Object.keys(data).length === 0) return;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 14, currentY);
        currentY += 8;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        for (const [key, value] of Object.entries(data)) {
            let label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            doc.text(`${label}:`, 16, currentY);
            doc.text(String(value), 100, currentY);
            currentY += 7;
            if (currentY > 280) {
                doc.addPage();
                currentY = 20;
            }
        }
        currentY += 5;
    }
    addSection('Resultados Técnicos', lastResults.sistema);
    addSection('Análise Financeira e Energética', lastResults.financeiro_energetico);
    const lifeData = {};
    for (const [id, data] of Object.entries(lastResults)) {
        if (id.startsWith('comp_') && data.tipo === 'Rolamento') {
            lifeData[`Vida Util L10h (${id})`] = `${data.vida_util_l10h.toLocaleString('pt-BR')} horas`;
        }
    }
    addSection('Análise de Vida Útil dos Componentes', lifeData);
    doc.save(`relatorio-sistema-${Date.now()}.pdf`);
}

function drawConnections() {
    const connectionCanvas = document.getElementById('connection-canvas');
    if (!connectionCanvas) return;

    connectionCanvas.innerHTML = '';

    const p1Element = document.querySelector('.placed-component.polia_motora');
    const p2Element = document.querySelector('.placed-component.polia_movida');
    if (!p1Element || !p2Element) return;

    const r1 = p1Element.offsetWidth / 2;
    const c1x = parseFloat(p1Element.style.left) + r1;
    const c1y = parseFloat(p1Element.style.top) + r1;

    const r2 = p2Element.offsetWidth / 2;
    const c2x = parseFloat(p2Element.style.left) + r2;
    const c2y = parseFloat(p2Element.style.top) + r2;

    const dx = c2x - c1x;
    const dy = c2y - c1y;
    const d = Math.sqrt(dx * dx + dy * dy);

    if (d > r1 + r2) {
        const angle = Math.atan2(dy, dx);
        const alpha = Math.acos((r1 - r2) / d);
        const t1x_upper = c1x + r1 * Math.cos(angle - alpha);
        const t1y_upper = c1y + r1 * Math.sin(angle - alpha);
        const t1x_lower = c1x + r1 * Math.cos(angle + alpha);
        const t1y_lower = c1y + r1 * Math.sin(angle + alpha);
        const t2x_upper = c2x + r2 * Math.cos(angle - alpha);
        const t2y_upper = c2y + r2 * Math.sin(angle - alpha);
        const t2x_lower = c2x + r2 * Math.cos(angle + alpha);
        const t2y_lower = c2y + r2 * Math.sin(angle + alpha);

        const pathData = `M ${t1x_upper} ${t1y_upper} L ${t2x_upper} ${t2y_upper} M ${t1x_lower} ${t1y_lower} L ${t2x_lower} ${t2y_lower}`;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('class', 'belt-line');
        connectionCanvas.appendChild(path);
    }
}

// Fechar modais
function setupModalCloseButtons() {
    document.getElementById('save-modal-close-btn')?.addEventListener('click', () => {
        document.getElementById('save-project-modal').classList.add('hidden');
    });
    document.getElementById('modal-close-btn')?.addEventListener('click', () => {
        document.getElementById('component-modal').classList.add('hidden');
    });
    document.getElementById('optimize-modal-close-btn')?.addEventListener('click', () => {
        document.getElementById('optimize-modal').classList.add('hidden');
    });
}

// Botões adicionar componentes biblioteca
function setupAddComponentButtons() {
    document.querySelectorAll('.add-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            createComponent(type, 50, 50);
        });
    });
}

// Botões desktop e mobile sincronizados
function setupActionButtons() {
    // Desktop
    document.getElementById('desktop-save-btn')?.addEventListener('click', () => {
        document.getElementById('save-project-modal').classList.remove('hidden');
    });
    document.getElementById('desktop-clear-btn')?.addEventListener('click', clearWorkbench);
    document.getElementById('desktop-settings-btn')?.addEventListener('click', () => {
        document.getElementById('optimize-modal').classList.remove('hidden');
    });
    document.getElementById('desktop-analyze-btn')?.addEventListener('click', handleAnalyzeClick);

// Importação do jsPDF (já carregado via CDN)
const { jsPDF } = window.jspdf;

// Estado global
let systemState = { components: [], connections: [] };
let componentCounter = 0;
let currentEditingComponentId = null;
let lastResults = {};
let componentDatabase = {};
let activeComponent = null;
let offsetX = 0;
let offsetY = 0;

// Inicialização após DOM carregado
document.addEventListener('DOMContentLoaded', () => {
    setupAddComponentButtons();
    setupMainButtons();
    initializeData();
    renderWorkbench();

    // Formulários dos modais
    document.getElementById('modal-form')?.addEventListener('submit', handleModalSubmit);
    document.getElementById('save-project-form')?.addEventListener('submit', handleSaveProject);
    document.getElementById('optimize-form')?.addEventListener('submit', handleOptimizeSubmit);

    // Botões fechar modais
    document.getElementById('modal-close-btn')?.addEventListener('click', () => closeModal('component-modal'));
    document.getElementById('save-modal-close-btn')?.addEventListener('click', () => closeModal('save-project-modal'));
    document.getElementById('optimize-modal-close-btn')?.addEventListener('click', () => closeModal('optimize-modal'));

    // Botão gerar PDF
    document.getElementById('generate-pdf-btn')?.addEventListener('click', generatePDFReport);
});

// -------------------- Renderização da bancada --------------------

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
        el.style.position = 'absolute';
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

// -------------------- Criação e edição de componentes --------------------

function createComponent(type, x = 50, y = 50) {
    componentCounter++;
    const id = `comp_${componentCounter}`;
    const defaultSize = 80;
    const newComponent = { id, type, x, y, width: defaultSize, height: defaultSize, data: {} };
    systemState.components.push(newComponent);
    renderWorkbench();
    openModalForComponent(id);
}

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

function handleModalSubmit(e) {
    e.preventDefault();
    const modalForm = e.target;
    const formData = new FormData(modalForm);
    const component = systemState.components.find(c => c.id === currentEditingComponentId);
    if (!component) return;

    for (let [key, value] of formData.entries()) {
        component.data[key] = value;
    }

    closeModal('component-modal');
    renderWorkbench();
}

// -------------------- Drag & Drop --------------------

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

// -------------------- Botões e ações principais --------------------

function setupAddComponentButtons() {
    document.querySelectorAll('.add-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.getAttribute('data-type');
            createComponent(type, 50, 50);
        });
    });
}

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

function clearWorkbench() {
    if (confirm('Tem certeza que deseja limpar a bancada? Todos os componentes serão removidos.')) {
        systemState.components = [];
        systemState.connections = [];
        componentCounter = 0;
        renderWorkbench();
        closeModal('component-modal');
        closeModal('optimize-modal');
        closeModal('save-project-modal');
        document.getElementById('results-panel').classList.add('hidden');
    }
}

function openSaveProjectModal() {
    const modal = document.getElementById('save-project-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    const input = document.getElementById('project-name');
    if (input) {
        input.value = '';
        input.focus();
    }
}

// -------------------- Salvar Projeto --------------------

async function handleSaveProject(e) {
    e.preventDefault();
    const projectNameInput = document.getElementById('project-name');
    if (!projectNameInput || !projectNameInput.value.trim()) {
        alert('Por favor, dê um nome ao seu projeto.');
        projectNameInput?.focus();
        return;
    }
    const projectName = projectNameInput.value.trim();

    const payload = {
        project_name: projectName,
        system_state: systemState
    };

    try {
        const response = await fetch('/save_project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.success) {
            alert('Projeto salvo com sucesso!');
            closeModal('save-project-modal');
            await fetchAndDisplayProjects();
        } else {
            throw new Error(result.error || 'Falha ao salvar o projeto.');
        }
    } catch (error) {
        alert(`Erro ao salvar projeto: ${error.message}`);
    }
}

// -------------------- Otimização --------------------

async function handleOptimizeSubmit(e) {
    e.preventDefault();

    // Validação mínima: pelo menos 1 motor, 2 polias e 2 rolamentos
    const motorCount = systemState.components.filter(c => c.type === 'motor').length;
    const poliaCount = systemState.components.filter(c => c.type === 'polia_motora' || c.type === 'polia_movida').length;
    const rolamentoCount = systemState.components.filter(c => c.type === 'rolamento').length;

    if (motorCount < 1 || poliaCount < 2 || rolamentoCount < 2) {
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

// -------------------- Análise --------------------

async function handleAnalyzeClick() {
    if (systemState.components.length === 0) {
        alert("Bancada de trabalho vazia. Adicione componentes para analisar.");
        return;
    }

    const payload = { components: systemState.components, connections: systemState.connections };

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

// -------------------- Exibição de resultados --------------------

function displayResults(results) {
    const resultsContent = document.getElementById('results-content');
    if (!resultsContent) return;

    let html = '<h3>Resultados</h3><ul>';
    for (const [key, value] of Object.entries(results)) {
        html += `<li>${key.replace(/_/g, ' ')}: <strong>${value}</strong></li>`;
    }
    html += '</ul>';

    resultsContent.innerHTML = html;

    // Mostrar botão gerar PDF
    document.getElementById('generate-pdf-btn')?.classList.remove('hidden');
}

function displayOptimizationResults(results, goal) {
    const resultsContent = document.getElementById('results-content');
    if (!resultsContent) return;

    let html = `<h3>Resultados da Otimização - Objetivo: ${goal}</h3><ul>`;
    for (const [key, value] of Object.entries(results)) {
        html += `<li>${key.replace(/_/g, ' ')}: <strong>${value}</strong></li>`;
    }
    html += '</ul>';

    resultsContent.innerHTML = html;

    // Mostrar botão gerar PDF
    document.getElementById('generate-pdf-btn')?.classList.remove('hidden');
}

// -------------------- Gerar PDF --------------------

function generatePDFReport() {
    const resultsContent = document.getElementById('results-content');
    if (!resultsContent) return;

    const pdf = new jsPDF();

    pdf.setFontSize(16);
    pdf.text("Relatório de Análise / Otimização", 10, 20);

    pdf.setFontSize(12);
    const lines = resultsContent.innerText.split('\n');
    let y = 30;
    lines.forEach(line => {
        pdf.text(line, 10, y);
        y += 10;
    });

    pdf.save('relatorio.pdf');
}

// -------------------- Modais --------------------

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
}

// -------------------- Inicialização de dados --------------------

async function initializeData() {
    const welcomeMessage = document.getElementById('welcome-message');
    const projectList = document.getElementById('project-list');

    try {
        // Busca do arquivo estático database.json
        const response = await fetch('/database.json');
        if (!response.ok) throw new Error('Falha ao carregar database.json');
        componentDatabase = await response.json();
        if (!componentDatabase.rolamentos) componentDatabase.rolamentos = [];
    } catch (error) {
        alert("Não foi possível carregar o banco de dados de componentes.");
        componentDatabase = { rolamentos: [] };
    }

    try {
        if (projectList) await fetchAndDisplayProjects();
    } catch (error) {
        console.error("Erro ao carregar projetos:", error);
    }

    if (welcomeMessage) welcomeMessage.textContent = 'Bem-vindo!';
}

async function fetchAndDisplayProjects() {
    const projectList = document.getElementById('project-list');
    if (!projectList) return;
    try {
        const response = await fetch('/get_projects');
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        const projects = await response.json();
        projectList.innerHTML = '';
        if (projects.length === 0) {
            projectList.innerHTML = '<li>Nenhum projeto salvo.</li>';
        } else {
            projects.forEach(project => {
                const li = document.createElement('li');
                li.textContent = project.name;
                li.dataset.projectId = project.id;
                li.addEventListener('click', () => loadProject(project.id));
                projectList.appendChild(li);
            });
        }
    } catch {
        projectList.innerHTML = '<li>Erro ao carregar projetos.</li>';
    }
}

async function loadProject(projectId) {
    alert('Funcionalidade de carregar projeto ainda não implementada!');
}

