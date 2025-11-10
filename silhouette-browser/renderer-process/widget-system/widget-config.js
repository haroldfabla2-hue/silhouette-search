// =============================================================================
// SILHOUETTE V5.2 - CONFIGURACIÓN DE WIDGETS
// Sistema de configuración visual y personalización de widgets
// =============================================================================

class WidgetConfig {
    constructor(widgetManager) {
        this.widgetManager = widgetManager;
        this.configPanels = new Map();
        this.activeConfig = null;
        this.isInitialized = false;
        this.validationRules = new Map();
        
        // Configuración del tema
        this.theme = {
            primary: '#007ACC',
            background: '#FFFFFF',
            text: '#2D3748',
            border: '#E2E8F0',
            ...this.getCurrentTheme()
        };

        this.init();
    }

    // =============================================================================
    // INICIALIZACIÓN
    // =============================================================================

    init() {
        if (this.isInitialized) return;

        this.setupValidationRules();
        this.setupThemeObserver();
        this.createConfigStyles();
        this.isInitialized = true;

        console.log('✅ Widget Config initialized');
    }

    // =============================================================================
    // GESTIÓN DE CONFIGURACIÓN
    // =============================================================================

    showConfigPanel(widgetId) {
        const widget = this.widgetManager.getWidget(widgetId);
        if (!widget) {
            throw new Error(`Widget not found: ${widgetId}`);
        }

        this.activeConfig = {
            widgetId,
            widget,
            originalConfig: { ...widget.config },
            isDirty: false
        };

        this.createConfigPanel();
    }

    hideConfigPanel() {
        if (this.activeConfig && this.activeConfig.isDirty) {
            const hasChanges = JSON.stringify(this.activeConfig.widget.config) !== 
                             JSON.stringify(this.activeConfig.originalConfig);
            
            if (hasChanges) {
                if (confirm('¿Descartar cambios no guardados?')) {
                    this.discardChanges();
                } else {
                    return; // No cerrar si hay cambios sin guardar
                }
            }
        }

        this.removeConfigPanel();
        this.activeConfig = null;
    }

    createConfigPanel() {
        this.removeConfigPanel(); // Limpiar panel anterior

        const panel = document.createElement('div');
        panel.className = 'widget-config-panel';
        panel.id = 'widget-config-panel';
        
        panel.innerHTML = this.generateConfigPanelHTML();

        // Añadir estilos específicos si no existen
        this.ensureConfigPanelStyles();

        document.body.appendChild(panel);

        // Configurar eventos
        this.setupConfigPanelEvents();
        
        // Mostrar panel con animación
        setTimeout(() => {
            panel.classList.add('visible');
        }, 10);
    }

    removeConfigPanel() {
        const existingPanel = document.getElementById('widget-config-panel');
        if (existingPanel) {
            existingPanel.classList.remove('visible');
            setTimeout(() => {
                existingPanel.remove();
            }, 300);
        }
    }

    generateConfigPanelHTML() {
        const { widget } = this.activeConfig;
        const widgetType = this.getWidgetTypeInfo(widget.type);
        
        return `
            <div class="config-panel-overlay" onclick="this.parentElement.classList.remove('visible')"></div>
            <div class="config-panel-content">
                <div class="config-header">
                    <div class="config-title">
                        <span class="widget-icon">${widgetType.icon}</span>
                        <h2>Configurar ${widgetType.name}</h2>
                    </div>
                    <button class="config-close" onclick="window.widgetConfig.hideConfigPanel()">×</button>
                </div>
                
                <div class="config-body">
                    ${this.generateConfigForm(widget)}
                </div>
                
                <div class="config-footer">
                    <div class="config-actions">
                        <button class="btn-secondary" onclick="window.widgetConfig.discardChanges()">Descartar</button>
                        <button class="btn-primary" onclick="window.widgetConfig.applyChanges()">Aplicar</button>
                        <button class="btn-success" onclick="window.widgetConfig.saveAndClose()">Guardar y Cerrar</button>
                    </div>
                </div>
            </div>
        `;
    }

