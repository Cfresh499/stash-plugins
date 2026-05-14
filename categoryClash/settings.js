// Category Clash Settings
console.log("Category Clash Settings loaded");

// Load current settings
let settings = {
    kFactor: localStorage.getItem('categoryClash_kFactor') || '32',
    categories: localStorage.getItem('categoryClash_categories') || 'Face,Breasts,Ass,Legs,Overall',
    syncToStash: localStorage.getItem('categoryClash_syncToStash') === 'true',
    showStashRating: localStorage.getItem('categoryClash_showStashRating') === 'true'
};

function showMessage(message, isError = false) {
    const msgDiv = document.getElementById('statusMessage');
    if (!msgDiv) return;
    msgDiv.textContent = message;
    msgDiv.className = `status-message ${isError ? 'status-error' : 'status-success'}`;
    msgDiv.style.display = 'block';
    setTimeout(() => {
        if (msgDiv) msgDiv.style.display = 'none';
    }, 3000);
}

function loadSettingsToForm() {
    const kFactorInput = document.getElementById('kFactor');
    const categoriesInput = document.getElementById('categories');
    const syncToStashCheckbox = document.getElementById('syncToStash');
    const showStashRatingCheckbox = document.getElementById('showStashRating');
    
    if (kFactorInput) kFactorInput.value = settings.kFactor;
    if (categoriesInput) categoriesInput.value = settings.categories;
    if (syncToStashCheckbox) syncToStashCheckbox.checked = settings.syncToStash;
    if (showStashRatingCheckbox) showStashRatingCheckbox.checked = settings.showStashRating;
}

function saveSettings() {
    const kFactorInput = document.getElementById('kFactor');
    const categoriesInput = document.getElementById('categories');
    const syncToStashCheckbox = document.getElementById('syncToStash');
    const showStashRatingCheckbox = document.getElementById('showStashRating');
    
    if (kFactorInput) settings.kFactor = kFactorInput.value;
    if (categoriesInput) settings.categories = categoriesInput.value;
    if (syncToStashCheckbox) settings.syncToStash = syncToStashCheckbox.checked;
    if (showStashRatingCheckbox) settings.showStashRating = showStashRatingCheckbox.checked;
    
    localStorage.setItem('categoryClash_kFactor', settings.kFactor);
    localStorage.setItem('categoryClash_categories', settings.categories);
    localStorage.setItem('categoryClash_syncToStash', settings.syncToStash);
    localStorage.setItem('categoryClash_showStashRating', settings.showStashRating);
    
    showMessage('Settings saved successfully!');
}

function resetAllRatings() {
    if (confirm('⚠️ WARNING: This will permanently delete ALL your ELO ratings. This cannot be undone. Are you sure?')) {
        localStorage.removeItem('categoryClash_elo');
        showMessage('All ratings have been reset.');
    }
}

function exportRatings() {
    const ratings = localStorage.getItem('categoryClash_elo');
    if (!ratings) {
        showMessage('No ratings data to export.', true);
        return;
    }
    
    const data = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        ratings: JSON.parse(ratings)
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `category-clash-ratings-${new Date().toISOString().slice(0,19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMessage('Ratings exported successfully!');
}

function importRatings(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.ratings) {
                localStorage.setItem('categoryClash_elo', JSON.stringify(data.ratings));
                showMessage(`Imported ${Object.keys(data.ratings).length} ratings successfully!`);
            } else if (typeof data === 'object') {
                localStorage.setItem('categoryClash_elo', JSON.stringify(data));
                showMessage(`Imported ${Object.keys(data).length} ratings successfully!`);
            } else {
                throw new Error('Invalid format');
            }
        } catch (err) {
            showMessage('Invalid file format. Please export a valid JSON file.', true);
        }
    };
    reader.readAsText(file);
}

// Wait for DOM to load before initializing
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing settings");
    
    // Load settings into form
    loadSettingsToForm();
    
    // Setup event listeners
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const resetBtn = document.getElementById('resetBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');
    
    if (saveBtn) saveBtn.onclick = saveSettings;
    if (cancelBtn) cancelBtn.onclick = () => {
        loadSettingsToForm();
        showMessage('Changes cancelled');
    };
    if (resetBtn) resetBtn.onclick = resetAllRatings;
    if (exportBtn) exportBtn.onclick = exportRatings;
    if (importBtn && importFile) {
        importBtn.onclick = () => {
            if (importFile.files.length > 0) {
                importRatings(importFile.files[0]);
                importFile.value = '';
            } else {
                showMessage('Please select a file to import', true);
            }
        };
    }
});