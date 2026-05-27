// ============================================
// SCHEMATIC MANAGER - Wellbore schematic SVG dinámico
// ============================================

class SchematicManager {
    constructor() {
        this.svg = null;
        this.labels = null;
        // Constantes de dibujo (sistema de coordenadas SVG 100 x 450)
        this.VIEW_W = 100;
        this.VIEW_H = 450;
        this.LABEL_H = 450; // las etiquetas usan el mismo alto
    }

    init() {
        this.svg = document.getElementById('wellboreSvg');
        this.labels = document.getElementById('schematicLabels');
    }

    /**
     * Render completo basado en el pozo (casings + open hole + current depth).
     */
    render(well) {
        if (!this.svg || !this.labels) return;
        this.currentWell = well;

        const maxDepth = Math.max(
            well.plannedTD || 0,
            ...(well.casings || []).map(c => c.shoeMD || 0),
            ...(well.days || []).map(d => d.actualMD || 0)
        );
        // Escala lineal con margen del 10% (ground)
        const padTop = 12; // espacio para línea de superficie
        this.depthToY = (md) => padTop + (md / maxDepth) * (this.VIEW_H - padTop - 20);
        this.maxDepth = maxDepth;

        // === SVG ===
        const parts = [];

        // Línea de superficie
        parts.push(`<line x1="0" y1="${padTop}" x2="${this.VIEW_W}" y2="${padTop}" stroke="#8b949e" stroke-width="1.2"/>`);
        // Indicador "GL" (ground level)
        parts.push(`<text x="2" y="${padTop - 2}" font-family="JetBrains Mono" font-size="6" fill="#8b949e">GL</text>`);

        // Casings (de afuera hacia adentro: en cada nivel disminuye el ancho)
        const casings = (well.casings || []).filter(c => c.shoeMD > 0);
        // Definir anchos por índice (más afuera = más ancho)
        const widthsByIdx = [
            { left: 8, right: 92 },   // Conductor
            { left: 18, right: 82 },  // Superficie
            { left: 28, right: 72 },  // Intermedio
            { left: 36, right: 64 }   // Producción
        ];

        let lastSetShoeY = padTop;
        let innermostSetWidth = widthsByIdx[0];

        casings.forEach((c, i) => {
            const wIdx = Math.min(i, widthsByIdx.length - 1);
            const w = widthsByIdx[wIdx];
            const shoeY = this.depthToY(c.shoeMD);
            const tocY = this.depthToY(c.tocMD || 0);

            if (c.set) {
                // Cemento (entre TOC y zapata, anillos a izq/derecha)
                const cementW = 5;
                parts.push(`<path class="cement" d="M ${w.left - cementW},${tocY} L ${w.left},${tocY} L ${w.left},${shoeY} L ${w.left - cementW},${shoeY} Z"/>`);
                parts.push(`<path class="cement" d="M ${w.right},${tocY} L ${w.right + cementW},${tocY} L ${w.right + cementW},${shoeY} L ${w.right},${shoeY} Z"/>`);

                // Tubería de casing (líneas)
                parts.push(`<line class="casing-pipe" x1="${w.left}" y1="${padTop}" x2="${w.left}" y2="${shoeY}"/>`);
                parts.push(`<line class="casing-pipe" x1="${w.right}" y1="${padTop}" x2="${w.right}" y2="${shoeY}"/>`);

                // Marca de zapata (línea horizontal pequeña)
                parts.push(`<line x1="${w.left}" y1="${shoeY}" x2="${w.right}" y2="${shoeY}" stroke="#9ca3af" stroke-width="0.8"/>`);

                lastSetShoeY = shoeY;
                innermostSetWidth = w;
            } else {
                // No set: dibujar como contorno tenue, sólo si está planificado a más profundidad que el actual
                parts.push(`<line class="casing-pipe" x1="${w.left}" y1="${lastSetShoeY}" x2="${w.left}" y2="${shoeY}" stroke="#30363d" stroke-dasharray="3,3" stroke-width="1"/>`);
                parts.push(`<line class="casing-pipe" x1="${w.right}" y1="${lastSetShoeY}" x2="${w.right}" y2="${shoeY}" stroke="#30363d" stroke-dasharray="3,3" stroke-width="1"/>`);
            }
        });

        // Open hole (desde innermost set shoe hasta current actualMD)
        // se actualizará dinámicamente en updateCurrentDepth
        this.lastSetShoeY = lastSetShoeY;
        this.innermostSetWidth = innermostSetWidth;

        // Marcadores ground/zapata
        this.svg.innerHTML = parts.join('\n') +
            // placeholder para open hole + drillstring (se reemplaza)
            '<g id="dynamicLayer"></g>';

        // Render labels
        this.renderLabels(well);
    }

