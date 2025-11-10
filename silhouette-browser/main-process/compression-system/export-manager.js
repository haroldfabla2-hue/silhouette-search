// =============================================================================
// SILHOUETTE V5.0 - COMPRESSION & EXPORT SYSTEM
// Sistema completo de compresión y exportación de proyectos
// =============================================================================

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as archiver from 'archiver';
import * as tar from 'tar';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);

class CompressionSystem extends EventEmitter {
  constructor() {
    super();
    this.compressionJobs = new Map(); // jobId -> job info
    this.exportTemplates = new Map(); // templateId -> template
    this.downloadQueue = new Map(); // downloadId -> download info
    this.isInitialized = false;
    
    // Configuration
    this.config = {
      maxFileSize: 100 * 1024 * 1024, // 100MB
      compressionLevel: 6, // Default compression level
      maxConcurrentJobs: 3,
      tempDir: path.join(os.tmpdir(), 'silhouette-exports'),
      supportedFormats: ['zip', 'tar', 'tar.gz', '7z'],
      maxJobAge: 60 * 60 * 1000, // 1 hour
      cleanupInterval: 10 * 60 * 1000, // 10 minutes
    };
    
    // Export templates
    this.setupExportTemplates();
  }

  // =============================================================================
  // INICIALIZACIÓN
  // =============================================================================
  
  async initialize() {
    console.log('📦 Initializing Compression & Export System...');
    
    try {
      // Create temp directory
      await this.createTempDirectory();
      
      // Setup cleanup timer
      this.setupCleanupTimer();
      
      // Initialize export templates
      this.initializeTemplates();
      
      this.isInitialized = true;
      console.log('✅ Compression & Export System initialized');
      console.log(`📁 Temp directory: ${this.config.tempDir}`);
      console.log(`🎯 Supported formats: ${this.config.supportedFormats.join(', ')}`);
      
      this.emit('initialized');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize Compression System:', error);
      return false;
    }
  }

