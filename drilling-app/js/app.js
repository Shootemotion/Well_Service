// ============================================
// APP - Inicialización y orquestación
// ============================================

class DrillingApp {
    constructor() {
        this.dataManager = new DataManager();
        this.wellManager = new WellManager(this.dataManager);
        this.chartManager = new ChartManager(this.dataManager);
        this.schematicManager = new SchematicManager();
        this.locationsManager = new LocationsManager(this.dataManager);
    }

    async init() {
        try {
            // Cargar datos
            await this.dataManager.loadWells();

            // Inicializar UI
            this.wellManager.initElements();
            this.wellManager.setupPicklist();

            this.chartManager.init();
            this.schematicManager.init();
            this.locationsManager.init();

            // Wire managers
            this.wellManager.setChartManager(this.chartManager);
            this.wellManager.setSchematicManager(this.schematicManager);

            // Seleccionar primer pozo
            const firstWell = this.dataManager.getAllWells()[0];
            if (firstWell) {
                this.wellManager.selectWell(firstWell.id);
            }

            console.log('✓ Drilling Command Center inicializado');
            console.log(`✓ ${this.dataManager.getAllWells().length} pozos cargados`);
        } catch (error) {
            console.error('Error iniciando aplicación:', error);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new DrillingApp();
    app.init();
    window.app = app;
});
