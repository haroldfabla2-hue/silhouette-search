// =============================================================================
// SILHOUETTE V5.2 - WIDGET PRESETS
// Widgets predefinidos y configurables
// =============================================================================

class WidgetPresets {
    constructor() {
        this.presets = new Map();
        this.categories = new Map();
        this.isInitialized = false;
        
        this.init();
    }

    // =============================================================================
    // INICIALIZACIÓN
    // =============================================================================

    init() {
        if (this.isInitialized) return;

        this.registerBuiltInPresets();
        this.isInitialized = true;
        
        console.log('✅ Widget Presets initialized');
    }

    // =============================================================================
    // REGISTRO DE PRESETS
    // =============================================================================

    registerBuiltInPresets() {
        // Dashboard Widgets
        this.registerPreset({
            id: 'chart-line',
            name: 'Gráfico de Líneas',
            category: 'Dashboard',
            icon: '📈',
            description: 'Gráfico de líneas para mostrar tendencias',
            defaultSize: { w: 6, h: 4 },
            config: {
                chartType: 'line',
                data: {
                    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
                    datasets: [{
                        label: 'Ventas',
                        data: [65, 59, 80, 81, 56, 55],
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Tendencia de Ventas'
                        }
                    }
                }
            }
        });

        this.registerPreset({
            id: 'chart-bar',
            name: 'Gráfico de Barras',
            category: 'Dashboard',
            icon: '📊',
            description: 'Gráfico de barras para comparaciones',
            defaultSize: { w: 6, h: 4 },
            config: {
                chartType: 'bar',
                data: {
                    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                    datasets: [{
                        label: 'Ingresos',
                        data: [12000, 19000, 3000, 5000],
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Ingresos Trimestrales'
                        }
                    }
                }
            }
        });

        this.registerPreset({
            id: 'metric-counter',
            name: 'Contador de Métrica',
            category: 'Dashboard',
            icon: '🔢',
            description: 'Muestra un valor numérico grande con título',
            defaultSize: { w: 3, h: 2 },
            config: {
                value: 1234,
                label: 'Usuarios Activos',
                change: '+12.5%',
                trend: 'up',
                color: '#4CAF50',
                animate: true
            }
        });

        this.registerPreset({
            id: 'progress-circle',
            name: 'Progreso Circular',
            category: 'Dashboard',
            icon: '⭕',
            description: 'Indicador circular de progreso',
            defaultSize: { w: 3, h: 3 },
            config: {
                percentage: 75,
                label: 'Meta del Mes',
                color: '#2196F3',
                showPercentage: true,
                size: 120
            }
        });

        this.registerPreset({
            id: 'gauge-meter',
            name: 'Medidor de Velocidad',
            category: 'Dashboard',
            icon: '⚡',
            description: 'Medidor tipo velocímetro',
            defaultSize: { w: 4, h: 3 },
            config: {
                value: 85,
                min: 0,
                max: 100,
                label: 'CPU',
                unit: '%',
                color: '#FF9800',
                zones: [
                    { min: 0, max: 50, color: '#4CAF50' },
                    { min: 50, max: 80, color: '#FF9800' },
                    { min: 80, max: 100, color: '#F44336' }
                ]
            }
        });

        // Development Widgets
        this.registerPreset({
            id: 'code-editor-js',
            name: 'Editor JavaScript',
            category: 'Desarrollo',
            icon: '🟨',
            description: 'Editor de código JavaScript con syntax highlighting',
            defaultSize: { w: 8, h: 6 },
            config: {
                language: 'javascript',
                theme: 'monokai',
                fontSize: 14,
                tabSize: 2,
                lineNumbers: true,
                wordWrap: true,
                initialCode: `// Tu código JavaScript aquí
function saludar(nombre) {
    return \`Hola, \${nombre}!\`;
}

console.log(saludar('Silhouette'));`
            }
        });

        this.registerPreset({
            id: 'code-editor-html',
            name: 'Editor HTML',
            category: 'Desarrollo',
            icon: '🟧',
            description: 'Editor de código HTML',
            defaultSize: { w: 8, h: 6 },
            config: {
                language: 'html',
                theme: 'github',
                fontSize: 14,
                tabSize: 2,
                lineNumbers: true,
                initialCode: `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Mi Página</title>
</head>
<body>
    <h1>Hola Silhouette!</h1>
    <p>Contenido de ejemplo</p>
</body>
</html>`
            }
        });

        this.registerPreset({
            id: 'terminal-bash',
            name: 'Terminal Bash',
            category: 'Desarrollo',
            icon: '💻',
            description: 'Terminal tipo bash',
            defaultSize: { w: 6, h: 4 },
            config: {
                shell: 'bash',
                prompt: '$',
                theme: 'dark',
                fontSize: 14,
                showWelcome: true,
                initialCommands: ['ls -la', 'pwd', 'whoami']
            }
        });

        this.registerPreset({
            id: 'logs-viewer',
            name: 'Visor de Logs',
            category: 'Desarrollo',
            icon: '📜',
            description: 'Visualizador de logs en tiempo real',
            defaultSize: { w: 6, h: 4 },
            config: {
                maxLines: 1000,
                autoScroll: true,
                showTimestamps: true,
                showLevels: true,
                levels: ['DEBUG', 'INFO', 'WARN', 'ERROR'],
                filter: 'ALL'
            }
        });

        this.registerPreset({
            id: 'git-status',
            name: 'Estado Git',
            category: 'Desarrollo',
            icon: '🔄',
            description: 'Muestra el estado del repositorio Git',
            defaultSize: { w: 4, h: 3 },
            config: {
                showBranches: true,
                showStaged: true,
                showUnstaged: true,
                showUntracked: true,
                refreshInterval: 5000
            }
        });

        // System Widgets
        this.registerPreset({
            id: 'system-monitor',
            name: 'Monitor del Sistema',
            category: 'Sistema',
            icon: '🖥️',
            description: 'Monitoreo completo del sistema',
            defaultSize: { w: 4, h: 3 },
            config: {
                showCPU: true,
                showMemory: true,
                showDisk: true,
                showNetwork: true,
                refreshInterval: 2000,
                chartType: 'line'
            }
        });

        this.registerPreset({
            id: 'network-monitor',
            name: 'Monitor de Red',
            category: 'Sistema',
            icon: '🌐',
            description: 'Monitoreo de tráfico de red',
            defaultSize: { w: 5, h: 3 },
            config: {
                showUpload: true,
                showDownload: true,
                showLatency: true,
                unit: 'MB/s',
                chartType: 'area',
                timeRange: 60 // seconds
            }
        });

        this.registerPreset({
            id: 'disk-usage',
            name: 'Uso de Disco',
            category: 'Sistema',
            icon: '💾',
            description: 'Visualización del uso de disco',
            defaultSize: { w: 4, h: 3 },
            config: {
                showPieChart: true,
                showBars: false,
                showPercentages: true,
                refreshInterval: 10000
            }
        });

        // Productivity Widgets
        this.registerPreset({
            id: 'calendar-today',
            name: 'Calendario de Hoy',
            category: 'Productividad',
            icon: '📅',
            description: 'Calendario y eventos del día',
            defaultSize: { w: 4, h: 4 },
            config: {
                showEvents: true,
                showWeather: false,
                showTime: true,
                theme: 'light',
                firstDayOfWeek: 1
            }
        });

        this.registerPreset({
            id: 'notes-sticky',
            name: 'Notas Adhesivas',
            category: 'Productividad',
            icon: '🗒️',
            description: 'Notas rápidas estilo post-it',
            defaultSize: { w: 3, h: 4 },
            config: {
                maxNotes: 10,
                autoSave: true,
                showTimestamp: true,
                allowDelete: true,
                color: '#FFF9C4'
            }
        });

        this.registerPreset({
            id: 'todo-list',
            name: 'Lista de Tareas',
            category: 'Productividad',
            icon: '✅',
            description: 'Lista de tareas pendientes',
            defaultSize: { w: 4, h: 4 },
            config: {
                maxItems: 20,
                showPriority: true,
                showDueDate: true,
                allowEdit: true,
                autoSave: true,
                initialItems: [
                    { text: 'Completar presentación', priority: 'high', completed: false },
                    { text: 'Revisar código', priority: 'medium', completed: false },
                    { text: 'Enviar reporte', priority: 'low', completed: true }
                ]
            }
        });

        this.registerPreset({
            id: 'pomodoro-timer',
            name: 'Temporizador Pomodoro',
            category: 'Productividad',
            icon: '🍅',
            description: 'Temporizador Pomodoro para productividad',
            defaultSize: { w: 3, h: 3 },
            config: {
                workTime: 25,
                breakTime: 5,
                longBreakTime: 15,
                sessionsUntilLongBreak: 4,
                autoStartBreaks: false,
                showNotifications: true,
                soundEnabled: true
            }
        });

        this.registerPreset({
            id: 'weather-widget',
            name: 'Clima',
            category: 'Productividad',
            icon: '🌤️',
            description: 'Widget del clima actual',
            defaultSize: { w: 3, h: 2 },
            config: {
                location: 'auto',
                unit: 'celsius',
                showForecast: true,
                showHumidity: true,
                showWind: true,
                refreshInterval: 600000 // 10 minutes
            }
        });

        // Creative Widgets
        this.registerPreset({
            id: 'color-palette',
            name: 'Paleta de Colores',
            category: 'Creativo',
            icon: '🎨',
            description: 'Paleta de colores personalizable',
            defaultSize: { w: 4, h: 3 },
            config: {
                colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57'],
                showColorInfo: true,
                allowEdit: true,
                format: 'hex',
                maxColors: 12
            }
        });

        this.registerPreset({
            id: 'inspiration-quote',
            name: 'Cita Inspiracional',
            category: 'Creativo',
            icon: '💭',
            description: 'Citas motivacionales aleatorias',
            defaultSize: { w: 3, h: 2 },
            config: {
                category: 'motivational',
                showAuthor: true,
                showShare: true,
                autoRefresh: true,
                refreshInterval: 3600000 // 1 hour
            }
        });

        // Custom Widgets
        this.registerPreset({
            id: 'html-snippet',
            name: 'Snippet HTML',
            category: 'Personalizado',
            icon: '🔧',
            description: 'Widget HTML/JS personalizado',
            defaultSize: { w: 4, h: 3 },
            config: {
                html: '<div style="padding: 20px; text-align: center;"><h3>Custom Widget</h3><p>Edita este contenido</p></div>',
                css: '',
                js: '',
                autoUpdate: false,
                refreshInterval: 0
            }
        });

        this.registerPreset({
            id: 'iframe-embed',
            name: 'Iframe Embebido',
            category: 'Personalizado',
            icon: '🖼️',
            description: 'Widget que muestra contenido externo',
            defaultSize: { w: 6, h: 4 },
            config: {
                url: 'https://example.com',
                allowFullscreen: true,
                allowScrolling: true,
                responsive: true
            }
        });

        // Form Widgets
        this.registerPreset({
            id: 'feedback-form',
            name: 'Formulario de Feedback',
            category: 'Formularios',
            icon: '📝',
            description: 'Formulario para收集 feedback',
            defaultSize: { w: 4, h: 5 },
            config: {
                fields: [
                    { type: 'text', name: 'name', label: 'Nombre', required: true },
                    { type: 'email', name: 'email', label: 'Email', required: true },
                    { type: 'select', name: 'category', label: 'Categoría', options: ['Sugerencia', 'Bug', 'Pregunta'] },
                    { type: 'textarea', name: 'message', label: 'Mensaje', required: true }
                ],
                submitText: 'Enviar',
                showValidation: true
            }
        });

        this.registerPreset({
            id: 'contact-card',
            name: 'Tarjeta de Contacto',
            category: 'Formularios',
            icon: '📇',
            description: 'Tarjeta de contacto con información',
            defaultSize: { w: 3, h: 4 },
            config: {
                name: 'Silhouette Team',
                title: 'Desarrollador',
                email: 'contact@silhouette.com',
                phone: '+1 (555) 123-4567',
                website: 'https://silhouette.dev',
                avatar: 'https://via.placeholder.com/100',
                socialLinks: [
                    { platform: 'github', url: 'https://github.com/silhouette' },
                    { platform: 'twitter', url: 'https://twitter.com/silhouette' }
                ]
            }
        });
    }

