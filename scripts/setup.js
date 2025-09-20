#!/usr/bin/env node

/**
 * Catipedia Setup Script
 * Handles project setup, environment checks, and development initialization
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

class SetupManager {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.skipInstall = options.skipInstall || false;
    this.dev = options.dev || false;
    
    console.log('🐱 Catipedia Setup Manager');
    console.log('============================\n');
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

  // Check system requirements
  async checkSystemRequirements() {
    this.log('Checking system requirements...');
    
    try {
      // Check Node.js version
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      
      if (majorVersion < 16) {
        throw new Error(`Node.js ${majorVersion} is not supported. Please upgrade to Node.js 16 or higher.`);
      }
      
      this.log(`Node.js version: ${nodeVersion}`, 'verbose');
      this.log(`Platform: ${os.platform()} ${os.arch()}`, 'verbose');
      
      // Check npm availability
      try {
        const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
        this.log(`npm version: ${npmVersion}`, 'verbose');
      } catch (error) {
        throw new Error('npm is not available. Please install npm.');
      }
      
      // Check git availability
      try {
        const gitVersion = execSync('git --version', { encoding: 'utf8' }).trim();
        this.log(`${gitVersion}`, 'verbose');
      } catch (error) {
        this.log('Git is not available - some features may not work', 'warning');
      }
      
      this.log('System requirements check passed', 'success');
    } catch (error) {
      throw new Error(`System requirements check failed: ${error.message}`);
    }
  }

  // Create necessary directories
  async createDirectories() {
    this.log('Creating necessary directories...');
    
    const directories = [
      './dist',
      './temp',
      './logs',
      './assets/images',
      './assets/icons'
    ];
    
    try {
      for (const dir of directories) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          this.log(`Created directory: ${dir}`, 'verbose');
        } else {
          this.log(`Directory already exists: ${dir}`, 'verbose');
        }
      }
      
      this.log('Directory structure created', 'success');
    } catch (error) {
      throw new Error(`Failed to create directories: ${error.message}`);
    }
  }

  // Install dependencies
  async installDependencies() {
    if (this.skipInstall) {
      this.log('Skipping dependency installation', 'verbose');
      return;
    }

    this.log('Installing dependencies...');
    
    try {
      // Check if package.json exists
      if (!fs.existsSync('./package.json')) {
        throw new Error('package.json not found');
      }
      
      // Install production dependencies
      this.log('Installing production dependencies...', 'verbose');
      execSync('npm ci --only=production', { stdio: this.verbose ? 'inherit' : 'pipe' });
      
      // Install dev dependencies if in development mode
      if (this.dev) {
        this.log('Installing development dependencies...', 'verbose');
        execSync('npm ci', { stdio: this.verbose ? 'inherit' : 'pipe' });
      }
      
      this.log('Dependencies installed successfully', 'success');
    } catch (error) {
      throw new Error(`Failed to install dependencies: ${error.message}`);
    }
  }

  // Initialize git hooks (if git is available)
  async initializeGitHooks() {
    try {
      // Check if we're in a git repository
      execSync('git rev-parse --git-dir', { stdio: 'pipe' });
      
      this.log('Initializing git hooks...');
      
      const hooksDir = '.git/hooks';
      if (!fs.existsSync(hooksDir)) {
        fs.mkdirSync(hooksDir, { recursive: true });
      }
      
      // Create a simple pre-commit hook
      const preCommitHook = `#!/bin/sh
# Catipedia pre-commit hook
echo "Running pre-commit checks..."

# Check if package.json exists and run lint if available
if [ -f "package.json" ] && npm run lint --silent 2>/dev/null; then
  echo "Running linter..."
  npm run lint
fi

echo "Pre-commit checks completed"
`;
      
      const preCommitPath = path.join(hooksDir, 'pre-commit');
      fs.writeFileSync(preCommitPath, preCommitHook);
      
      // Make hook executable on Unix systems
      if (os.platform() !== 'win32') {
        fs.chmodSync(preCommitPath, '755');
      }
      
      this.log('Git hooks initialized', 'success');
    } catch (error) {
      this.log('Skipping git hooks setup (not a git repository)', 'verbose');
    }
  }

  // Create development configuration files
  async createConfigFiles() {
    this.log('Creating configuration files...');
    
    try {
      // Create .env.example if it doesn't exist
      const envExample = `# Catipedia Environment Variables
NODE_ENV=development
PORT=3000
API_BASE_URL=https://api.catipedia.com
ENABLE_DEBUG=true
`;
      
      if (!fs.existsSync('.env.example')) {
        fs.writeFileSync('.env.example', envExample);
        this.log('Created .env.example', 'verbose');
      }
      
      // Create .env for development if it doesn't exist
      if (!fs.existsSync('.env') && this.dev) {
        fs.writeFileSync('.env', envExample);
        this.log('Created .env for development', 'verbose');
      }
      
      // Create basic Makefile
      const makefileContent = `# Catipedia Makefile
.PHONY: help build deploy test clean setup

help:
	@echo "Available commands:"
	@echo "  make setup    - Run setup script"
	@echo "  make build    - Build the project"
	@echo "  make deploy   - Deploy the project"
	@echo "  make test     - Run tests"
	@echo "  make clean    - Clean build files"

setup:
	node scripts/setup.js --dev

build:
	node scripts/build.js

deploy:
	node scripts/deploy.js

test:
	npm test

clean:
	rm -rf dist temp logs
`;
      
      if (!fs.existsSync('Makefile')) {
        fs.writeFileSync('Makefile', makefileContent);
        this.log('Created Makefile', 'verbose');
      }
      
      this.log('Configuration files created', 'success');
    } catch (error) {
      throw new Error(`Failed to create config files: ${error.message}`);
    }
  }

  // Run health checks
  async runHealthChecks() {
    this.log('Running health checks...');
    
    const checks = [];
    
    try {
      // Check if critical files exist
      const criticalFiles = [
        { file: 'package.json', required: true },
        { file: 'index.html', required: true },
        { file: 'css/style.css', required: false },
        { file: 'js/main.js', required: false },
        { file: 'wrangler.toml', required: false }
      ];
      
      for (const { file, required } of criticalFiles) {
        if (fs.existsSync(file)) {
          checks.push(`✅ ${file}`);
          this.log(`Found: ${file}`, 'verbose');
        } else if (required) {
          checks.push(`❌ ${file} (required)`);
          throw new Error(`Required file missing: ${file}`);
        } else {
          checks.push(`⚠️  ${file} (optional)`);
          this.log(`Missing optional file: ${file}`, 'verbose');
        }
      }
      
      // Check package.json structure
      if (fs.existsSync('package.json')) {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        
        if (packageJson.scripts) {
          this.log('Found npm scripts in package.json', 'verbose');
        } else {
          checks.push('⚠️  No scripts section in package.json');
        }
        
        if (packageJson.dependencies || packageJson.devDependencies) {
          this.log('Found dependencies in package.json', 'verbose');
        }
      }
      
      // Display health check results
      console.log('\n🏥 Health Check Results:');
      for (const check of checks) {
        console.log(`  ${check}`);
      }
      
      this.log('\nHealth checks completed', 'success');
    } catch (error) {
      throw new Error(`Health checks failed: ${error.message}`);
    }
  }

  // Display next steps
  displayNextSteps() {
    console.log('\n🎉 Setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('  1. Review the .env file and adjust settings if needed');
    console.log('  2. Run `npm run build` to build the project');
    console.log('  3. Run `npm start` to start the development server (if available)');
    console.log('  4. Run `node scripts/deploy.js` to deploy to your hosting platform');
    console.log('\n📚 Useful commands:');
    console.log('  • make help     - Show available Makefile commands');
    console.log('  • make build    - Build the project');
    console.log('  • make deploy   - Deploy the project');
    console.log('  • make test     - Run tests');
    console.log('\n🔗 Documentation:');
    console.log('  • README.md     - Project overview and instructions');
    console.log('  • CONTRIBUTING.md - Contribution guidelines');
  }

  // Main setup process
  async setup() {
    const startTime = Date.now();
    
    try {
      this.log('Starting Catipedia setup...');
      
      await this.checkSystemRequirements();
      await this.createDirectories();
      await this.installDependencies();
      await this.initializeGitHooks();
      await this.createConfigFiles();
      await this.runHealthChecks();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      this.displayNextSteps();
      console.log(`\n⏱️  Setup completed in ${duration}s`);
      
    } catch (error) {
      this.log(`\n💥 Setup failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    skipInstall: args.includes('--skip-install'),
    dev: args.includes('--dev') || args.includes('-d')
  };
  
  const setupManager = new SetupManager(options);
  setupManager.setup().catch(error => {
    console.error('Setup failed:', error.message);
    process.exit(1);
  });
}

module.exports = { SetupManager };
