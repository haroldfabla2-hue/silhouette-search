// =============================================================================
// SILHOUETTE V5.2 - GESTOR DE LAYOUTS
// Gestión avanzada de layouts responsivos para widgets
// =============================================================================

class LayoutManager {
    constructor(widgetManager) {
        this.widgetManager = widgetManager;
        this.breakpoints = {
            xxs: 0,
            xs: 480,
            sm: 768,
            md: 996,
            lg: 1200
        };
        
        this.cols = {
            xxs: 2,
            xs: 4,
            sm: 6,
            md: 10,
            lg: 12
        };

        this.currentBreakpoint = this.getCurrentBreakpoint();
        this.layouts = this.initializeLayouts();
        this.isInitialized = false;
        
        this.observers = new Set();
        this.resizeTimeout = null;
        
        this.init();
    }

    // =============================================================================
    // INICIALIZACIÓN
    // =============================================================================

    init() {
        if (this.isInitialized) return;

        // Configurar listeners de redimensionamiento
        this.setupResizeListener();
        
        // Configurar observer de cambios de layout
        this.setupLayoutObserver();
        
        // Cargar layouts existentes
        this.loadLayouts();
        
        this.isInitialized = true;
        
        console.log('✅ Layout Manager initialized');
        this.notifyObservers('initialized', {
            currentBreakpoint: this.currentBreakpoint,
            totalLayouts: this.getTotalLayouts()
        });
    }

    // =============================================================================
    // GESTIÓN DE LAYOUTS
    // =============================================================================

    initializeLayouts() {
        return {
            xxs: [],
            xs: [],
            sm: [],
            md: [],
            lg: []
        };
    }

    setLayout(breakpoint, layout) {
        if (!this.isValidBreakpoint(breakpoint)) {
            throw new Error(`Invalid breakpoint: ${breakpoint}`);
        }

        // Validar layout
        const validatedLayout = this.validateLayout(layout);
        
        this.layouts[breakpoint] = validatedLayout;
        
        // Notificar cambio
        this.notifyObservers('layoutChanged', {
            breakpoint,
            layout: validatedLayout,
            widgetCount: validatedLayout.length
        });

        console.log(`📐 Layout set for ${breakpoint}: ${validatedLayout.length} items`);
        
        return validatedLayout;
    }

    getLayout(breakpoint) {
        if (!this.isValidBreakpoint(breakpoint)) {
            throw new Error(`Invalid breakpoint: ${breakpoint}`);
        }
        
        return [...this.layouts[breakpoint]];
    }

    getCurrentLayout() {
        return this.getLayout(this.currentBreakpoint);
    }

    addWidgetToLayout(breakpoint, widgetId, position = {}) {
        if (!this.isValidBreakpoint(breakpoint)) {
            throw new Error(`Invalid breakpoint: ${breakpoint}`);
        }

        const layout = this.getLayout(breakpoint);
        
        // Calcular posición si no se proporciona
        if (!position.x || !position.y) {
            position = this.calculateNextPosition(layout, position.w || 4, position.h || 3);
        }

        const layoutItem = {
            i: widgetId,
            x: Math.max(0, position.x || 0),
            y: Math.max(0, position.y || 0),
            w: Math.max(1, position.w || 4),
            h: Math.max(1, position.h || 3),
            minW: position.minW || 2,
            minH: position.minH || 2,
            maxW: position.maxW || this.cols[breakpoint],
            maxH: position.maxH || 20
        };

        // Verificar que no exceda los límites de columnas
        if (layoutItem.x + layoutItem.w > this.cols[breakpoint]) {
            layoutItem.x = Math.max(0, this.cols[breakpoint] - layoutItem.w);
        }

        layout.push(layoutItem);
        this.setLayout(breakpoint, layout);

        this.notifyObservers('widgetAdded', {
            breakpoint,
            widgetId,
            position: layoutItem
        });

        return layoutItem;
    }

    removeWidgetFromLayout(breakpoint, widgetId) {
        const layout = this.getLayout(breakpoint);
        const index = layout.findIndex(item => item.i === widgetId);
        
        if (index === -1) {
            return false;
        }

        layout.splice(index, 1);
        this.setLayout(breakpoint, layout);

        this.notifyObservers('widgetRemoved', {
            breakpoint,
            widgetId
        });

        return true;
    }

