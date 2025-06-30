// Versão completa com sistema de salvamento de projetos e otimização
const { jsPDF } = window.jspdf;

document.addEventListener('DOMContentLoaded', async () => {
    // --- SELETORES DE ELEMENTOS ---
    const saveButton = document.getElementById('save-button');
    const clearButton = document.getElementById('clear-button'); // <-- NOVO
    const settingsButton = document.getElementById('settings-button'); // <-- NOVO
    const analyzeButton = document.getElementById('analyze-button');
    const saveProjectModal = document.getElementById('save-project-modal');
    const saveProjectForm = document.getElementById('save-project-form');
    const saveModalCloseBtn = document.getElementById('save-modal-close-btn');
    const projectList = document.getElementById('project-list');
    const welcomeMessage = document.getElementById('welcome-message');
    const library = document.getElementById('component-library');
    const workbench = document.getElementById('main-workbench').querySelector('#workbench-area');
    const generatePdfBtn = document.getElementById('generate-pdf-btn');
    const resultsPanel = document.getElementById('results-panel');
    const connectionCanvas = document.getElementById('connection-canvas');
    const modal = document.getElementById('component-modal');
    const modalForm = document.getElementById('modal-form');
    const modalFields = document.getElementById('modal-fields');
    const modalTitle = document.getElementById('modal-title');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const resultsContent = document.getElementById('results-content');
    const optimizeModal = document.getElementById('optimize-modal'); // <-- NOVO
    const optimizeForm = document.getElementById('optimize-form'); // <-- NOVO
    const optimizeModalCloseBtn = document.getElementById('optimize-modal-close-btn'); // <-- NOVO
    
    // --- ESTADO DA APLICAÇÃO ---
    let systemState = { components: [], connections: [] };
    let componentCounter = 0;
    let currentEditingComponentId = null;
    let lastResults = {};
    let componentDatabase = {};

    // --- INICIALIZAÇÃO ROBUSTA ---
    try {
        const response = await fetch('/get_component_database');
        if (!response.ok) throw new Error('Falha na resposta do servidor para o banco de dados.');
        componentDatabase = await response.json();
    } catch (error) {
        console.error("Erro ao carregar o banco de dados de componentes:", error);
        alert("Não foi possível carregar o banco de dados de componentes. A lista de rolamentos não estará disponível.");
    }
    
    try {
        await fetchAndDisplayProjects();
    } catch (error) {
        console.error("Erro na inicialização ao carregar projetos:", error);
    }

    if (welcomeMessage) {
        welcomeMessage.textContent = 'Bem-vindo!';
    }
    
    // --- LISTENERS DE EVENTOS ---
    library.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-btn')) {
            const type = e.target.dataset.type;
            createComponent(type, 50, 50);
        }
    });

    if (saveButton) {
        saveButton.addEventListener('click', () => saveProjectModal.classList.remove('hidden'));
    }
    if (saveModalCloseBtn) {
        saveModalCloseBtn.addEventListener('click', () => saveProjectModal.classList.add('hidden'));
    }
    if (saveProjectForm) {
        saveProjectForm.addEventListener('submit', handleSaveProject);
    }
    
    if (clearButton) { // <-- NOVO LISTENER PARA LIMPAR A BANCADA
        clearButton.addEventListener('click', clearWorkbench);
    }

    if (settingsButton) { // <-- NOVO LISTENER PARA O BOTÃO DE ENGRANAGEM/OTIMIZAR
        settingsButton.addEventListener('click', () => optimizeModal.classList.remove('hidden'));
    }
    if (optimizeModalCloseBtn) { // <-- NOVO LISTENER PARA FECHAR O MODAL
        optimizeModalCloseBtn.addEventListener('click', () => optimizeModal.classList.add('hidden'));
    }
    if (optimizeForm) { // <-- NOVO LISTENER PARA O FORMULÁRIO DE OTIMIZAÇÃO
        optimizeForm.addEventListener('submit', handleOptimizeSubmit);
    }

    if (projectList) { /* ... */ }
    if (analyzeButton) { analyzeButton.addEventListener('click', handleAnalyzeClick); }
    if (generatePdfBtn) { generatePdfBtn.addEventListener('click', generatePDF); }
    if (modalCloseBtn) { modalCloseBtn.addEventListener('click', () => modal.classList.add('hidden')); }
    if (modalForm) { modalForm.addEventListener('submit', handleModalSubmit); }

    // --- FUNÇÕES DE PROJETO, ANÁLISE E OTIMIZAÇÃO ---
    async function fetchAndDisplayProjects() { /* ... */ } // Inalterada
    async function loadProject(projectId) { alert('Funcionalidade de carregar projeto ainda não implementada!'); } // Inalterada
    async function handleSaveProject(e) { /* ... */ } // Inalterada
    
    function clearWorkbench() { // <-- NOVA FUNÇÃO
        systemState.components = [];
        renderWorkbench();
        resultsPanel.classList.add('hidden');
        generatePdfBtn.classList.add('hidden');
        console.log('Bancada de trabalho limpa.');
    }

    async function handleOptimizeSubmit(e) { // <-- NOVA FUNÇÃO
        e.preventDefault();
        
        if (systemState.components.length < 5) { // Motor, 2 Polias, 2 Rolamentos
            alert("Para otimizar, o sistema precisa ter pelo menos um motor, duas polias e dois rolamentos.");
            return;
        }

        const goal = document.querySelector('input[name="optimization_goal"]:checked').value;

        const payload = {
            system: systemState,
            goal: goal
        };

        try {
            resultsContent.innerHTML = '<div class="loading-message">Otimizando... Isso pode levar um momento.</div>';
            resultsPanel.classList.remove('hidden');
            
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
            optimizeModal.classList.add('hidden'); // Fecha o modal após a otimização
        } catch (error) {
            resultsContent.innerHTML = `<div style="color: var(--cor-erro);"><strong>Erro na otimização:</strong> ${error.message}</div>`;
        }
    }

    function displayOptimizationResults(results, goal) { // <-- NOVA FUNÇÃO
        let html = `<h3>Soluções de Otimização (${goal.toUpperCase()})</h3>`;
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
        resultsContent.innerHTML = html;
        resultsPanel.classList.remove('hidden');
    }

    // --- CÓDIGO DA BANCADA DE TRABALHO (Mantido, com pequenas adaptações) ---
    let activeComponent = null; let offsetX = 0; let offsetY = 0;
    function createComponent(type, x, y) { /* ... */ }
    function renderWorkbench() { /* ... */ }
    function startDrag(e) { /* ... */ }
    function drag(e) { /* ... */ }
    function endDrag() { /* ... */ }
    function openModalForComponent(id) { /* ... */ }
    function handleModalSubmit(e) { /* ... */ }
    async function handleAnalyzeClick() { /* ... */ }
    function displayResults(results) { /* ... */ }
    async function generatePDF() { /* ... */ }
    function drawConnections() { /* ... */ }
});
