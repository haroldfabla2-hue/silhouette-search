// =============================================================================
// SILHOUETTE V5.2 - CONMUTADOR DE TEMAS
// Interfaz de usuario para cambio de temas con previsualización
// =============================================================================

class ThemeSwitcher {
    constructor(container = null, options = {}) {
        this.container = container || document.body;
        this.options = {
            showLabels: options.showLabels !== false,
            showPreview: options.showPreview !== false,
            position: options.position || 'bottom-right', // bottom-right, bottom-left, top-right, top-left
            autoHide: options.autoHide !== false,
            ...options
        };
        
        this.isOpen = false;
        this.previewTimeout = null;
        
        this.init();
    }

    init() {
        this.createSwitcher();
        this.setupEventListeners();
        this.updateCurrentTheme();
    }

    createSwitcher() {
        // Crear contenedor principal
        this.switcherElement = document.createElement('div');
        this.switcherElement.className = 'theme-switcher';
        this.switcherElement.innerHTML = `
            <button class="theme-switcher-trigger" id="theme-switcher-trigger">
                <span class="theme-icon">🌙</span>
                <span class="theme-name">Oscuro</span>
                <svg class="dropdown-arrow" width="16" height="16" viewBox="0 0 24 24">
                    <path d="M7 10l5 5 5-5z" fill="currentColor"/>
                </svg>
            </button>
            <div class="theme-switcher-dropdown" id="theme-switcher-dropdown">
                <div class="theme-switcher-header">
                    <h3>Cambiar Tema</h3>
                    <button class="close-btn" id="theme-switcher-close">×</button>
                </div>
                <div class="theme-list" id="theme-list">
                    <!-- Los temas se generarán dinámicamente -->
                </div>
                <div class="theme-switcher-footer">
                    <div class="theme-preview">
                        <div class="preview-header"></div>
                        <div class="preview-content">
                            <div class="preview-card"></div>
                            <div class="preview-card small"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Añadir estilos
        this.injectStyles();

        // Añadir al DOM
        this.container.appendChild(this.switcherElement);

        // Configurar posición
        this.positionSwitcher();
    }

    injectStyles() {
        if (document.getElementById('theme-switcher-styles')) return;

        const styles = `
            <style id="theme-switcher-styles">
                .theme-switcher {
                    position: relative;
                    z-index: 10000;
                    font-family: var(--font-family-base);
                }

                .theme-switcher-trigger {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    padding: var(--spacing-sm) var(--spacing);
                    background: var(--panel-bg);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius);
                    color: var(--text-primary);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    font-size: var(--font-size-sm);
                    min-width: 120px;
                }

                .theme-switcher-trigger:hover {
                    background: var(--bg-tertiary);
                    border-color: var(--primary-color);
                    transform: translateY(-1px);
                    box-shadow: var(--shadow);
                }

                .theme-icon {
                    font-size: 1.2em;
                }

                .theme-name {
                    flex: 1;
                    text-align: left;
                }

                .dropdown-arrow {
                    transition: transform var(--transition-fast);
                }

                .theme-switcher.open .dropdown-arrow {
                    transform: rotate(180deg);
                }