    generateConfigForm(widget) {
        const widgetType = this.getWidgetTypeInfo(widget.type);
        let formHTML = '';

        // Campo título
        formHTML += this.createFormField('text', 'title', widget.config.title || widgetType.name, 'Título del Widget');

        // Configuraciones específicas por tipo de widget
        switch (widget.type) {
            case 'metric':
            case 'metric-counter':
                formHTML += this.createFormField('number', 'value', widget.config.value || 0, 'Valor');
                formHTML += this.createFormField('text', 'label', widget.config.label || 'Métrica', 'Etiqueta');
                formHTML += this.createFormField('text', 'change', widget.config.change || '0%', 'Cambio');
                formHTML += this.createFormField('select', 'trend', widget.config.trend || 'neutral', 'Tendencia', [
                    { value: 'up', label: 'Subiendo ↗️' },
                    { value: 'down', label: 'Bajando ↘️' },
                    { value: 'neutral', label: 'Neutral ➡️' }
                ]);
                formHTML += this.createFormField('color', 'color', widget.config.color || '#4CAF50', 'Color');
                break;

            case 'chart':
            case 'chart-line':
            case 'chart-bar':
                formHTML += this.createFormField('select', 'chartType', widget.config.chartType || 'line', 'Tipo de Gráfico', [
                    { value: 'line', label: 'Líneas' },
                    { value: 'bar', label: 'Barras' },
                    { value: 'pie', label: 'Torta' },
                    { value: 'doughnut', label: 'Dona' }
                ]);
                formHTML += this.createFormField('text', 'title', widget.config.options?.title?.text || 'Título', 'Título del Gráfico');
                formHTML += this.createFormField('textarea', 'data', JSON.stringify(widget.config.data || {}, null, 2), 'Datos (JSON)', 'Datos en formato JSON');
                break;

            case 'progress':
            case 'progress-circle':
                formHTML += this.createFormField('number', 'percentage', widget.config.percentage || 75, 'Porcentaje', 0, 100);
                formHTML += this.createFormField('text', 'label', widget.config.label || 'Progreso', 'Etiqueta');
                formHTML += this.createFormField('color', 'color', widget.config.color || '#2196F3', 'Color');
                break;

            case 'code-editor':
            case 'code-editor-js':
            case 'code-editor-html':
                formHTML += this.createFormField('select', 'language', widget.config.language || 'javascript', 'Lenguaje', [
                    { value: 'javascript', label: 'JavaScript' },
                    { value: 'html', label: 'HTML' },
                    { value: 'css', label: 'CSS' },
                    { value: 'json', label: 'JSON' },
                    { value: 'python', label: 'Python' }
                ]);
                formHTML += this.createFormField('select', 'theme', widget.config.theme || 'monokai', 'Tema', [
                    { value: 'monokai', label: 'Monokai' },
                    { value: 'github', label: 'GitHub' },
                    { value: 'solarized', label: 'Solarized' },
                    { value: 'dracula', label: 'Dracula' }
                ]);
                formHTML += this.createFormField('textarea', 'initialCode', widget.config.initialCode || '', 'Código Inicial', 'Código que se cargará al iniciar');
                break;

            case 'terminal':
            case 'terminal-bash':
                formHTML += this.createFormField('select', 'shell', widget.config.shell || 'bash', 'Shell', [
                    { value: 'bash', label: 'Bash' },
                    { value: 'powershell', label: 'PowerShell' },
                    { value: 'cmd', label: 'Command Prompt' }
                ]);
                formHTML += this.createFormField('text', 'prompt', widget.config.prompt || '$', 'Prompt');
                formHTML += this.createFormField('select', 'theme', widget.config.theme || 'dark', 'Tema', [
                    { value: 'dark', label: 'Oscuro' },
                    { value: 'light', label: 'Claro' }
                ]);
                break;

            case 'notes':
            case 'notes-sticky':
                formHTML += this.createFormField('text', 'title', widget.config.title || 'Notas', 'Título de la Nota');
                formHTML += this.createFormField('textarea', 'content', widget.config.content || '', 'Contenido', 'Contenido inicial de la nota');
                formHTML += this.createFormField('color', 'color', widget.config.color || '#FFF9C4', 'Color de Fondo');
                break;

            case 'todo':
            case 'todo-list':
                formHTML += this.createFormField('number', 'maxItems', widget.config.maxItems || 20, 'Máximo de Elementos', 1, 100);
                formHTML += this.createFormField('checkbox', 'showPriority', widget.config.showPriority || false, 'Mostrar Prioridad');
                formHTML += this.createFormField('checkbox', 'showDueDate', widget.config.showDueDate || false, 'Mostrar Fecha Límite');
                formHTML += this.createFormField('textarea', 'initialItems', JSON.stringify(widget.config.initialItems || [], null, 2), 'Elementos Iniciales (JSON)');
                break;

            case 'html':
            case 'html-snippet':
                formHTML += this.createFormField('textarea', 'html', widget.config.html || '<div>Custom HTML</div>', 'HTML', 'Contenido HTML del widget');
                formHTML += this.createFormField('textarea', 'css', widget.config.css || '', 'CSS', 'Estilos CSS personalizados');
                formHTML += this.createFormField('textarea', 'js', widget.config.js || '', 'JavaScript', 'Código JavaScript del widget');
                break;

            case 'weather-widget':
                formHTML += this.createFormField('text', 'location', widget.config.location || 'auto', 'Ubicación', 'Ciudad o "auto" para detección automática');
                formHTML += this.createFormField('select', 'unit', widget.config.unit || 'celsius', 'Unidad de Temperatura', [
                    { value: 'celsius', label: 'Celsius (°C)' },
                    { value: 'fahrenheit', label: 'Fahrenheit (°F)' }
                ]);
                formHTML += this.createFormField('checkbox', 'showForecast', widget.config.showForecast !== false, 'Mostrar Pronóstico');
                break;

            case 'pomodoro-timer':
                formHTML += this.createFormField('number', 'workTime', widget.config.workTime || 25, 'Tiempo de Trabajo (min)', 5, 60);
                formHTML += this.createFormField('number', 'breakTime', widget.config.breakTime || 5, 'Tiempo de Descanso (min)', 1, 30);
                formHTML += this.createFormField('number', 'longBreakTime', widget.config.longBreakTime || 15, 'Descanso Largo (min)', 10, 60);
                formHTML += this.createFormField('checkbox', 'soundEnabled', widget.config.soundEnabled !== false, 'Habilitar Sonidos');
                break;

            default:
                // Configuración genérica para widgets personalizados
                formHTML += this.createFormField('textarea', 'customConfig', JSON.stringify(widget.config, null, 2), 'Configuración Personalizada (JSON)');
        }

        // Configuraciones de tamaño y posición (común para todos)
        formHTML += '<h3>Apariencia</h3>';
        formHTML += this.createFormField('number', 'width', widget.position.w || 4, 'Ancho (columnas)', 1, 12);
        formHTML += this.createFormField('number', 'height', widget.position.h || 3, 'Alto (filas)', 1, 8);
        formHTML += this.createFormField('color', 'backgroundColor', widget.config.backgroundColor || 'transparent', 'Color de Fondo');
        formHTML += this.createFormField('color', 'textColor', widget.config.textColor || 'inherit', 'Color de Texto');
        formHTML += this.createFormField('select', 'borderRadius', widget.config.borderRadius || 'medium', 'Borde Redondeado', [
            { value: 'none', label: 'Sin Redondear' },
            { value: 'small', label: 'Pequeño' },
            { value: 'medium', label: 'Medio' },
            { value: 'large', label: 'Grande' }
        ]);

        // Configuraciones de animación
        formHTML += '<h3>Animaciones</h3>';
        formHTML += this.createFormField('select', 'animation', widget.config.animation || 'fade', 'Animación de Entrada', [
            { value: 'none', label: 'Sin Animación' },
            { value: 'fade', label: 'Desvanecer' },
            { value: 'slide', label: 'Deslizar' },
            { value: 'scale', label: 'Escalar' }
        ]);
        formHTML += this.createFormField('number', 'animationDuration', widget.config.animationDuration || 300, 'Duración (ms)', 100, 2000, 100);

        return formHTML;
    }

