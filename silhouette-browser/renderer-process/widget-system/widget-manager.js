// =============================================================================
// SILHOUETTE V5.2 - GESTOR DE WIDGETS
// Gestión avanzada de widgets con persistencia y integración de temas
// =============================================================================

import { ipcRenderer } from 'electron';

class WidgetManager {
    constructor() {
        this.widgets = new Map();
        this.layouts = {
            lg: [], md: [], sm: [], xs: [], xxs: []
        };
        this.settings = {
            autoSave: true,
            saveInterval: 30000, // 30 segundos
            maxWidgets: 50,
            enableAnimations: true,
            defaultTheme: 'auto'
        };
        this.observers = new Set();
        this.isInitialized = false;
        this.saveTimeout = null;
        this.dirty = false;
        
        // Integración con sistema de temas
        this.currentTheme = 'auto';
        this.themeObserver = null;
        
        this.init();
    }

    // =============================================================================
    // INICIALIZACIÓN
    // =============================================================================

    async init() {
        if (this.isInitialized) return;

        try {
            // Cargar datos guardados
            await this.loadFromStorage();
            
            // Configurar auto-save
            this.setupAutoSave();
            
            // Configurar integración con temas
            this.setupThemeIntegration();
            
            // Configurar comunicación con Electron
            this.setupElectronIntegration();
            
            this.isInitialized = true;
            
            console.log('✅ Widget Manager initialized');
            this.notifyObservers('initialized', {
                widgetCount: this.widgets.size,
                layoutCount: this.getTotalLayoutItems()
            });

        } catch (error) {
            console.error('❌ Error initializing Widget Manager:', error);
        }
    }

    // =============================================================================
    // GESTIÓN DE WIDGETS
    // =============================================================================

    createWidget(type, config = {}) {
        if (this.widgets.size >= this.settings.maxWidgets) {
            throw new Error(`Maximum widget limit (${this.settings.maxWidgets}) reached`);
        }

        const widgetId = this.generateWidgetId();
        const now = Date.now();

        const widget = {
            id: widgetId,
            type: type,
            config: {
                title: this.getDefaultTitle(type),
                width: 4,
                height: 3,
                ...config
            },
            position: {
                x: 0,
                y: 0,
                w: 4,
                h: 3
            },
            createdAt: now,
            updatedAt: now,
            metadata: {
                version: '1.0',
                theme: this.currentTheme,
                viewport: this.getCurrentViewport()
            }
        };

        this.widgets.set(widgetId, widget);
        this.markDirty();

        console.log(`✅ Widget created: ${type} (${widgetId})`);
        this.notifyObservers('widgetCreated', widget);

        return widgetId;
    }

    updateWidget(widgetId, updates) {
        const widget = this.widgets.get(widgetId);
        if (!widget) {
            throw new Error(`Widget not found: ${widgetId}`);
        }

        // Actualizar config
        if (updates.config) {
            widget.config = { ...widget.config, ...updates.config };
        }

        // Actualizar position
        if (updates.position) {
            widget.position = { ...widget.position, ...updates.position };
        }

        // Actualizar metadata
        widget.updatedAt = Date.now();
        widget.metadata.lastInteraction = Date.now();

        this.widgets.set(widgetId, widget);
        this.markDirty();

        console.log(`📝 Widget updated: ${widgetId}`);
        this.notifyObservers('widgetUpdated', widget);

        return widget;
    }

    deleteWidget(widgetId) {
        const widget = this.widgets.get(widgetId);
        if (!widget) {
            return false;
        }

        // Remover de todos los layouts
        this.removeFromAllLayouts(widgetId);

        // Remover de la colección
        this.widgets.delete(widgetId);
        this.markDirty();

        console.log(`🗑️ Widget deleted: ${widgetId}`);
        this.notifyObservers('widgetDeleted', { id: widgetId, type: widget.type });

        return true;
    }

    getWidget(widgetId) {
        return this.widgets.get(widgetId);
    }