    registerPreset(preset) {
        if (!preset.id || !preset.name || !preset.category) {
            throw new Error('Preset must have id, name, and category');
        }

        this.presets.set(preset.id, preset);

        if (!this.categories.has(preset.category)) {
            this.categories.set(preset.category, []);
        }
        this.categories.get(preset.category).push(preset);

        console.log(`📋 Preset registered: ${preset.name} (${preset.id})`);
    }

    // =============================================================================
    // OBTENER PRESETS
    // =============================================================================

    getPreset(presetId) {
        return this.presets.get(presetId);
    }

    getAllPresets() {
        return Array.from(this.presets.values());
    }

    getPresetsByCategory(category) {
        return this.categories.get(category) || [];
    }

    getAllCategories() {
        return Array.from(this.categories.keys());
    }

    searchPresets(query) {
        const searchTerm = query.toLowerCase();
        return this.getAllPresets().filter(preset => 
            preset.name.toLowerCase().includes(searchTerm) ||
            preset.description.toLowerCase().includes(searchTerm) ||
            preset.category.toLowerCase().includes(searchTerm)
        );
    }

    // =============================================================================
    // CREAR WIDGET DESDE PRESET
    // =============================================================================

    createWidgetFromPreset(presetId, customConfig = {}) {
        const preset = this.getPreset(presetId);
        if (!preset) {
            throw new Error(`Preset not found: ${presetId}`);
        }

        const widgetConfig = {
            ...preset.config,
            ...customConfig
        };

        return {
            type: presetId,
            config: widgetConfig,
            size: preset.defaultSize,
            metadata: {
                presetId,
                presetName: preset.name,
                category: preset.category,
                createdFrom: 'preset'
            }
        };
    }

