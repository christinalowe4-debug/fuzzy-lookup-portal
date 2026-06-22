document.addEventListener('DOMContentLoaded', () => {
    const uploadA = document.getElementById('upload-a');
    const uploadB = document.getElementById('upload-b');
    const fileA = document.getElementById('file-a');
    const fileB = document.getElementById('file-b');
    const textA = document.getElementById('text-a');
    const textB = document.getElementById('text-b');
    const infoA = document.getElementById('info-a');
    const infoB = document.getElementById('info-b');
    const thresholdSlider = document.getElementById('threshold');
    const thresholdValue = document.getElementById('threshold-value');
    const maxResultsSelect = document.getElementById('max-results');
    const matchBtn = document.getElementById('match-btn');
    const clearBtn = document.getElementById('clear-btn');
    const resultsSection = document.getElementById('results-section');
    const resultsBody = document.getElementById('results-body');
    const resultsCount = document.getElementById('results-count');
    const exportBtn = document.getElementById('export-btn');
    let listAData = [], listBData = [], currentResults = [];

    function setupUploadArea(uploadEl, fileInput, textArea, infoEl, listSetter) {
        uploadEl.addEventListener('click', () => fileInput.click());
        uploadEl.addEventListener('dragover', (e) => { e.preventDefault(); uploadEl.classList.add('drag-over'); });
        uploadEl.addEventListener('dragleave', () => uploadEl.classList.remove('drag-over'));
        uploadEl.addEventListener('drop', (e) => {
            e.preventDefault(); uploadEl.classList.remove('drag-over');
            if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0], uploadEl, textArea, infoEl, listSetter);
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) processFile(e.target.files[0], uploadEl, textArea, infoEl, listSetter);
        });
        textArea.addEventListener('input', () => {
            const lines = parseText(textArea.value);
            listSetter(lines);
            infoEl.textContent = lines.length + ' items loaded';
        });
    }

    function processFile(file, uploadEl, textArea, infoEl, listSetter) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const lines = (file.name.endsWith('.csv') && text.includes(',')) ? parseCSV(text) : parseText(text);
            listSetter(lines);
            textArea.value = lines.join('\n');
            infoEl.textContent = lines.length + ' items loaded from ' + file.name;
            uploadEl.classList.add('file-loaded');
            uploadEl.querySelector('p').textContent = 'Loaded: ' + file.name;
        };
        reader.readAsText(file);
    }

    function parseText(text) { return text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0); }

    function parseCSV(text) {
        return text.split(/[\n\r]+/).filter(l => l.trim()).map(line => {
            const m = line.match(/^"([^"]*)"/) || line.match(/^([^,]*)/);
            return m ? m[1].trim() : line.trim();
        }).filter(i => i.length > 0);
    }

    function runMatching() {
        const listA = listAData.length > 0 ? listAData : parseText(textA.value);
        const listB = listBData.length > 0 ? listBData : parseText(textB.value);
        if (!listA.length || !listB.length) { alert('Please provide items in both lists.'); return; }
        matchBtn.disabled = true; matchBtn.textContent = 'Matching...';
        setTimeout(() => {
            currentResults = FuzzyMatcher.findMatches(listA, listB, parseInt(thresholdSlider.value), parseInt(maxResultsSelect.value));
            displayResults(currentResults);
            matchBtn.disabled = false; matchBtn.textContent = 'Find Matches';
        }, 50);
    }

    function displayResults(results) {
        resultsBody.innerHTML = '';
        let totalMatches = 0;
        results.forEach(result => {
            if (!result.matches.length) {
                const row = document.createElement('tr');
                row.innerHTML = '<td>' + esc(result.source) + '</td><td class="no-match">No match found</td><td class="no-match">-</td>';
                resultsBody.appendChild(row);
            } else {
                result.matches.forEach((match, idx) => {
                    totalMatches++;
                    const cls = match.score >= 80 ? 'score-high' : match.score >= 60 ? 'score-medium' : 'score-low';
                    const row = document.createElement('tr');
                    row.innerHTML = '<td>' + (idx === 0 ? esc(result.source) : '') + '</td><td>' + esc(match.target) + '</td><td><span class="score-badge ' + cls + '">' + match.score + '%</span></td>';
                    resultsBody.appendChild(row);
                });
            }
        });
        resultsCount.textContent = totalMatches + ' matches found across ' + results.length + ' items';
        resultsSection.classList.remove('hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function esc(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }

    function exportCSV() {
        if (!currentResults.length) return;
        let csv = 'Source Item,Best Match,Score\n';
        currentResults.forEach(r => {
            if (!r.matches.length) csv += '"' + r.source.replace(/"/g,'""') + '","No match",""\n';
            else r.matches.forEach(m => { csv += '"' + r.source.replace(/"/g,'""') + '","' + m.target.replace(/"/g,'""') + '","' + m.score + '%"\n'; });
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'fuzzy-matches-' + new Date().toISOString().slice(0,10) + '.csv';
        link.click(); URL.revokeObjectURL(link.href);
    }

    function clearAll() {
        textA.value = ''; textB.value = '';
        listAData = []; listBData = [];
        infoA.textContent = '0 items loaded'; infoB.textContent = '0 items loaded';
        resultsSection.classList.add('hidden'); resultsBody.innerHTML = ''; currentResults = [];
        [uploadA, uploadB].forEach(el => { el.classList.remove('file-loaded'); el.querySelector('p').textContent = 'Drag & drop a file here or click to upload'; });
        fileA.value = ''; fileB.value = '';
    }

    thresholdSlider.addEventListener('input', () => { thresholdValue.textContent = thresholdSlider.value + '%'; });
    matchBtn.addEventListener('click', runMatching);
    clearBtn.addEventListener('click', clearAll);
    exportBtn.addEventListener('click', exportCSV);
    setupUploadArea(uploadA, fileA, textA, infoA, (d) => { listAData = d; });
    setupUploadArea(uploadB, fileB, textB, infoB, (d) => { listBData = d; });
    document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.ctrlKey) runMatching(); });
});
