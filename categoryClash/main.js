console.log("Category Clash loading - Working version");

// ELO ratings storage
let eloRatings = {};
let currentCategory = 'overall';
let modal = null;
let syncToStash = localStorage.getItem('categoryClash_syncToStash') === 'true';

// Load saved ratings from localStorage
function loadRatings() {
    const saved = localStorage.getItem('categoryClash_elo');
    if (saved) {
        eloRatings = JSON.parse(saved);
    }
    console.log("ELO ratings loaded:", Object.keys(eloRatings).length);
}

// Save ratings to localStorage
function saveRatings() {
    localStorage.setItem('categoryClash_elo', JSON.stringify(eloRatings));
}

// Get ELO rating for a performer and category
function getElo(performerId, category) {
    const key = `${performerId}_${category}`;
    return eloRatings[key] || 1200;
}

// Convert ELO to Stash rating (0-100 scale)
function eloToStashRating(eloScore) {
    return Math.max(0, Math.min(100, Math.round((eloScore - 1000) / 6)));
}

// Update performer's rating in Stash
async function updatePerformerRating(performerId, eloScore) {
    if (!syncToStash) return;
    
    const stashRating = eloToStashRating(eloScore);
    
    const mutation = `
        mutation UpdatePerformer($input: PerformerUpdateInput!) {
            performerUpdate(input: $input) {
                id
                rating100
            }
        }
    `;
    
    const variables = {
        input: {
            id: performerId,
            rating100: stashRating
        }
    };
    
    try {
        const response = await fetch('/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: mutation, variables })
        });
        const result = await response.json();
        if (result.errors) {
            console.error("Error updating rating:", result.errors);
        } else {
            console.log(`Updated ${performerId} rating to ${stashRating}`);
        }
    } catch(err) {
        console.error("Failed to update rating:", err);
    }
}

// Update ELO after a battle
function updateElo(winnerId, loserId, category) {
    const winnerKey = `${winnerId}_${category}`;
    const loserKey = `${loserId}_${category}`;
    
    let winnerElo = eloRatings[winnerKey] || 1200;
    let loserElo = eloRatings[loserKey] || 1200;
    
    const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
    const K = 32;
    const newWinnerElo = winnerElo + K * (1 - expectedWinner);
    const newLoserElo = loserElo + K * (0 - (1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400))));
    
    eloRatings[winnerKey] = newWinnerElo;
    eloRatings[loserKey] = newLoserElo;
    
    saveRatings();
    updatePerformerRating(winnerId, newWinnerElo);
}

// Create the modal dialog
function createModal() {
    if (modal) return modal;
    
    modal = document.createElement('div');
    modal.id = 'categoryClashModal';
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 90%;
        max-width: 1000px;
        background: #1a1a2e;
        border: 1px solid #333;
        border-radius: 12px;
        z-index: 10001;
        display: none;
        flex-direction: column;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    `;
    
    const header = document.createElement('div');
    header.style.cssText = `
        padding: 15px 20px;
        background: #0f0f1a;
        border-bottom: 1px solid #333;
        border-radius: 12px 12px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    header.innerHTML = '<h3 style="margin:0;">🏆 Category Clash</h3><button id="closeModalBtn" style="background:none; border:none; color:#fff; font-size:24px; cursor:pointer;">&times;</button>';
    
    const body = document.createElement('div');
    body.id = 'categoryClashBody';
    body.style.cssText = `padding: 20px; min-height: 400px;`;
    body.innerHTML = '<div style="text-align:center; padding:40px;">Loading battle interface...</div>';
    
    modal.appendChild(header);
    modal.appendChild(body);
    document.body.appendChild(modal);
    
    document.getElementById('closeModalBtn').onclick = () => {
        modal.style.display = 'none';
    };
    
    return modal;
}