    // =============================================================================
    // PRESET WIDGETS DINÁMICOS
    // =============================================================================

    getDynamicPresets() {
        return [
            {
                id: 'dynamic-chart',
                name: 'Gráfico Dinámico',
                category: 'Dashboard',
                icon: '📊',
                description: 'Gráfico con datos en tiempo real',
                dynamic: true,
                generateConfig: (data) => ({
                    chartType: data.chartType || 'line',
                    data: data.data || [],
                    options: data.options || {}
                })
            },
            {
                id: 'dynamic-metric',
                name: 'Métrica Dinámica',
                category: 'Dashboard',
                icon: '🔢',
                description: 'Métrica que se actualiza automáticamente',
                dynamic: true,
                generateConfig: (data) => ({
                    value: data.value || 0,
                    label: data.label || 'Métrica',
                    change: data.change || '0%',
                    trend: data.trend || 'neutral',
                    color: data.color || '#4CAF50',
                    animate: true
                })
            },
            {
                id: 'custom-form',
                name: 'Formulario Personalizado',
                category: 'Formularios',
                icon: '📋',
                description: 'Formulario con campos configurables',
                dynamic: true,
                generateConfig: (config) => ({
                    fields: config.fields || [],
                    submitText: config.submitText || 'Enviar',
                    showValidation: config.showValidation !== false,
                    layout: config.layout || 'vertical'
                })
            }
        ];
    }