    updateWidgetPosition(breakpoint, widgetId, newPosition) {
        const layout = this.getLayout(breakpoint);
        const itemIndex = layout.findIndex(item => item.i === widgetId);
        
        if (itemIndex === -1) {
            throw new Error(`Widget ${widgetId} not found in ${breakpoint} layout`);
        }

        // Actualizar posición
        const updatedItem = {
            ...layout[itemIndex],
            x: newPosition.x !== undefined ? Math.max(0, newPosition.x) : layout[itemIndex].x,
            y: newPosition.y !== undefined ? Math.max(0, newPosition.y) : layout[itemIndex].y,
            w: newPosition.w !== undefined ? Math.max(1, newPosition.w) : layout[itemIndex].w,
            h: newPosition.h !== undefined ? Math.max(1, newPosition.h) : layout[itemIndex].h
        };

        // Verificar límites
        if (updatedItem.x + updatedItem.w > this.cols[breakpoint]) {
            updatedItem.x = Math.max(0, this.cols[breakpoint] - updatedItem.w);
        }

        layout[itemIndex] = updatedItem;
        this.setLayout(breakpoint, layout);

        this.notifyObservers('widgetPositionChanged', {
            breakpoint,
            widgetId,
            position: updatedItem
        });

        return updatedItem;
    }

    // =============================================================================
    // LAYOUT RESPONSIVO
    // =============================================================================

    setCurrentBreakpoint(breakpoint) {
        if (!this.isValidBreakpoint(breakpoint)) {
            throw new Error(`Invalid breakpoint: ${breakpoint}`);
        }

        const previousBreakpoint = this.currentBreakpoint;
        this.currentBreakpoint = breakpoint;

        this.notifyObservers('breakpointChanged', {
            from: previousBreakpoint,
            to: breakpoint,
            layout: this.getCurrentLayout()
        });

        console.log(`📱 Breakpoint changed: ${previousBreakpoint} → ${breakpoint}`);
    }

    getCurrentBreakpoint() {
        const width = window.innerWidth;
        
        for (const [name, minWidth] of Object.entries(this.breakpoints).reverse()) {
            if (width >= minWidth) {
                return name;
            }
        }
        
        return 'xxs';
    }

    isValidBreakpoint(breakpoint) {
        return breakpoint in this.breakpoints;
    }

    getBreakpointWidth(breakpoint) {
        return this.breakpoints[breakpoint];
    }

    getBreakpointCols(breakpoint) {
        return this.cols[breakpoint];
    }

    // =============================================================================
    // LAYOUT INTELIGENTE
    // =============================================================================

    calculateNextPosition(layout, width, height) {
        // Estrategia: buscar la primera posición disponible
        for (let y = 0; y < 100; y++) { // Limite de 100 filas
            for (let x = 0; x <= this.cols.lg - width; x++) {
                if (this.isPositionAvailable(layout, x, y, width, height)) {
                    return { x, y, w: width, h: height };
                }
            }
        }
        
        // Si no hay espacio, añadir al final
        return { 
            x: 0, 
            y: this.getMaxY(layout) + height, 
            w: width, 
            h: height 
        };
    }

    isPositionAvailable(layout, x, y, width, height) {
        // Verificar que el área esté libre
        for (let checkY = y; checkY < y + height; checkY++) {
            for (let checkX = x; checkX < x + width; checkX++) {
                if (this.isOccupied(layout, checkX, checkY)) {
                    return false;
                }
            }
        }
        return true;
    }

    isOccupied(layout, x, y) {
        return layout.some(item => 
            x >= item.x && 
            x < item.x + item.w && 
            y >= item.y && 
            y < item.y + item.h
        );
    }

    getMaxY(layout) {
        return Math.max(0, ...layout.map(item => item.y + item.h));
    }

    compactLayout(breakpoint) {
        const layout = this.getLayout(breakpoint);
        if (layout.length === 0) return layout;

        // Ordenar por posición
        const sortedLayout = [...layout].sort((a, b) => a.y - b.y || a.x - b.x);
        const compacted = [];

        for (const item of sortedLayout) {
            // Buscar posición más alta disponible
            let newY = 0;
            let newX = 0;
            
            // Intentar comprimir verticalmente
            let foundPosition = false;
            for (let y = 0; y < this.getMaxY(compacted) + 10; y++) {
                for (let x = 0; x <= this.cols[breakpoint] - item.w; x++) {
                    if (this.isPositionAvailable(compacted, x, y, item.w, item.h)) {
                        newX = x;
                        newY = y;
                        foundPosition = true;
                        break;
                    }
                }
                if (foundPosition) break;
            }

            if (!foundPosition) {
                newX = item.x;
                newY = this.getMaxY(compacted);
            }

            compacted.push({
                ...item,
                x: newX,
                y: newY
            });
        }

        this.setLayout(breakpoint, compacted);
        this.notifyObservers('layoutCompacted', { breakpoint, layout: compacted });
        
        return compacted;
    }

    // =============================================================================
    // LAYOUT SHARING Y BACKUP
    // =============================================================================

