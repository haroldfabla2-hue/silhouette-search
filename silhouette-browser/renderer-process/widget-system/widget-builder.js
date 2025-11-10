// =============================================================================
// SILHOUETTE V5.2 - CONSTRUCTOR DE WIDGETS
// Sistema de creación y gestión de widgets personalizables
// =============================================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { v4 as uuidv4 } from 'uuid';

// Importar dependencias CSS
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

class WidgetBuilder {
    constructor(container, options = {}) {
        this.container = container || document.body;
        this.options = {
            rowHeight: 30,
            cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
            breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
            isDraggable: true,
            isResizable: true,
            margin: [16, 16],
            containerPadding: [16, 16],
            preventCollision: false,
            ...options
        };

        this.layouts = { lg: [], md: [], sm: [], xs: [], xxs: [] };
        this.widgets = new Map();
        this.widgetTypes = new Map();
        this.isInitialized = false;
        this.currentBreakpoint = 'lg';
        
        this.eventListeners = new Map();
        
        this.init();
    }

    // =============================================================================
    // INICIALIZACIÓN
    // =============================================================================

    init() {
        if (this.isInitialized) return;
        
        // Cargar layouts guardados
        this.loadLayouts();
        
        // Registrar tipos de widgets por defecto
        this.registerDefaultWidgetTypes();
        
        // Crear interfaz
        this.createBuilderInterface();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        this.isInitialized = true;
        console.log('✅ Widget Builder initialized');
    }

    // =============================================================================
    // GESTIÓN DE LAYOUTS
    // =============================================================================

    createBuilderInterface() {
        this.builderElement = document.createElement('div');
        this.builderElement.className = 'widget-builder';
        this.builderElement.innerHTML = `
            <div class="widget-builder-header">
                <div class="builder-title">
                    <h2>Constructor de Widgets</h2>
                    <span class="widget-count">0 widgets</span>
                </div>
                <div class="builder-controls">
                    <button class="btn-add-widget" id="btn-add-widget">+ Añadir Widget</button>
                    <button class="btn-save-layout" id="btn-save-layout">💾 Guardar</button>
                    <button class="btn-reset-layout" id="btn-reset-layout">🔄 Reset</button>
                    <button class="btn-export-layout" id="btn-export-layout">📤 Exportar</button>
                    <button class="btn-import-layout" id="btn-import-layout">📥 Importar</button>
                </div>
            </div>
            <div class="widget-builder-toolbar">
                <div class="widget-palette">
                    <h3>Widgets Disponibles</h3>
                    <div class="widget-types" id="widget-types">
                        <!-- Widget types se cargarán dinámicamente -->
                    </div>
                </div>
                <div class="builder-main">
                    <div class="layout-controls">
                        <button class="breakpoint-btn active" data-breakpoint="lg">Desktop</button>
                        <button class="breakpoint-btn" data-breakpoint="md">Tablet</button>
                        <button class="breakpoint-btn" data-breakpoint="sm">Mobile</button>
                    </div>
                    <div class="grid-container" id="grid-container">
                        <div class="grid-layout" id="grid-layout">
                            <!-- El grid layout se generará aquí -->
                        </div>
                    </div>
                </div>
                <div class="widget-config">
                    <h3>Configuración</h3>
                    <div class="config-panel" id="config-panel">
                        <p class="config-placeholder">Selecciona un widget para configurar</p>
                    </div>
                </div>
            </div>
        `;

        // Añadir estilos
        this.injectStyles();
        
        this.container.appendChild(this.builderElement);
        
        // Renderizar el grid layout
        this.renderGridLayout();
        
        // Cargar tipos de widgets
        this.loadWidgetTypes();
    }

