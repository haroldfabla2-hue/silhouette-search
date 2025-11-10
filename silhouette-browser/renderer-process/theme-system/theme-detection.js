// =============================================================================
// SILHOUETTE V5.2 - DETECTOR DE TEMAS DEL SISTEMA
// Detección automática de preferencias del sistema operativo
// =============================================================================

class ThemeDetector {
    constructor() {
        this.systemTheme = 'light';
        this.prefersDark = false;
        this.prefersReducedMotion = false;
        this.prefersHighContrast = false;
        this.colorScheme = [];
        
        this.listeners = new Set();
        this.observers = [];
        
        this.init();
    }

    init() {
        this.detectInitialPreferences();
        this.setupMediaQueryListeners();
        this.setupSystemListeners();
        this.monitorSystemChanges();
    }

    // =============================================================================
    // DETECCIÓN INICIAL
    // =============================================================================

    detectInitialPreferences() {
        // Detectar tema preferido del sistema
        this.prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.systemTheme = this.prefersDark ? 'dark' : 'light';

        // Detectar preferencias de accesibilidad
        this.prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.prefersHighContrast = window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches;

        // Detectar esquema de colores soportados
        this.detectColorScheme();

        console.log('🎨 System preferences detected:', {
            theme: this.systemTheme,
            prefersDark: this.prefersDark,
            reducedMotion: this.prefersReducedMotion,
            highContrast: this.prefersHighContrast,
            colorScheme: this.colorScheme
        });

        this.notifyListeners('systemPreferencesDetected', {
            theme: this.systemTheme,
            prefersDark: this.prefersDark,
            reducedMotion: this.prefersReducedMotion,
            highContrast: this.prefersHighContrast,
            colorScheme: this.colorScheme
        });
    }

    detectColorScheme() {
        // Detectar si el navegador soporta color-scheme
        if (CSS && CSS.supports && CSS.supports('color-scheme', 'light dark')) {
            this.colorScheme = ['light', 'dark'];
        } else {
            this.colorScheme = ['light'];
        }

        // Verificar soporte para otros esquemas
        const supportedSchemes = ['light', 'dark', 'light dark', 'only light', 'only dark'];
        this.colorScheme = supportedSchemes.filter(scheme => 
            CSS.supports('color-scheme', scheme)
        );
    }

    // =============================================================================
    // LISTENERS DE MEDIA QUERIES
    // =============================================================================

    setupMediaQueryListeners() {
        // Listener para cambios en el esquema de colores
        const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        colorSchemeQuery.addEventListener('change', (e) => {
            const oldTheme = this.systemTheme;
            this.prefersDark = e.matches;
            this.systemTheme = e.matches ? 'dark' : 'light';

            console.log(`🖥️ System theme changed: ${oldTheme} → ${this.systemTheme}`);

            this.notifyListeners('systemThemeChanged', {
                from: oldTheme,
                to: this.systemTheme,
                timestamp: Date.now()
            });

            // Notificar al theme manager si existe
            if (window.themeManager && window.themeManager.currentTheme === 'auto') {
                window.themeManager.applyTheme(this.systemTheme);
            }
        });

        // Listener para cambios en la preferencia de movimiento
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        motionQuery.addEventListener('change', (e) => {
            const oldValue = this.prefersReducedMotion;
            this.prefersReducedMotion = e.matches;

            console.log(`🎬 Motion preference: ${oldValue ? 'reduced' : 'normal'} → ${e.matches ? 'reduced' : 'normal'}`);

            this.notifyListeners('motionPreferenceChanged', {
                from: oldValue,
                to: e.matches,
                timestamp: Date.now()
            });

            this.applyMotionPreference(e.matches);
        });

        // Listener para cambios en el contraste
        const contrastQuery = window.matchMedia('(prefers-contrast: high)');
        contrastQuery.addEventListener('change', (e) => {
            const oldValue = this.prefersHighContrast;
            this.prefersHighContrast = e.matches;

            console.log(`🔍 Contrast preference: ${oldValue ? 'high' : 'normal'} → ${e.matches ? 'high' : 'normal'}`);

            this.notifyListeners('contrastPreferenceChanged', {
                from: oldValue,
                to: e.matches,
                timestamp: Date.now()
            });

            this.applyContrastPreference(e.matches);
        });

        // Guardar referencias para cleanup
        this.observers.push(colorSchemeQuery, motionQuery, contrastQuery);
    }

    // =============================================================================
    // LISTENERS DEL SISTEMA OPERATIVO
    // =============================================================================

    setupSystemListeners() {
        // Detectar cambios en el tema del sistema operativo
        if (window.matchMedia) {
            // Windows
            if (navigator.userAgent.includes('Windows')) {
                this.setupWindowsThemeListener();
            }
            
            // macOS
            if (navigator.userAgent.includes('Mac')) {
                this.setupMacOSThemeListener();
            }
            
            // Linux
            if (navigator.userAgent.includes('Linux')) {
                this.setupLinuxThemeListener();
            }
        }
    }

