// Versão completa com sistema de salvamento de projetos e otimização
const { jsPDF } = window.jspdf;

// --- FUNÇÕES DE INICIALIZAÇÃO E AÇÕES (MOVIDAS PARA O TOPO) ---
// Estas funções e variáveis são declaradas no escopo global para serem acessíveis por todo o script.

// Variáveis de estado global
let systemState = { components: [], connections: [] };
let componentCounter = 0;
let currentEditingComponentId = null;
let lastResults = {};
let componentDatabase = {};

let activeComponent = null; 
let offsetX = 0; 
let offsetY = 0;

// Funções de inicialização de dados
async function initializeData() {
    // Estas são as variáveis que serão selecionadas dentro do DOMContentLoaded
    // Mas precisamos delas aqui para a função ser autônoma
    const welcomeMessage = document.getElementById('welcome-message');
    const projectList = document.getElementById('project-list');

    try {
        const response = await fetch('/get_component_database');
        if (!response.ok) throw new Error('Falha na resposta do servidor para o banco de dados.');
        componentDatabase = await response.json();
    } catch (error) {
        console.error("Erro ao carregar o banco de dados de componentes:", error);
        // O alert aqui é um fallback, se o JS seguir, o modal de erro será melhor
        alert("Não foi possível carregar o banco de dados de componentes. A lista de rolamentos não estará disponível.");
    }
    
    try {
        // fetchAndDisplayProjects precisa de projectList, que será selecionado no DOMContentLoaded
        // Por isso, fazemos uma checagem defensiva aqui.
        if (projectList) {
            await fetchAndDisplayProjects();
        } else {
            console.warn("projectList element not found, skipping fetchAndDisplayProjects.");
        }
        
    } catch (error) {
        console.error("Erro na inicialização ao carregar projetos:", error);
    }

    if (welcomeMessage) {
        welcomeMessage.textContent = 'Bem-vindo!';
    }
}

// Funções de requisição e manipulação de resultados
async function fetchAndDisplayProjects() {
    const projectList = document.getElementById('project-list'); // Selecionado aqui também para a função ser independente
    if (!projectList) {
        console.error("projectList element not found in fetchAndDisplayProjects.");
        return;
    }
    try {
        const response = await fetch('/get_projects');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
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
    } catch (error) {
        console.error("Erro ao buscar projetos:", error);
        projectList.innerHTML = '<li>Erro ao carregar projetos.</li>';
    }
}

async function loadProject(projectId) { alert('Funcionalidade de carregar projeto ainda não implementada!'); }

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
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.success) {
            alert('Projeto salvo com sucesso!');
            document.getElementById('save-project-modal').classList.add('hidden'); // Usa ID direto
            await fetchAndDisplayProjects();
        } else {
            throw new Error(result.error || 'Falha ao salvar o projeto.');
        }
    } catch (error) {
        alert(`Erro ao salvar: ${error.message}`);
    }
}

function clearWorkbench() {
    systemState.components = [];
    renderWorkbench();
    const resultsPanel = document.getElementById('results-panel'); // Seleciona aqui
    const resultsMobileModal = document.getElementById('results-mobile-modal'); // Seleciona aqui
    const generatePdfBtn = document.getElementById('generate-pdf-btn'); // Seleciona aqui

    if (resultsPanel) resultsPanel.classList.add('hidden');
    if (resultsMobileModal) resultsMobileModal.classList.add('hidden');
    if (generatePdfBtn) generatePdfBtn.classList.add('hidden');
    console.log('Bancada de trabalho limpa.');
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

    const payload = {
        system: systemState,
        goal: goal
    };

    const resultsMobileContent = document.getElementById('results-mobile-content');
    const resultsMobileModal = document.getElementById('results-mobile-modal');
    const resultsContent = document.getElementById('results-content');
    const resultsPanel = document.getElementById('results-panel');
    const generatePdfBtn = document.getElementById('generate-pdf-btn');

    try {
        if (window.innerWidth <= 768 && resultsMobileContent && resultsMobileModal) {
             resultsMobileContent.innerHTML = '<div class="loading-message">Otimizando... Isso pode levar um momento.</div>';
             resultsMobileModal.classList.remove('hidden');
             document.getElementById('results-mobile-title').textContent = "Resultados da Otimização"; // Título
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
            body: JSON.stringify(payload)
        });
        
        const results = await response.json();
        
        if (results.error) {
            throw new Error(results.error);
        }
        
        displayOptimizationResults(results, goal);
        document.getElementById('optimize-modal').classList.add('hidden'); // Fecha o modal de otimização
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

// Função para exibir resultados de análise ou otimização (AJUSTADA PARA EXIBIÇÃO CONDICIONAL)
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
        console.error("Target results elements not found for display.");
        return;
    }

    let html = '';
    if (results.financeiro_energetico) {
        const fin = results.financeiro_energetico;
        html += `<h3>Análise Financeira e Energética</h3><ul><li>Eficiência da Transmissão: <strong>${fin.eficiencia_transmissao}</strong></li><li>Potência Perdida: <strong>${fin.potencia_perdida}</strong></li></ul>`;
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
        if (isMobileView) {
            generatePdfBtn.classList.add('hidden');
        } else {
            generatePdfBtn.classList.remove('hidden');
        }
    }
}

