// ============================================
// LOCATIONS MANAGER - Vista de próximas locaciones
// ============================================

class LocationsManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.elements = {};
        this.searchQuery = '';
    }

    init() {
        this.elements = {
            view: document.getElementById('locationsView'),
            openBtn: document.getElementById('openLocationsBtn'),
            closeBtn: document.getElementById('closeLocationsBtn'),
            badge: document.getElementById('locationsBadge'),
            search: document.getElementById('locationsSearch'),
            stats: document.getElementById('locationsStats'),
            timeline: document.getElementById('locationsTimeline'),
            grid: document.getElementById('locationsGrid')
        };

        if (this.elements.openBtn) {
            this.elements.openBtn.addEventListener('click', () => this.open());
        }
        if (this.elements.closeBtn) {
            this.elements.closeBtn.addEventListener('click', () => this.close());
        }
        if (this.elements.search) {
            this.elements.search.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase().trim();
                this.renderGrid();
            });
        }
        // Cerrar con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) this.close();
        });

        this.updateBadge();
    }

    isOpen() {
        return this.elements.view && !this.elements.view.classList.contains('hidden');
    }

    open() {
        if (!this.elements.view) return;
        this.render();
        this.elements.view.classList.remove('hidden');
        if (this.elements.search) this.elements.search.value = '';
        this.searchQuery = '';
    }

    close() {
        if (this.elements.view) this.elements.view.classList.add('hidden');
    }

    updateBadge() {
        const n = this.dataManager.getUpcomingLocations().length;
        if (this.elements.badge) this.elements.badge.textContent = n;
    }

    render() {
        this.renderStats();
        this.renderTimeline();
        this.renderGrid();
    }

    // ===== Línea de tiempo de spuds =====
    renderTimeline() {
        if (!this.elements.timeline) return;
        const dm = this.dataManager;
        const locs = dm.getUpcomingLocations().filter(l => l.estimatedSpud);

        if (!locs.length) {
            this.elements.timeline.innerHTML = '<div class="loc-empty">Sin fechas de spud cargadas</div>';
            return;
        }

        const DAY = 86400000;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const dates = locs.map(l => new Date(l.estimatedSpud + 'T00:00:00').getTime());
        let min = Math.min(today.getTime(), ...dates);
        let max = Math.max(today.getTime(), ...dates);
        // Padding del 6% a cada lado para que no peguen al borde
        const span = Math.max(DAY, max - min);
        min -= span * 0.06;
        max += span * 0.06;
        const range = max - min;
        const pctOf = (t) => ((t - min) / range) * 100;

        // Ticks de meses
        const ticks = [];
        const cursor = new Date(min);
        cursor.setDate(1);
        cursor.setHours(0, 0, 0, 0);
        while (cursor.getTime() <= max) {
            const t = cursor.getTime();
            if (t >= min) {
                ticks.push({
                    pct: pctOf(t),
                    label: cursor.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')
                });
            }
            cursor.setMonth(cursor.getMonth() + 1);
        }

        const ticksHTML = ticks.map(tk =>
            `<div class="tl-tick" style="left:${tk.pct.toFixed(2)}%"><span>${this.escapeHtml(tk.label)}</span></div>`
        ).join('');

        const todayPct = pctOf(today.getTime());
        const todayHTML = `<div class="tl-today" style="left:${todayPct.toFixed(2)}%"><span>HOY</span></div>`;

        // Marcadores de locaciones (alternar arriba/abajo para no superponer)
        const markersHTML = locs.map((l, i) => {
            const t = new Date(l.estimatedSpud + 'T00:00:00').getTime();
            const pct = pctOf(t);
            const stage = dm.getLocationStage(l);
            const side = i % 2 === 0 ? 'top' : 'bottom';
            const days = dm.daysUntil(l.estimatedSpud);
            const daysTxt = days != null ? (days >= 0 ? `en ${days}d` : `-${Math.abs(days)}d`) : '';
            return `
                <div class="tl-marker side-${side} tone-${stage.tone}" style="left:${pct.toFixed(2)}%" title="${this.escapeHtml(l.name)} · ${dm.formatDate(l.estimatedSpud)}">
                    <div class="tl-flag">
                        <span class="tl-flag-id">${this.escapeHtml(l.id)}</span>
                        <span class="tl-flag-date">${dm.formatDate(l.estimatedSpud)} · ${daysTxt}</span>
                    </div>
                    <span class="tl-dot"></span>
                </div>
            `;
        }).join('');

        this.elements.timeline.innerHTML = `
            <div class="tl-track">
                ${ticksHTML}
                ${todayHTML}
                ${markersHTML}
            </div>
        `;
    }

    // ===== Banda de KPIs superior =====
    renderStats() {
        const locs = this.dataManager.getUpcomingLocations();
        const total = locs.length;
        let ready = 0, inPrep = 0, notStarted = 0;
        locs.forEach(l => {
            const stage = this.dataManager.getLocationStage(l);
            if (stage.tone === 'green') ready++;
            else if (stage.tone === 'yellow') inPrep++;
            else notStarted++;
        });

        // Próxima por spud
        const next = locs[0];
        const nextDays = next ? this.dataManager.daysUntil(next.estimatedSpud) : null;

        const cards = [
            { label: 'Locaciones', value: total, tone: 'blue' },
            { label: 'Listas para DTM', value: ready, tone: 'green' },
            { label: 'En preparación', value: inPrep, tone: 'yellow' },
            { label: 'Por iniciar', value: notStarted, tone: 'slate' },
            {
                label: 'Próximo spud',
                value: next ? next.id : '—',
                sub: nextDays != null ? (nextDays >= 0 ? `en ${nextDays} días` : `atrasado ${Math.abs(nextDays)} d`) : '',
                tone: 'cyan'
            }
        ];

        this.elements.stats.innerHTML = cards.map(c => `
            <div class="loc-stat tone-${c.tone}">
                <div class="loc-stat-value">${this.escapeHtml(String(c.value))}</div>
                <div class="loc-stat-label">${this.escapeHtml(c.label)}</div>
                ${c.sub ? `<div class="loc-stat-sub">${this.escapeHtml(c.sub)}</div>` : ''}
            </div>
        `).join('');
    }

    // ===== Grilla de tarjetas =====
    renderGrid() {
        const q = this.searchQuery;
        let locs = this.dataManager.getUpcomingLocations();

        if (q) {
            locs = locs.filter(l => {
                const hay = [l.id, l.name, l.field, l.area, l.rig]
                    .filter(Boolean).join(' ').toLowerCase();
                return hay.includes(q);
            });
        }

        if (!locs.length) {
            this.elements.grid.innerHTML = `<div class="loc-empty">Sin locaciones para «${this.escapeHtml(q)}»</div>`;
            return;
        }

        this.elements.grid.innerHTML = locs.map(l => this.cardHTML(l)).join('');
    }

    cardHTML(loc) {
        const dm = this.dataManager;
        const stage = dm.getLocationStage(loc);
        const readiness = dm.getLocationReadiness(loc);
        const days = dm.daysUntil(loc.estimatedSpud);
        const gateDefs = dm.getGateDefs();

        const daysTxt = days != null
            ? (days >= 0 ? `en ${days} d` : `atrasado ${Math.abs(days)} d`)
            : '—';
        const daysCls = days != null && days < 0 ? 'overdue' : (days != null && days <= 14 ? 'soon' : '');

        const gatesHTML = gateDefs.map(def => {
            const g = (loc.gates || {})[def.key] || { status: 'pending' };
            const statusMap = {
                done:     { cls: 'gate-done',     txt: 'OK' },
                progress: { cls: 'gate-progress', txt: 'En trámite' },
                pending:  { cls: 'gate-pending',  txt: 'Pendiente' }
            };
            const s = statusMap[g.status] || statusMap.pending;
            const dateTxt = g.date ? dm.formatDate(g.date) : '—';
            const note = g.note ? this.escapeHtml(g.note) : '';
            return `
                <div class="loc-gate ${s.cls}" title="${note}">
                    <span class="loc-gate-icon">${def.icon}</span>
                    <div class="loc-gate-body">
                        <div class="loc-gate-label">${def.label}</div>
                        <div class="loc-gate-meta"><span class="loc-gate-state">${s.txt}</span> · <span class="loc-gate-date">${dateTxt}</span></div>
                    </div>
                    <span class="loc-gate-dot"></span>
                </div>
            `;
        }).join('');

        return `
            <div class="loc-card stage-${stage.tone}">
                <div class="loc-card-top">
                    <div class="loc-card-id">
                        <div class="loc-card-name">${this.escapeHtml(loc.id)}</div>
                        <div class="loc-card-field">${this.escapeHtml(loc.field || '')} · ${this.escapeHtml(loc.area || '')}</div>
                    </div>
                    <span class="loc-stage-badge tone-${stage.tone}">${stage.label}</span>
                </div>

                <div class="loc-card-meta">
                    <div class="loc-meta-item">
                        <span class="loc-meta-label">RIG</span>
                        <span class="loc-meta-value">${this.escapeHtml(loc.rig || '—')}</span>
                    </div>
                    <div class="loc-meta-item">
                        <span class="loc-meta-label">Spud est.</span>
                        <span class="loc-meta-value">${dm.formatDate(loc.estimatedSpud)} <span class="loc-meta-days ${daysCls}">${daysTxt}</span></span>
                    </div>
                    <div class="loc-meta-item">
                        <span class="loc-meta-label">TD plan</span>
                        <span class="loc-meta-value">${loc.targetDepth != null ? loc.targetDepth + ' m' : '—'}</span>
                    </div>
                    <div class="loc-meta-item">
                        <span class="loc-meta-label">AFE est.</span>
                        <span class="loc-meta-value">${dm.formatUSD(loc.afeEstimate)}</span>
                    </div>
                </div>

                <div class="loc-readiness">
                    <div class="loc-readiness-head">
                        <span>Preparación</span>
                        <span class="loc-readiness-count">${readiness.done}/${readiness.total} gates</span>
                    </div>
                    <div class="loc-readiness-bar">
                        <div class="loc-readiness-fill tone-${stage.tone}" style="width:${readiness.pct}%"></div>
                    </div>
                </div>

                <div class="loc-gates">
                    ${gatesHTML}
                </div>
            </div>
        `;
    }

    escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

window.LocationsManager = LocationsManager;
