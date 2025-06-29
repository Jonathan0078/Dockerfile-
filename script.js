document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('calculation-form');
    const resultsContainer = document.getElementById('results-container');
    const errorMessageDiv = document.getElementById('error-message');
    const warningMessageDiv = document.getElementById('warning-message');
    const calculateBtn = document.getElementById('calculate-btn');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        calculateBtn.textContent = 'Calculando...';
        calculateBtn.disabled = true;

        resultsContainer.classList.add('hidden');
        errorMessageDiv.classList.add('hidden');
        warningMessageDiv.classList.add('hidden');

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/calculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Ocorreu um erro desconhecido.');
            }

            document.getElementById('res-relacao').textContent = `1:${result.relacao_transmissao.toFixed(2)}`;
            document.getElementById('res-rpm-movida').textContent = `${result.rpm_movida.toFixed(2)} RPM`;
            document.getElementById('res-comprimento').textContent = `${result.comprimento_correia.toFixed(2)} mm`;
            document.getElementById('res-velocidade').textContent = `${result.velocidade_correia_mps.toFixed(2)} m/s`;
            document.getElementById('res-arco').textContent = `${result.arco_contato_graus.toFixed(2)} °`;

            resultsContainer.classList.remove('hidden');

            if (result.arco_contato_graus < 120) {
                warningMessageDiv.textContent = 'Atenção: O arco de contato na polia menor é baixo (< 120°). Isso pode aumentar o risco de escorregamento da correia.';
                warningMessageDiv.classList.remove('hidden');
            }

        } catch (error) {
            errorMessageDiv.textContent = `Erro: ${error.message}`;
            errorMessageDiv.classList.remove('hidden');
        } finally {
            calculateBtn.textContent = 'Calcular';
            calculateBtn.disabled = false;
        }
    });
});