    // =============================================================================
    // TEMPLATES Y EJEMPLOS
    // =============================================================================

    getTemplatePresets() {
        return [
            {
                id: 'template-dashboard',
                name: 'Dashboard Completo',
                category: 'Templates',
                icon: '📱',
                description: 'Template con widgets de dashboard preconfigurados',
                template: [
                    { presetId: 'metric-counter', position: { x: 0, y: 0, w: 3, h: 2 } },
                    { presetId: 'chart-line', position: { x: 3, y: 0, w: 6, h: 4 } },
                    { presetId: 'progress-circle', position: { x: 9, y: 0, w: 3, h: 3 } },
                    { presetId: 'gauge-meter', position: { x: 0, y: 2, w: 4, h: 3 } },
                    { presetId: 'todo-list', position: { x: 0, y: 4, w: 4, h: 4 } }
                ]
            },
            {
                id: 'template-dev-env',
                name: 'Entorno de Desarrollo',
                category: 'Templates',
                icon: '💻',
                description: 'Template para desarrollo con editor y terminal',
                template: [
                    { presetId: 'code-editor-js', position: { x: 0, y: 0, w: 8, h: 6 } },
                    { presetId: 'terminal-bash', position: { x: 8, y: 0, w: 4, h: 4 } },
                    { presetId: 'logs-viewer', position: { x: 8, y: 4, w: 4, h: 4 } }
                ]
            },
            {
                id: 'template-monitoring',
                name: 'Monitor del Sistema',
                category: 'Templates',
                icon: '🖥️',
                description: 'Template para monitoreo completo del sistema',
                template: [
                    { presetId: 'system-monitor', position: { x: 0, y: 0, w: 6, h: 3 } },
                    { presetId: 'network-monitor', position: { x: 6, y: 0, w: 6, h: 3 } },
                    { presetId: 'disk-usage', position: { x: 0, y: 3, w: 4, h: 3 } },
                    { presetId: 'weather-widget', position: { x: 4, y: 3, w: 3, h: 2 } },
                    { presetId: 'pomodoro-timer', position: { x: 7, y: 3, w: 3, h: 2 } }
                ]
            }
        ];
    }