    createFormField(type, name, value, label, min = null, max = null, step = null) {
        const id = `config-${name}`;
        let fieldHTML = '';

        fieldHTML += `<div class="form-field">`;
        fieldHTML += `<label for="${id}">${label}</label>`;

        switch (type) {
            case 'text':
                fieldHTML += `<input type="text" id="${id}" name="${name}" value="${value || ''}" onchange="window.widgetConfig.onFieldChange('${name}', this.value)">`;
                break;

            case 'number':
                const attrs = [min !== null ? `min="${min}"` : '', max !== null ? `max="${max}"` : '', step !== null ? `step="${step}"` : ''].join(' ');
                fieldHTML += `<input type="number" id="${id}" name="${name}" value="${value || 0}" ${attrs} onchange="window.widgetConfig.onFieldChange('${name}', parseInt(this.value) || 0)">`;
                break;

            case 'textarea':
                fieldHTML += `<textarea id="${id}" name="${name}" rows="4" placeholder="${value || ''}" onchange="window.widgetConfig.onFieldChange('${name}', this.value)">${value || ''}</textarea>`;
                break;

            case 'select':
                if (Array.isArray(value)) {
                    fieldHTML += `<select id="${id}" name="${name}" onchange="window.widgetConfig.onFieldChange('${name}', this.value)">`;
                    value.forEach(option => {
                        if (typeof option === 'string') {
                            const isSelected = option === name;
                            fieldHTML += `<option value="${option}" ${isSelected ? 'selected' : ''}>${option}</option>`;
                        } else {
                            const isSelected = option.value === name;
                            fieldHTML += `<option value="${option.value}" ${isSelected ? 'selected' : ''}>${option.label}</option>`;
                        }
                    });
                    fieldHTML += `</select>`;
                } else {
                    fieldHTML += `<select id="${id}" name="${name}" onchange="window.widgetConfig.onFieldChange('${name}', this.value)">`;
                    fieldHTML += `<option value="javascript" ${name === 'javascript' ? 'selected' : ''}>JavaScript</option>`;
                    fieldHTML += `<option value="html" ${name === 'html' ? 'selected' : ''}>HTML</option>`;
                    fieldHTML += `<option value="css" ${name === 'css' ? 'selected' : ''}>CSS</option>`;
                    fieldHTML += `</select>`;
                }
                break;

            case 'checkbox':
                fieldHTML += `<input type="checkbox" id="${id}" name="${name}" ${value ? 'checked' : ''} onchange="window.widgetConfig.onFieldChange('${name}', this.checked)">`;
                break;

            case 'color':
                fieldHTML += `<input type="color" id="${id}" name="${name}" value="${value || '#007ACC'}" onchange="window.widgetConfig.onFieldChange('${name}', this.value)">`;
                break;

            default:
                fieldHTML += `<input type="text" id="${id}" name="${name}" value="${value || ''}" onchange="window.widgetConfig.onFieldChange('${name}', this.value)">`;
        }

        fieldHTML += `</div>`;
        return fieldHTML;
    }

