// ============================================
// WELL MANAGER - Gestión de UI y eventos
// ============================================

class WellManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.elements = {};
        this.chartManager = null;
        this.schematicManager = null;
        this.searchQuery = '';
        this.playTimer = null;
        this.isPlaying = false;
        this.playStepMs = 1100;   // ritmo del "play" (coincide con la animación del chart)
        this.dayWindowStart = 0;  // índice del primer día visible en la tira
        this.dayWindowSize = 7;   // días visibles por página
        this.sensorsData = [];    // sensores del día actual (para paginar)
        this.sensorWindowStart = 0;
        this.sensorPageSize = 6;  // sensores visibles por página
    }

    setChartManager(cm)     { this.chartManager = cm; }
    setSchematicManager(sm) { this.schematicManager = sm; }

    initElements() {
        this.elements = {
            // Picklist
            picklist: document.getElementById('wellPicklist'),
            picklistTrigger: document.getElementById('picklistTrigger'),
            picklistCurrent: document.getElementById('picklistCurrent'),
            picklistDropdown: document.getElementById('picklistDropdown'),
            picklistSearch: document.getElementById('picklistSearch'),
            picklistList: document.getElementById('picklistList'),
            picklistCount: document.getElementById('picklistCount'),

            // Header info
            headerOperator: document.getElementById('headerOperator'),
            headerRig: document.getElementById('headerRig'),
            headerStatus: document.getElementById('headerStatus'),
            headerLocation: document.getElementById('headerLocation'),
            headerMD: document.getElementById('headerMD'),
            headerTVD: document.getElementById('headerTVD'),
            headerTD: document.getElementById('headerTD'),
            headerProgressBar: document.getElementById('headerProgressBar'),
            headerProgressTxt: document.getElementById('headerProgressTxt'),
            liveStatus: document.getElementById('liveStatus'),

            // Day selector
            dayContainer: document.getElementById('dayContainer'),
            dayPrev: document.getElementById('dayPrev'),
            dayNext: document.getElementById('dayNext'),
            dayPlay: document.getElementById('dayPlay'),
            dayCurrentLabel: document.getElementById('dayCurrentLabel'),
            dayWindowRange: document.getElementById('dayWindowRange'),
            daySummaryMD: document.getElementById('daySummaryMD'),
            daySummaryPlan: document.getElementById('daySummaryPlan'),
            daySummaryDelta: document.getElementById('daySummaryDelta'),
            daySummaryNPT: document.getElementById('daySummaryNPT'),
            daySummaryCost: document.getElementById('daySummaryCost'),

            // DDR
            ddrTableBody: document.getElementById('ddrTableBody'),
            livePill: document.getElementById('livePill'),

            // Chart
            chartDayChip: document.getElementById('chartDayChip'),
            chartToggle: document.getElementById('chartToggle'),

            // BHA + Mud + NPT
            bhaList: document.getElementById('bhaList'),
            mudGrid: document.getElementById('mudGrid'),
            nptStackBar: document.getElementById('nptStackBar'),
            nptLegend: document.getElementById('nptLegend'),
            nptTotalChip: document.getElementById('nptTotalChip'),

            // Sensors
            sensorsContainer: document.getElementById('sensorsContainer'),
            sensorOpChip: document.getElementById('sensorOpChip'),
            sensorPrev: document.getElementById('sensorPrev'),
            sensorNext: document.getElementById('sensorNext'),
            sensorPageLabel: document.getElementById('sensorPageLabel')
        };

        this.setupControls();
    }

    // =================================================
    // CONTROLES: toggle Profundidad/Costo + Play
    // =================================================
    setupControls() {
        // Toggle de modo del gráfico
        if (this.elements.chartToggle) {
            this.elements.chartToggle.querySelectorAll('.chart-toggle-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (btn.classList.contains('active')) return;
                    this.elements.chartToggle
                        .querySelectorAll('.chart-toggle-btn')
                        .forEach(b => b.classList.toggle('active', b === btn));
                    if (this.chartManager) this.chartManager.setMode(btn.dataset.mode);
                    const well = this.dataManager.getCurrentWell();
                    const day = this.dataManager.getCurrentDay();
                    if (well && day) this.updateChartChip(well, day.dayNumber);
                });
            });
        }

        // Botón Play / Pausa
        if (this.elements.dayPlay) {
            this.elements.dayPlay.addEventListener('click', () => this.togglePlay());
        }

        // Paginador de sensores
        if (this.elements.sensorPrev) {
            this.elements.sensorPrev.addEventListener('click', () => this.pageSensors(-1));
        }
        if (this.elements.sensorNext) {
            this.elements.sensorNext.addEventListener('click', () => this.pageSensors(+1));
        }
    }

    // =================================================
    // PLAY / PAUSA — recorre los días con transición suave
    // =================================================
    togglePlay() {
        if (this.isPlaying) { this.stopPlay(); return; }

        const well = this.dataManager.getCurrentWell();
        if (!well || well.days.length < 2) return;

        const cur = this.dataManager.getCurrentDay();
        let idx = cur ? well.days.findIndex(d => d.dayNumber === cur.dayNumber) : -1;
        // Si estamos en el último día (o sin selección), reiniciar desde el primero
        if (idx >= well.days.length - 1) idx = -1;

        this.isPlaying = true;
        this.setPlayButton(true);

        // Si arrancamos desde el inicio, posicionar en el día 1 de inmediato
        if (idx < 0) { this.selectDay(well.days[0].dayNumber); idx = 0; }

        this.playTimer = setInterval(() => {
            const w = this.dataManager.getCurrentWell();
            if (!w) { this.stopPlay(); return; }
            const next = idx + 1;
            if (next >= w.days.length) { this.stopPlay(); return; }
            idx = next;
            this.selectDay(w.days[idx].dayNumber);
        }, this.playStepMs);
    }

    stopPlay() {
        if (this.playTimer) clearInterval(this.playTimer);
        this.playTimer = null;
        this.isPlaying = false;
        this.setPlayButton(false);
    }

    setPlayButton(playing) {
        const btn = this.elements.dayPlay;
        if (!btn) return;
        btn.classList.toggle('playing', playing);
        const icon = btn.querySelector('.play-icon');
        const label = btn.querySelector('.play-label');
        if (icon) icon.textContent = playing ? '❚❚' : '▶';
        if (label) label.textContent = playing ? 'Pausa' : 'Play';
    }

    // Texto del chip del gráfico según el modo (profundidad / costo)
    updateChartChip(well, dayNumber) {
        const chip = this.elements.chartDayChip;
        if (!chip) return;
        if (this.chartManager && this.chartManager.mode === 'cost') {
            const actual = this.dataManager.getActualCostUpTo(well, dayNumber);
            const pct = this.dataManager.getAFEConsumed(well, dayNumber);
            chip.textContent = `${this.dataManager.formatUSD(actual)} · ${pct.toFixed(0)}% AFE`;
            chip.classList.toggle('chip-red', pct > 100);
        } else {
            chip.textContent = `Hasta Día ${dayNumber}`;
            chip.classList.remove('chip-red');
        }
    }

    // =================================================
    // PICKLIST
    // =================================================
    setupPicklist() {
        const { picklist, picklistTrigger, picklistSearch } = this.elements;

        picklistTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = picklist.classList.toggle('open');
            if (isOpen) {
                this.renderPicklistItems();
                setTimeout(() => picklistSearch.focus(), 50);
            }
        });

        picklistSearch.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.renderPicklistItems();
        });

        // Cerrar al clickear fuera
        document.addEventListener('click', (e) => {
            if (!picklist.contains(e.target)) {
                picklist.classList.remove('open');
            }
        });

        // Escape para cerrar, Enter para seleccionar primero
        picklistSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                picklist.classList.remove('open');
                picklistTrigger.focus();
            } else if (e.key === 'Enter') {
                const first = this.elements.picklistList.querySelector('.picklist-item');
                if (first) first.click();
            }
        });
    }

    renderPicklistItems() {
        const list = this.elements.picklistList;
        const wells = this.dataManager.getAllWells();
        const q = this.searchQuery.trim().toLowerCase();

        const filtered = wells.filter(w => {
            if (!q) return true;
            return (
                w.id.toLowerCase().includes(q) ||
                w.name.toLowerCase().includes(q) ||
                (w.location || '').toLowerCase().includes(q) ||
                (w.rig || '').toLowerCase().includes(q) ||
                (w.field || '').toLowerCase().includes(q) ||
                (w.status || '').toLowerCase().includes(q)
            );
        });

        this.elements.picklistCount.textContent = filtered.length;

        if (filtered.length === 0) {
            list.innerHTML = '<div class="picklist-empty">Sin resultados para «' + this.escapeHtml(this.searchQuery) + '»</div>';
            return;
        }

        const currentId = this.dataManager.getCurrentWell()?.id;
        list.innerHTML = filtered.map(w => {
            const statusCls = this.getStatusClass(w.status);
            const isActive = w.id === currentId ? 'active' : '';
            return `
                <div class="picklist-item ${isActive}" data-well-id="${w.id}">
                    <div class="picklist-item-main">
                        <div class="picklist-item-id">${this.highlight(w.id, q)}</div>
                        <div class="picklist-item-sub">
                            ${this.highlight(w.location || '—', q)} · RIG ${this.highlight(w.rig || '—', q)}
                            ${w.field ? ' · ' + this.highlight(w.field, q) : ''}
                        </div>
                    </div>
                    <div class="picklist-item-status ${statusCls}">${w.status || '—'}</div>
                </div>
            `;
        }).join('');

        list.querySelectorAll('.picklist-item').forEach(el => {
            el.addEventListener('click', () => {
                this.selectWell(el.dataset.wellId);
                this.elements.picklist.classList.remove('open');
                this.searchQuery = '';
                this.elements.picklistSearch.value = '';
            });
        });
    }

    getStatusClass(status) {
        if (!status) return 'status-other';
        const s = status.toUpperCase();
        if (s.includes('DRILLING')) return 'status-drilling';
        if (s.includes('CASING') || s.includes('CEMENT')) return 'status-casing';
        return 'status-other';
    }

    highlight(text, q) {
        if (!q || !text) return this.escapeHtml(text || '');
        const safe = this.escapeHtml(text);
        const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return safe.replace(new RegExp('(' + escapedQ + ')', 'gi'),
            '<span class="picklist-highlight">$1</span>');
    }

    escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // =================================================
    // SELECCIÓN DE POZO
    // =================================================
    selectWell(wellId) {
        this.stopPlay();
        const well = this.dataManager.setCurrentWell(wellId);
        if (!well) return;

        this.elements.picklistCurrent.textContent = well.id;
        this.updateHeaderInfo(well);
        this.loadDayButtons(well);
        this.renderBHA(well);
        this.renderMud(well);
        this.renderNPTSummary(well);

        if (this.schematicManager) {
            this.schematicManager.render(well);
        }

        // Por defecto seleccionar el último día (más reciente)
        if (well.days.length > 0) {
            const lastDay = well.days[well.days.length - 1];
            this.selectDay(lastDay.dayNumber);
        }
    }

    // =================================================
    // HEADER
    // =================================================
    updateHeaderInfo(well) {
        const e = this.elements;
        e.headerOperator.textContent = well.operator || '—';
        e.headerRig.textContent = well.rig || '—';
        e.headerStatus.textContent = well.status || '—';
        e.headerLocation.textContent = well.location || '—';
        e.headerTD.textContent = well.plannedTD ? `${well.plannedTD} m` : '—';

        const maxMD = this.dataManager.getCurrentMaxDepth(well);
        e.headerMD.textContent = `${maxMD.toFixed(1)} m`;
        e.headerTVD.textContent = `${(maxMD * 0.9).toFixed(1)} m`;

        const pct = this.dataManager.getProgress(well);
        e.headerProgressBar.style.width = pct.toFixed(1) + '%';
        e.headerProgressTxt.textContent = pct.toFixed(1) + '%';

        const isLive = (well.status || '').toUpperCase().includes('DRILLING');
        e.liveStatus.classList.toggle('not-live', !isLive);
    }

    // =================================================
    // DAY SELECTOR
    // =================================================
    loadDayButtons(well) {
        const c = this.elements.dayContainer;
        c.innerHTML = '';

        well.days.forEach((day, idx) => {
            const btn = document.createElement('button');
            const nptMin = this.dataManager.getDayNPTMinutes(day);
            const phaseTag = day.phase
                ? `<div class="day-tags-mini" title="${this.escapeHtml(day.phase)}"><span class="day-tag-mini">${this.phaseShort(day.phase)}</span></div>`
                : '';

            btn.className = 'day-btn' + (nptMin > 0 ? ' has-npt' : '');
            btn.dataset.day = day.dayNumber;
            btn.dataset.idx = idx;
            btn.innerHTML = `
                <div class="day-num">Día ${day.dayNumber}</div>
                <div class="day-date">${this.dataManager.formatDate(day.date)}</div>
                ${phaseTag}
            `;
            btn.addEventListener('click', () => { this.stopPlay(); this.selectDay(day.dayNumber); });
            c.appendChild(btn);
        });

        // Las flechas paginan la ventana de 7 días (no día a día)
        this.elements.dayPrev.onclick = () => this.pageDayWindow(-1);
        this.elements.dayNext.onclick = () => this.pageDayWindow(+1);

        // Arrancar mostrando la última página (días más recientes)
        this.dayWindowStart = Math.max(0, well.days.length - this.dayWindowSize);
        this.updateDayWindow();
    }

    maxWindowStart(well) {
        return Math.max(0, well.days.length - this.dayWindowSize);
    }

    // Mueve la ventana visible de a una página, sin cambiar el día seleccionado
    pageDayWindow(dir) {
        this.stopPlay();
        const well = this.dataManager.getCurrentWell();
        if (!well) return;
        const max = this.maxWindowStart(well);
        this.dayWindowStart = Math.min(max, Math.max(0, this.dayWindowStart + dir * this.dayWindowSize));
        this.updateDayWindow();
    }

    // Garantiza que el índice de día quede dentro de la ventana visible
    ensureDayVisible(idx) {
        if (idx < this.dayWindowStart) {
            this.dayWindowStart = idx;
        } else if (idx >= this.dayWindowStart + this.dayWindowSize) {
            this.dayWindowStart = idx - this.dayWindowSize + 1;
        }
    }

    // Muestra/oculta botones según la ventana y actualiza flechas + rango
    updateDayWindow() {
        const well = this.dataManager.getCurrentWell();
        if (!well) return;
        const start = this.dayWindowStart;
        const end = start + this.dayWindowSize;

        this.elements.dayContainer.querySelectorAll('.day-btn').forEach(btn => {
            const i = Number(btn.dataset.idx);
            btn.classList.toggle('hidden', i < start || i >= end);
        });

        const max = this.maxWindowStart(well);
        this.elements.dayPrev.disabled = start <= 0;
        this.elements.dayNext.disabled = start >= max;

        if (this.elements.dayWindowRange) {
            const total = well.days.length;
            if (total <= this.dayWindowSize) {
                this.elements.dayWindowRange.textContent = '';
            } else {
                const from = start + 1;
                const to = Math.min(total, end);
                this.elements.dayWindowRange.textContent = `Días ${from}–${to} de ${total}`;
            }
        }
    }

    selectDay(dayNumber) {
        const day = this.dataManager.setCurrentDay(dayNumber);
        if (!day) return;

        // Marcar botón activo
        document.querySelectorAll('.day-btn').forEach(btn => {
            btn.classList.toggle('active', Number(btn.dataset.day) === dayNumber);
        });

        const well = this.dataManager.getCurrentWell();

        // Update day controls
        this.elements.dayCurrentLabel.textContent =
            `Día ${day.dayNumber} · ${this.dataManager.formatDateLong(day.date)}`;

        // Asegurar que el día quede dentro de la ventana visible de 7
        const idx = well.days.findIndex(d => d.dayNumber === dayNumber);
        this.ensureDayVisible(idx);
        this.updateDayWindow();

        // Summary chips
        const nptMin = this.dataManager.getDayNPTMinutes(day);
        const delta = day.actualMD - day.planMD;
        this.elements.daySummaryMD.textContent = (day.actualMD || 0).toFixed(1) + 'm';
        this.elements.daySummaryPlan.textContent = (day.planMD || 0).toFixed(1) + 'm';
        const dEl = this.elements.daySummaryDelta;
        dEl.innerHTML = `Δ <b>${delta >= 0 ? '+' : ''}${delta.toFixed(1)}m</b>`;
        dEl.className = 'chip ' + (delta >= 0 ? 'chip-green' : 'chip-red');
        this.elements.daySummaryNPT.innerHTML = `NPT día: <b>${this.dataManager.formatHours(nptMin)}h</b>`;
        if (this.elements.daySummaryCost) {
            this.elements.daySummaryCost.textContent = this.dataManager.formatUSD(day.actualCost);
        }

        // Chart chip (según modo activo)
        this.updateChartChip(well, dayNumber);

        // Update widgets
        this.loadDDRTable(day);
        this.loadSensors(day);

        // Update schematic (current depth changes per day)
        if (this.schematicManager) {
            this.schematicManager.updateCurrentDepth(well, day);
        }

        // Update chart progressively
        if (this.chartManager) {
            this.chartManager.update(well, dayNumber);
        }
    }

    // =================================================
    // DDR TABLE
    // =================================================
    loadDDRTable(day) {
        const tbody = this.elements.ddrTableBody;
        tbody.innerHTML = '';

        day.operations.forEach(op => {
            const row = document.createElement('tr');
            const isNPT = this.dataManager.isNPTOperation(op);

            const codeCls = this.getCodeClass(op.code);
            const rowCls  = isNPT ? `npt-row ${this.getNPTRowClass(op.code)}` : '';
            row.className = rowCls;

            const descClass = isNPT ? 'desc-cell' : 'desc-cell';

            row.innerHTML = `
                <td class="text-muted">${op.startTime}</td>
                <td class="text-main">${op.endTime}</td>
                <td class="text-center ${isNPT ? 'text-main' : 'text-main'}">${op.duration}</td>
                <td class="text-center">
                    <span class="code-badge ${codeCls}">${op.code}</span>
                </td>
                <td class="${descClass}">${this.escapeHtml(op.description)}</td>
                <td class="text-blue text-right">${(op.md || 0).toFixed(1)}</td>
                <td class="text-right ${op.wob === 0 ? 'text-muted' : 'text-main'}">${op.wob}</td>
                <td class="text-right ${op.rpm === 0 ? 'text-muted' : 'text-main'}">${op.rpm}</td>
                <td class="text-right text-main">${(op.torque || 0).toFixed(1)}</td>
                <td class="text-right ${op.gpm === 0 ? 'text-muted' : 'text-main'}">${op.gpm}</td>
                <td class="text-right ${op.spp === 0 ? 'text-muted' : 'text-main'}">${op.spp}</td>
            `;

            tbody.appendChild(row);
        });
    }

    getCodeClass(code) {
        const map = {
            'DRILL':  'drill',
            'CONN':   'conn',
            'CIRC':   'circ',
            'TRIP':   'trip',
            'CASING': 'casing',
            'CEMENT': 'cement',
            'BOP':    'bop',
            'RIG_UP': 'rig_up',
            'NPT_M':  'npt',
            'NPT_D':  'npt-d',
            'NPT_W':  'npt-w',
            'NPT_L':  'npt-l',
            'NPT_O':  'npt-o',
            'NPT_E':  'npt-e'
        };
        return map[code] || 'drill';
    }

    phaseShort(phase) {
        const map = {
            'Csg Guía': 'GUÍA',
            'Csg Aislación Intermedio': 'INTERM',
            'Csg Guía Final': 'FINAL',
            'OpenHole': 'OH'
        };
        return map[phase] || phase;
    }

    getNPTRowClass(code) {
        const map = {
            'NPT_M': '',
            'NPT_D': 'npt-d',
            'NPT_W': 'npt-w',
            'NPT_L': 'npt-l',
            'NPT_O': 'npt-o',
            'NPT_E': 'npt-e'
        };
        return map[code] || '';
    }

    // =================================================
    // SENSORS (más completo)
    // =================================================
    loadSensors(day) {
        const container = this.elements.sensorsContainer;
        container.innerHTML = '';

        if (!day.operations.length) {
            this.elements.sensorOpChip.textContent = '—';
            this.sensorsData = [];
            this.renderSensorWindow();
            return;
        }

        // Tomar la última operación NO-NPT para representar el estado operativo;
        // si todas son NPT, tomar la última.
        const nonNpt = day.operations.filter(op => !this.dataManager.isNPTOperation(op));
        const lastOp = nonNpt.length ? nonNpt[nonNpt.length - 1] : day.operations[day.operations.length - 1];

        this.elements.sensorOpChip.textContent = `${lastOp.code} · ${lastOp.startTime}-${lastOp.endTime}`;

        const isIdle = this.dataManager.isNPTOperation(lastOp) || lastOp.wob === 0;
        const gas = +(Math.random() * 1.5 + 0.3).toFixed(2);
        const flowOut = lastOp.gpm > 0 ? Math.round(lastOp.gpm * (0.98 + Math.random() * 0.03)) : 0;
        const hkld = lastOp.md > 0 ? +(lastOp.md * 0.06 + 50 + (Math.random() * 4)).toFixed(1) : 0;
        const tempIn  = +(45 + (lastOp.md / 200) + (Math.random() * 3)).toFixed(1);
        const tempOut = +(tempIn + 3 + Math.random() * 2).toFixed(1);

        // Densidad de lodo desde el pozo (si está definida)
        const wellMud = this.dataManager.getCurrentWell()?.mud || {};
        const mwIn = wellMud.density != null ? wellMud.density : 10.5;

        this.sensorsData = [
            { name: 'Peso sobre el Tricono (WOB)',  value: lastOp.wob, unit: 'klbs', color: this.colorForWOB(lastOp.wob), idle: isIdle },
            { name: 'Peso en el Gancho (HKLD)',     value: hkld,        unit: 'klbs', color: 'green' },
            { name: 'Presión de Inyección (SPP)',   value: lastOp.spp,  unit: 'psi',  color: this.colorForSPP(lastOp.spp), idle: isIdle },
            { name: 'Revoluciones (RPM)',           value: lastOp.rpm,  unit: 'rpm',  color: this.colorForRPM(lastOp.rpm), idle: isIdle },
            { name: 'Torque de Torsión (TORQUE)',   value: (lastOp.torque || 0).toFixed(1), unit: 'kft-lb', color: this.colorForTorque(lastOp.torque), idle: isIdle },
            { name: 'Gasto de Inyección (FLOW_IN)', value: lastOp.gpm,  unit: 'gpm',  color: 'green', idle: isIdle },
            { name: 'Retorno de Lodo (FLOW_OUT)',   value: flowOut,      unit: 'gpm',  color: 'green', idle: isIdle },
            { name: 'Densidad Lodo Ent. (MW IN)',   value: mwIn,         unit: 'ppg',  color: 'green' },
            { name: 'Temperatura de Entrada (TEMP IN)',  value: tempIn,  unit: '°C',   color: 'green' },
            { name: 'Temperatura de Salida (TEMP OUT)',  value: tempOut, unit: '°C',   color: 'green' },
            { name: 'Profundidad Medida (MD)',     value: (lastOp.md || 0).toFixed(1), unit: 'm', color: 'green' },
            { name: 'Gas Total (GAS)',             value: gas,           unit: '%',    color: gas > 1 ? 'yellow' : 'green' }
        ];

        // Clamp de la ventana por si cambió la cantidad de sensores
        const maxStart = Math.max(0, this.sensorsData.length - this.sensorPageSize);
        if (this.sensorWindowStart > maxStart) this.sensorWindowStart = 0;
        this.renderSensorWindow();
    }

    // Mueve la página de sensores
    pageSensors(dir) {
        const maxStart = Math.max(0, this.sensorsData.length - this.sensorPageSize);
        this.sensorWindowStart = Math.min(maxStart, Math.max(0, this.sensorWindowStart + dir * this.sensorPageSize));
        this.renderSensorWindow();
    }

    // Renderiza sólo la página visible de sensores + actualiza flechas y etiqueta
    renderSensorWindow() {
        const container = this.elements.sensorsContainer;
        if (!container) return;
        container.innerHTML = '';

        const start = this.sensorWindowStart;
        const end = start + this.sensorPageSize;
        const slice = this.sensorsData.slice(start, end);

        slice.forEach(s => {
            const card = document.createElement('div');
            const dimCls = s.idle && s.value === 0 ? ' dim' : '';
            card.className = `sensor-card ${s.color}${dimCls}`;
            card.innerHTML = `
                <div class="sensor-title">${s.name}</div>
                <div class="sensor-value-row">
                    <span class="sensor-value">${s.value}</span>
                    <span class="sensor-unit">${s.unit}</span>
                </div>
            `;
            container.appendChild(card);
        });

        // Controles del paginador
        const total = this.sensorsData.length;
        const maxStart = Math.max(0, total - this.sensorPageSize);
        if (this.elements.sensorPrev) this.elements.sensorPrev.disabled = start <= 0;
        if (this.elements.sensorNext) this.elements.sensorNext.disabled = start >= maxStart;
        if (this.elements.sensorPageLabel) {
            const from = total ? start + 1 : 0;
            const to = Math.min(total, end);
            this.elements.sensorPageLabel.textContent = `${from}–${to}/${total}`;
        }
    }

    colorForWOB(wob) {
        if (wob === 0) return 'dim';
        if (wob > 40) return 'yellow';
        return 'green';
    }
    colorForRPM(rpm) {
        if (rpm === 0) return 'dim';
        if (rpm < 50) return 'yellow';
        return 'green';
    }
    colorForSPP(spp) {
        if (spp === 0) return 'dim';
        if (spp > 3200) return 'yellow';
        if (spp > 3500) return 'red';
        return 'green';
    }
    colorForTorque(t) {
        if (!t) return 'dim';
        if (t > 17) return 'yellow';
        return 'green';
    }

    // =================================================
    // BHA
    // =================================================
    renderBHA(well) {
        const list = this.elements.bhaList;
        list.innerHTML = '';
        if (!well.bha || !well.bha.length) {
            list.innerHTML = '<li style="justify-content:center;color:var(--textMuted);">Sin datos de BHA</li>';
            return;
        }

        well.bha.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="bha-n">${item.n}.</span>
                <span class="bha-item">${this.escapeHtml(item.item)}</span>
                <span class="bha-len">${item.length.toFixed(1)}m</span>
            `;
            list.appendChild(li);
        });
    }

    // =================================================
    // MUD
    // =================================================
    renderMud(well) {
        const grid = this.elements.mudGrid;
        grid.innerHTML = '';

        const mud = well.mud || {};

        // Banner destacado: tipo de lodo + densidad como dato dominante
        const banner = document.createElement('div');
        banner.className = 'mud-banner';
        banner.innerHTML = `
            <div class="mud-banner-icon">💧</div>
            <div class="mud-banner-main">
                <div class="mud-banner-label">Sistema de Lodo</div>
                <div class="mud-banner-type">${this.escapeHtml(mud.type || '—')}</div>
            </div>
            <div class="mud-banner-density">
                <div class="mud-banner-density-val">${mud.density != null ? mud.density : '—'}</div>
                <div class="mud-banner-density-unit">ppg</div>
            </div>
        `;
        grid.appendChild(banner);

        // Métricas en tiles compactos con acento de color
        const metrics = [
            { label: 'Viscosidad',   value: mud.viscosity, unit: 'sec',        accent: 'cyan' },
            { label: 'pH',           value: mud.ph,        unit: '',           accent: 'green' },
            { label: 'Filtrado API', value: mud.filtrate,  unit: 'cc',         accent: 'purple' },
            { label: 'YP',           value: mud.yp,        unit: 'lb/100ft²',  accent: 'orange' },
            { label: 'Gels 10s/10m', value: mud.gels,      unit: '',           accent: 'slate', raw: true }
        ];

        const tiles = document.createElement('div');
        tiles.className = 'mud-tiles';
        metrics.forEach(m => {
            const has = m.value != null && m.value !== '';
            const valTxt = has ? this.escapeHtml(String(m.value)) : '—';
            const el = document.createElement('div');
            el.className = 'mud-tile accent-' + m.accent;
            el.innerHTML = `
                <div class="mud-tile-label">${m.label}</div>
                <div class="mud-tile-value">${valTxt}${m.unit && has ? `<span class="mud-tile-unit">${m.unit}</span>` : ''}</div>
            `;
            tiles.appendChild(el);
        });
        grid.appendChild(tiles);
    }

    // =================================================
    // NPT SUMMARY
    // =================================================
    renderNPTSummary(well) {
        const totals = this.dataManager.getWellNPTByCategory(well);
        const cats = this.dataManager.getCategories();
        const totalMin = Object.values(totals).reduce((s, v) => s + v, 0);

        // Chip total
        this.elements.nptTotalChip.textContent =
            `${this.dataManager.formatHours(totalMin)} hrs acum.`;

        // Stack bar
        const bar = this.elements.nptStackBar;
        bar.innerHTML = '';

        if (totalMin === 0) {
            const empty = document.createElement('div');
            empty.className = 'npt-bar-seg empty';
            empty.textContent = 'Sin NPT registrado';
            bar.appendChild(empty);
        } else {
            Object.entries(totals)
                .sort((a, b) => b[1] - a[1])
                .forEach(([code, mins]) => {
                    const cat = cats[code] || { label: code, color: '#888' };
                    const pct = (mins / totalMin) * 100;
                    const seg = document.createElement('div');
                    seg.className = 'npt-bar-seg';
                    seg.style.width = pct + '%';
                    seg.style.background = cat.color;
                    seg.title = `${cat.label}: ${this.dataManager.formatHours(mins)}h (${pct.toFixed(1)}%)`;
                    if (pct >= 8) seg.textContent = pct.toFixed(0) + '%';
                    bar.appendChild(seg);
                });
        }

        // Legend (todas las categorías, mostrando 0 si no hay)
        const legend = this.elements.nptLegend;
        legend.innerHTML = '';
        Object.entries(cats).forEach(([code, cat]) => {
            const mins = totals[code] || 0;
            const pct = totalMin > 0 ? (mins / totalMin) * 100 : 0;
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="npt-dot" style="background:${cat.color};"></span>
                <span class="npt-label">${cat.label}</span>
                <span class="npt-hrs">${this.dataManager.formatHours(mins)}h</span>
                <span class="npt-pct">${pct.toFixed(0)}%</span>
            `;
            legend.appendChild(li);
        });
    }
}

window.WellManager = WellManager;
