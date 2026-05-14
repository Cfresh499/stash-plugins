console.log("Category Clash Performer Panel loading - Hover + Click version");

// Get ELO for a specific performer and category
function getELO(performerId, category) {
    const key = `${performerId}_${category}`;
    const ratings = JSON.parse(localStorage.getItem('categoryClash_elo') || '{}');
    return ratings[key] || 1200;
}

// Convert ELO (1000-1600 range) to stars (1-5)
function eloToStars(elo) {
    const starValue = ((elo - 1000) / 600) * 5;
    return Math.min(5, Math.max(1, starValue));
}

// Render stars as HTML
function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalf = (rating - fullStars) >= 0.5;
    let html = '';
    for (let i = 0; i < fullStars; i++) html += '★';
    if (hasHalf) html += '½';
    for (let i = Math.ceil(rating); i < 5; i++) html += '☆';
    return html;
}

// Create hover tooltip content
function getTooltipContent(performerId) {
    const categories = ['face', 'breasts', 'ass', 'legs', 'overall'];
    const categoryNames = { face: 'Face', breasts: 'Breasts', ass: 'Ass', legs: 'Legs', overall: 'Overall' };
    
    let html = '<div style="padding: 8px 12px; min-width: 160px;">';
    html += '<div style="font-weight: 600; margin-bottom: 8px; font-size: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">🏆 Category Clash</div>';
    
    for (const cat of categories) {
        const elo = getELO(performerId, cat);
        const stars = eloToStars(elo);
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 11px; gap: 12px;">
                <span style="color: var(--bs-gray-400, #ccc);">${categoryNames[cat]}:</span>
                <div style="display: flex; align-items: center; gap: 4px;">
                    <span style="color: #ffd700;">${renderStars(stars)}</span>
                    <span style="color: var(--bs-gray-500, #888);">(${Math.round(elo)})</span>
                </div>
            </div>
        `;
    }
    
    html += '<div style="margin-top: 8px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 10px; color: var(--bs-gray-500, #888); text-align: center;">Click 🏆 to battle</div>';
    html += '</div>';
    return html;
}

// Create and inject the hover/click button
function injectHoverButton() {
    // Find the performer name element
    const performerNameEl = document.querySelector('.performer-name');
    if (!performerNameEl) {
        setTimeout(injectHoverButton, 500);
        return;
    }
    
    // Get performer ID from URL
    const urlMatch = window.location.pathname.match(/\/performers\/(\d+)/);
    if (!urlMatch) return;
    const performerId = urlMatch[1];
    
    // Check if button already exists
    if (document.querySelector('.category-clash-hover-btn')) return;
    
    // Find the parent container (the h2 or the name-icons span)
    const nameContainer = document.querySelector('.performer-head h2') || performerNameEl.parentElement;
    
    // Create the button container
    const btnContainer = document.createElement('span');
    btnContainer.className = 'category-clash-hover-btn';
    btnContainer.style.cssText = 'position: relative; display: inline-block; margin-left: 8px;';
    
    const btn = document.createElement('button');
    btn.innerHTML = '🏆';
    btn.style.cssText = `
        background: transparent;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: var(--bs-gray-500, #888);
        transition: color 0.2s, transform 0.2s;
        padding: 0 4px;
    `;
    
    // Hover effects
    btn.onmouseenter = () => {
        btn.style.color = '#ffd700';
        btn.style.transform = 'scale(1.1)';
    };
    btn.onmouseleave = () => {
        btn.style.color = 'var(--bs-gray-500, #888)';
        btn.style.transform = 'scale(1)';
    };
    
    // Click to open battle modal
    btn.onclick = (e) => {
        e.stopPropagation();
        if (window.openBattleModal) {
            sessionStorage.setItem('clash_preferred_performer', performerId);
            window.openBattleModal();
        }
    };
    
    // Create tooltip (hover to view stats)
    const tooltip = document.createElement('div');
    tooltip.className = 'category-clash-tooltip';
    tooltip.style.cssText = `
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        margin-top: 8px;
        background: var(--bs-body-bg, #1a1a2e);
        border: 1px solid var(--bs-border-color, #333);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s, visibility 0.2s;
        pointer-events: none;
        white-space: nowrap;
    `;
    tooltip.innerHTML = getTooltipContent(performerId);
    
    btnContainer.appendChild(btn);
    btnContainer.appendChild(tooltip);
    
    // Show/hide tooltip on hover (without affecting click)
    btnContainer.onmouseenter = () => {
        tooltip.style.opacity = '1';
        tooltip.style.visibility = 'visible';
    };
    btnContainer.onmouseleave = () => {
        tooltip.style.opacity = '0';
        tooltip.style.visibility = 'hidden';
    };
    
    // Insert next to the performer name
    nameContainer.appendChild(btnContainer);
    console.log("Category Clash hover+click button added");
}

// Watch for navigation
let lastUrl = window.location.href;
function watchForNavigation() {
    if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        if (window.location.pathname.includes('/performers/')) {
            setTimeout(injectHoverButton, 500);
        }
    }
    setTimeout(watchForNavigation, 500);
}

// Start when page loads
if (window.location.pathname.includes('/performers/')) {
    setTimeout(injectHoverButton, 500);
}
watchForNavigation();