    getAllWidgets() {
        return Array.from(this.widgets.values());
    }

    getWidgetsByType(type) {
        return this.getAllWidgets().filter(widget => widget.type === type);
    }

    // =============================================================================
    // GESTIÓN DE LAYOUTS
    // =============================================================================

    updateLayout(breakpoint, layout) {
        if (!this.layouts[breakpoint]) {
            throw new Error(`Invalid breakpoint: ${breakpoint}`);
        }

        this.layouts[breakpoint] = layout.map(item => ({
            i: item.i,
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h,
            minW: item.minW || 2,
            minH: item.minH || 2,
            maxW: item.maxW || 12,
            maxH: item.maxH || 8
        }));

        // Actualizar posiciones en widgets
        layout.forEach(item => {
            const widget = this.widgets.get(item.i);
            if (widget) {
                widget.position = {
                    x: item.x,
                    y: item.y,
                    w: item.w,
                    h: item.h
                };
                this.widgets.set(item.i, widget);
            }
        });

        this.markDirty();
        
        console.log(`📐 Layout updated: ${breakpoint} (${layout.length} items)`);
        this.notifyObservers('layoutUpdated', { breakpoint, layout });
    }

    getLayout(breakpoint) {
        return this.layouts[breakpoint] || [];
    }

    getCurrentLayout() {
        const currentBreakpoint = this.getCurrentBreakpoint();
        return this.getLayout(currentBreakpoint);
    }

    addToLayout(breakpoint, widgetId, position) {
        if (!this.layouts[breakpoint]) {
            this.layouts[breakpoint] = [];
        }

        const layoutItem = {
            i: widgetId,
            x: position.x || 0,
            y: position.y || 0,
            w: position.w || 4,
            h: position.h || 3,
            minW: position.minW || 2,
            minH: position.minH || 2,
            maxW: position.maxW || 12,
            maxH: position.maxH || 8
        };

        this.layouts[breakpoint].push(layoutItem);
        this.markDirty();

        this.notifyObservers('layoutItemAdded', { breakpoint, widgetId, position });
    }

    removeFromLayout(breakpoint, widgetId) {
        if (this.layouts[breakpoint]) {
            const oldLength = this.layouts[breakpoint].length;
            this.layouts[breakpoint] = this.layouts[breakpoint].filter(item => item.i !== widgetId);
            
            if (this.layouts[breakpoint].length < oldLength) {
                this.markDirty();
                this.notifyObservers('layoutItemRemoved', { breakpoint, widgetId });
            }
        }
    }

    removeFromAllLayouts(widgetId) {
        Object.keys(this.layouts).forEach(breakpoint => {
            this.removeFromLayout(breakpoint, widgetId);
        });
    }

    getTotalLayoutItems() {
        return Object.values(this.layouts).reduce((total, layout) => total + layout.length, 0);
    }

    // =============================================================================
    // PERSISTENCIA
    // =============================================================================

    async saveToStorage() {
        try {
            const data = {
                widgets: Array.from(this.widgets.entries()),
                layouts: this.layouts,
                settings: this.settings,
                currentTheme: this.currentTheme,
                timestamp: Date.now(),
                version: '5.2.0'
            };

            // Guardar en localStorage
            localStorage.setItem('silhouette-widgets', JSON.stringify(data));

            // Guardar en Electron si está disponible
            if (this.isElectron) {
                await ipcRenderer.invoke('widget:save', data);
            }

            this.dirty = false;
            console.log('💾 Widgets saved to storage');
            
            this.notifyObservers('saved', {
                widgetCount: this.widgets.size,
                layoutCount: this.getTotalLayoutItems(),
                timestamp: Date.now()
            });

            return true;

        } catch (error) {
            console.error('❌ Error saving widgets:', error);
            this.notifyObservers('saveError', error);
            return false;
        }
    }

