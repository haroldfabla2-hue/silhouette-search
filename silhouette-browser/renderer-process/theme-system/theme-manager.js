// =============================================================================
// SILHOUETTE V5.2 - SISTEMA DE GESTIÓN DE TEMAS
// Core del sistema de temas con persistencia y integración Electron
// =============================================================================

import { ipcRenderer } from 'electron';

class ThemeManager {
    constructor() {
        this.currentTheme = 'auto';
        this.availableThemes = [
            { id: 'auto', name: 'Automático', icon: '🔄' },
            { id: 'light', name: 'Claro', icon: '☀️' },
            { id: 'dark', name: 'Oscuro', icon: '🌙' },
            { id: 'blue', name: 'Azul', icon: '🔵' },
            { id: 'green', name: 'Verde', icon: '🟢' },
            { id: 'purple', name: 'Púrpura', icon: '🟣' },
            { id: 'solar', name: 'Solar', icon: '🧡' }
        ];
        
        this.systemPreferences = {
            prefersDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        };
        
        this.isInitialized = false;
        this.observers = new Set();
        
        // Inicialización inmediata para prevenir FOUC
        this.preventFOUC();
        
        // Inicializar cuando el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    // =============================================================================
    // PREVENCIÓN DE FOUC (Flash of Unstyled Content)
    // =============================================================================
    
    preventFOUC() {
        // Aplicar tema antes de que cargue el CSS
        const savedTheme = localStorage.getItem('silhouette-theme') || 'auto';
        const systemTheme = this.getSystemTheme();
        const theme = savedTheme === 'auto' ? systemTheme : savedTheme;
        
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.classList.add('theme-transition');
        
        console.log(`🎨 Theme applied before CSS load: ${theme}`);
    }

    // =============================================================================
    // INICIALIZACIÓN
    // =============================================================================

    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // Cargar tema guardado
            await this.loadTheme();
            
            // Configurar detectores del sistema
            this.setupSystemListeners();
            
            // Configurar comunicador con main process
            this.setupElectronBridge();
            
            // Marcar como inicializado
            this.isInitialized = true;
            
            console.log('✅ Theme Manager initialized successfully');
            
            // Notificar a los observadores
            this.notifyObservers('themeChanged', this.getCurrentTheme());
            
        } catch (error) {
            console.error('❌ Error initializing Theme Manager:', error);
        }
    }

    // =============================================================================
    // GESTIÓN DE TEMAS
    // =============================================================================

    async setTheme(themeId) {
        try {
            if (!this.availableThemes.find(t => t.id === themeId)) {
                throw new Error(`Theme '${themeId}' not found`);
            }

            const previousTheme = this.currentTheme;
            let newTheme = themeId;

            // Si es auto, calcular el tema del sistema
            if (themeId === 'auto') {
                newTheme = this.getSystemTheme();
            }

            // Aplicar tema
            this.applyTheme(newTheme);
            this.currentTheme = themeId;

            // Persistir en localStorage
            localStorage.setItem('silhouette-theme', themeId);

            // Notificar al main process
            await this.notifyMainProcess('themeChanged', {
                from: previousTheme,
                to: themeId,
                actual: newTheme,
                timestamp: Date.now()
            });

            console.log(`🎨 Theme changed: ${previousTheme} → ${themeId} (${newTheme})`);

            // Notificar observadores
            this.notifyObservers('themeChanged', {
                from: previousTheme,
                to: themeId,
                actual: newTheme
            });

            return true;

        } catch (error) {
            console.error('❌ Error setting theme:', error);
            return false;
        }
    }

    applyTheme(themeId) {
        document.documentElement.setAttribute('data-theme', themeId);
        
        // Actualizar meta theme-color para móviles
        this.updateMetaThemeColor(themeId);
        
        // Añadir transición suave
        document.documentElement.classList.add('theme-transition');
        setTimeout(() => {
            document.documentElement.classList.remove('theme-transition');
        }, 300);
    }

    getSystemTheme() {
        // Detectar tema del sistema operativo
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    getCurrentTheme() {
        return {
            id: this.currentTheme,
            actual: document.documentElement.getAttribute('data-theme') || this.getSystemTheme(),
            system: this.getSystemTheme(),
            timestamp: Date.now()
        };
    }

    // =============================================================================
    // PERSISTENCIA
    // =============================================================================

    async loadTheme() {
        try {
            const savedTheme = localStorage.getItem('silhouette-theme') || 'auto';
            await this.setTheme(savedTheme);
        } catch (error) {
            console.warn('⚠️ Could not load saved theme, using auto:', error);
            await this.setTheme('auto');
        }
    }

    async saveTheme(themeId) {
        localStorage.setItem('silhouette-theme', themeId);
        localStorage.setItem('silhouette-theme-saved', new Date().toISOString());
    }

    // =============================================================================
    // DETECTORES DEL SISTEMA
    // =============================================================================

    setupSystemListeners() {
        // Escuchar cambios en la preferencia del sistema
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        
        darkModeQuery.addEventListener('change', (e) => {
            this.systemPreferences.prefersDark = e.matches;
            console.log(`🖥️ System theme changed: ${e.matches ? 'dark' : 'light'}`);
            
            // Si estamos en modo automático, cambiar tema
            if (this.currentTheme === 'auto') {
                this.applyTheme(this.getSystemTheme());
                this.notifyObservers('systemThemeChanged', e.matches);
            }
        });

        reducedMotionQuery.addEventListener('change', (e) => {
            this.systemPreferences.reducedMotion = e.matches;
            console.log(`🎬 Motion preference: ${e.matches ? 'reduced' : 'normal'}`);
            this.notifyObservers('motionPreferenceChanged', e.matches);
        });
    }

    // =============================================================================
    // INTEGRACIÓN ELECTRON
    // =============================================================================

    setupElectronBridge() {
        // Verificar si estamos en Electron
        if (typeof ipcRenderer !== 'undefined') {
            // Escuchar eventos del main process
            ipcRenderer.on('theme:set', (event, themeId) => {
                this.setTheme(themeId);
            });

            ipcRenderer.on('theme:get', (event) => {
                event.reply('theme:current', this.getCurrentTheme());
            });

            // Solicitar tema del sistema si está disponible
            this.requestSystemTheme();
        }
    }

    async requestSystemTheme() {
        try {
            const systemTheme = await ipcRenderer.invoke('theme:getSystem');
            if (systemTheme) {
                console.log('🖥️ System theme from Electron:', systemTheme);
                // Usar la información del sistema si está disponible
            }
        } catch (error) {
            // No es crítico si no está disponible
            console.log('ℹ️ Electron system theme not available');
        }
    }

    async notifyMainProcess(channel, data) {
        if (typeof ipcRenderer !== 'undefined') {
            try {
                await ipcRenderer.send('theme:changed', data);
            } catch (error) {
                console.warn('⚠️ Could not notify main process:', error);
            }
        }
    }

    // =============================================================================
    // UTILIDADES
    // =============================================================================

    updateMetaThemeColor(themeId) {
        let color = '#007ACC'; // Default
        
        switch (themeId) {
            case 'dark': color = '#1E1E1E'; break;
            case 'light': color = '#FFFFFF'; break;
            case 'blue': color = '#1E40AF'; break;
            case 'green': color = '#059669'; break;
            case 'purple': color = '#7C3AED'; break;
            case 'solar': color = '#EA580C'; break;
        }

        // Actualizar o crear meta theme-color
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.setAttribute('name', 'theme-color');
            document.head.appendChild(metaThemeColor);
        }
        metaThemeColor.setAttribute('content', color);
    }

    getThemeColors(themeId = this.getCurrentTheme().actual) {
        // Obtener colores calculados del tema actual
        const computedStyle = getComputedStyle(document.documentElement);
        return {
            primary: computedStyle.getPropertyValue('--primary-color').trim(),
            background: computedStyle.getPropertyValue('--bg-primary').trim(),
            text: computedStyle.getPropertyValue('--text-primary').trim(),
            border: computedStyle.getPropertyValue('--border-color').trim()
        };
    }

    // =============================================================================
    // OBSERVADORES (PATRÓN OBSERVER)
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
                console.error('❌ Observer error:', error);
            }
        });
    }

    // =============================================================================
    // API PÚBLICA
    // =============================================================================

    // Obtener lista de temas disponibles
    getAvailableThemes() {
        return [...this.availableThemes];
    }

    // Verificar si un tema está disponible
    isThemeAvailable(themeId) {
        return this.availableThemes.some(t => t.id === themeId);
    }

    // Alternar entre temas
    async toggleTheme() {
        const themes = this.availableThemes.map(t => t.id);
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex];
        
        return await this.setTheme(nextTheme);
    }

    // Reiniciar a tema automático
    async resetToAuto() {
        return await this.setTheme('auto');
    }

    // Exportar configuración
    exportConfig() {
        return {
            theme: this.currentTheme,
            systemPreferences: this.systemPreferences,
            timestamp: Date.now()
        };
    }

    // Importar configuración
    async importConfig(config) {
        if (config.theme && this.isThemeAvailable(config.theme)) {
            await this.setTheme(config.theme);
        }
        
        if (config.systemPreferences) {
            this.systemPreferences = { ...this.systemPreferences, ...config.systemPreferences };
        }
    }
}

// =============================================================================
// EXPORTAR INSTANCIA GLOBAL
// =============================================================================

// Crear instancia global
window.themeManager = new ThemeManager();

// Exportar para uso en módulos
export default window.themeManager;

// Exportar clase para uso directo
export { ThemeManager };