// Show the battle interface
function showBattle() {
    const modal = createModal();
    modal.style.display = 'flex';
    const body = document.getElementById('categoryClashBody');
    
    const syncStatus = syncToStash ? 'Enabled' : 'Disabled';
    
    body.innerHTML = `
        <div style="text-align:center; margin-bottom:20px;">
            <div style="margin-bottom:15px;">
                <label style="margin-right:10px;">Category: </label>
                <select id="battleCat" style="padding:8px 16px; background:#0f3460; color:white; border:none; border-radius:8px; cursor:pointer;">
                    <option value="face">😊 Face</option>
                    <option value="breasts">🍒 Breasts</option>
                    <option value="ass">🍑 Ass</option>
                    <option value="legs">🦵 Legs</option>
                    <option value="overall">🏆 Overall</option>
                </select>
            </div>
            <div style="margin-bottom:15px;">
                <button id="syncToggleBtn" style="padding:6px 16px; background:#555; color:white; border:none; border-radius:20px; cursor:pointer; font-size:12px;">Sync to Stash: ${syncStatus}</button>
                <button id="settingsToggleBtn" style="padding:6px 16px; background:#555; color:white; border:none; border-radius:20px; cursor:pointer; font-size:12px; margin-left:10px;">⚙️ Settings</button>
            </div>
            <div id="settingsPanel" style="display:none; background:#0f0f1a; border-radius:12px; padding:15px; margin:10px auto; max-width:500px; text-align:left;">
                <h4 style="margin:0 0 10px 0;">⚙️ Settings</h4>
                
                <div style="margin-bottom:10px;">
                    <label style="display:block; font-size:12px; margin-bottom:4px;">ELO K-Factor (16-64):</label>
                    <input type="number" id="kFactorInput" style="width:100%; padding:6px; background:#1a1a2e; border:1px solid #333; color:white; border-radius:4px;" value="${localStorage.getItem('categoryClash_kFactor') || '32'}">
                    <small style="font-size:10px; color:#888;">Higher = ratings change faster (32 is default)</small>
                </div>
                
                <div style="margin-bottom:10px;">
                    <label style="display:block; font-size:12px; margin-bottom:4px;">Categories (comma-separated):</label>
                    <input type="text" id="categoriesInput" style="width:100%; padding:6px; background:#1a1a2e; border:1px solid #333; color:white; border-radius:4px;" value="${localStorage.getItem('categoryClash_categories') || 'Face,Breasts,Ass,Legs,Overall'}">
                    <small style="font-size:10px; color:#888;">These appear in the category dropdown</small>
                </div>
                
                <div style="margin-bottom:10px;">
                    <label><input type="checkbox" id="showStashRatingInput" ${localStorage.getItem('categoryClash_showStashRating') === 'true' ? 'checked' : ''}> Show Stash Rating</label>
                    <small style="display:block; font-size:10px; color:#888;">Display performer's existing star rating during battles</small>
                </div>
                
                <button id="saveSettingsBtn" style="padding:6px 12px; background:#0f3460; color:white; border:none; border-radius:4px; cursor:pointer;">Save Settings</button>
                <button id="resetRatingsBtn" style="padding:6px 12px; background:#5a1a1a; color:white; border:none; border-radius:4px; cursor:pointer; margin-left:10px;">Reset All Ratings</button>
                <div id="settingsMessage" style="margin-top:8px; font-size:12px;"></div>
                
                <hr style="margin:15px 0; border-color:#333;">
                
                <h4 style="margin:10px 0;">📖 How to Use Category Clash</h4>
                
                <div style="font-size:12px; color:#ccc; line-height:1.5;">
                    <p><strong>🎮 Battle Mode:</strong><br>
                    • Click the 🏆 trophy in the top navigation bar to open the battle modal<br>
                    • Select a category (Face, Breasts, Ass, Legs, Overall)<br>
                    • Two random female performers with images will appear<br>
                    • Click on the performer you think wins that category<br>
                    • The winner gains ELO points, the loser loses points<br>
                    • A new battle automatically loads after each vote</p>
                    
                    <p><strong>👤 Performer Page:</strong><br>
                    • Hover over the 🏆 trophy next to any performer's name<br>
                    • A tooltip shows their ELO ratings for all categories<br>
                    • Click the trophy to open a battle with that performer pre-selected</p>
                    
                    <p><strong>⚙️ Settings:</strong><br>
                    • <strong>ELO K-Factor:</strong> Controls how fast ratings change (16=slow, 64=fast)<br>
                    • <strong>Categories:</strong> Customize which categories appear in battles<br>
                    • <strong>Sync to Stash:</strong> When enabled, winners update their star rating in Stash<br>
                    • <strong>Export/Import:</strong> Use the buttons below to backup or restore ratings</p>
                    
                    <p><strong>💾 Data Storage:</strong><br>
                    • All ELO ratings are stored in your browser's localStorage<br>
                    • Ratings are tied to this browser only (not synced across devices)<br>
                    • Use Export/Import to transfer ratings between browsers</p>
                </div>
            </div>
            <button id="startBattleBtn" style="padding:10px 32px; background:#0f3460; color:white; border:none; border-radius:30px; cursor:pointer; font-weight:500;">⚡ Start Battle</button>
        </div>
        <div id="battleContainer" style="margin-top:20px;"></div>
        <div id="statsContainer" style="margin-top:20px; text-align:center; font-size:13px; color:#888;"></div>
    `;
    
    const catSelect = document.getElementById('battleCat');
    if (catSelect) {
        catSelect.value = currentCategory;
        catSelect.onchange = (e) => {
            currentCategory = e.target.value;
            updateStatsDisplay();
        };
    }
    
    const syncBtn = document.getElementById('syncToggleBtn');
    if (syncBtn) {
        syncBtn.onclick = () => {
            syncToStash = !syncToStash;
            localStorage.setItem('categoryClash_syncToStash', syncToStash);
            syncBtn.textContent = `Sync to Stash: ${syncToStash ? 'Enabled' : 'Disabled'}`;
            syncBtn.style.background = syncToStash ? '#2e7d32' : '#555';
            showNotification(`Sync to Stash ${syncToStash ? 'enabled' : 'disabled'}`);
        };
    }
    
    const settingsToggle = document.getElementById('settingsToggleBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    let settingsVisible = false;
    if (settingsToggle && settingsPanel) {
        settingsToggle.onclick = () => {
            settingsVisible = !settingsVisible;
            settingsPanel.style.display = settingsVisible ? 'block' : 'none';
        };
    }
    
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn) {
        saveSettingsBtn.onclick = () => {
            const kFactor = document.getElementById('kFactorInput').value;
            const categories = document.getElementById('categoriesInput').value;
            const showStashRating = document.getElementById('showStashRatingInput').checked;
            
            localStorage.setItem('categoryClash_kFactor', kFactor);
            localStorage.setItem('categoryClash_categories', categories);
            localStorage.setItem('categoryClash_showStashRating', showStashRating);
            
            const msgDiv = document.getElementById('settingsMessage');
            if (msgDiv) {
                msgDiv.textContent = 'Settings saved!';
                msgDiv.style.color = '#4caf50';
                setTimeout(() => msgDiv.textContent = '', 2000);
            }
        };
    }
    
    const resetBtn = document.getElementById('resetRatingsBtn');
    if (resetBtn) {
        resetBtn.onclick = () => {
            if (confirm('Delete all ELO ratings? This cannot be undone.')) {
                localStorage.removeItem('categoryClash_elo');
                eloRatings = {};
                const msgDiv = document.getElementById('settingsMessage');
                if (msgDiv) {
                    msgDiv.textContent = 'All ratings reset!';
                    msgDiv.style.color = '#f44336';
                    setTimeout(() => msgDiv.textContent = '', 2000);
                }
                updateStatsDisplay();
            }
        };
    }
    
    const startBtn = document.getElementById('startBattleBtn');
    if (startBtn) {
        startBtn.onclick = () => loadBattle();
    }
    
    updateStatsDisplay();
    loadBattle();
}

