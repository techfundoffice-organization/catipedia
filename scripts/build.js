#!/usr/bin/env node

/**
 * Catipedia Build Script
 * Handles the build process for the Catipedia project
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

// Build configuration
const BUILD_CONFIG = {
  srcDir: './src',
  distDir: './dist',
  publicDir: './public',
  cssDir: './css',
  jsDir: './js',
  assetsDir: './assets',
  tempDir: './temp'
};

class BuildManager {
  constructor(options = {}) {
    this.isProduction = options.production || process.env.NODE_ENV === 'production';
    this.verbose = options.verbose || false;
    this.clean = options.clean !== false;
    
    console.log(`🏗️  Catipedia Build Manager`);
    console.log(`🌍 Environment: ${this.isProduction ? 'Production' : 'Development'}`);
  }

  // Utility function for logging
  log(message, level = 'info') {
    if (level === 'verbose' && !this.verbose) return;
    
    const icons = {
      info: '📝',
      success: '✅',
      warning: '⚠️ ',
      error: '❌',
      verbose: '🔍'
    };
    
    console.log(`${icons[level] || '📝'} ${message}`);
  }

  // Clean build directory
  async cleanBuild() {
    if (!this.clean) {
      this.log('Skipping clean step', 'verbose');
      return;
    }

    this.log('Cleaning build directory...');
    
    try {
      if (fs.existsSync(BUILD_CONFIG.distDir)) {
        fs.rmSync(BUILD_CONFIG.distDir, { recursive: true, force: true });
        this.log('Build directory cleaned', 'verbose');
      }
      
      // Create fresh dist directory
      fs.mkdirSync(BUILD_CONFIG.distDir, { recursive: true });
      this.log('Build directory cleaned successfully', 'success');
    } catch (error) {
      throw new Error(`Failed to clean build directory: ${error.message}`);
    }
  }

  // Copy static files
  async copyStaticFiles() {
    this.log('Copying static files...');
    
    const staticFiles = [
      { src: './index.html', dest: 'index.html' },
      { src: './article.html', dest: 'article.html' },
      { src: './compare.html', dest: 'compare.html' },
      { src: './favicon.svg', dest: 'favicon.svg' },
      { src: './manifest.json', dest: 'manifest.json' },
      { src: './robots.txt', dest: 'robots.txt' },
      { src: './sitemap.xml', dest: 'sitemap.xml' }
    ];

    try {
      for (const file of staticFiles) {
        if (fs.existsSync(file.src)) {
          const destPath = path.join(BUILD_CONFIG.distDir, file.dest);
          fs.copyFileSync(file.src, destPath);
          this.log(`Copied ${file.src} -> ${file.dest}`, 'verbose');
        }
      }
      
      this.log('Static files copied successfully', 'success');
    } catch (error) {
      throw new Error(`Failed to copy static files: ${error.message}`);
    }
  }

  // Process CSS files
  async processCSS() {
    this.log('Processing CSS files...');
    
    try {
      const cssSourceDir = BUILD_CONFIG.cssDir;
      const cssDestDir = path.join(BUILD_CONFIG.distDir, 'css');
      
      if (!fs.existsSync(cssSourceDir)) {
        this.log('No CSS directory found, skipping CSS processing', 'warning');
        return;
      }

      // Create CSS destination directory
      fs.mkdirSync(cssDestDir, { recursive: true });
      
      const cssFiles = fs.readdirSync(cssSourceDir).filter(file => file.endsWith('.css'));
      
      for (const cssFile of cssFiles) {
        const srcPath = path.join(cssSourceDir, cssFile);
        let cssContent = fs.readFileSync(srcPath, 'utf8');
        
        if (this.isProduction) {
          // Minify CSS in production
          cssContent = this.minifyCSS(cssContent);
          this.log(`Minified ${cssFile}`, 'verbose');
        }
        
        const destPath = path.join(cssDestDir, cssFile);
        fs.writeFileSync(destPath, cssContent);
        this.log(`Processed ${cssFile}`, 'verbose');
      }
      
      this.log('CSS processing completed', 'success');
    } catch (error) {
      throw new Error(`Failed to process CSS: ${error.message}`);
    }
  }

  // Process JavaScript files
  async processJS() {
    this.log('Processing JavaScript files...');
    
    try {
      const jsSourceDir = BUILD_CONFIG.jsDir;
      const jsDestDir = path.join(BUILD_CONFIG.distDir, 'js');
      
      if (!fs.existsSync(jsSourceDir)) {
        this.log('No JS directory found, skipping JS processing', 'warning');
        return;
      }

      // Create JS destination directory
      fs.mkdirSync(jsDestDir, { recursive: true });
      
      const jsFiles = fs.readdirSync(jsSourceDir).filter(file => file.endsWith('.js'));
      
      for (const jsFile of jsFiles) {
        const srcPath = path.join(jsSourceDir, jsFile);
        let jsContent = fs.readFileSync(srcPath, 'utf8');
        
        if (this.isProduction) {
          // Basic JS minification (remove comments and extra whitespace)
          jsContent = this.minifyJS(jsContent);
          this.log(`Minified ${jsFile}`, 'verbose');
        }
        
        const destPath = path.join(jsDestDir, jsFile);
        fs.writeFileSync(destPath, jsContent);
        this.log(`Processed ${jsFile}`, 'verbose');
      }
      
      this.log('JavaScript processing completed', 'success');
    } catch (error) {
      throw new Error(`Failed to process JavaScript: ${error.message}`);
    }
  }

  // Process source files if they exist
  async processSrcFiles() {
    this.log('Processing source files...');
    
    try {
      if (!fs.existsSync(BUILD_CONFIG.srcDir)) {
        this.log('No src directory found, skipping src processing', 'verbose');
        return;
      }

      // Copy src files to dist
      const srcDestDir = path.join(BUILD_CONFIG.distDir, 'src');
      this.copyDirectory(BUILD_CONFIG.srcDir, srcDestDir);
      
      this.log('Source files processing completed', 'success');
    } catch (error) {
      throw new Error(`Failed to process source files: ${error.message}`);
    }
  }

  // Generate file hashes for cache busting
  async generateHashes() {
    if (!this.isProduction) {
      this.log('Skipping hash generation in development', 'verbose');
      return;
    }

    this.log('Generating file hashes...');
    
    try {
      const hashMap = {};
      const hashFiles = (dir) => {
        if (!fs.existsSync(dir)) return;
        
        const files = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const file of files) {
          const fullPath = path.join(dir, file.name);
          
          if (file.isDirectory()) {
            hashFiles(fullPath);
          } else if (file.isFile() && (file.name.endsWith('.css') || file.name.endsWith('.js'))) {
            const content = fs.readFileSync(fullPath);
            const hash = crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
            const relativePath = path.relative(BUILD_CONFIG.distDir, fullPath);
            hashMap[relativePath] = hash;
            this.log(`Generated hash for ${relativePath}: ${hash}`, 'verbose');
          }
        }
      };
      
      hashFiles(BUILD_CONFIG.distDir);
      
      // Write hash map
      const hashMapPath = path.join(BUILD_CONFIG.distDir, 'hashes.json');
      fs.writeFileSync(hashMapPath, JSON.stringify(hashMap, null, 2));
      
      this.log('File hashes generated', 'success');
    } catch (error) {
      throw new Error(`Failed to generate hashes: ${error.message}`);
    }
  }

  // Basic CSS minification
  minifyCSS(css) {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/;\s*}/g, '}') // Remove unnecessary semicolons
      .replace(/\s*{\s*/g, '{') // Clean up braces
      .replace(/;\s*/g, ';') // Clean up semicolons
      .trim();
  }

  // Basic JS minification
  minifyJS(js) {
    return js
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .replace(/\/\/.*$/gm, '') // Remove single-line comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/;\s*}/g, '}') // Clean up semicolons before braces
      .trim();
  }

  // Copy directory recursively
  copyDirectory(src, dest) {
    if (!fs.existsSync(src)) return;
    
    fs.mkdirSync(dest, { recursive: true });
    
    const files = fs.readdirSync(src, { withFileTypes: true });
    
    for (const file of files) {
      const srcPath = path.join(src, file.name);
      const destPath = path.join(dest, file.name);
      
      if (file.isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  // Validate build output
  async validateBuild() {
    this.log('Validating build output...');
    
    try {
      const requiredFiles = ['index.html'];
      const missingFiles = [];
      
      for (const file of requiredFiles) {
        const filePath = path.join(BUILD_CONFIG.distDir, file);
        if (!fs.existsSync(filePath)) {
          missingFiles.push(file);
        }
      }
      
      if (missingFiles.length > 0) {
        throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
      }
      
      // Check if dist directory has content
      const distContents = fs.readdirSync(BUILD_CONFIG.distDir);
      if (distContents.length === 0) {
        throw new Error('Build directory is empty');
      }
      
      this.log('Build validation passed', 'success');
    } catch (error) {
      throw new Error(`Build validation failed: ${error.message}`);
    }
  }

  // Main build process
  async build() {
    const startTime = Date.now();
    
    try {
      this.log('\n🚀 Starting build process...');
      
      await this.cleanBuild();
      await this.copyStaticFiles();
      await this.processCSS();
      await this.processJS();
      await this.processSrcFiles();
      await this.generateHashes();
      await this.validateBuild();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      this.log(`\n🎉 Build completed successfully in ${duration}s`, 'success');
      this.log(`📁 Output directory: ${BUILD_CONFIG.distDir}`);
      this.log(`🌍 Environment: ${this.isProduction ? 'Production' : 'Development'}`);
      
    } catch (error) {
      this.log(`\n💥 Build failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  const options = {
    production: args.includes('--production') || args.includes('-p'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    clean: !args.includes('--no-clean')
  };
  
  const buildManager = new BuildManager(options);
  buildManager.build().catch(error => {
    console.error('Build failed:', error.message);
    process.exit(1);
  });
}

module.exports = { BuildManager, BUILD_CONFIG };