    /**
     * Renderiza etiquetas verticales del lado derecho (casings + open hole).
     */
    renderLabels(well) {
        const labelsDiv = this.labels;
        labelsDiv.innerHTML = '';

        const casings = (well.casings || []).filter(c => c.shoeMD > 0);
        const containerH = labelsDiv.clientHeight || this.LABEL_H;

        // Función: SVG Y → label Y proporcional
        const yToTopPx = (svgY) => {
            return Math.max(2, Math.min(containerH - 50, (svgY / this.VIEW_H) * containerH - 14));
        };

        casings.forEach((c) => {
            const div = document.createElement('div');
            div.className = 'schem-label';
            div.style.top = yToTopPx(this.depthToY(c.shoeMD)) + 'px';
            const setBadge = c.set
                ? '<span class="schem-label-md" style="color:var(--successGreen);font-weight:700;">SET</span>'
                : '<span class="schem-label-md" style="color:var(--textMuted);">Planificado</span>';
            div.innerHTML = `
                <span class="schem-label-title">${this.escape(c.label)}</span>
                <span class="schem-label-sub">${this.escape(c.size)} ${this.escape(c.grade)} ${this.escape(c.weight)} @ ${c.shoeMD}m MD</span>
                <span class="schem-label-sub">TOC @ ${c.tocMD}m · ${setBadge}</span>
            `;
            labelsDiv.appendChild(div);
        });
    }

    /**
     * Actualiza la profundidad actual y la fase actual a partir del día seleccionado.
     * Dibuja la sarta de perforación y open hole hasta day.actualMD.
     */
    updateCurrentDepth(well, day) {
        if (!this.svg || !day) return;
        const actualY = this.depthToY(day.actualMD || 0);
        const w = this.innermostSetWidth || { left: 36, right: 64 };
        const midX = (w.left + w.right) / 2;

        const dynParts = [];

        // Open hole (de last set shoe hasta actualMD), si actualMD > lastSetShoeY (en profundidad)
        const lastSetShoeMD = this.lastSetShoeYInMD(well);
        if ((day.actualMD || 0) > lastSetShoeMD) {
            const ohStartY = this.depthToY(lastSetShoeMD);
            dynParts.push(`<line class="open-hole" x1="${w.left}" y1="${ohStartY}" x2="${w.left}" y2="${actualY}"/>`);
            dynParts.push(`<line class="open-hole" x1="${w.right}" y1="${ohStartY}" x2="${w.right}" y2="${actualY}"/>`);
        }

        // Drill string (sarta) en el centro, desde superficie hasta actualY
        dynParts.push(`<rect class="drill-string" x="${midX - 1.5}" y="12" width="3" height="${actualY - 12}" fill="#00f6ff" opacity="0.5"/>`);

        // BHA (último tramo del drill string, más grueso)
        const bhaLen = Math.min(30, actualY - 12);
        dynParts.push(`<rect class="drill-bha" x="${midX - 2.5}" y="${actualY - bhaLen}" width="5" height="${bhaLen}" fill="#00f6ff"/>`);

        // Tricono (punto en la base)
        dynParts.push(`<polygon points="${midX - 3.5},${actualY} ${midX + 3.5},${actualY} ${midX},${actualY + 4.5}" fill="#00f6ff"/>`);

        // Línea horizontal de current MD a la derecha
        dynParts.push(`<line x1="${w.right}" y1="${actualY}" x2="${this.VIEW_W}" y2="${actualY}" stroke="#00f6ff" stroke-width="0.8" stroke-dasharray="2,2" opacity="0.65"/>`);

        const layer = this.svg.querySelector('#dynamicLayer');
        if (layer) layer.innerHTML = dynParts.join('\n');

        // Añadir/actualizar label "fase actual"
        this.updateCurrentLabel(well, day, actualY);
    }

    updateCurrentLabel(well, day, actualY) {
        const labelsDiv = this.labels;
        let curLabel = labelsDiv.querySelector('.schem-label.current');
        if (curLabel) curLabel.remove();

        const containerH = labelsDiv.clientHeight || this.LABEL_H;
        const top = Math.max(2, Math.min(containerH - 50, (actualY / this.VIEW_H) * containerH - 14));

        const div = document.createElement('div');
        div.className = 'schem-label current';
        div.style.top = top + 'px';
        div.innerHTML = `
            <span class="schem-label-title">[Fase ${day.phase || 'Actual'}] Profundidad actual</span>
            <span class="schem-label-sub">Plan: ${day.planMD}m MD</span>
            <span class="schem-label-md">Actual: ${(day.actualMD || 0).toFixed(1)}m MD</span>
        `;
        labelsDiv.appendChild(div);
    }

    lastSetShoeYInMD(well) {
        const setCasings = (well.casings || []).filter(c => c.set);
        if (!setCasings.length) return 0;
        return Math.max(...setCasings.map(c => c.shoeMD));
    }

    escape(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}

window.SchematicManager = SchematicManager;