function updateStatsDisplay() {
    const container = document.getElementById('statsContainer');
    if (!container) return;
    
    const categoryRatings = Object.keys(eloRatings).filter(k => k.endsWith(`_${currentCategory}`));
    container.innerHTML = `${categoryRatings.length} performers rated in ${currentCategory.toUpperCase()}`;
}

function showNotification(message) {
    const notif = document.createElement('div');
    notif.textContent = message;
    notif.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #4caf50;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 10002;
        animation: fadeOut 2s ease-out forwards;
    `;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 2000);
}

async function loadBattle() {
    const container = document.getElementById('battleContainer');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align:center; padding:40px;">🎲 Loading female performers...</div>';
    
    const query = `{
        findPerformers(
            filter: { per_page: 100 },
            performer_filter: { gender: { value: GENDER_FEMALE, modifier: EQUALS } }
        ) {
            performers {
                id
                name
                image_path
                rating100
            }
        }
    }`;
    
    try {
        const res = await fetch('/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        const result = await res.json();
        const performers = result.data?.findPerformers?.performers || [];
        const eligible = performers.filter(p => p.image_path);
        
        if (eligible.length < 2) {
            container.innerHTML = '<div style="text-align:center; padding:40px;">❌ Not enough female performers with images.</div>';
            return;
        }
        
        let a = eligible[Math.floor(Math.random() * eligible.length)];
        let b = eligible[Math.floor(Math.random() * eligible.length)];
        while (b.id === a.id && eligible.length > 1) b = eligible[Math.floor(Math.random() * eligible.length)];
        
        const eloA = getElo(a.id, currentCategory);
        const eloB = getElo(b.id, currentCategory);
        const stashRatingA = a.rating100 ? (a.rating100 / 20).toFixed(1) : 'N/A';
        const stashRatingB = b.rating100 ? (b.rating100 / 20).toFixed(1) : 'N/A';
        
        container.innerHTML = `
            <div style="display:flex; gap:20px; justify-content:center; flex-wrap:wrap;">
                <div class="perf-card" data-id="${a.id}" data-name="${a.name}" style="flex:1; min-width:250px; background:#16213e; border-radius:12px; padding:20px; text-align:center; cursor:pointer;">
                    <img src="${a.image_path}" style="width:100%; height:280px; object-fit:cover; border-radius:8px;" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect width=%22200%22 height=%22200%22 fill=%22%23333%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%23aaa%22%3ENo%20Image%3C/text%3E%3C/svg%3E'">
                    <div style="font-size:20px; font-weight:600; margin-top:12px;">${a.name}</div>
                    <div style="font-size:16px; color:#ffd700; margin-top:4px;">🏆 ELO: ${Math.round(eloA)}</div>
                    <div style="font-size:12px; color:#888; margin-top:2px;">⭐ Stash: ${stashRatingA}</div>
                </div>
                <div class="perf-card" data-id="${b.id}" data-name="${b.name}" style="flex:1; min-width:250px; background:#16213e; border-radius:12px; padding:20px; text-align:center; cursor:pointer;">
                    <img src="${b.image_path}" style="width:100%; height:280px; object-fit:cover; border-radius:8px;" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect width=%22200%22 height=%22200%22 fill=%22%23333%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%23aaa%22%3ENo%20Image%3C/text%3E%3C/svg%3E'">
                    <div style="font-size:20px; font-weight:600; margin-top:12px;">${b.name}</div>
                    <div style="font-size:16px; color:#ffd700; margin-top:4px;">🏆 ELO: ${Math.round(eloB)}</div>
                    <div style="font-size:12px; color:#888; margin-top:2px;">⭐ Stash: ${stashRatingB}</div>
                </div>
            </div>
            <div style="text-align:center; margin-top:20px; color:#888;">👆 Click on a performer to vote</div>
        `;
        
        const cards = container.querySelectorAll('.perf-card');
        cards[0].onclick = () => {
            updateElo(a.id, b.id, currentCategory);
            showNotification(`${a.name} wins! ELO updated.`);
            updateStatsDisplay();
            loadBattle();
        };
        cards[1].onclick = () => {
            updateElo(b.id, a.id, currentCategory);
            showNotification(`${b.name} wins! ELO updated.`);
            updateStatsDisplay();
            loadBattle();
        };
        
    } catch(err) {
        console.error("Battle error:", err);
        container.innerHTML = `<div style="text-align:center; padding:40px; color:#f44336;">❌ Error: ${err.message}</div>`;
    }
}

// Expose openBattleModal globally
window.openBattleModal = showBattle;

function addButton() {
    let navBar = document.querySelector('.navbar-nav');
    if (!navBar) {
        setTimeout(addButton, 500);
        return;
    }
    
    if (document.querySelector('.clash-btn')) return;
    
    const btn = document.createElement('button');
    btn.className = 'btn btn-link clash-btn';
    btn.innerHTML = '🏆';
    btn.style.cssText = `
        font-size: 20px;
        color: white !important;
        background: transparent;
        border: none;
        padding: 8px 12px;
        margin: 0 5px;
        cursor: pointer;
        opacity: 0.8;
    `;
    btn.onmouseenter = () => btn.style.opacity = '1';
    btn.onmouseleave = () => btn.style.opacity = '0.8';
    btn.onclick = showBattle;
    navBar.appendChild(btn);
    console.log("Category Clash button added");
}

loadRatings();
window.addEventListener('load', addButton);