    injectStyles() {
        if (document.getElementById('widget-builder-styles')) return;

        const styles = `
            <style id="widget-builder-styles">
                .widget-builder {
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    background: var(--bg-primary);
                    color: var(--text-primary);
                    font-family: var(--font-family-base);
                }

                .widget-builder-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: var(--spacing);
                    background: var(--bg-secondary);
                    border-bottom: 1px solid var(--border-color);
                }

                .builder-title {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing);
                }

                .builder-title h2 {
                    margin: 0;
                    font-size: var(--font-size-xl);
                    color: var(--text-primary);
                }

                .widget-count {
                    font-size: var(--font-size-sm);
                    color: var(--text-muted);
                    background: var(--bg-tertiary);
                    padding: 2px 8px;
                    border-radius: var(--radius-full);
                }

                .builder-controls {
                    display: flex;
                    gap: var(--spacing-sm);
                }

                .builder-controls button {
                    padding: var(--spacing-sm) var(--spacing);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius);
                    background: var(--panel-bg);
                    color: var(--text-primary);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    font-size: var(--font-size-sm);
                }

                .builder-controls button:hover {
                    background: var(--bg-tertiary);
                    border-color: var(--primary-color);
                    transform: translateY(-1px);
                }

                .widget-builder-toolbar {
                    display: grid;
                    grid-template-columns: 250px 1fr 300px;
                    flex: 1;
                    overflow: hidden;
                }

                .widget-palette {
                    background: var(--bg-secondary);
                    border-right: 1px solid var(--border-color);
                    padding: var(--spacing);
                    overflow-y: auto;
                }

                .widget-palette h3 {
                    margin: 0 0 var(--spacing) 0;
                    font-size: var(--font-size-base);
                    color: var(--text-primary);
                }

                .widget-types {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-sm);
                }

                .widget-type-item {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    padding: var(--spacing);
                    background: var(--panel-bg);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius);
                    cursor: grab;
                    transition: all var(--transition-fast);
                }

                .widget-type-item:hover {
                    background: var(--bg-tertiary);
                    border-color: var(--primary-color);
                    transform: translateX(4px);
                }

                .widget-type-item.dragging {
                    opacity: 0.5;
                    transform: rotate(5deg);
                }

                .widget-type-icon {
                    font-size: 1.2em;
                    min-width: 24px;
                    text-align: center;
                }

                .widget-type-info {
                    flex: 1;
                }

                .widget-type-name {
                    font-weight: 600;
                    margin-bottom: 2px;
                }

                .widget-type-description {
                    font-size: var(--font-size-xs);
                    color: var(--text-muted);
                }

                .builder-main {
                    display: flex;
                    flex-direction: column;
                    padding: var(--spacing);
                    overflow: hidden;
                }

                .layout-controls {
                    display: flex;
                    gap: var(--spacing-sm);
                    margin-bottom: var(--spacing);
                }

                .breakpoint-btn {
                    padding: var(--spacing-xs) var(--spacing);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-sm);
                    background: var(--panel-bg);
                    color: var(--text-secondary);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    font-size: var(--font-size-sm);
                }

                .breakpoint-btn.active,
                .breakpoint-btn:hover {
                    background: var(--primary-color);
                    color: var(--text-inverse);
                    border-color: var(--primary-color);
                }

                .grid-container {
                    flex: 1;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius);
                    overflow: auto;
                    position: relative;
                }

                .grid-container::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-image: 
                        linear-gradient(to right, var(--border-color) 1px, transparent 1px),
                        linear-gradient(to bottom, var(--border-color) 1px, transparent 1px);
                    background-size: 40px 40px, 40px 40px;
                    pointer-events: none;
                    opacity: 0.3;
                }

                .widget-config {
                    background: var(--bg-secondary);
                    border-left: 1px solid var(--border-color);
                    padding: var(--spacing);
                    overflow-y: auto;
                }

                .widget-config h3 {
                    margin: 0 0 var(--spacing) 0;
                    font-size: var(--font-size-base);
                    color: var(--text-primary);
                }

                .config-panel {
                    background: var(--panel-bg);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius);
                    padding: var(--spacing);
                    min-height: 200px;
                }

                .config-placeholder {
                    color: var(--text-muted);
                    text-align: center;
                    margin: var(--spacing-xl) 0;
                }

                /* Estilos de widgets en el grid */
                .react-grid-item {
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius);
                    background: var(--panel-bg);
                    transition: all var(--transition-fast);
                }

                .react-grid-item:hover {
                    border-color: var(--primary-color);
                    box-shadow: var(--shadow);
                }

                .react-grid-item.react-grid-placeholder {
                    background: var(--primary-color);
                    opacity: 0.2;
                    border: 2px dashed var(--primary-color);
                }

                .react-grid-item .react-resizable-handle {
                    background: var(--primary-color);
                }

                .widget-item {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .widget-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: var(--spacing-sm) var(--spacing);
                    background: var(--bg-tertiary);
                    border-bottom: 1px solid var(--border-color);
                    cursor: move;
                }

                .widget-title {
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .widget-actions {
                    display: flex;
                    gap: var(--spacing-xs);
                }

                .widget-action {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: 2px;
                    border-radius: var(--radius-sm);
                    transition: all var(--transition-fast);
                }

                .widget-action:hover {
                    background: var(--bg-primary);
                    color: var(--text-primary);
                }

                .widget-content {
                    flex: 1;
                    padding: var(--spacing);
                    overflow: auto;
                }

                /* Widget drag and drop */
                .widget-type-dragging {
                    opacity: 0.5;
                    transform: rotate(5deg);
                }

                .grid-container.drag-over {
                    background: var(--bg-accent);
                }

                /* Responsive */
                @media (max-width: 1024px) {
                    .widget-builder-toolbar {
                        grid-template-columns: 200px 1fr 250px;
                    }
                }

                @media (max-width: 768px) {
                    .widget-builder-toolbar {
                        grid-template-columns: 1fr;
                        grid-template-rows: 200px 1fr 200px;
                    }
                    
                    .widget-palette,
                    .widget-config {
                        border: none;
                        border-bottom: 1px solid var(--border-color);
                    }
                }

                /* Animaciones */
                @keyframes slideInWidget {
                    from {
                        opacity: 0;
                        transform: scale(0.8) translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }

                .widget-item {
                    animation: slideInWidget 0.3s ease-out;
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }

    // =============================================================================
    // GESTIÓN DE TIPOS DE WIDGETS
    // =============================================================================

    registerDefaultWidgetTypes() {
        // Dashboard Widgets
        this.registerWidgetType({
            id: 'chart',
            name: 'Gráfico',
            icon: '📊',
            description: 'Widget de gráfico configurable',
            category: 'Dashboard',
            defaultSize: { w: 4, h: 3 },
            component: this.createChartWidget
        });

        this.registerWidgetType({
            id: 'metric',
            name: 'Métrica',
            icon: '📈',
            description: 'Widget de métrica numérica',
            category: 'Dashboard',
            defaultSize: { w: 2, h: 2 },
            component: this.createMetricWidget
        });

        this.registerWidgetType({
            id: 'progress',
            name: 'Progreso',
            icon: '⏳',
            description: 'Widget de barra de progreso',
            category: 'Dashboard',
            defaultSize: { w: 3, h: 2 },
            component: this.createProgressWidget
        });

        // Development Widgets
        this.registerWidgetType({
            id: 'code-editor',
            name: 'Editor de Código',
            icon: '💻',
            description: 'Editor de código con syntax highlighting',
            category: 'Desarrollo',
            defaultSize: { w: 6, h: 4 },
            component: this.createCodeEditorWidget
        });

        this.registerWidgetType({
            id: 'terminal',
            name: 'Terminal',
            icon: '⚡',
            description: 'Terminal embebido',
            category: 'Desarrollo',
            defaultSize: { w: 4, h: 3 },
            component: this.createTerminalWidget
        });

        this.registerWidgetType({
            id: 'logs',
            name: 'Logs',
            icon: '📜',
            description: 'Visualizador de logs',
            category: 'Desarrollo',
            defaultSize: { w: 4, h: 3 },
            component: this.createLogsWidget
        });

        // System Widgets
        this.registerWidgetType({
            id: 'cpu-meter',
            name: 'CPU',
            icon: '🖥️',
            description: 'Monitor de uso de CPU',
            category: 'Sistema',
            defaultSize: { w: 3, h: 2 },
            component: this.createCPUMeterWidget
        });

        this.registerWidgetType({
            id: 'memory-meter',
            name: 'Memoria',
            icon: '💾',
            description: 'Monitor de uso de memoria',
            category: 'Sistema',
            defaultSize: { w: 3, h: 2 },
            component: this.createMemoryMeterWidget
        });

        this.registerWidgetType({
            id: 'network',
            name: 'Red',
            icon: '🌐',
            description: 'Monitor de red',
            category: 'Sistema',
            defaultSize: { w: 4, h: 2 },
            component: this.createNetworkWidget
        });

        // Productivity Widgets
        this.registerWidgetType({
            id: 'calendar',
            name: 'Calendario',
            icon: '📅',
            description: 'Widget de calendario',
            category: 'Productividad',
            defaultSize: { w: 4, h: 3 },
            component: this.createCalendarWidget
        });

        this.registerWidgetType({
            id: 'notes',
            name: 'Notas',
            icon: '📝',
            description: 'Widget de notas rápidas',
            category: 'Productividad',
            defaultSize: { w: 3, h: 4 },
            component: this.createNotesWidget
        });

        this.registerWidgetType({
            id: 'todo',
            name: 'To-Do',
            icon: '✅',
            description: 'Lista de tareas',
            category: 'Productividad',
            defaultSize: { w: 3, h: 3 },
            component: this.createTodoWidget
        });

        // Custom Widgets
        this.registerWidgetType({
            id: 'html',
            name: 'HTML Personalizado',
            icon: '🔧',
            description: 'Widget HTML/JS personalizado',
            category: 'Personalizado',
            defaultSize: { w: 4, h: 3 },
            component: this.createCustomHTMLWidget
        });
    }

    registerWidgetType(widgetType) {
        this.widgetTypes.set(widgetType.id, widgetType);
    }

    getWidgetTypes() {
        return Array.from(this.widgetTypes.values());
    }

    getWidgetTypesByCategory() {
        const types = {};
        this.widgetTypes.forEach((type, id) => {
            if (!types[type.category]) {
                types[type.category] = [];
            }
            types[type.category].push(type);
        });
        return types;
    }

    // =============================================================================
    // COMPONENTES DE WIDGETS
    // =============================================================================

    createChartWidget(config) {
        return `
            <div class="widget-chart">
                <canvas width="100%" height="100%"></canvas>
            </div>
        `;
    }

    createMetricWidget(config) {
        return `
            <div class="widget-metric">
                <div class="metric-value">${config.value || '0'}</div>
                <div class="metric-label">${config.label || 'Métrica'}</div>
                <div class="metric-change ${config.trend || 'neutral'}">
                    ${config.trend === 'up' ? '↗️' : config.trend === 'down' ? '↘️' : '➡️'}
                    ${config.change || '0%'}
                </div>
            </div>
        `;
    }

    createProgressWidget(config) {
        return `
            <div class="widget-progress">
                <div class="progress-header">
                    <span class="progress-label">${config.label || 'Progreso'}</span>
                    <span class="progress-value">${config.value || 0}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${config.value || 0}%"></div>
                </div>
            </div>
        `;
    }

    createCodeEditorWidget(config) {
        return `
            <div class="widget-code-editor">
                <div class="code-header">
                    <select class="code-language">
                        <option value="javascript">JavaScript</option>
                        <option value="html">HTML</option>
                        <option value="css">CSS</option>
                        <option value="json">JSON</option>
                    </select>
                    <button class="btn-run">▶️ Ejecutar</button>
                </div>
                <textarea class="code-editor" placeholder="// Escribe tu código aquí..."></textarea>
            </div>
        `;
    }

    createTerminalWidget(config) {
        return `
            <div class="widget-terminal">
                <div class="terminal-header">
                    <div class="terminal-title">Terminal</div>
                    <div class="terminal-controls">
                        <button class="terminal-clear">🗑️</button>
                    </div>
                </div>
                <div class="terminal-output">
                    <div class="terminal-line">$ </div>
                </div>
                <input type="text" class="terminal-input" placeholder="Escribe un comando...">
            </div>
        `;
    }

    createLogsWidget(config) {
        return `
            <div class="widget-logs">
                <div class="logs-header">
                    <select class="log-level">
                        <option value="all">Todos</option>
                        <option value="error">Error</option>
                        <option value="warn">Warning</option>
                        <option value="info">Info</option>
                    </select>
                    <button class="btn-clear-logs">🗑️</button>
                </div>
                <div class="logs-container">
                    <div class="log-entry"><span class="log-time">12:34</span> <span class="log-level-info">INFO</span> Iniciado widget</div>
                </div>
            </div>
        `;
    }

    createCPUMeterWidget(config) {
        return `
            <div class="widget-cpu-meter">
                <div class="meter-header">
                    <span class="meter-icon">🖥️</span>
                    <span class="meter-label">CPU</span>
                </div>
                <div class="meter-gauge">
                    <svg viewBox="0 0 36 36" class="circular-chart">
                        <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--border-color)" stroke-width="2.8"/>
                        <path class="circle" stroke="var(--primary-color)" stroke-dasharray="${config.value || 30}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke-width="2.8" stroke-linecap="round"/>
                        <text x="18" y="20.35" class="percentage" text-anchor="middle" fill="var(--text-primary)" font-size="0.5em" font-weight="bold">${config.value || 30}%</text>
                    </svg>
                </div>
            </div>
        `;
    }

    createMemoryMeterWidget(config) {
        return `
            <div class="widget-memory-meter">
                <div class="meter-header">
                    <span class="meter-icon">💾</span>
                    <span class="meter-label">Memoria</span>
                </div>
                <div class="memory-stats">
                    <div class="memory-bar">
                        <div class="memory-used" style="width: ${config.usage || 45}%"></div>
                    </div>
                    <div class="memory-text">
                        <span class="used">${config.used || '3.2'}GB</span> / <span class="total">${config.total || '8.0'}GB</span>
                    </div>
                </div>
            </div>
        `;
    }

    createNetworkWidget(config) {
        return `
            <div class="widget-network">
                <div class="network-header">
                    <span class="network-icon">🌐</span>
                    <span class="network-label">Red</span>
                </div>
                <div class="network-stats">
                    <div class="network-item">
                        <span class="network-label">↓ Download</span>
                        <span class="network-value">${config.download || '15.2'} MB/s</span>
                    </div>
                    <div class="network-item">
                        <span class="network-label">↑ Upload</span>
                        <span class="network-value">${config.upload || '3.1'} MB/s</span>
                    </div>
                </div>
            </div>
        `;
    }

    createCalendarWidget(config) {
        return `
            <div class="widget-calendar">
                <div class="calendar-header">
                    <button class="calendar-prev">‹</button>
                    <div class="calendar-title">${config.title || 'Noviembre 2025'}</div>
                    <button class="calendar-next">›</button>
                </div>
                <div class="calendar-grid">
                    <div class="calendar-day">L</div>
                    <div class="calendar-day">M</div>
                    <div class="calendar-day">X</div>
                    <div class="calendar-day">J</div>
                    <div class="calendar-day">V</div>
                    <div class="calendar-day">S</div>
                    <div class="calendar-day">D</div>
                    <div class="calendar-day">1</div>
                    <div class="calendar-day">2</div>
                    <div class="calendar-day">3</div>
                    <div class="calendar-day calendar-today">10</div>
                    <div class="calendar-day">11</div>
                </div>
            </div>
        `;
    }

    createNotesWidget(config) {
        return `
            <div class="widget-notes">
                <div class="notes-header">
                    <input type="text" class="note-title" placeholder="Título de la nota" value="${config.title || ''}">
                </div>
                <textarea class="notes-content" placeholder="Escribe tu nota aquí...">${config.content || ''}</textarea>
                <div class="notes-footer">
                    <button class="btn-save-note">💾 Guardar</button>
                </div>
            </div>
        `;
    }

    createTodoWidget(config) {
        return `
            <div class="widget-todo">
                <div class="todo-header">
                    <input type="text" class="todo-input" placeholder="Nueva tarea...">
                    <button class="btn-add-todo">+</button>
                </div>
                <div class="todo-list">
                    ${config.items ? config.items.map(item => `
                        <div class="todo-item ${item.completed ? 'completed' : ''}">
                            <input type="checkbox" ${item.completed ? 'checked' : ''}>
                            <span>${item.text}</span>
                            <button class="btn-delete-todo">×</button>
                        </div>
                    `).join('') : `
                        <div class="todo-item">
                            <input type="checkbox">
                            <span>Tarea de ejemplo</span>
                            <button class="btn-delete-todo">×</button>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    createCustomHTMLWidget(config) {
        return `
            <div class="widget-custom-html">
                <div class="custom-html-editor">
                    <div class="html-preview" id="html-preview-${config.id}">
                        ${config.content || '<p>Contenido HTML personalizado</p>'}
                    </div>
                    <button class="btn-edit-html">✏️ Editar</button>
                </div>
            </div>
        `;
    }

    // =============================================================================
    // RENDERIZADO DEL GRID
    // =============================================================================

    renderGridLayout() {
        const gridContainer = this.builderElement.querySelector('#grid-layout');
        if (!gridContainer) return;

        const layouts = this.layouts[this.currentBreakpoint] || [];

        // Crear elementos de widgets
        const gridItems = layouts.map((layout, index) => {
            const widget = this.widgets.get(layout.i);
            if (!widget) return null;

            const widgetType = this.widgetTypes.get(widget.type);
            const content = widgetType ? widgetType.component(widget.config || {}) : '<p>Widget no encontrado</p>';

            return `
                <div class="react-grid-item" data-index="${index}">
                    <div class="widget-item" data-widget-id="${layout.i}">
                        <div class="widget-header">
                            <div class="widget-title">${widgetType ? widgetType.name : 'Widget'}</div>
                            <div class="widget-actions">
                                <button class="widget-action widget-config-btn" title="Configurar">⚙️</button>
                                <button class="widget-action widget-delete-btn" title="Eliminar">🗑️</button>
                            </div>
                        </div>
                        <div class="widget-content">
                            ${content}
                        </div>
                    </div>
                </div>
            `;
        }).filter(Boolean).join('');

        gridContainer.innerHTML = gridItems;
    }

    // =============================================================================
    // GESTIÓN DE EVENTOS
    // =============================================================================

    setupEventListeners() {
        // Botón añadir widget
        const addBtn = this.builderElement.querySelector('#btn-add-widget');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showWidgetSelector());
        }

        // Botones de layout
        const saveBtn = this.builderElement.querySelector('#btn-save-layout');
        const resetBtn = this.builderElement.querySelector('#btn-reset-layout');
        const exportBtn = this.builderElement.querySelector('#btn-export-layout');
        const importBtn = this.builderElement.querySelector('#btn-import-layout');

        if (saveBtn) saveBtn.addEventListener('click', () => this.saveLayouts());
        if (resetBtn) resetBtn.addEventListener('click', () => this.resetLayouts());
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportLayouts());
        if (importBtn) importBtn.addEventListener('click', () => this.importLayouts());

        // Botones de breakpoint
        const breakpointBtns = this.builderElement.querySelectorAll('.breakpoint-btn');
        breakpointBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const breakpoint = e.target.dataset.breakpoint;
                this.setCurrentBreakpoint(breakpoint);
            });
        });

        // Event delegation para acciones de widgets
        this.builderElement.addEventListener('click', (e) => {
            if (e.target.classList.contains('widget-config-btn')) {
                const widgetId = e.target.closest('.widget-item').dataset.widgetId;
                this.configureWidget(widgetId);
            } else if (e.target.classList.contains('widget-delete-btn')) {
                const widgetId = e.target.closest('.widget-item').dataset.widgetId;
                this.removeWidget(widgetId);
            }
        });
    }

    // =============================================================================
    // API PÚBLICA
    // =============================================================================

    addWidget(widgetType, customConfig = {}) {
        const widgetTypeObj = this.widgetTypes.get(widgetType);
        if (!widgetTypeObj) {
            console.error(`Widget type '${widgetType}' not found`);
            return null;
        }

        const widgetId = uuidv4();
        const defaultSize = widgetTypeObj.defaultSize || { w: 4, h: 3 };
        
        // Crear widget
        const widget = {
            id: widgetId,
            type: widgetType,
            config: {
                title: widgetTypeObj.name,
                ...customConfig
            },
            createdAt: Date.now()
        };

        // Añadir al mapa de widgets
        this.widgets.set(widgetId, widget);

        // Añadir al layout actual
        const currentLayout = this.layouts[this.currentBreakpoint] || [];
        const newLayoutItem = {
            i: widgetId,
            x: 0,
            y: 0,
            w: defaultSize.w,
            h: defaultSize.h,
            minW: 2,
            minH: 2,
            maxW: 12,
            maxH: 8
        };

        // Encontrar posición disponible
        newLayoutItem.x = this.findAvailablePosition(currentLayout, defaultSize.w);
        newLayoutItem.y = this.getNextRow(currentLayout);

        currentLayout.push(newLayoutItem);
        this.layouts[this.currentBreakpoint] = currentLayout;

        // Re-renderizar
        this.renderGridLayout();
        this.updateWidgetCount();

        console.log(`✅ Widget added: ${widgetType} (${widgetId})`);
        return widgetId;
    }

    removeWidget(widgetId) {
        // Remover de widgets
        this.widgets.delete(widgetId);

        // Remover de todos los layouts
        Object.keys(this.layouts).forEach(breakpoint => {
            this.layouts[breakpoint] = this.layouts[breakpoint].filter(item => item.i !== widgetId);
        });

        // Re-renderizar
        this.renderGridLayout();
        this.updateWidgetCount();

        console.log(`🗑️ Widget removed: ${widgetId}`);
    }

    configureWidget(widgetId) {
        const widget = this.widgets.get(widgetId);
        if (!widget) return;

        // Mostrar panel de configuración
        this.showConfigPanel(widget);
    }

    showWidgetSelector() {
        // Implementar selector de widgets
        console.log('📋 Showing widget selector...');
    }

    setCurrentBreakpoint(breakpoint) {
        this.currentBreakpoint = breakpoint;
        
        // Actualizar botones activos
        const buttons = this.builderElement.querySelectorAll('.breakpoint-btn');
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.breakpoint === breakpoint);
        });

        // Re-renderizar para este breakpoint
        this.renderGridLayout();
    }

    saveLayouts() {
        const layoutData = {
            layouts: this.layouts,
            widgets: Array.from(this.widgets.entries()),
            timestamp: Date.now(),
            version: '5.2.0'
        };

        localStorage.setItem('silhouette-widget-layouts', JSON.stringify(layoutData));
        console.log('💾 Widget layouts saved');
    }

    loadLayouts() {
        try {
            const saved = localStorage.getItem('silhouette-widget-layouts');
            if (saved) {
                const data = JSON.parse(saved);
                this.layouts = data.layouts || this.layouts;
                
                // Recrear widgets Map
                this.widgets = new Map(data.widgets || []);
                
                console.log('📁 Widget layouts loaded');
            }
        } catch (error) {
            console.warn('⚠️ Could not load widget layouts:', error);
        }
    }

    resetLayouts() {
        if (confirm('¿Estás seguro de que quieres resetear todos los layouts?')) {
            this.layouts = { lg: [], md: [], sm: [], xs: [], xxs: [] };
            this.widgets.clear();
            this.renderGridLayout();
            this.updateWidgetCount();
            localStorage.removeItem('silhouette-widget-layouts');
            console.log('🔄 Widget layouts reset');
        }
    }

    exportLayouts() {
        const data = {
            layouts: this.layouts,
            widgets: Array.from(this.widgets.entries()),
            timestamp: Date.now(),
            version: '5.2.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `silhouette-widgets-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importLayouts() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        this.layouts = data.layouts || this.layouts;
                        this.widgets = new Map(data.widgets || []);
                        this.renderGridLayout();
                        this.updateWidgetCount();
                        console.log('📥 Widget layouts imported');
                    } catch (error) {
                        console.error('❌ Error importing layouts:', error);
                        alert('Error al importar los layouts');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    // =============================================================================
    // UTILIDADES
    // =============================================================================

    findAvailablePosition(layout, width) {
        // Algoritmo simple para encontrar posición disponible
        for (let x = 0; x <= 12 - width; x++) {
            let canPlace = true;
            for (let w = 0; w < width; w++) {
                if (layout.some(item => item.x === x + w && item.y === 0)) {
                    canPlace = false;
                    break;
                }
            }
            if (canPlace) return x;
        }
        return 0;
    }

    getNextRow(layout) {
        return Math.max(0, ...layout.map(item => item.y + item.h));
    }

    updateWidgetCount() {
        const countElement = this.builderElement.querySelector('.widget-count');
        if (countElement) {
            countElement.textContent = `${this.widgets.size} widget${this.widgets.size !== 1 ? 's' : ''}`;
        }
    }

    loadWidgetTypes() {
        const widgetTypesContainer = this.builderElement.querySelector('#widget-types');
        if (!widgetTypesContainer) return;

        const typesByCategory = this.getWidgetTypesByCategory();
        let html = '';

        Object.keys(typesByCategory).forEach(category => {
            const types = typesByCategory[category];
            html += `<h4 style="margin: var(--spacing) 0 var(--spacing-sm) 0; color: var(--text-muted); font-size: var(--font-size-sm); text-transform: uppercase;">${category}</h4>`;
            
            types.forEach(type => {
                html += `
                    <div class="widget-type-item" data-widget-type="${type.id}">
                        <div class="widget-type-icon">${type.icon}</div>
                        <div class="widget-type-info">
                            <div class="widget-type-name">${type.name}</div>
                            <div class="widget-type-description">${type.description}</div>
                        </div>
                    </div>
                `;
            });
        });

        widgetTypesContainer.innerHTML = html;

        // Event listeners para añadir widgets
        widgetTypesContainer.addEventListener('click', (e) => {
            const typeItem = e.target.closest('.widget-type-item');
            if (typeItem) {
                const widgetType = typeItem.dataset.widgetType;
                this.addWidget(widgetType);
            }
        });
    }

    showConfigPanel(widget) {
        const configPanel = this.builderElement.querySelector('#config-panel');
        if (!configPanel) return;

        configPanel.innerHTML = `
            <div class="widget-config-form">
                <h4>Configurar ${widget.config.title}</h4>
                <div class="config-field">
                    <label>Título:</label>
                    <input type="text" value="${widget.config.title || ''}" data-config="title">
                </div>
                <div class="config-field">
                    <label>Ancho:</label>
                    <input type="number" value="${widget.config.width || ''}" min="2" max="12" data-config="width">
                </div>
                <div class="config-field">
                    <label>Alto:</label>
                    <input type="number" value="${widget.config.height || ''}" min="2" max="8" data-config="height">
                </div>
                <div class="config-actions">
                    <button class="btn-save-config">Guardar</button>
                    <button class="btn-cancel-config">Cancelar</button>
                </div>
            </div>
        `;
    }
}

// =============================================================================
// EXPORTAR
// =============================================================================

export default WidgetBuilder;