    setupWindowsThemeListener() {
        // Windows 10/11 puede cambiar tema dinámicamente
        // En Electron, podemos usar IPC para detectar cambios
        if (window.electronAPI) {
            // Escuchar cambios a través de Electron
            window.electronAPI.onThemeChanged((theme) => {
                console.log('🪟 Windows theme changed via Electron:', theme);
                this.handleSystemThemeChange(theme);
            });
        }
    }

    setupMacOSThemeListener() {
        // macOS tiene mejor soporte para cambios dinámicos
        // En Electron, usar systemPreferences API
        if (window.electronAPI) {
            window.electronAPI.onThemeChanged((theme) => {
                console.log('🍎 macOS theme changed via Electron:', theme);
                this.handleSystemThemeChange(theme);
            });
        }
    }

    setupLinuxThemeListener() {
        // Linux varía según el entorno de escritorio
        // GNOME, KDE, XFCE tienen diferentes APIs
        // En Electron, detección limitada
        if (window.electronAPI) {
            window.electronAPI.onThemeChanged((theme) => {
                console.log('🐧 Linux theme changed via Electron:', theme);
                this.handleSystemThemeChange(theme);
            });
        }
    }

    handleSystemThemeChange(theme) {
        const oldTheme = this.systemTheme;
        this.systemTheme = theme;
        this.prefersDark = theme === 'dark';

        this.notifyListeners('systemThemeChanged', {
            from: oldTheme,
            to: theme,
            platform: this.getPlatform(),
            timestamp: Date.now()
        });
    }

    // =============================================================================
    // MONITOREO DE CAMBIOS
    // =============================================================================

    monitorSystemChanges() {
        // Verificar cambios cada 30 segundos por si las media queries no funcionan
        setInterval(() => {
            this.checkForSystemChanges();
        }, 30000);
    }

    checkForSystemChanges() {
        // Verificar si el sistema ha cambiado de tema
        const currentSystemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        
        if (currentSystemTheme !== this.systemTheme) {
            console.log('🔄 System theme change detected via polling');
            this.handleSystemThemeChange(currentSystemTheme);
        }
    }

    // =============================================================================
    // APLICAR PREFERENCIAS
    // =============================================================================

    applyMotionPreference(reduceMotion) {
        if (reduceMotion) {
            document.documentElement.classList.add('reduce-motion');
            // Deshabilitar animaciones
            const style = document.createElement('style');
            style.id = 'reduced-motion-styles';
            style.textContent = `
                *, *::before, *::after {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                }
            `;
            document.head.appendChild(style);
        } else {
            document.documentElement.classList.remove('reduce-motion');
            const style = document.getElementById('reduced-motion-styles');
            if (style) style.remove();
        }
    }

    applyContrastPreference(highContrast) {
        if (highContrast) {
            document.documentElement.classList.add('high-contrast');
        } else {
            document.documentElement.classList.remove('high-contrast');
        }
    }

    // =============================================================================
    // NOTIFICACIONES
    // =============================================================================

    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners(event, data) {
        this.listeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('❌ Theme detector listener error:', error);
            }
        });
    }

    // =============================================================================
    // UTILIDADES
    // =============================================================================

    getPlatform() {
        const ua = navigator.userAgent;
        if (ua.includes('Windows')) return 'windows';
        if (ua.includes('Mac')) return 'macos';
        if (ua.includes('Linux')) return 'linux';
        if (ua.includes('Android')) return 'android';
        if (ua.includes('iPhone') || ua.includes('iPad')) return 'ios';
        return 'unknown';
    }

    getCurrentPreferences() {
        return {
            systemTheme: this.systemTheme,
            prefersDark: this.prefersDark,
            reducedMotion: this.prefersReducedMotion,
            highContrast: this.prefersHighContrast,
            colorScheme: this.colorScheme,
            platform: this.getPlatform(),
            timestamp: Date.now()
        };
    }

    shouldFollowSystemTheme() {
        // Determinar si deberíamos seguir el tema del sistema
        // Basado en preferencias del usuario y capacidades del sistema
        
        // Si el usuario está en modo auto
        const userTheme = localStorage.getItem('silhouette-theme');
        if (userTheme === 'auto') return true;
        
        // Si no hay preferencia del usuario
        if (!userTheme) return true;
        
        // Si el sistema no soporta cambios dinámicos
        return this.colorScheme.length > 1;
    }

    // =============================================================================
    // CLEANUP
    // =============================================================================

    destroy() {
        // Limpiar observers
        this.observers.forEach(observer => {
            if (observer.removeEventListener) {
                observer.removeEventListener('change', this.handleChange);
            }
        });
        
        // Limpiar listeners
        this.listeners.clear();
        
        // Remover estilos dinámicos
        const reducedMotionStyle = document.getElementById('reduced-motion-styles');
        if (reducedMotionStyle) {
            reducedMotionStyle.remove();
        }
    }
}

// =============================================================================
// AUTO-INITIALIZATION
// =============================================================================

// Crear instancia global
window.themeDetector = new ThemeDetector();

// Exportar para uso en módulos
export default window.themeDetector;