    copyLayout(fromBreakpoint, toBreakpoint) {
        if (!this.isValidBreakpoint(fromBreakpoint) || !this.isValidBreakpoint(toBreakpoint)) {
            throw new Error('Invalid breakpoint(s)');
        }

        const fromLayout = this.getLayout(fromBreakpoint);
        const toLayout = fromLayout.map(item => ({ ...item }));
        
        this.setLayout(toBreakpoint, toLayout);
        
        this.notifyObservers('layoutCopied', {
            from: fromBreakpoint,
            to: toBreakpoint,
            layout: toLayout
        });

        console.log(`📋 Layout copied: ${fromBreakpoint} → ${toBreakpoint}`);
    }

    shareLayout(breakpoint) {
        const layout = this.getLayout(breakpoint);
        return {
            layout,
            breakpoint,
            timestamp: Date.now(),
            viewport: {
                width: this.getBreakpointWidth(breakpoint),
                cols: this.getBreakpointCols(breakpoint)
            }
        };
    }

    applySharedLayout(sharedLayout) {
        if (!sharedLayout || !sharedLayout.layout) {
            throw new Error('Invalid shared layout');
        }

        const breakpoint = sharedLayout.breakpoint;
        if (!this.isValidBreakpoint(breakpoint)) {
            throw new Error(`Invalid breakpoint in shared layout: ${breakpoint}`);
        }

        // Ajustar layout al breakpoint actual si es necesario
        const currentCols = this.cols[breakpoint];
        const sharedCols = sharedLayout.viewport?.cols || 12;
        
        let adjustedLayout = [...sharedLayout.layout];
        
        if (currentCols !== sharedCols) {
            adjustedLayout = this.adjustLayoutForCols(adjustedLayout, sharedCols, currentCols);
        }

        this.setLayout(breakpoint, adjustedLayout);
        
        this.notifyObservers('sharedLayoutApplied', {
            breakpoint,
            layout: adjustedLayout,
            original: sharedLayout
        });

        console.log(`📥 Shared layout applied: ${breakpoint}`);
    }

    adjustLayoutForCols(layout, fromCols, toCols) {
        if (fromCols === toCols) return layout;

        const scale = toCols / fromCols;
        
        return layout.map(item => ({
            ...item,
            x: Math.round(item.x * scale),
            w: Math.max(1, Math.round(item.w * scale))
        }));
    }

    // =============================================================================
    // PERSISTENCIA
    // =============================================================================

    saveLayouts() {
        const data = {
            layouts: this.layouts,
            currentBreakpoint: this.currentBreakpoint,
            settings: {
                breakpoints: this.breakpoints,
                cols: this.cols
            },
            timestamp: Date.now()
        };

        localStorage.setItem('silhouette-layouts', JSON.stringify(data));
        console.log('💾 Layouts saved');
    }

    loadLayouts() {
        try {
            const saved = localStorage.getItem('silhouette-layouts');
            if (saved) {
                const data = JSON.parse(saved);
                
                // Cargar layouts
                this.layouts = { ...this.initializeLayouts(), ...data.layouts };
                
                // Cargar breakpoint actual
                if (data.currentBreakpoint && this.isValidBreakpoint(data.currentBreakpoint)) {
                    this.currentBreakpoint = data.currentBreakpoint;
                }
                
                // Cargar configuración si existe
                if (data.settings) {
                    if (data.settings.breakpoints) this.breakpoints = data.settings.breakpoints;
                    if (data.settings.cols) this.cols = data.settings.cols;
                }

                console.log('📁 Layouts loaded');
                this.notifyObservers('layoutsLoaded', {
                    layouts: this.layouts,
                    currentBreakpoint: this.currentBreakpoint
                });

                return true;
            }
        } catch (error) {
            console.error('❌ Error loading layouts:', error);
        }
        
        return false;
    }

    exportLayouts() {
        return {
            layouts: this.layouts,
            currentBreakpoint: this.currentBreakpoint,
            breakpoints: this.breakpoints,
            cols: this.cols,
            exportDate: new Date().toISOString(),
            version: '5.2.0'
        };
    }

    importLayouts(layoutData) {
        try {
            if (!layoutData || !layoutData.layouts) {
                throw new Error('Invalid layout data');
            }

            // Backup layouts actuales
            const backup = this.exportLayouts();

            // Importar nuevos layouts
            this.layouts = { ...this.initializeLayouts(), ...layoutData.layouts };
            this.currentBreakpoint = layoutData.currentBreakpoint || this.currentBreakpoint;
            
            if (layoutData.breakpoints) {
                this.breakpoints = layoutData.breakpoints;
            }
            if (layoutData.cols) {
                this.cols = layoutData.cols;
            }

            this.saveLayouts();
            
            console.log('📥 Layouts imported');
            this.notifyObservers('layoutsImported', {
                layouts: this.layouts,
                currentBreakpoint: this.currentBreakpoint,
                backup
            });

            return { success: true, backup };

        } catch (error) {
            console.error('❌ Error importing layouts:', error);
            this.notifyObservers('layoutImportError', error);
            return { success: false, error };
        }
    }