                .theme-switcher-dropdown {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    margin-top: var(--spacing-xs);
                    background: var(--modal-bg);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-xl);
                    width: 320px;
                    max-height: 400px;
                    overflow: hidden;
                    opacity: 0;
                    visibility: hidden;
                    transform: translateY(-10px);
                    transition: all var(--transition);
                    z-index: 10001;
                }

                .theme-switcher.open .theme-switcher-dropdown {
                    opacity: 1;
                    visibility: visible;
                    transform: translateY(0);
                }

                .theme-switcher-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: var(--spacing);
                    border-bottom: 1px solid var(--border-color);
                    background: var(--bg-secondary);
                }

                .theme-switcher-header h3 {
                    margin: 0;
                    font-size: var(--font-size-base);
                    color: var(--text-primary);
                }

                .close-btn {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: var(--radius-sm);
                    transition: all var(--transition-fast);
                }

                .close-btn:hover {
                    background: var(--bg-tertiary);
                    color: var(--text-primary);
                }

                .theme-list {
                    max-height: 300px;
                    overflow-y: auto;
                    padding: var(--spacing-sm);
                }

                .theme-item {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing);
                    padding: var(--spacing-sm);
                    border-radius: var(--radius);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    border: 1px solid transparent;
                    margin-bottom: var(--spacing-xs);
                }

                .theme-item:last-child {
                    margin-bottom: 0;
                }

                .theme-item:hover {
                    background: var(--bg-tertiary);
                    border-color: var(--border-color);
                }

                .theme-item.active {
                    background: var(--primary-color);
                    color: var(--text-inverse);
                    border-color: var(--primary-color);
                }

                .theme-item.active .theme-item-icon {
                    transform: scale(1.1);
                }

                .theme-item-icon {
                    font-size: 1.2em;
                    min-width: 24px;
                    text-align: center;
                    transition: transform var(--transition-fast);
                }

                .theme-item-info {
                    flex: 1;
                }

                .theme-item-name {
                    font-weight: 600;
                    margin-bottom: 2px;
                }

                .theme-item-description {
                    font-size: var(--font-size-xs);
                    opacity: 0.8;
                }

                .theme-item-status {
                    font-size: var(--font-size-xs);
                    padding: 2px 6px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: var(--radius-full);
                }

                .theme-switcher-footer {
                    border-top: 1px solid var(--border-color);
                    padding: var(--spacing);
                    background: var(--bg-secondary);
                }

                .theme-preview {
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius);
                    overflow: hidden;
                }

                .preview-header {
                    height: 20px;
                    background: var(--primary-color);
                }

                .preview-content {
                    padding: var(--spacing-sm);
                }

                .preview-card {
                    height: 8px;
                    background: var(--bg-tertiary);
                    border-radius: var(--radius-sm);
                    margin-bottom: var(--spacing-xs);
                }

                .preview-card.small {
                    width: 60%;
                }

                .preview-card:last-child {
                    margin-bottom: 0;
                }

                /* Posicionamiento */
                .theme-switcher.bottom-right .theme-switcher-dropdown {
                    right: 0;
                }

                .theme-switcher.bottom-left .theme-switcher-dropdown {
                    left: 0;
                }

                .theme-switcher.top-right .theme-switcher-dropdown {
                    bottom: 100%;
                    top: auto;
                    margin-top: 0;
                    margin-bottom: var(--spacing-xs);
                }

                .theme-switcher.top-left .theme-switcher-dropdown {
                    bottom: 100%;
                    top: auto;
                    left: 0;
                    margin-top: 0;
                    margin-bottom: var(--spacing-xs);
                }

                /* Responsive */
                @media (max-width: 480px) {
                    .theme-switcher-dropdown {
                        width: calc(100vw - 32px);
                        max-width: 320px;
                    }
                }

                /* Animación de entrada */
                .theme-item {
                    animation: slideInUp 0.3s ease forwards;
                    opacity: 0;
                    transform: translateY(10px);
                }

                @keyframes slideInUp {
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                /* Scrollbar personalizado */
                .theme-list::-webkit-scrollbar {
                    width: 6px;
                }

                .theme-list::-webkit-scrollbar-track {
                    background: var(--bg-secondary);
                }

                .theme-list::-webkit-scrollbar-thumb {
                    background: var(--border-color);
                    border-radius: var(--radius-sm);
                }

                .theme-list::-webkit-scrollbar-thumb:hover {
                    background: var(--text-muted);
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }

    setupEventListeners() {
        // Toggle dropdown
        const trigger = this.switcherElement.querySelector('#theme-switcher-trigger');
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Cerrar con botón
        const closeBtn = this.switcherElement.querySelector('#theme-switcher-close');
        closeBtn.addEventListener('click', () => this.close());

        // Cerrar con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Cerrar al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.switcherElement.contains(e.target)) {
                this.close();
            }
        });

        // Escuchar cambios de tema
        if (window.themeManager) {
            window.themeManager.addObserver((event, data) => {
                if (event === 'themeChanged') {
                    this.updateCurrentTheme();
                }
            });
        }
    }

    positionSwitcher() {
        this.switcherElement.classList.add(`position-${this.options.position}`);
    }

    async populateThemes() {
        const themeList = this.switcherElement.querySelector('#theme-list');
        themeList.innerHTML = '';

        const themes = window.themeManager ? window.themeManager.getAvailableThemes() : [
            { id: 'auto', name: 'Automático', icon: '🔄', description: 'Seguir sistema' },
            { id: 'light', name: 'Claro', icon: '☀️', description: 'Fondo claro' },
            { id: 'dark', name: 'Oscuro', icon: '🌙', description: 'Fondo oscuro' },
            { id: 'blue', name: 'Azul', icon: '🔵', description: 'Tema azul' },
            { id: 'green', name: 'Verde', icon: '🟢', description: 'Tema verde' },
            { id: 'purple', name: 'Púrpura', icon: '🟣', description: 'Tema púrpura' },
            { id: 'solar', name: 'Solar', icon: '🧡', description: 'Tema cálido' }
        ];

        themes.forEach((theme, index) => {
            const themeItem = document.createElement('div');
            themeItem.className = 'theme-item';
            themeItem.style.animationDelay = `${index * 0.1}s`;
            
            const isActive = window.themeManager ? 
                window.themeManager.getCurrentTheme().id === theme.id : 
                theme.id === 'light';

            themeItem.innerHTML = `
                <div class="theme-item-icon">${theme.icon}</div>
                <div class="theme-item-info">
                    <div class="theme-item-name">${theme.name}</div>
                    <div class="theme-item-description">${theme.description || 'Tema personalizado'}</div>
                </div>
                ${isActive ? '<div class="theme-item-status">Activo</div>' : ''}
            `;

            if (isActive) {
                themeItem.classList.add('active');
            }

            themeItem.addEventListener('click', () => this.selectTheme(theme.id));
            themeItem.addEventListener('mouseenter', () => this.previewTheme(theme.id));

            themeList.appendChild(themeItem);
        });
    }

    async selectTheme(themeId) {
        if (window.themeManager) {
            await window.themeManager.setTheme(themeId);
        } else {
            // Fallback si no hay themeManager
            document.documentElement.setAttribute('data-theme', themeId);
            localStorage.setItem('silhouette-theme', themeId);
        }
        
        this.updateCurrentTheme();
        
        if (this.options.autoHide !== false) {
            setTimeout(() => this.close(), 300);
        }
    }

    async previewTheme(themeId) {
        // Previsualización temporal del tema
        clearTimeout(this.previewTimeout);
        
        if (window.themeManager) {
            const currentTheme = window.themeManager.getCurrentTheme().id;
            
            // Cambiar temporalmente
            document.documentElement.setAttribute('data-theme', themeId);
            
            // Restaurar después de 2 segundos si no se selecciona
            this.previewTimeout = setTimeout(() => {
                document.documentElement.setAttribute('data-theme', currentTheme);
            }, 2000);
        }
    }

    updateCurrentTheme() {
        const currentTheme = window.themeManager ? 
            window.themeManager.getCurrentTheme() : 
            { id: localStorage.getItem('silhouette-theme') || 'auto' };

        const trigger = this.switcherElement.querySelector('.theme-switcher-trigger');
        const icon = trigger.querySelector('.theme-icon');
        const name = trigger.querySelector('.theme-name');

        const themeIcons = {
            auto: '🔄',
            light: '☀️',
            dark: '🌙',
            blue: '🔵',
            green: '🟢',
            purple: '🟣',
            solar: '🧡'
        };

        const themeNames = {
            auto: 'Automático',
            light: 'Claro',
            dark: 'Oscuro',
            blue: 'Azul',
            green: 'Verde',
            purple: 'Púrpura',
            solar: 'Solar'
        };

        icon.textContent = themeIcons[currentTheme.id] || '🎨';
        name.textContent = themeNames[currentTheme.id] || 'Personalizado';

        // Actualizar estado visual
        this.switcherElement.classList.toggle('dark-theme', currentTheme.actual === 'dark');
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        this.switcherElement.classList.add('open');
        this.populateThemes();
    }

    close() {
        this.isOpen = false;
        this.switcherElement.classList.remove('open');
        clearTimeout(this.previewTimeout);
    }

    // API Pública
    destroy() {
        if (this.switcherElement) {
            this.switcherElement.remove();
        }
        document.removeEventListener('keydown', this.keydownHandler);
        document.removeEventListener('click', this.clickHandler);
    }

    refresh() {
        this.updateCurrentTheme();
        if (this.isOpen) {
            this.populateThemes();
        }
    }
}

// =============================================================================
// AUTO-INITIALIZATION
// =============================================================================

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Crear switcher global
        window.themeSwitcher = new ThemeSwitcher();
    });
} else {
    window.themeSwitcher = new ThemeSwitcher();
}

// Exportar para uso en módulos
export default ThemeSwitcher;