    createTemplate(templateId) {
        const template = this.getTemplatePresets().find(t => t.id === templateId);
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }

        const widgets = template.template.map(item => {
            const preset = this.getPreset(item.presetId);
            if (!preset) {
                throw new Error(`Preset not found in template: ${item.presetId}`);
            }
            
            return {
                presetId: item.presetId,
                config: this.createWidgetFromPreset(item.presetId),
                position: item.position
            };
        });

        return {
            templateId,
            name: template.name,
            category: template.category,
            description: template.description,
            widgets
        };
    }

    // =============================================================================
    // VALIDACIÓN Y UTILIDADES
    // =============================================================================

    validatePreset(preset) {
        const errors = [];

        if (!preset.id) errors.push('Missing preset id');
        if (!preset.name) errors.push('Missing preset name');
        if (!preset.category) errors.push('Missing preset category');
        if (!preset.defaultSize) errors.push('Missing default size');
        if (!preset.config) errors.push('Missing config');

        return {
            valid: errors.length === 0,
            errors
        };
    }

    exportPresets() {
        return {
            presets: this.getAllPresets(),
            categories: this.getAllCategories(),
            templatePresets: this.getTemplatePresets(),
            exportDate: new Date().toISOString(),
            version: '5.2.0'
        };
    }

    importPresets(presetsData) {
        try {
            if (!presetsData || !presetsData.presets) {
                throw new Error('Invalid presets data');
            }

            // Importar presets
            presetsData.presets.forEach(preset => {
                const validation = this.validatePreset(preset);
                if (validation.valid) {
                    this.registerPreset(preset);
                } else {
                    console.warn(`Invalid preset skipped: ${preset.id}`, validation.errors);
                }
            });

            console.log(`📥 Imported ${presetsData.presets.length} presets`);
            return true;

        } catch (error) {
            console.error('❌ Error importing presets:', error);
            return false;
        }
    }

    // =============================================================================
    // API PÚBLICA
    // =============================================================================

    getStats() {
        return {
            totalPresets: this.presets.size,
            totalCategories: this.categories.size,
            categoryBreakdown: Object.fromEntries(
                Array.from(this.categories.entries()).map(([name, presets]) => [name, presets.length])
            )
        };
    }

    reset() {
        this.presets.clear();
        this.categories.clear();
        this.registerBuiltInPresets();
        console.log('🔄 Widget presets reset');
    }

    // =============================================================================
    // CLEANUP
    // =============================================================================

    destroy() {
        this.presets.clear();
        this.categories.clear();
        console.log('🧹 Widget Presets destroyed');
    }
}

// =============================================================================
// EXPORTAR
// =============================================================================

export default WidgetPresets;