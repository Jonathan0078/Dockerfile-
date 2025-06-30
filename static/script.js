// Versão completa com sistema de salvamento de projetos
const { jsPDF } = window.jspdf;

document.addEventListener('DOMContentLoaded', async () => {
    // --- SELETORES DE ELEMENTOS (com adições) ---
    const saveButtons = document.querySelectorAll('#save-button');
    const saveProjectModal = document.getElementById('save-project-modal');
    const saveProjectForm = document.getElementById('save-project-form');
    const saveModalCloseBtn = document.getElementById('save-modal-close-btn');
    const projectList = document.getElementById('project-list');
    const welcomeMessage = document.getElementById('welcome-message');

    // (Seletores antigos permanecem)
    const analyzeButtons = document.querySelectorAll('#analyze-button');
    const optimizeButtons = document.querySelectorAll('#optimize-button');
    const clearButtons = document.querySelectorAll('#clear-button');
    // ...

    // --- ESTADO DA APLICAÇÃO (sem alterações) ---
    let systemState = { components: [], connections: [] };
    // ...

    // --- INICIALIZAÇÃO ---
    // (Busca do DB de componentes)
    // NOVA: Busca e exibe os projetos do usuário
    await fetchAndDisplayProjects();
    
    // ATUALIZAÇÃO: Exibe o nome do usuário (simples por enquanto)
    if(welcomeMessage) {
        welcomeMessage.textContent = `Bem-vindo!`; // Futuramente pode ser o nome do usuário
    }

    // --- LISTENERS DE EVENTOS (com adições) ---
    saveButtons.forEach(btn => btn.addEventListener('click', () => saveProjectModal.classList.remove('hidden')));
    saveModalCloseBtn.addEventListener('click', () => saveProjectModal.classList.add('hidden'));
    saveProjectForm.addEventListener('submit', handleSaveProject);

    // (Listeners antigos permanecem)
    // ...

    // --- NOVAS FUNÇÕES DE PROJETO ---
    async function handleSaveProject(e) {
        e.preventDefault();
        const projectName = document.getElementById('project-name').value;
        if (!projectName) {
            alert('Por favor, dê um nome ao seu projeto.');
            return;
        }

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
                saveProjectModal.classList.add('hidden');
                await fetchAndDisplayProjects(); // Atualiza a lista de projetos
            } else {
                throw new Error(result.error || 'Falha ao salvar o projeto.');
            }
        } catch (error) {
            alert(`Erro: ${error.message}`);
        }
    }

    async function fetchAndDisplayProjects() {
        try {
            const response = await fetch('/get_projects');
            const projects = await response.json();
            projectList.innerHTML = ''; // Limpa a lista antiga
            if (projects.length === 0) {
                projectList.innerHTML = '<li>Nenhum projeto salvo.</li>';
            } else {
                projects.forEach(project => {
                    const li = document.createElement('li');
                    li.textContent = project.name;
                    li.dataset.projectId = project.id;
                    projectList.appendChild(li);
                });
            }
        } catch (error) {
            projectList.innerHTML = '<li>Erro ao carregar projetos.</li>';
        }
    }
    
    // (Todas as outras funções do script.js permanecem aqui, inalteradas)
    // handleClearWorkbench, handleLibraryClick, createComponent, renderWorkbench,
    // startDrag, drag, endDrag, openModalForComponent, handleModalSubmit,
    // handleAnalyzeClick, handleOptimizeSubmit, displayAnalysisResults,
    // displayOptimizationResults, drawConnections, generatePDF
    // ...
});
