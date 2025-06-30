document.addEventListener('DOMContentLoaded', function () {
    const { jsPDF } = window.jspdf;

    // --- Seletores de Elementos ---
    const componentList = document.getElementById('component-list');
    const workbench = document.getElementById('workbench-area');
    const analyzeButton = document.getElementById('analyze-button');
    const optimizeButton = document.getElementById('optimize-button');
    const saveButton = document.getElementById('save-button');
    const clearButton = document.getElementById('clear-button');
    const projectList = document.getElementById('project-list');
    const resultsPanel = document.getElementById('results-panel');
    const resultsContent = document.getElementById('results-content');
    const generatePdfBtn = document.getElementById('generate-pdf-btn');
    const connectionCanvas = document.getElementById('connection-canvas');

    // Modais
    const componentModal = document.getElementById('component-modal');
    const saveProjectModal = document.getElementById('save-project-modal');
    const optimizeModal = document.getElementById('optimize-modal');

    // --- Estado da Aplicação ---
    let systemState = { components: [] };
    let componentCounter = 0;
    let componentDatabase = {};
    let currentEditingComponentId = null;
    let lastResults = null;

    // --- INICIALIZAÇÃO ---
    async function initialize() {
        try {
            const response = await fetch('https://raw.githubusercontent.com/Jonathan0078/Dockerfile-/main/database.json');
            if (!response.ok) throw new Error('Falha ao carregar banco de dados de componentes.');
            componentDatabase = await response.json();
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
        await fetchAndDisplayProjects();
    }

    // --- LÓGICA DA BIBLIOTECA ---
    componentList.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-btn')) {
            const type = e.target.closest('.component-item').dataset.type;
            createComponent(type);
        }
    });

    function createComponent(type) {
        componentCounter++;
        const id = `comp_${componentCounter}`;
        const newComponent = {
            id, type,
            x: 50 + (systemState.components.length * 20) % 200,
            y: 50 + (systemState.components.length * 20) % 200,
            data: {}
        };
        systemState.components.push(newComponent);
        renderWorkbench();
    }

    function renderWorkbench() {
        workbench.querySelectorAll('.placed-component').forEach(el => el.remove());
        systemState.components.forEach(comp => {
            const el = document.createElement('div');
            el.className = `placed-component ${comp.type}`;
            el.id = comp.id;
            el.style.left = `${comp.x}px`;
            el.style.top = `${comp.y}px`;
            el.innerHTML = `<div class="component-label">${comp.type} #${comp.id.split('_')[1]}</div>`;
            el.addEventListener('mousedown', startDrag);
            el.addEventListener('dblclick', () => openModalForComponent(comp.id));
            workbench.appendChild(el);
        });
        drawConnections();
    }

    // --- DRAG AND DROP ---
    let activeComponent = null; let offsetX = 0; let offsetY = 0;
    function startDrag(e) {
        activeComponent = e.target.closest('.placed-component');
        if (!activeComponent) return;
        e.preventDefault();
        activeComponent.classList.add('dragging');
        offsetX = e.clientX - activeComponent.getBoundingClientRect().left;
        offsetY = e.clientY - activeComponent.getBoundingClientRect().top;
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', endDrag);
    }
    function drag(e) {
        if (!activeComponent) return;
        const workbenchRect = workbench.getBoundingClientRect();
        let x = e.clientX - workbenchRect.left - offsetX;
        let y = e.clientY - workbenchRect.top - offsetY;
        activeComponent.style.left = `${x}px`;
        activeComponent.style.top = `${y}px`;
        drawConnections();
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
    }
    
    // --- LÓGICA DOS BOTÕES PRINCIPAIS ---
    analyzeButton.addEventListener('click', handleAnalyzeClick);
    clearButton.addEventListener('click', () => {
        if(confirm('Tem certeza que deseja limpar a bancada?')) {
            systemState = { components: [] };
            componentCounter = 0;
            renderWorkbench();
            resultsPanel.classList.add('hidden');
        }
    });

    // --- LÓGICA DE PROJETOS (SALVAR/CARREGAR) ---
    saveButton.addEventListener('click', () => saveProjectModal.classList.remove('hidden'));
    document.getElementById('save-cancel-btn').addEventListener('click', () => saveProjectModal.classList.add('hidden'));
    document.getElementById('save-confirm-btn').addEventListener('click', handleSaveProject);
    
    projectList.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI') {
            const projectId = e.target.dataset.projectId;
            if (confirm('Carregar este projeto? O trabalho atual será perdido.')) {
                loadProject(projectId);
            }
        }
    });

    async function fetchAndDisplayProjects() {
        try {
            const response = await fetch('/get_projects');
            const projects = await response.json();
            projectList.innerHTML = '';
            if (projects.length === 0) {
                projectList.innerHTML = '<li>Nenhum projeto salvo.</li>';
            } else {
                projects.forEach(p => {
                    const li = document.createElement('li');
                    li.textContent = p.name;
                    li.dataset.projectId = p.id;
                    projectList.appendChild(li);
                });
            }
        } catch (error) {
            console.error("Erro ao buscar projetos:", error);
        }
    }

    async function handleSaveProject() {
        const projectName = document.getElementById('project-name').value;
        if (!projectName.trim()) return alert('Por favor, dê um nome ao projeto.');
        
        try {
            const response = await fetch('/save_project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_name: projectName, system_state: systemState })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Falha ao salvar');
            alert('Projeto salvo!');
            saveProjectModal.classList.add('hidden');
            fetchAndDisplayProjects();
        } catch (error) {
            alert(`Erro ao salvar: ${error.message}`);
        }
    }

    async function loadProject(projectId) {
        try {
            const response = await fetch(`/load_project/${projectId}`);
            if (!response.ok) throw new Error('Projeto não encontrado.');
            const loadedState = await response.json();
            systemState = loadedState;
            const ids = systemState.components.map(c => parseInt(c.id.split('_')[1]));
            componentCounter = ids.length > 0 ? Math.max(...ids) : 0;
            renderWorkbench();
            resultsPanel.classList.add('hidden');
        } catch (error) {
            alert(`Erro ao carregar projeto: ${error.message}`);
        }
    }

    // --- ANÁLISE E OTIMIZAÇÃO ---
    async function handleAnalyzeClick() {
        if(systemState.components.length === 0) return alert('Adicione componentes para analisar.');
        try {
            const response = await fetch('/analyze_system', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(systemState)
            });
            const results = await response.json();
            if (results.error) throw new Error(results.error);
            lastResults = results;
            displayAnalysisResults(results);
        } catch (error) {
            alert(`Erro na análise: ${error.message}`);
        }
    }

    function displayAnalysisResults(results) {
        resultsContent.innerHTML = `<ul>
            ${Object.entries(results.sistema).map(([key, value]) => `<li>${key}: <strong>${value}</strong></li>`).join('')}
            ${Object.entries(results.financeiro_energetico).map(([key, value]) => `<li>${key}: <strong>${value}</strong></li>`).join('')}
        </ul>`;
        resultsPanel.classList.remove('hidden');
        generatePdfBtn.classList.remove('hidden');
    }

    // Otimização
    optimizeButton.addEventListener('click', () => optimizeModal.classList.remove('hidden'));
    document.getElementById('optimize-cancel-btn').addEventListener('click', () => optimizeModal.classList.add('hidden'));
    document.getElementById('optimize-confirm-btn').addEventListener('click', handleOptimize);
    
    async function handleOptimize() {
        // Lógica de otimização aqui
        optimizeModal.classList.add('hidden');
    }

    // --- MODAL DE COMPONENTES ---
    document.getElementById('modal-close-btn').addEventListener('click', () => componentModal.classList.add('hidden'));
    document.getElementById('modal-form').addEventListener('submit', handleModalSubmit);

    function openModalForComponent(id) {
        currentEditingComponentId = id;
        const component = systemState.components.find(c => c.id === id);
        if (!component) return;
        document.getElementById('modal-title').textContent = `Configurar ${component.type}`;
        
        let fieldsHtml = '';
        const data = component.data;
        // Gerar campos baseados no tipo de componente
        switch(component.type) {
            case 'motor':
                fieldsHtml = `
                    <input name="power_kw" placeholder="Potência (kW)" value="${data.power_kw || ''}">
                    <input name="rpm" placeholder="RPM" value="${data.rpm || ''}">`;
                break;
            case 'polia_motora':
            case 'polia_movida':
                fieldsHtml = `<input name="diameter" placeholder="Diâmetro (mm)" value="${data.diameter || ''}">`;
                break;
            case 'rolamento':
                fieldsHtml = `<select name="modelo"><option value="">Selecione</option>${componentDatabase.rolamentos.map(r => `<option value="${r.modelo}" ${data.modelo === r.modelo ? 'selected' : ''}>${r.modelo}</option>`).join('')}</select>`;
                break;
        }
        document.getElementById('modal-fields').innerHTML = fieldsHtml;
        componentModal.classList.remove('hidden');
    }

    function handleModalSubmit(e) {
        e.preventDefault();
        const component = systemState.components.find(c => c.id === currentEditingComponentId);
        if(component) {
            const formData = new FormData(e.target);
            for(let [key, value] of formData.entries()) {
                if (key === 'modelo' && component.type === 'rolamento') {
                    const rolamentoData = componentDatabase.rolamentos.find(r => r.modelo === value);
                    if(rolamentoData) {
                        component.data = { ...component.data, ...rolamentoData };
                    }
                } else {
                    component.data[key] = value;
                }
            }
        }
        componentModal.classList.add('hidden');
        renderWorkbench();
    }
    
    // --- FUNÇÕES DE DESENHO ---
    function drawConnections() {
        // Lógica para desenhar as linhas (correias) aqui
    }

    // --- Iniciar a aplicação ---
    initialize();
});
