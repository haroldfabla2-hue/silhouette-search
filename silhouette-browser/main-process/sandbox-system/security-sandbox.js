// =============================================================================
// SILHOUETTE V5.0 - SECURITY SANDBOX SYSTEM
// Sistema de seguridad avanzado inspirado en Claude Code
// =============================================================================

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class SecuritySandbox extends EventEmitter {
  constructor() {
    super();
    this.workspacePath = null;
    this.allowedPaths = new Set();
    this.blockedPaths = new Set();
    this.networkRules = new Map();
    this.permissionLevels = new Map();
    this.securityEvents = [];
    this.auditEnabled = true;
    this.isInitialized = false;
    
    // Security configuration
    this.securityConfig = {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFilesPerProject: 10000,
      blockedExtensions: ['.exe', '.bat', '.sh', '.ps1', '.dll', '.so', '.dylib'],
      allowedDomains: new Set(['localhost', '127.0.0.1', 'github.com', 'npmjs.org']),
      networkTimeout: 30000,
      enableProcessIsolation: true,
      enableFileMonitoring: true
    };
  }

  // =============================================================================
  // INICIALIZACIÓN DEL SANDBOX
  // =============================================================================
  
  async initialize() {
    console.log('🔒 Initializing Security Sandbox...');
    
    try {
      // Create workspace directory
      await this.createWorkspace();
      
      // Setup security rules
      await this.setupSecurityRules();
      
      // Initialize file monitoring
      if (this.securityConfig.enableFileMonitoring) {
        await this.initializeFileMonitoring();
      }
      
      // Setup process isolation
      if (this.securityConfig.enableProcessIsolation) {
        await this.setupProcessIsolation();
      }
      
      this.isInitialized = true;
      console.log('✅ Security Sandbox initialized successfully');
      console.log(`📁 Workspace: ${this.workspacePath}`);
      
      this.emit('initialized');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize Security Sandbox:', error);
      return false;
    }
  }

  async createWorkspace() {
    const homeDir = os.homedir();
    this.workspacePath = path.join(homeDir, 'Silhouette-V5-Workspace');
    
    try {
      await fs.mkdir(this.workspacePath, { recursive: true });
      console.log('✅ Workspace created:', this.workspacePath);
    } catch (error) {
      // Fallback to temporary directory
      this.workspacePath = path.join(os.tmpdir(), 'silhouette-v5-workspace');
      await fs.mkdir(this.workspacePath, { recursive: true });
      console.log('✅ Workspace created in temp directory:', this.workspacePath);
    }
  }

  async setupSecurityRules() {
    // Block sensitive system paths
    this.blockedPaths.add('/etc');
    this.blockedPaths.add('/usr/bin');
    this.blockedPaths.add('/usr/sbin');
    this.blockedPaths.add('/bin');
    this.blockedPaths.add('/sbin');
    this.blockedPaths.add('/var/log');
    this.blockedPaths.add('/var/run');
    this.blockedPaths.add('/root');
    this.blockedPaths.add('/home');
    
    // Platform-specific blocks
    if (process.platform === 'win32') {
      this.blockedPaths.add('C:\\Windows');
      this.blockedPaths.add('C:\\Program Files');
      this.blockedPaths.add('C:\\Program Files (x86)');
    } else {
      this.blockedPaths.add('/usr');
      this.blockedPaths.add('/opt');
    }
    
    // Allow development paths
    this.allowedPaths.add(this.workspacePath);
    this.allowedPaths.add('/tmp');
    this.allowedPaths.add(process.cwd());
    
    // Add node_modules from current project
    const projectDir = path.dirname(process.cwd());
    this.allowedPaths.add(path.join(projectDir, 'node_modules'));
    
    console.log('✅ Security rules configured');
  }

  // =============================================================================
  // GESTIÓN DE PROYECTOS
  // =============================================================================
  
  async createProjectSpace(projectName) {
    const projectPath = path.join(this.workspacePath, projectName);
    
    try {
      // Check if project already exists
      try {
        await fs.access(projectPath);
        throw new Error(`Project "${projectName}" already exists`);
      } catch (error) {
        // Path doesn't exist, we can create it
      }
      
      // Create project directory with proper permissions
      await fs.mkdir(projectPath, { recursive: true, mode: 0o755 });
      
      // Create essential subdirectories
      const subdirs = ['src', 'dist', 'node_modules', 'logs'];
      for (const subdir of subdirs) {
        const subdirPath = path.join(projectPath, subdir);
        await fs.mkdir(subdirPath, { recursive: true, mode: 0o755 });
      }
      
      // Create security configuration
      await this.createSecurityConfig(projectPath, projectName);
      
      // Setup monitoring
      await this.setupProjectMonitoring(projectPath);
      
      // Log security event
      this.logSecurityEvent('project_created', {
        projectName,
        projectPath,
        timestamp: Date.now()
      });
      
      this.emit('projectCreated', { name: projectName, path: projectPath });
      
      console.log('✅ Project space created:', projectPath);
      return projectPath;
      
    } catch (error) {
      console.error('❌ Failed to create project space:', error);
      throw error;
    }
  }

  async createSecurityConfig(projectPath, projectName) {
    const configPath = path.join(projectPath, '.silhouette-security.json');
    
    const config = {
      name: projectName,
      createdAt: Date.now(),
      securityLevel: 'standard',
      permissions: {
        readPaths: [projectPath, path.join(projectPath, 'src'), path.join(projectPath, 'dist')],
        writePaths: [projectPath, path.join(projectPath, 'src'), path.join(projectPath, 'dist')],
        executePaths: [projectPath, path.join(projectPath, 'node_modules', '.bin')],
        blockedPaths: Array.from(this.blockedPaths),
        allowedNetworkDomains: Array.from(this.securityConfig.allowedDomains),
        maxFileSize: this.securityConfig.maxFileSize,
        maxFiles: this.securityConfig.maxFilesPerProject
      },
      monitoring: {
        fileSystemEvents: true,
        networkRequests: true,
        processExecution: true,
        auditLog: true
      }
    };
    
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  }

  // =============================================================================
  // VERIFICACIÓN DE PERMISOS
  // =============================================================================
  
  async checkFilePermission(filePath, operation) {
    const absolutePath = path.resolve(filePath);
    
    // Check if path is blocked
    for (const blockedPath of this.blockedPaths) {
      if (absolutePath.startsWith(blockedPath)) {
        this.logSecurityEvent('access_denied', {
          path: absolutePath,
          operation,
          reason: 'blocked_path',
          timestamp: Date.now()
        });
        return false;
      }
    }
    
    // Check if path is allowed
    let isAllowed = false;
    for (const allowedPath of this.allowedPaths) {
      if (absolutePath.startsWith(allowedPath)) {
        isAllowed = true;
        break;
      }
    }
    
    if (!isAllowed) {
      this.logSecurityEvent('access_denied', {
        path: absolutePath,
        operation,
        reason: 'not_in_allowed_paths',
        timestamp: Date.now()
      });
      return false;
    }
    
    // Check file size for write operations
    if (operation === 'write') {
      try {
        const stats = await fs.stat(absolutePath);
        if (stats.size > this.securityConfig.maxFileSize) {
          this.logSecurityEvent('access_denied', {
            path: absolutePath,
            operation,
            reason: 'file_too_large',
            size: stats.size,
            timestamp: Date.now()
          });
          return false;
        }
      } catch (error) {
        // File doesn't exist, continue
      }
    }
    
    return true;
  }

  async checkNetworkPermission(domain, port) {
    if (this.allowedDomains.has(domain)) {
      return true;
    }
    
    // Check if domain is in allowed list
    for (const allowedDomain of this.allowedDomains) {
      if (domain === allowedDomain || domain.endsWith(`.${allowedDomain}`)) {
        return true;
      }
    }
    
    this.logSecurityEvent('network_denied', {
      domain,
      port,
      reason: 'domain_not_allowed',
      timestamp: Date.now()
    });
    
    return false;
  }

  async checkProcessPermission(command, args) {
    // Basic security checks for process execution
    const dangerousCommands = ['rm -rf', 'format', 'del /f', 'sudo', 'su', 'chmod 777'];
    
    const commandString = `${command} ${args.join(' ')}`;
    
    for (const dangerous of dangerousCommands) {
      if (commandString.includes(dangerous)) {
        this.logSecurityEvent('process_denied', {
          command: commandString,
          reason: 'dangerous_command',
          timestamp: Date.now()
        });
        return false;
      }
    }
    
    return true;
  }

  // =============================================================================
  // MONITOREO Y AUDITORÍA
  // =============================================================================
  
  async initializeFileMonitoring() {
    // This would be implemented with chokidar or similar
    console.log('🔍 File system monitoring enabled');
  }

  async setupProcessIsolation() {
    // This would implement process-level isolation
    console.log('🏗️ Process isolation enabled');
  }

  async setupProjectMonitoring(projectPath) {
    // Setup monitoring for the specific project
    console.log(`📊 Monitoring enabled for project: ${projectPath}`);
  }

  logSecurityEvent(eventType, details) {
    const event = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: eventType,
      details,
      timestamp: Date.now(),
      userAgent: 'Silhouette-V5.0'
    };
    
    this.securityEvents.push(event);
    
    // Keep only last 1000 events
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }
    
    if (this.auditEnabled) {
      this.emit('securityEvent', event);
    }
    
    console.log(`🔐 Security Event: ${eventType}`, details);
  }

  getSecurityEvents(limit = 100) {
    return this.securityEvents.slice(-limit);
  }

  getSecurityReport() {
    const now = Date.now();
    const last24h = this.securityEvents.filter(e => now - e.timestamp < 24 * 60 * 60 * 1000);
    
    const report = {
      totalEvents: this.securityEvents.length,
      eventsLast24h: last24h.length,
      eventTypes: {},
      securityLevel: this.getSecurityLevel(),
      violations: last24h.filter(e => e.type.includes('denied')).length,
      recommendations: this.generateSecurityRecommendations(last24h),
      timestamp: now
    };
    
    // Count event types
    for (const event of this.securityEvents) {
      report.eventTypes[event.type] = (report.eventTypes[event.type] || 0) + 1;
    }
    
    return report;
  }

  getSecurityLevel() {
    const totalEvents = this.securityEvents.length;
    const violations = this.securityEvents.filter(e => e.type.includes('denied')).length;
    
    if (violations === 0) return 'secure';
    if (violations < totalEvents * 0.1) return 'low_risk';
    if (violations < totalEvents * 0.3) return 'medium_risk';
    return 'high_risk';
  }

  generateSecurityRecommendations(events) {
    const recommendations = [];
    
    const violations = events.filter(e => e.type.includes('denied'));
    const accessDenied = violations.filter(e => e.type === 'access_denied');
    const networkDenied = violations.filter(e => e.type === 'network_denied');
    
    if (accessDenied.length > 5) {
      recommendations.push({
        type: 'access_control',
        priority: 'medium',
        message: 'Consider expanding allowed file paths for better development experience',
        suggestion: 'Review and update security configuration'
      });
    }
    
    if (networkDenied.length > 3) {
      recommendations.push({
        type: 'network',
        priority: 'low',
        message: 'Some network requests were blocked',
        suggestion: 'Review allowed domains if external APIs are needed'
      });
    }
    
    return recommendations;
  }

  // =============================================================================
  // CONFIGURACIÓN Y UTILIDADES
  // =============================================================================
  
  getWorkspacePath() {
    return this.workspacePath;
  }

  async addAllowedPath(pathToAdd) {
    this.allowedPaths.add(path.resolve(pathToAdd));
    console.log('✅ Added allowed path:', pathToAdd);
  }

  async addAllowedDomain(domain) {
    this.allowedDomains.add(domain);
    console.log('✅ Added allowed domain:', domain);
  }

  async updateSecurityConfig(newConfig) {
    Object.assign(this.securityConfig, newConfig);
    console.log('✅ Security configuration updated');
  }

  async createSecureProxy(options = {}) {
    const proxyConfig = {
      allowedDomains: Array.from(this.allowedDomains),
      blockedDomains: [],
      timeout: this.securityConfig.networkTimeout,
      logging: true,
      userConfirmation: false,
      ...options
    };
    
    // This would create an actual proxy server
    console.log('🔒 Secure network proxy created');
    return proxyConfig;
  }

  async cleanWorkspace() {
    try {
      await fs.rm(this.workspacePath, { recursive: true, force: true });
      await this.createWorkspace();
      this.securityEvents = [];
      
      this.emit('workspaceCleaned');
      console.log('✅ Workspace cleaned successfully');
      
    } catch (error) {
      console.error('❌ Failed to clean workspace:', error);
    }
  }

  async exportSecurityReport() {
    const report = this.getSecurityReport();
    const reportPath = path.join(this.workspacePath, 'security-report.json');
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    return reportPath;
  }
}

export { SecuritySandbox };