    async loadFromStorage() {
        try {
            // Intentar cargar desde Electron primero
            let data = null;
            if (this.isElectron) {
                data = await ipcRenderer.invoke('widget:load');
            }

            // Fallback a localStorage
            if (!data) {
                const saved = localStorage.getItem('silhouette-widgets');
                if (saved) {
                    data = JSON.parse(saved);
                }
            }

            if (data) {
                this.widgets = new Map(data.widgets || []);
                this.layouts = { ...this.layouts, ...data.layouts };
                this.settings = { ...this.settings, ...data.settings };
                this.currentTheme = data.currentTheme || 'auto';

                console.log(`📁 Widgets loaded: ${this.widgets.size} widgets, ${this.getTotalLayoutItems()} layout items`);
                
                this.notifyObservers('loaded', {
                    widgetCount: this.widgets.size,
                    layoutCount: this.getTotalLayoutItems(),
                    timestamp: data.timestamp
                });

                return true;
            }

            console.log('📂 No saved widgets found, starting fresh');
            return false;

        } catch (error) {
            console.error('❌ Error loading widgets:', error);
            this.notifyObservers('loadError', error);
            return false;
        }
    }

    async exportData() {
        const data = {
            widgets: this.getAllWidgets(),
            layouts: this.layouts,
            settings: this.settings,
            currentTheme: this.currentTheme,
            exportDate: new Date().toISOString(),
            version: '5.2.0'
        };

        return data;
    }

    async importData(data) {
        try {
            // Validar datos
            if (!data || !data.widgets || !data.layouts) {
                throw new Error('Invalid data format');
            }

            // Backup datos actuales
            const backup = await this.exportData();

            // Importar nuevos datos
            this.widgets = new Map(data.widgets.map(w => [w.id, w]));
            this.layouts = { ...this.layouts, ...data.layouts };
            this.settings = { ...this.settings, ...data.settings };
            this.currentTheme = data.currentTheme || 'auto';

            this.markDirty();
            await this.saveToStorage();

            console.log(`📥 Widgets imported: ${this.widgets.size} widgets`);
            this.notifyObservers('imported', {
                widgetCount: this.widgets.size,
                layoutCount: this.getTotalLayoutItems(),
                backup
            });

            return { success: true, backup };

        } catch (error) {
            console.error('❌ Error importing widgets:', error);
            this.notifyObservers('importError', error);
            return { success: false, error };
        }
    }

    // =============================================================================
    // AUTO-SAVE
    // =============================================================================

    setupAutoSave() {
        if (!this.settings.autoSave) return;

        // Guardar periódicamente
        this.saveInterval = setInterval(() => {
            if (this.dirty) {
                this.saveToStorage();
            }
        }, this.settings.saveInterval);

        // Guardar antes de cerrar la página
        window.addEventListener('beforeunload', () => {
            if (this.dirty) {
                this.saveToStorage();
            }
        });
    }

    markDirty() {
        this.dirty = true;
        this.notifyObservers('dirty', { dirty: true, widgetCount: this.widgets.size });
    }

    clearDirty() {
        this.dirty = false;
        this.notifyObservers('dirty', { dirty: false, widgetCount: this.widgets.size });
    }

    // =============================================================================
    // INTEGRACIÓN CON TEMAS
    // =============================================================================

    setupThemeIntegration() {
        if (window.themeManager) {
            this.themeObserver = (event, data) => {
                if (event === 'themeChanged') {
                    this.handleThemeChange(data);
                }
            };
            window.themeManager.addObserver(this.themeObserver);
        }
    }

    handleThemeChange(themeData) {
        this.currentTheme = themeData.to;
        
        // Actualizar todos los widgets con el nuevo tema
        this.widgets.forEach((widget, widgetId) => {
            widget.metadata.theme = themeData.actual;
            this.widgets.set(widgetId, widget);
        });

        this.markDirty();
        this.notifyObservers('themeChanged', themeData);
    }

    // =============================================================================
    // INTEGRACIÓN ELECTRON
    // =============================================================================

