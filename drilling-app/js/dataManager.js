// ============================================
// DATA MANAGER - Gestión de datos de pozos
// ============================================

class DataManager {
    constructor() {
        this.wells = [];
        this.nptCategories = {};
        this.upcomingLocations = [];
        this.currentWell = null;
        this.currentDay = null;
    }

    async loadWells() {
        try {
            const response = await fetch('./data/wells.json');
            const data = await response.json();
            this.wells = data.wells || [];
            this.nptCategories = data.nptCategories || {};
            this.upcomingLocations = data.upcomingLocations || [];
            return this.wells;
        } catch (error) {
            console.error('Error loading wells:', error);
            return [];
        }
    }

    getWellById(wellId) {
        return this.wells.find(well => well.id === wellId);
    }

    getAllWells() {
        return this.wells;
    }

    setCurrentWell(wellId) {
        this.currentWell = this.getWellById(wellId);
        this.currentDay = null;
        return this.currentWell;
    }

    setCurrentDay(dayNumber) {
        if (!this.currentWell) return null;
        this.currentDay = this.currentWell.days.find(d => d.dayNumber === dayNumber);
        return this.currentDay;
    }

    getCurrentWell() { return this.currentWell; }
    getCurrentDay()  { return this.currentDay; }
    getCategories()  { return this.nptCategories; }

    // ===== NPT helpers =====

    isNPTOperation(op) {
        return typeof op.code === 'string' && op.code.startsWith('NPT_');
    }

    // NPT acumulado del pozo (en minutos), agrupado por código
    getWellNPTByCategory(well) {
        const totals = {};
        if (!well) return totals;

        for (const day of well.days) {
            for (const op of day.operations) {
                if (this.isNPTOperation(op)) {
                    totals[op.code] = (totals[op.code] || 0) + op.duration;
                }
            }
        }
        return totals;
    }

    // NPT total del pozo (en minutos) hasta un día específico (o todos)
    getWellNPTTotal(well, uptoDayNumber = null) {
        if (!well) return 0;
        let total = 0;
        for (const day of well.days) {
            if (uptoDayNumber !== null && day.dayNumber > uptoDayNumber) break;
            for (const op of day.operations) {
                if (this.isNPTOperation(op)) total += op.duration;
            }
        }
        return total;
    }

    getDayNPTMinutes(day) {
        if (!day) return 0;
        return day.operations
            .filter(op => this.isNPTOperation(op))
            .reduce((s, op) => s + op.duration, 0);
    }

    // ===== Depth helpers =====

    // Devuelve array de [day, actualMD, planMD] para todos los días del pozo
    getDepthSeries(well) {
        if (!well) return { labels: [], actual: [], plan: [] };
        const labels = well.days.map(d => `D${d.dayNumber}`);
        const actual = well.days.map(d => d.actualMD ?? null);
        const plan   = well.days.map(d => d.planMD ?? null);
        return { labels, actual, plan };
    }

    // Profundidad máxima alcanzada (último día con datos)
    getCurrentMaxDepth(well) {
        if (!well || !well.days.length) return 0;
        const last = well.days[well.days.length - 1];
        return last.actualMD || 0;
    }

    // Avance porcentual sobre TD plan
    getProgress(well) {
        if (!well || !well.plannedTD) return 0;
        return Math.min(100, (this.getCurrentMaxDepth(well) / well.plannedTD) * 100);
    }

    // ===== Cost helpers =====

    // Serie de costo ACUMULADO (USD) por día: { labels, plan, actual }
    getCostSeries(well) {
        if (!well) return { labels: [], plan: [], actual: [] };
        const labels = [];
        const plan = [];
        const actual = [];
        let cumPlan = 0;
        let cumActual = 0;
        for (const d of well.days) {
            cumPlan   += d.planCost   || 0;
            cumActual += d.actualCost || 0;
            labels.push(`D${d.dayNumber}`);
            plan.push(cumPlan);
            actual.push(cumActual);
        }
        return { labels, plan, actual };
    }

    // Costo real acumulado hasta un día (inclusive)
    getActualCostUpTo(well, dayNumber) {
        if (!well) return 0;
        let total = 0;
        for (const d of well.days) {
            total += d.actualCost || 0;
            if (d.dayNumber === dayNumber) break;
        }
        return total;
    }

    // % del AFE consumido (real acumulado / AFE)
    getAFEConsumed(well, dayNumber) {
        if (!well || !well.afe) return 0;
        return (this.getActualCostUpTo(well, dayNumber) / well.afe) * 100;
    }

    // Formatea USD de forma compacta: 3570000 -> "US$ 3.57M"
    formatUSD(value) {
        if (value == null) return '—';
        if (Math.abs(value) >= 1e6) return `US$ ${(value / 1e6).toFixed(2)}M`;
        if (Math.abs(value) >= 1e3) return `US$ ${(value / 1e3).toFixed(0)}k`;
        return `US$ ${value.toFixed(0)}`;
    }

    // ===== Upcoming locations helpers =====

    // Orden de los gates y sus etiquetas (para render consistente)
    getGateDefs() {
        return [
            { key: 'locacion', label: 'Locación lista',   icon: '🏗️' },
            { key: 'programa', label: 'Programa asignado', icon: '📋' },
            { key: 'afe',      label: 'AFE aprobado',      icon: '💰' },
            { key: 'permisos', label: 'Permisos ingreso',  icon: '🔑' }
        ];
    }

    // Locaciones ordenadas por spud estimado (más próximas primero)
    getUpcomingLocations() {
        return [...this.upcomingLocations].sort((a, b) => {
            const da = a.estimatedSpud || '9999';
            const db = b.estimatedSpud || '9999';
            return da < db ? -1 : da > db ? 1 : 0;
        });
    }

    // Resumen de avance de gates: { done, total, pct, ready }
    getLocationReadiness(loc) {
        const defs = this.getGateDefs();
        const total = defs.length;
        let done = 0;
        defs.forEach(d => {
            const g = (loc.gates || {})[d.key];
            if (g && g.status === 'done') done++;
        });
        return {
            done,
            total,
            pct: total ? Math.round((done / total) * 100) : 0,
            ready: done === total
        };
    }

    // Etiqueta de estado general de la locación
    getLocationStage(loc) {
        const { done, ready } = this.getLocationReadiness(loc);
        if (ready) return { label: 'Listo para DTM', tone: 'green' };
        if (done === 0) return { label: 'Por iniciar',   tone: 'slate' };
        return { label: 'En preparación', tone: 'yellow' };
    }

    // Días desde hoy hasta el spud estimado (negativo = atrasado)
    daysUntil(dateString) {
        if (!dateString) return null;
        const target = new Date(dateString + 'T00:00:00');
        if (Number.isNaN(target.getTime())) return null;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return Math.round((target - now) / 86400000);
    }

    // ===== Util =====

    formatDate(dateString) {
        if (!dateString) return '—';
        const d = new Date(dateString + 'T00:00:00');
        if (Number.isNaN(d.getTime())) return dateString;
        return d.toLocaleDateString('es-AR', {
            year: '2-digit',
            month: '2-digit',
            day: '2-digit'
        });
    }

    formatDateLong(dateString) {
        if (!dateString) return '—';
        const d = new Date(dateString + 'T00:00:00');
        if (Number.isNaN(d.getTime())) return dateString;
        return d.toLocaleDateString('es-AR', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    formatHours(minutes) {
        if (!minutes) return '0.0';
        return (minutes / 60).toFixed(1);
    }
}

window.DataManager = DataManager;