    // =============================================================================
    // GESTIÓN DE CAMBIOS
    // =============================================================================

    onFieldChange(fieldName, value) {
        if (!this.activeConfig) return;

        // Validar campo
        const validation = this.validateField(fieldName, value);
        if (!validation.valid) {
            this.showFieldError(fieldName, validation.error);
            return;
        }

        // Limpiar error anterior
        this.clearFieldError(fieldName);

        // Actualizar configuración
        this.activeConfig.widget.config[fieldName] = value;

        // Marcar como modificado
        this.activeConfig.isDirty = true;
        
        // Actualizar previsualización en vivo si está disponible
        this.updateLivePreview();

        console.log(`Field changed: ${fieldName} = ${value}`);
    }

    applyChanges() {
        if (!this.activeConfig) return;

        try {
            // Validar configuración completa
            const validation = this.validateConfig(this.activeConfig.widget);
            if (!validation.valid) {
                this.showConfigError(validation.errors.join(', '));
                return;
            }

            // Aplicar cambios al widget
            this.widgetManager.updateWidget(this.activeConfig.widgetId, {
                config: this.activeConfig.widget.config
            });

            this.activeConfig.isDirty = false;
            this.showSuccessMessage('Cambios aplicados correctamente');
            
            console.log('✅ Changes applied successfully');
            
        } catch (error) {
            console.error('❌ Error applying changes:', error);
            this.showConfigError('Error al aplicar los cambios: ' + error.message);
        }
    }