    // =============================================================================
    // LISTENERS Y OBSERVADORES
    // =============================================================================

    setupResizeListener() {
        const handleResize = () => {
            clearTimeout(this.resizeTimeout);
            
            this.resizeTimeout = setTimeout(() => {
                const newBreakpoint = this.getCurrentBreakpoint();
                if (newBreakpoint !== this.currentBreakpoint) {
                    this.setCurrentBreakpoint(newBreakpoint);
                }
            }, 150); // Debounce
        };

        window.addEventListener('resize', handleResize);
        this.resizeHandler = handleResize;
    }

    setupLayoutObserver() {
        if (this.widgetManager) {
            this.widgetManager.addObserver((event, data) => {
                if (event === 'widgetCreated' || event === 'widgetDeleted') {
                    // Ajustar layouts cuando se crean/eliminan widgets
                    this.adjustLayoutsForWidgetChange(data);
                } else if (event === 'layoutUpdated') {
                    // Sincronizar con widget manager
                    this.handleLayoutUpdateFromWidgetManager(data);
                }
            });
        }
    }

    adjustLayoutsForWidgetChange(data) {
        if (data.widget) {
            // Si se creó un widget, añadir a todos los layouts
            Object.keys(this.layouts).forEach(breakpoint => {
                if (!this.layouts[breakpoint].find(item => item.i === data.widget.id)) {
                    this.addWidgetToLayout(breakpoint, data.widget.id);
                }
            });
        } else if (data.id) {
            // Si se eliminó un widget, remover de todos los layouts
            Object.keys(this.layouts).forEach(breakpoint => {
                this.removeWidgetFromLayout(breakpoint, data.id);
            });
        }
    }

    handleLayoutUpdateFromWidgetManager(data) {
        // Sincronizar con el layout del widget manager
        if (data.breakpoint && data.layout) {
            this.setLayout(data.breakpoint, data.layout);
        }
    }

    // =============================================================================
    // VALIDACIÓN
    // =============================================================================

    validateLayout(layout) {
        if (!Array.isArray(layout)) {
            throw new Error('Layout must be an array');
        }

        return layout.map(item => {
            // Validar propiedades requeridas
            if (!item.i || typeof item.x !== 'number' || typeof item.y !== 'number' || 
                typeof item.w !== 'number' || typeof item.h !== 'number') {
                throw new Error('Invalid layout item: missing required properties');
            }

            // Validar valores positivos
            if (item.w < 1 || item.h < 1) {
                throw new Error('Layout item must have positive width and height');
            }

            return {
                i: item.i,
                x: Math.max(0, item.x),
                y: Math.max(0, item.y),
                w: Math.max(1, item.w),
                h: Math.max(1, item.h),
                minW: item.minW || 2,
                minH: item.minH || 2,
                maxW: item.maxW || 12,
                maxH: item.maxH || 20
            };
        });
    }

    // =============================================================================
    // UTILIDADES
    // =============================================================================

    getTotalLayouts() {
        return Object.values(this.layouts).reduce((total, layout) => total + layout.length, 0);
    }

    getLayoutStats() {
        const stats = {};
        Object.keys(this.layouts).forEach(breakpoint => {
            stats[breakpoint] = {
                items: this.layouts[breakpoint].length,
                cols: this.cols[breakpoint],
                minWidth: this.breakpoints[breakpoint]
            };
        });
        return stats;
    }

    findWidgetPosition(breakpoint, widgetId) {
        const layout = this.getLayout(breakpoint);
        return layout.find(item => item.i === widgetId);
    }

    // =============================================================================
    // OBSERVADORES
    // =============================================================================

    addObserver(callback) {
        this.observers.add(callback);
        return () => this.observers.delete(callback);
    }

    removeObserver(callback) {
        this.observers.delete(callback);
    }

    notifyObservers(event, data) {
        this.observers.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('❌ Layout manager observer error:', error);
            }
        });
    }

    // =============================================================================
    // CLEANUP
    // =============================================================================

    destroy() {
        // Limpiar listeners
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }

        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }

        // Guardar layouts finales
        this.saveLayouts();

        // Limpiar observers
        this.observers.clear();

        console.log('🧹 Layout Manager destroyed');
    }
}

// =============================================================================
// EXPORTAR
// =============================================================================

export default LayoutManager;