// Função para exibir resultados de otimização (AJUSTADA PARA EXIBIÇÃO CONDICIONAL)
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
        console.error("Target results elements not found for display.");
        return;
    }

    let html = '';
    if (results.length === 0) {
        html += '<p>Nenhuma solução otimizada encontrada.</p>';
    } else {
        html += '<ul class="optimization-list">';
        results.forEach((sol, index) => {
            html += `
                <li>
                    <strong>Solução ${index + 1}:</strong> ${sol.config}<br>
                    Custo Anual: R$ ${sol.cost.toLocaleString('pt-BR')}<br>
                    Eficiência: ${sol.efficiency}%<br>
                    Vida Útil Mínima: ${sol.min_life.toLocaleString('pt-BR')} horas
                </li>
            `;
        });
        html += '</ul>';
    }
    targetContentElement.innerHTML = html;
    targetPanelElement.classList.remove('hidden');
    if (generatePdfBtn) {
        if (isMobileView) {
            generatePdfBtn.classList.add('hidden');
        } else {
            generatePdfBtn.classList.remove('hidden');
        }
    }
}

// FUNÇÃO handleAnalyzeClick (MOVIDA PARA O INÍCIO DO ARQUIVO)
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
            body: JSON.stringify(payload)
        });
        const results = await response.json();
        if (results.error) {
            throw new Error(results.error);
        }
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

// --- CÓDIGO DA BANCADA DE TRABALHO (FUNÇÕES AUXILIARES) ---
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
    const workbench = document.getElementById('main-workbench') ? document.getElementById('main-workbench').querySelector('#workbench-area') : null; // Selecionado aqui
    if (!workbench) return; 
    workbench.querySelectorAll('.placed-component').forEach(el => el.remove());
    systemState.components.forEach(comp => {
        const el = document.createElement('div');
        el.className = `placed-component ${comp.type}`;
        el.id = comp.id;
        el.style.left = `${comp.x}px`;
        el.style.top = `${comp.y}px`;
        if (comp.type.includes('polia') && comp.data.diameter) {
            const scaleFactor = 0.8;
            el.style.width = `${Math.max(40, comp.data.diameter * scaleFactor)}px`;
            el.style.height = `${Math.max(40, comp.data.diameter * scaleFactor)}px`;
        }
        const label = document.createElement('div');
        label.className = 'component-label';
        label.textContent = `${comp.type.replace(/_/g, ' ')} #${comp.id.split('_')[1]}`;
        el.appendChild(label);
        workbench.appendChild(el);
        el.addEventListener('click', (e) => { if (!el.classList.contains('dragging')) openModalForComponent(comp.id); });
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
    const workbench = document.getElementById('main-workbench') ? document.getElementById('main-workbench').querySelector('#workbench-area') : null; // Selecionado aqui

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
        setTimeout(() => renderWorkbench(), 0);
    }
}

