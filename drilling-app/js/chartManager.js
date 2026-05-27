// ============================================
// CHART MANAGER - Días vs Profundidad / Costo (progresivo)
// ============================================

class ChartManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.chart = null;
        this.mode = 'depth';          // 'depth' | 'cost'
        this.well = null;             // pozo actual (para re-render al cambiar de modo)
        this.selectedDayNumber = null;
    }

    init() {
        const canvas = document.getElementById('daysDepthChart');
        if (!canvas) return;
        this.ctx = canvas.getContext('2d');

        const self = this;
        const fmtAxis = (v) => self.mode === 'cost'
            ? self.dataManager.formatUSD(v).replace('US$ ', '$')
            : v;

        this.chart = new Chart(this.ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        // 0 — PLAN (profundidad o costo plan acumulado)
                        label: 'PLAN',
                        data: [],
                        borderColor: '#8b949e',
                        borderDash: [5, 5],
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 0,
                        tension: 0.15
                    },
                    {
                        // 1 — REAL hasta día seleccionado (área rellena)
                        label: 'REAL',
                        data: [],
                        borderColor: '#00f6ff',
                        backgroundColor: 'rgba(0, 246, 255, 0.15)',
                        borderWidth: 3,
                        fill: true,
                        pointBackgroundColor: '#00f6ff',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 1,
                        pointRadius: ctx => ctx.dataIndex === ctx.chart.$selectedDayIdx ? 7 : 3.5,
                        pointHoverRadius: 7,
                        tension: 0.15
                    },
                    {
                        // 2 — REAL proyección (días futuros)
                        label: 'Proyección',
                        data: [],
                        borderColor: 'rgba(0, 246, 255, 0.35)',
                        borderDash: [2, 4],
                        borderWidth: 1.5,
                        fill: false,
                        pointRadius: 2,
                        pointBackgroundColor: 'rgba(0, 246, 255, 0.35)',
                        pointBorderColor: 'transparent',
                        tension: 0.15
                    },
                    {
                        // 3 — AFE (presupuesto autorizado) — sólo en modo costo
                        label: 'AFE',
                        data: [],
                        borderColor: '#ef4444',
                        borderDash: [8, 4],
                        borderWidth: 1.5,
                        fill: false,
                        pointRadius: 0,
                        tension: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 600, easing: 'easeOutQuart' },
                layout: { padding: { top: 6, right: 10, bottom: 0, left: 0 } },
                scales: {
                    y: {
                        reverse: true,
                        min: 0,
                        grid: { color: '#21262d', drawBorder: false },
                        ticks: {
                            color: '#8b949e',
                            font: { family: 'JetBrains Mono', size: 9 },
                            callback: fmtAxis
                        },
                        title: {
                            display: true,
                            text: 'PROFUNDIDAD (m)',
                            color: '#8b949e',
                            font: { size: 9, weight: 'bold', family: 'Inter' }
                        }
                    },
                    x: {
                        grid: { color: '#21262d', drawBorder: false },
                        ticks: {
                            color: '#8b949e',
                            font: { family: 'JetBrains Mono', size: 9 }
                        },
                        title: {
                            display: true,
                            text: 'DÍA OPERATIVO',
                            color: '#8b949e',
                            font: { size: 9, weight: 'bold', family: 'Inter' }
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end',
                        labels: {
                            color: '#c9d1d9',
                            usePointStyle: true,
                            boxWidth: 6,
                            font: { size: 9, family: 'Inter', weight: 'bold' },
                            // Ocultar la entrada de "Proyección" para no saturar la leyenda
                            filter: item => item.text !== 'Proyección'
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(13, 17, 23, 0.96)',
                        titleColor: '#8b949e',
                        titleFont: { size: 11, family: 'Inter' },
                        bodyColor: '#fff',
                        bodyFont: { size: 11, family: 'JetBrains Mono', weight: 'bold' },
                        borderColor: '#30363d',
                        borderWidth: 1,
                        padding: 10,
                        displayColors: true,
                        boxWidth: 8,
                        boxHeight: 8,
                        callbacks: {
                            label: (ctx) => {
                                if (ctx.parsed.y == null) return null;
                                const val = self.mode === 'cost'
                                    ? self.dataManager.formatUSD(ctx.parsed.y)
                                    : `${ctx.parsed.y.toFixed(1)} m`;
                                return `${ctx.dataset.label}: ${val}`;
                            }
                        }
                    }
                },
                interaction: { mode: 'nearest', axis: 'x', intersect: false }
            }
        });
    }

    setMode(mode) {
        if (mode === this.mode) return;
        this.mode = mode;
        // Eje Y: profundidad va invertido (0 arriba), costo normal (0 abajo)
        this.chart.options.scales.y.reverse = (mode === 'depth');
        this.chart.options.scales.y.title.text =
            mode === 'cost' ? 'COSTO ACUMULADO (US$)' : 'PROFUNDIDAD (m)';
        if (this.well) this.update(this.well, this.selectedDayNumber);
    }

    /**
     * Actualiza el chart hasta el día seleccionado, según el modo activo.
     * - Plan: serie completa (línea punteada gris).
     * - Real sólido: hasta el día seleccionado (área celeste).
     * - Real proyección: días posteriores (punteado tenue).
     * - AFE: línea horizontal roja (sólo modo costo).
     */
    update(well, selectedDayNumber) {
        if (!this.chart || !well || !well.days.length) return;
        this.well = well;
        this.selectedDayNumber = selectedDayNumber;

        const days = well.days;
        const labels = days.map(d => `D${d.dayNumber}`);
        const selIdx = days.findIndex(d => d.dayNumber === selectedDayNumber);

        let planSeries, actualSeries, afeSeries;

        if (this.mode === 'cost') {
            const cs = this.dataManager.getCostSeries(well);
            planSeries = cs.plan;
            actualSeries = cs.actual;
            afeSeries = labels.map(() => well.afe || null);
        } else {
            planSeries = days.map(d => d.planMD);
            actualSeries = days.map(d => d.actualMD);
            afeSeries = labels.map(() => null);   // oculto en modo profundidad
        }

        const actualUpTo  = actualSeries.map((v, i) => i <= selIdx ? v : null);
        const actualFuture = actualSeries.map((v, i) => i >= selIdx ? v : null);

        // Eje Y dinámico
        const allValues = [...planSeries, ...actualSeries, ...afeSeries].filter(v => v != null);
        const maxV = Math.max(...allValues, 0);
        const step = this.mode === 'cost' ? 500000 : 500;
        const yMax = Math.ceil(maxV / step) * step + (this.mode === 'cost' ? 200000 : 200);

        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = planSeries;
        this.chart.data.datasets[1].data = actualUpTo;
        this.chart.data.datasets[2].data = actualFuture;
        this.chart.data.datasets[3].data = afeSeries;

        this.chart.options.scales.y.max = yMax;
        this.chart.$selectedDayIdx = selIdx;
        this.chart.update();
    }
}

window.ChartManager = ChartManager;