    saveAndClose() {
        this.applyChanges();
        this.hideConfigPanel();
    }

    discardChanges() {
        if (this.activeConfig) {
            this.activeConfig.widget.config = { ...this.activeConfig.originalConfig };
            this.activeConfig.isDirty = false;
        }
        
        this.hideConfigPanel();
    }

    // =============================================================================
    // VALIDACIÓN
    // =============================================================================

    setupValidationRules() {
        // Reglas de validación por campo
        this.validationRules.set('title', {
            required: true,
            maxLength: 50,
            pattern: /^[a-zA-Z0-9\s\-_]+$/
        });

        this.validationRules.set('value', {
            type: 'number',
            min: 0,
            max: 1000000
        });

        this.validationRules.set('percentage', {
            type: 'number',
            min: 0,
            max: 100
        });

        this.validationRules.set('width', {
            type: 'number',
            min: 1,
            max: 12
        });

        this.validationRules.set('height', {
            type: 'number',
            min: 1,
            max: 20
        });

        this.validationRules.set('color', {
            pattern: /^#[0-9A-Fa-f]{6}$/
        });

        this.validationRules.set('html', {
            required: true,
            maxLength: 5000
        });
    }

    validateField(fieldName, value) {
        const rule = this.validationRules.get(fieldName);
        if (!rule) {
            return { valid: true };
        }

        // Validación requerida
        if (rule.required && (!value || value.toString().trim() === '')) {
            return { valid: false, error: 'Este campo es obligatorio' };
        }

        // Validación de tipo
        if (rule.type === 'number') {
            const numValue = parseFloat(value);
            if (isNaN(numValue)) {
                return { valid: false, error: 'Debe ser un número válido' };
            }
            if (rule.min !== undefined && numValue < rule.min) {
                return { valid: false, error: `Mínimo: ${rule.min}` };
            }
            if (rule.max !== undefined && numValue > rule.max) {
                return { valid: false, error: `Máximo: ${rule.max}` };
            }
        }

        // Validación de patrón
        if (rule.pattern && !rule.pattern.test(value)) {
            return { valid: false, error: 'Formato inválido' };
        }

        // Validación de longitud
        if (rule.maxLength && value.length > rule.maxLength) {
            return { valid: false, error: `Máximo ${rule.maxLength} caracteres` };
        }

        return { valid: true };
    }