    setupElectronIntegration() {
        this.isElectron = typeof ipcRenderer !== 'undefined';
        
        if (this.isElectron) {
            // Escuchar cambios desde el main process
            ipcRenderer.on('widget:update', (event, data) => {
                this.handleExternalUpdate(data);
            });

            ipcRenderer.on('widget:themeChange', (event, theme) => {
                this.handleThemeChange({ to: theme, actual: theme });
            });
        }
    }

    handleExternalUpdate(data) {
        // Manejar actualizaciones desde el main process
        console.log('🔄 External widget update received:', data);
        // Implementar lógica de sincronización
    }

    // =============================================================================
    // UTILIDADES
    // =============================================================================

    generateWidgetId() {
        return `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getDefaultTitle(type) {
        const titles = {
            chart: 'Gráfico',
            metric: 'Métrica',
            progress: 'Progreso',
            'code-editor': 'Editor de Código',
            terminal: 'Terminal',
            logs: 'Logs',
            'cpu-meter': 'CPU',
            'memory-meter': 'Memoria',
            network: 'Red',
            calendar: 'Calendario',
            notes: 'Notas',
            todo: 'To-Do',
            html: 'HTML Personalizado'
        };
        return titles[type] || 'Widget';
    }

    getCurrentBreakpoint() {
        const width = window.innerWidth;
        if (width >= 1200) return 'lg';
        if (width >= 996) return 'md';
        if (width >= 768) return 'sm';
        if (width >= 480) return 'xs';
        return 'xxs';
    }

    getCurrentViewport() {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
            breakpoint: this.getCurrentBreakpoint()
        };
    }

    validateWidgetConfig(widget) {
        const errors = [];

        if (!widget.id) errors.push('Missing widget ID');
        if (!widget.type) errors.push('Missing widget type');
        if (!widget.config) errors.push('Missing widget config');
        if (widget.config && !widget.config.title) errors.push('Missing widget title');

        return {
            valid: errors.length === 0,
            errors
        };
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
                console.error('❌ Widget manager observer error:', error);
            }
        });
    }

    // =============================================================================
    // API PÚBLICA
    // =============================================================================

    // Estadísticas
    getStats() {
        return {
            widgetCount: this.widgets.size,
            layoutItems: this.getTotalLayoutItems(),
            currentTheme: this.currentTheme,
            dirty: this.dirty,
            settings: this.settings
        };
    }

    // Configuración
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.markDirty();
        this.notifyObservers('settingsUpdated', this.settings);
    }

    getSettings() {
        return { ...this.settings };
    }

    // Limpieza
    clearAll() {
        this.widgets.clear();
        this.layouts = { lg: [], md: [], sm: [], xs: [], xxs: [] };
        this.markDirty();
        this.notifyObservers('cleared', {});
    }

    // Respaldo y restauración
    createBackup() {
        return {
            widgets: this.getAllWidgets(),
            layouts: this.layouts,
            settings: this.settings,
            timestamp: Date.now()
        };
    }

    restoreFromBackup(backup) {
        if (backup.widgets) {
            this.widgets = new Map(backup.widgets.map(w => [w.id, w]));
        }
        if (backup.layouts) {
            this.layouts = { ...this.layouts, ...backup.layouts };
        }
        if (backup.settings) {
            this.settings = { ...this.settings, ...backup.settings };
        }
        this.markDirty();
        this.notifyObservers('restored', backup);
    }

    // =============================================================================
    // CLEANUP
    // =============================================================================

    destroy() {
        // Limpiar auto-save
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
        }

        // Limpiar theme observer
        if (this.themeObserver && window.themeManager) {
            window.themeManager.removeObserver(this.themeObserver);
        }

        // Guardar datos finales
        if (this.dirty) {
            this.saveToStorage();
        }

        // Limpiar observers
        this.observers.clear();

        console.log('🧹 Widget Manager destroyed');
    }
}

// =============================================================================
// INSTANCIA GLOBAL
// =============================================================================

window.widgetManager = new WidgetManager();

export default window.widgetManager;
export { WidgetManager };