  async createTempDirectory() {
    try {
      await fs.mkdir(this.config.tempDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  setupCleanupTimer() {
    setInterval(() => {
      this.cleanupOldJobs();
    }, this.config.cleanupInterval);
  }

  setupExportTemplates() {
    this.exportTemplates.set('complete', {
      name: 'Complete Project',
      description: 'Full project with all files and dependencies',
      includeNodeModules: true,
      includeGit: true,
      includeDist: true,
      includeSource: true,
      includeDocumentation: true,
      includeTests: true,
      includeConfiguration: true
    });

    this.exportTemplates.set('source-only', {
      name: 'Source Code Only',
      description: 'Only source files, no dependencies or build artifacts',
      includeNodeModules: false,
      includeGit: true,
      includeDist: false,
      includeSource: true,
      includeDocumentation: true,
      includeTests: true,
      includeConfiguration: true
    });

    this.exportTemplates.set('production', {
      name: 'Production Ready',
      description: 'Optimized for production deployment',
      includeNodeModules: false,
      includeGit: false,
      includeDist: true,
      includeSource: false,
      includeDocumentation: true,
      includeTests: false,
      includeConfiguration: true
    });

    this.exportTemplates.set('documentation', {
      name: 'Documentation Package',
      description: 'Documentation and README files only',
      includeNodeModules: false,
      includeGit: true,
      includeDist: false,
      includeSource: false,
      includeDocumentation: true,
      includeTests: false,
      includeConfiguration: true
    });
  }

  initializeTemplates() {
    // Setup any additional template configurations
    console.log(`✅ Export templates initialized (${this.exportTemplates.size} templates)`);
  }

  // =============================================================================
  // EXPORTACIÓN DE PROYECTOS
  // =============================================================================
  
  async exportProject(project, options = {}) {
    const jobId = this.generateJobId();
    
    console.log(`📦 Starting export job: ${jobId} for project: ${project.name}`);
    
    try {
      // Validate project
      await this.validateProjectForExport(project);
      
      // Setup export job
      const job = {
        id: jobId,
        projectId: project.id,
        projectName: project.name,
        format: options.format || 'zip',
        template: options.template || 'complete',
        options: options,
        status: 'preparing',
        progress: 0,
        createdAt: Date.now(),
        startedAt: null,
        completedAt: null,
        filePath: null,
        fileSize: 0,
        errors: []
      };
      
      this.compressionJobs.set(jobId, job);
      
      // Start export process
      const result = await this.startExportJob(job, project);
      
      this.emit('exportCompleted', { job, result });
      
      console.log(`✅ Export completed: ${jobId} (${result.fileSize} bytes)`);
      return result;
      
    } catch (error) {
      console.error(`❌ Export failed: ${jobId}`, error);
      
      const job = this.compressionJobs.get(jobId);
      if (job) {
        job.status = 'error';
        job.error = error.message;
        job.completedAt = Date.now();
        this.compressionJobs.set(jobId, job);
      }
      
      this.emit('exportError', { jobId, error });
      throw error;
    }
  }

  async validateProjectForExport(project) {
    // Check if project exists
    if (!project || !project.path) {
      throw new Error('Invalid project: missing path');
    }
    
    // Check if project directory is accessible
    try {
      await fs.access(project.path);
    } catch (error) {
      throw new Error(`Project directory not accessible: ${project.path}`);
    }
    
    // Get project files
    const files = await this.getProjectFiles(project);
    if (files.length === 0) {
      throw new Error('Project has no files to export');
    }
    
    // Check file size limits
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > this.config.maxFileSize * 10) { // Allow 10x max size for compression
      throw new Error(`Project too large: ${totalSize} bytes (max: ${this.config.maxFileSize * 10} bytes)`);
    }
  }

  async startExportJob(job, project) {
    job.status = 'preparing';
    job.startedAt = Date.now();
    job.progress = 10;
    
    try {
      // Get export template
      const template = this.exportTemplates.get(job.template);
      if (!template) {
        throw new Error(`Invalid export template: ${job.template}`);
      }
      
      // Get files to include
      const files = await this.getFilesToExport(project, template);
      job.progress = 30;
      
      // Create output path
      const outputPath = this.getExportPath(job);
      
      // Start compression based on format
      let result;
      switch (job.format) {
        case 'zip':
          result = await this.createZipArchive(files, outputPath, job);
          break;
        case 'tar':
          result = await this.createTarArchive(files, outputPath, job);
          break;
        case 'tar.gz':
          result = await this.createTarGzArchive(files, outputPath, job);
          break;
        case '7z':
          result = await this.createSevenZipArchive(files, outputPath, job);
          break;
        default:
          throw new Error(`Unsupported format: ${job.format}`);
      }
      
      job.progress = 90;
      
      // Add metadata
      await this.addExportMetadata(outputPath, project, job, template);
      
      job.progress = 100;
      job.status = 'completed';
      job.completedAt = Date.now();
      job.filePath = outputPath;
      job.fileSize = result.size;
      
      this.compressionJobs.set(job.id, job);
      
      return {
        jobId: job.id,
        filePath: outputPath,
        fileSize: result.size,
        format: job.format,
        template: job.template,
        downloadUrl: this.getDownloadUrl(outputPath),
        expiresAt: Date.now() + this.config.maxJobAge
      };
      
    } catch (error) {
      job.status = 'error';
      job.error = error.message;
      job.completedAt = Date.now();
      this.compressionJobs.set(job.id, job);
      throw error;
    }
  }

  // =============================================================================
  // FORMATOS DE COMPRESIÓN
  // =============================================================================
  
  async createZipArchive(files, outputPath, job) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', {
        zlib: { level: this.config.compressionLevel }
      });
      
      output.on('close', () => {
        console.log(`✅ ZIP archive created: ${archive.pointer()} total bytes`);
        resolve({ size: archive.pointer() });
      });
      
      archive.on('error', (error) => {
        reject(error);
      });
      
      archive.on('progress', (data) => {
        job.progress = 30 + (data.fs.processedBytes / data.fs.totalBytes) * 50;
        this.compressionJobs.set(job.id, job);
        this.emit('exportProgress', { jobId: job.id, progress: job.progress });
      });
      