function openModalForComponent(id) {
    currentEditingComponentId = id;
    const component = systemState.components.find(c => c.id === id);
    if (!component) return;
    const modal = document.getElementById('component-modal'); // Selecionado aqui
    const modalTitle = document.getElementById('modal-title'); // Selecionado aqui
    const modalFields = document.getElementById('modal-fields'); // Selecionado aqui

    if (!modal || !modalTitle || !modalFields) return;
    modalTitle.textContent = `Configurar ${component.type.replace(/_/g, ' ')}`;
    let fieldsHtml = '';
    const data = component.data;
    switch (component.type) {
        case 'motor':
            fieldsHtml = `<div class="input-group"><label>Potência (kW)</label><input type="number" step="any" name="power_kw" required value="${data.power_kw || ''}"></div><div class="input-group"><label>Rotação (rpm)</label><input type="number" step="any" name="rpm" required value="${data.rpm || ''}"></div>`;
            break;
        case 'polia_motora':
        case 'polia_movida':
            fieldsHtml = `<div class="input-group"><label>Diâmetro (mm)</label><input type="number" name="diameter" required value="${data.diameter || ''}"></div>`;
            if (component.type === 'polia_motora') {
                fieldsHtml += `<div class="input-group"><label>Tipo de Correia</label><select name="belt_type"><option value="V" ${data.belt_type === 'V' ? 'selected' : ''}>Em V</option><option value="flat" ${data.belt_type === 'flat' ? 'selected' : ''}>Plana</option></select></div>`;
            }
            break;
        case 'rolamento':
            let options = (componentDatabase.rolamentos || []).map(r => `<option value="${r.modelo}" ${data.modelo === r.modelo ? 'selected' : ''}>${r.modelo}</option>`).join('');
            fieldsHtml = `<div class="input-group"><label>Selecione o Modelo</label><select id="rolamento-modelo-select" name="modelo"><option value="">-- Escolha um modelo --</option>${options}</select></div><div class="input-group"><label>Tipo</label><input type="text" id="rolamento-tipo-input" name="tipo" readonly value="${data.tipo || ''}"></div><div class="input-group"><label>Carga C</label><input type="number" id="rolamento-carga-c-input" name="carga_c" readonly value="${data.carga_c || ''}"></div>`;
            break;
    }
    modalFields.innerHTML = fieldsHtml;
    const modeloSelect = document.getElementById('rolamento-modelo-select');
    if (modeloSelect) {
        modeloSelect.addEventListener('change', (e) => {
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
    const modalForm = document.getElementById('modal-form'); // Selecionado aqui
    const formData = new FormData(modalForm);
    const component = systemState.components.find(c => c.id === currentEditingComponentId);
    if (component) {
        for (let [key, value] of formData.entries()) {
            component.data[key] = value;
        }
    }
    const modal = document.getElementById('component-modal'); // Selecionado aqui
    modal.classList.add('hidden');
    renderWorkbench();
}

async function generatePDF() {
    const workbench = document.getElementById('main-workbench') ? document.getElementById('main-workbench').querySelector('#workbench-area') : null; // Selecionado aqui
    if (!workbench) {
        alert("A área de trabalho não está visível para gerar o PDF.");
        return;
    }
    const doc = new jsPDF();
    const workbenchImage = await html2canvas(workbench, {
        backgroundColor: "#ffffff",
        scale: 2
    });
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
             if (currentY > 280) { doc.addPage(); currentY = 20; }
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
    const connectionCanvas = document.getElementById('connection-canvas'); // Selecionado aqui
    if (!connectionCanvas) return;
    connectionCanvas.innerHTML = '';
    const p1 = systemState.components.find(c => c.type === 'polia_motora');
    const p2 = systemState.components.find(c => c.type === 'polia_movida');
    if (p1 && p2) {
        const p1Div = document.getElementById(p1.id);
        const p2Div = document.getElementById(p2.id);
        if (!p1Div || !p2Div) return;
        const r1 = p1Div.offsetWidth / 2;
        const c1x = p1.x + r1;
        const c1y = p1.y + r1;
        const r2 = p2Div.offsetWidth / 2;
        const c2x = p2.x + r2;
        const c2y = p2.y + r2;
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
}

// Bloco de inicialização dos botões e eventos
document.addEventListener('DOMContentLoaded', () => {
  // Inicialização dos dados
  initializeData();

  // Botões Desktop
  document.getElementById('desktop-save-btn')?.addEventListener('click', () => {
    document.getElementById('save-project-modal').classList.remove('hidden');
  });
  document.getElementById('desktop-clear-btn')?.addEventListener('click', clearWorkbench);
  document.getElementById('desktop-settings-btn')?.addEventListener('click', () => {
    document.getElementById('optimize-modal').classList.remove('hidden');
  });
  document.getElementById('desktop-analyze-btn')?.addEventListener('click', handleAnalyzeClick);

  // Botões do modal de salvar projeto
  document.getElementById('save-project-form')?.addEventListener('submit', handleSaveProject);
  document.getElementById('save-modal-close-btn')?.addEventListener('click', () => {
    document.getElementById('save-project-modal').classList.add('hidden');
  });

  // Botões do modal de otimização
  document.getElementById('optimize-form')?.addEventListener('submit', handleOptimizeSubmit);
  document.getElementById('optimize-modal-close-btn')?.addEventListener('click', () => {
    document.getElementById('optimize-modal').classList.add('hidden');
  });

  // Botão do modal do componente
  document.getElementById('modal-form')?.addEventListener('submit', handleModalSubmit);
  document.getElementById('modal-close-btn')?.addEventListener('click', () => {
    document.getElementById('component-modal').classList.add('hidden');
  });

  // Botão gerar PDF
  document.getElementById('generate-pdf-btn')?.addEventListener('click', generatePDF);

  // Botões Mobile
  document.getElementById('save-button')?.addEventListener('click', () => {
    document.getElementById('save-project-modal').classList.remove('hidden');
  });
  document.getElementById('clear-button')?.addEventListener('click', clearWorkbench);
  document.getElementById('settings-button')?.addEventListener('click', () => {
    document.getElementById('optimize-modal').classList.remove('hidden');
  });
  document.getElementById('analyze-button-mobile')?.addEventListener('click', handleAnalyzeClick);

  // Botão adicionar componente (botões + da biblioteca)
  document.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const type = e.target.dataset.type;
      // Adiciona componente no centro da bancada (ajuste para sua preferência de posição)
      createComponent(type, 300, 150);
    });
  });
});