    validateConfig(widget) {
        const errors = [];

        // Validar campos requeridos
        Object.keys(widget.config).forEach(fieldName => {
            const fieldValue = widget.config[fieldName];
            const validation = this.validateField(fieldName, fieldValue);
            if (!validation.valid) {
                errors.push(`${fieldName}: ${validation.error}`);
            }
        });

        // Validar JSON si existe
        if (widget.config.data) {
            try {
                JSON.parse(widget.config.data);
            } catch (e) {
                errors.push('Datos: JSON inválido');
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // =============================================================================
    // UTILIDADES
    // =============================================================================

    getWidgetTypeInfo(type) {
        const types = {
            'metric': { name: 'Métrica', icon: '🔢' },
            'chart': { name: 'Gráfico', icon: '📊' },
            'progress': { name: 'Progreso', icon: '⏳' },
            'code-editor': { name: 'Editor de Código', icon: '💻' },
            'terminal': { name: 'Terminal', icon: '⚡' },
            'notes': { name: 'Notas', icon: '📝' },
            'todo': { name: 'To-Do', icon: '✅' },
            'html': { name: 'HTML Personalizado', icon: '🔧' },
            'weather': { name: 'Clima', icon: '🌤️' },
            'pomodoro': { name: 'Pomodoro', icon: '🍅' }
        };
        return types[type] || { name: 'Widget', icon: '📦' };
    }

    getCurrentTheme() {
        if (window.themeManager) {
            const currentTheme = window.themeManager.getCurrentTheme();
            if (currentTheme && window.themeManager.getThemeColors) {
                return window.themeManager.getThemeColors(currentTheme.actual);
            }
        }
        return {};
    }

    setupThemeObserver() {
        if (window.themeManager) {
            window.themeManager.addObserver((event, data) => {
                if (event === 'themeChanged') {
                    this.theme = { ...this.theme, ...this.getCurrentTheme() };
                    this.updateThemeStyles();
                }
            });
        }
    }

    // =============================================================================
    // ESTILOS Y UI
    // =============================================================================

    createConfigStyles() {
        if (document.getElementById('widget-config-styles')) return;

        const styles = `
            <style id="widget-config-styles">
                .widget-config-panel {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                }

                .widget-config-panel.visible {
                    opacity: 1;
                    visibility: visible;
                }

                .config-panel-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(4px);
                }

                .config-panel-content {
                    position: relative;
                    width: 90vw;
                    max-width: 600px;
                    max-height: 90vh;
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-xl);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    transform: scale(0.9);
                    transition: transform 0.3s ease;
                }

                .widget-config-panel.visible .config-panel-content {
                    transform: scale(1);
                }

                .config-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: var(--spacing-lg);
                    background: var(--bg-secondary);
                    border-bottom: 1px solid var(--border-color);
                }

                .config-title {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing);
                }

                .widget-icon {
                    font-size: 1.5em;
                }

                .config-title h2 {
                    margin: 0;
                    color: var(--text-primary);
                    font-size: var(--font-size-xl);
                }

                .config-close {
                    background: none;
                    border: none;
                    font-size: 1.5em;
                    color: var(--text-muted);
                    cursor: pointer;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: var(--radius);
                    transition: all var(--transition-fast);
                }

                .config-close:hover {
                    background: var(--bg-tertiary);
                    color: var(--text-primary);
                }

                .config-body {
                    flex: 1;
                    padding: var(--spacing-lg);
                    overflow-y: auto;
                }

                .config-footer {
                    padding: var(--spacing-lg);
                    background: var(--bg-secondary);
                    border-top: 1px solid var(--border-color);
                }

                .config-actions {
                    display: flex;
                    gap: var(--spacing);
                    justify-content: flex-end;
                }

                .form-field {
                    margin-bottom: var(--spacing-lg);
                }

                .form-field label {
                    display: block;
                    margin-bottom: var(--spacing-sm);
                    font-weight: 600;
                    color: var(--text-primary);
                    font-size: var(--font-size-sm);
                }

                .form-field input,
                .form-field select,
                .form-field textarea {
                    width: 100%;
                    padding: var(--spacing-sm) var(--spacing);
                    border: 1px solid var(--input-border);
                    border-radius: var(--radius);
                    background: var(--input-bg);
                    color: var(--text-primary);
                    font-size: var(--font-size-base);
                    transition: all var(--transition-fast);
                }

                .form-field input:focus,
                .form-field select:focus,
                .form-field textarea:focus {
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 3px rgba(var(--primary-color), 0.1);
                    outline: none;
                }

                .form-field input[type="checkbox"] {
                    width: auto;
                    margin-right: var(--spacing-sm);
                }

                .form-field textarea {
                    resize: vertical;
                    min-height: 80px;
                    font-family: var(--font-family-base);
                }

                .form-field.error input,
                .form-field.error select,
                .form-field.error textarea {
                    border-color: var(--danger-color);
                }

                .field-error {
                    color: var(--danger-color);
                    font-size: var(--font-size-xs);
                    margin-top: var(--spacing-xs);
                }

                .config-success,
                .config-error {
                    padding: var(--spacing);
                    border-radius: var(--radius);
                    margin-bottom: var(--spacing);
                    font-size: var(--font-size-sm);
                }

                .config-success {
                    background: var(--success-color);
                    color: white;
                }

                .config-error {
                    background: var(--danger-color);
                    color: white;
                }

                h3 {
                    color: var(--text-secondary);
                    font-size: var(--font-size-lg);
                    margin: var(--spacing-xl) 0 var(--spacing) 0;
                    padding-top: var(--spacing);
                    border-top: 1px solid var(--border-color);
                }

                h3:first-child {
                    border-top: none;
                    padding-top: 0;
                    margin-top: 0;
                }

                /* Responsive */
                @media (max-width: 768px) {
                    .config-panel-content {
                        width: 95vw;
                        max-height: 95vh;
                    }
                    
                    .config-actions {
                        flex-direction: column;
                    }
                    
                    .config-actions button {
                        width: 100%;
                    }
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }

    ensureConfigPanelStyles() {
        // Los estilos ya están creados en createConfigStyles()
    }

    updateThemeStyles() {
        // Actualizar variables CSS basadas en el tema actual
        const root = document.documentElement;
        Object.entries(this.theme).forEach(([key, value]) => {
            root.style.setProperty(`--${key}`, value);
        });
    }

    // =============================================================================
    // FEEDBACK AL USUARIO
    // =============================================================================

    showFieldError(fieldName, error) {
        const field = document.querySelector(`[name="${fieldName}"]`);
        if (field) {
            const formField = field.closest('.form-field');
            if (formField) {
                formField.classList.add('error');
                
                // Remover error anterior si existe
                const existingError = formField.querySelector('.field-error');
                if (existingError) {
                    existingError.remove();
                }
                
                // Añadir nuevo error
                const errorElement = document.createElement('div');
                errorElement.className = 'field-error';
                errorElement.textContent = error;
                formField.appendChild(errorElement);
            }
        }
    }

    clearFieldError(fieldName) {
        const field = document.querySelector(`[name="${fieldName}"]`);
        if (field) {
            const formField = field.closest('.form-field');
            if (formField) {
                formField.classList.remove('error');
                const errorElement = formField.querySelector('.field-error');
                if (errorElement) {
                    errorElement.remove();
                }
            }
        }
    }

    showConfigError(message) {
        this.showMessage('config-error', message);
    }

    showSuccessMessage(message) {
        this.showMessage('config-success', message);
    }

    showMessage(type, message) {
        const body = document.querySelector('.config-body');
        if (body) {
            // Remover mensajes anteriores
            const existingMessages = body.querySelectorAll('.config-success, .config-error');
            existingMessages.forEach(msg => msg.remove());

            // Añadir nuevo mensaje
            const messageElement = document.createElement('div');
            messageElement.className = type;
            messageElement.textContent = message;
            body.insertBefore(messageElement, body.firstChild);

            // Auto-remover después de 3 segundos
            setTimeout(() => {
                if (messageElement.parentNode) {
                    messageElement.remove();
                }
            }, 3000);
        }
    }

    // =============================================================================
    // PREVISUALIZACIÓN EN VIVO
    // =============================================================================

    updateLivePreview() {
        // Implementar previsualización en vivo si es necesario
        // Por ahora solo loggeamos los cambios
        console.log('🔄 Live preview update requested');
    }

    // =============================================================================
    // CLEANUP
    // =============================================================================

    destroy() {
        this.removeConfigPanel();
        this.configPanels.clear();
        console.log('🧹 Widget Config destroyed');
    }
}

// =============================================================================
// AUTO-INITIALIZATION
// =============================================================================

// Crear instancia global cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.widgetConfig = new WidgetConfig(window.widgetManager);
    });
} else {
    window.widgetConfig = new WidgetConfig(window.widgetManager);
}

export default WidgetConfig;