      archive.pipe(output);
      
      // Add files
      files.forEach((file, index) => {
        archive.file(file.path, { name: file.arcPath });
      });
      
      // Add README for exported project
      archive.append(this.generateExportReadme(job), { name: 'EXPORT_INFO.md' });
      
      archive.finalize();
    });
  }

  async createTarArchive(files, outputPath, job) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('tar', {
        gzip: false
      });
      
      output.on('close', () => {
        console.log(`✅ TAR archive created: ${archive.pointer()} total bytes`);
        resolve({ size: archive.pointer() });
      });
      
      archive.on('error', (error) => {
        reject(error);
      });
      
      archive.on('progress', (data) => {
        job.progress = 30 + (data.fs.processedBytes / data.fs.totalBytes) * 50;
        this.compressionJobs.set(job.id, job);
        this.emit('exportProgress', { jobId: job.id, progress: job.progress });
      });
      
      archive.pipe(output);
      
      // Add files
      files.forEach((file) => {
        archive.file(file.path, { name: file.arcPath });
      });
      
      // Add README
      archive.append(this.generateExportReadme(job), { name: 'EXPORT_INFO.md' });
      
      archive.finalize();
    });
  }

  async createTarGzArchive(files, outputPath, job) {
    return new Promise((resolve, reject) => {
      // Create tar first
      const tarPath = outputPath.replace('.tar.gz', '.tar');
      
      const tarArchive = archiver('tar', {
        gzip: false
      });
      
      const output = fs.createWriteStream(outputPath);
      const gzipStream = zlib.createGzip({ level: this.config.compressionLevel });
      
      let totalBytes = 0;
      tarArchive.on('data', (chunk) => {
        totalBytes += chunk.length;
        job.progress = 30 + (totalBytes / 1048576) * 50; // Rough estimate
        this.compressionJobs.set(job.id, job);
        this.emit('exportProgress', { jobId: job.id, progress: job.progress });
      });
      
      // Add files to tar
      files.forEach((file) => {
        tarArchive.file(file.path, { name: file.arcPath });
      });
      
      // Add README
      tarArchive.append(this.generateExportReadme(job), { name: 'EXPORT_INFO.md' });
      
      // Pipe through gzip
      tarArchive.pipe(gzipStream).pipe(output);
      
      output.on('close', () => {
        console.log(`✅ TAR.GZ archive created: ${output.bytesWritten} total bytes`);
        resolve({ size: output.bytesWritten });
      });
      
      tarArchive.on('error', reject);
      gzipStream.on('error', reject);
      
      tarArchive.finalize();
    });
  }

  async createSevenZipArchive(files, outputPath, job) {
    // This would require a 7z binary to be available
    // For now, create a tar.gz as fallback
    console.warn('⚠️ 7z format not fully implemented, falling back to tar.gz');
    return this.createTarGzArchive(files, outputPath.replace('.7z', '.tar.gz'), job);
  }

  // =============================================================================
  // GESTIÓN DE ARCHIVOS
  // =============================================================================
  
  async getProjectFiles(project) {
    const template = this.exportTemplates.get('complete');
    return this.getFilesToExport(project, template);
  }

  async getFilesToExport(project, template) {
    const files = [];
    
    // Get all files in project directory
    const allFiles = await this.getAllFilesRecursive(project.path);
    
    for (const file of allFiles) {
      const relativePath = path.relative(project.path, file.path);
      const fileInfo = {
        path: file.path,
        arcPath: path.join(project.name, relativePath),
        size: file.size,
        type: file.type
      };
      
      // Apply template filters
      if (this.shouldIncludeFile(file, relativePath, template)) {
        files.push(fileInfo);
      }
    }
    
    return files;
  }

  async getAllFilesRecursive(dirPath) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          if (!this.isExcludedDirectory(entry.name)) {
            const subFiles = await this.getAllFilesRecursive(fullPath);
            files.push(...subFiles);
          }
        } else {
          files.push({
            path: fullPath,
            size: stat.size,
            type: 'file'
          });
        }
      }
      
    } catch (error) {
      console.warn(`⚠️ Could not read directory: ${dirPath}`, error.message);
    }
    
    return files;
  }

  shouldIncludeFile(file, relativePath, template) {
    const ext = path.extname(relativePath).toLowerCase();
    const basename = path.basename(relativePath);
    
    // Always include certain files
    const alwaysInclude = ['package.json', 'README.md', 'LICENSE', 'tsconfig.json', 'webpack.config.js'];
    if (alwaysInclude.includes(basename)) {
      return true;
    }
    
    // Exclude based on template
    if (!template.includeNodeModules && relativePath.includes('node_modules')) {
      return false;
    }
    
    if (!template.includeDist && (relativePath.includes('dist') || relativePath.includes('build'))) {
      return false;
    }
    
    if (!template.includeSource && this.isSourceFile(ext)) {
      return false;
    }
    
    if (!template.includeTests && (relativePath.includes('test') || relativePath.includes('spec') || basename.includes('test.'))) {
      return false;
    }
    
    if (!template.includeGit && (relativePath.includes('.git') || basename === '.gitignore')) {
      return false;
    }
    
    // Include based on file type
    if (template.includeSource && this.isSourceFile(ext)) {
      return true;
    }
    
    if (template.includeConfiguration && this.isConfigurationFile(ext, basename)) {
      return true;
    }
    
    if (template.includeDocumentation && this.isDocumentationFile(ext)) {
      return true;
    }
    
    return true; // Default include
  }

  isSourceFile(ext) {
    const sourceExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.cs', '.go', '.rs', '.php', '.rb', '.swift', '.kt'];
    return sourceExtensions.includes(ext);
  }

  isConfigurationFile(ext, basename) {
    const configExtensions = ['.json', '.yaml', '.yml', '.xml', '.ini', '.conf', '.config'];
    const configFiles = ['package.json', 'tsconfig.json', 'webpack.config.js', 'babel.config.js', 'eslintrc.json', 'prettier.config.js'];
    
    return configExtensions.includes(ext) || configFiles.includes(basename);
  }

  isDocumentationFile(ext) {
    const docExtensions = ['.md', '.txt', '.rst', '.adoc'];
    return docExtensions.includes(ext);
  }

  isExcludedDirectory(dirName) {
    const excluded = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.nyc_output',
      '.cache',
      '.parcel-cache',
      '.nuxt',
      '.next',
      '.svelte-kit',
      'vendor'
    ];
    
    return excluded.includes(dirName) || dirName.startsWith('.');
  }

  // =============================================================================
  // METADATOS Y UTILIDADES
  // =============================================================================
  
  async addExportMetadata(outputPath, project, job, template) {
    const metadata = {
      project: {
        id: project.id,
        name: project.name,
        type: project.type,
        createdAt: project.createdAt,
        modifiedAt: project.modifiedAt
      },
      export: {
        jobId: job.id,
        format: job.format,
        template: job.template,
        exportedAt: new Date().toISOString(),
        version: '5.0.0',
        platform: process.platform,
        arch: process.arch
      },
      template: {
        name: template.name,
        description: template.description,
        options: template
      },
      system: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        hostname: os.hostname(),
        user: os.userInfo().username
      }
    };
    
    // Add metadata to archive
    const metadataPath = this.getExportPath(job, 'metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  generateExportReadme(job) {
    return `# Project Export - ${job.projectName}

**Silhouette V5.0 Export Information**

- **Export Date**: ${new Date().toISOString()}
- **Format**: ${job.format.toUpperCase()}
- **Template**: ${job.template}
- **Platform**: ${process.platform} (${process.arch})
- **Silhouette Version**: 5.0.0

## Project Information

- **Name**: ${job.projectName}
- **ID**: ${job.projectId}

## Files Included

This export includes:
${this.getTemplateDescription(job.template)}

## How to Use

1. Extract the archive to your desired location
2. Install dependencies (if applicable):
   \`\`\`bash
   npm install
   # or
   yarn install
   \`\`\`
3. Run the project:
   \`\`\`bash
   npm start
   # or
   npm run dev
   \`\`\`

## Support

Generated by **Silhouette V5.0** - The Ultimate Development Platform

Visit our documentation for more information about this export.
`;
  }

  getTemplateDescription(templateId) {
    const descriptions = {
      'complete': '- Source code\n- Dependencies (node_modules)\n- Build artifacts\n- Git history\n- Documentation\n- Tests\n- Configuration files',
      'source-only': '- Source code only\n- Git history\n- Documentation\n- Tests\n- Configuration files',
      'production': '- Build artifacts only\n- Documentation\n- Configuration files',
      'documentation': '- Documentation files\n- README files\n- Git history\n- Configuration files'
    };
    
    return descriptions[templateId] || '- All project files';
  }

  getExportPath(job, suffix = '') {
    const timestamp = new Date().toISOString().split('T')[0];
    const projectName = job.projectName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const extension = job.format === '7z' ? '.tar.gz' : `.${job.format}`;
    const fileName = `${projectName}-${job.template}-${timestamp}${suffix}${extension}`;
    
    return path.join(this.config.tempDir, fileName);
  }

  getDownloadUrl(filePath) {
    // This would return a web-accessible URL for downloading
    return `file://${filePath}`;
  }

  // =============================================================================
  // GESTIÓN DE TRABAJOS
  // =============================================================================
  
  getExportJob(jobId) {
    return this.compressionJobs.get(jobId);
  }

  getAllExportJobs() {
    return Array.from(this.compressionJobs.values());
  }

  getActiveExportJobs() {
    return Array.from(this.compressionJobs.values()).filter(job => 
      job.status === 'preparing' || job.status === 'compressing'
    );
  }

  async cancelExportJob(jobId) {
    const job = this.compressionJobs.get(jobId);
    if (!job) {
      return false;
    }
    
    if (job.status === 'completed' || job.status === 'error') {
      return false;
    }
    
    job.status = 'cancelled';
    job.completedAt = Date.now();
    
    // Clean up partial file
    if (job.filePath) {
      try {
        await fs.unlink(job.filePath);
      } catch (error) {
        console.warn(`⚠️ Could not clean up partial file: ${job.filePath}`);
      }
    }
    
    this.compressionJobs.set(jobId, job);
    
    this.emit('exportCancelled', { job });
    
    console.log(`🛑 Export cancelled: ${jobId}`);
    return true;
  }

  // =============================================================================
  // CLEANUP
  // =============================================================================
  
  cleanupOldJobs() {
    const now = Date.now();
    const expiredJobs = [];
    
    for (const [jobId, job] of this.compressionJobs) {
      if (now - job.createdAt > this.config.maxJobAge) {
        expiredJobs.push(jobId);
      }
    }
    
    for (const jobId of expiredJobs) {
      this.cleanupJob(jobId);
    }
    
    if (expiredJobs.length > 0) {
      console.log(`🧹 Cleaned up ${expiredJobs.length} expired export jobs`);
    }
  }

  async cleanupJob(jobId) {
    const job = this.compressionJobs.get(jobId);
    if (!job) return;
    
    // Remove file if it exists
    if (job.filePath) {
      try {
        await fs.unlink(job.filePath);
      } catch (error) {
        console.warn(`⚠️ Could not delete export file: ${job.filePath}`);
      }
    }
    
    this.compressionJobs.delete(jobId);
  }

  generateJobId() {
    return `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // =============================================================================
  // CLEANUP FINAL
  // =============================================================================
  
  async dispose() {
    // Cancel all active jobs
    for (const job of this.compressionJobs.values()) {
      if (job.status === 'preparing' || job.status === 'compressing') {
        await this.cancelExportJob(job.id);
      }
    }
    
    // Clean up temp directory
    try {
      await fs.rm(this.config.tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`⚠️ Could not clean up temp directory: ${this.config.tempDir}`);
    }
    
    this.compressionJobs.clear();
    this.exportTemplates.clear();
    this.downloadQueue.clear();
    
    console.log('🗑️ Compression & Export System disposed');
  }
}

export { CompressionSystem };
