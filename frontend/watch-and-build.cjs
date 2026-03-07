
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Configuration
const WATCH_DIRECTORIES = ['src', 'public', 'index.html', 'vite.config.ts', 'tailwind.config.js'];
const DEBOUNCE_DELAY = 1000; // 1 second delay to avoid multiple rapid builds

let buildTimeout;
let isBuilding = false;
let serveProcess = null;

console.log('🔍 Starting file watcher for lms-admin-fe...');
console.log('📁 Watching directories:', WATCH_DIRECTORIES.join(', '));

// Function to run npm commands
function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Running: npm ${command} ${args.join(' ')}`);
    
    const npmProcess = spawn('npm', ['run', command, ...args], {
      stdio: 'inherit',
      cwd: __dirname,
      shell: true // Penting untuk Windows agar bisa menemukan npm.cmd
    });

    npmProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ npm ${command} completed successfully`);
        resolve();
      } else {
        console.error(`❌ npm ${command} failed with code ${code}`);
        reject(new Error(`npm ${command} failed`));
      }
    });

    npmProcess.on('error', (error) => {
      console.error(`❌ Error running npm ${command}:`, error);
      reject(error);
    });
  });
}

// Function to stop the serve process
function stopServe() {
  if (serveProcess) {
    console.log('🛑 Stopping serve process...');
    serveProcess.kill('SIGTERM');
    serveProcess = null;
  }
}

// Function to start the serve process
function startServe() {
  console.log('🌐 Starting serve process...');
  serveProcess = spawn('npm', ['run', 'serve'], {
    stdio: 'inherit',
    cwd: __dirname,
    shell: true // Penting untuk Windows agar bisa menemukan npm.cmd
  });

  serveProcess.on('close', (code) => {
    console.log(`📡 Serve process exited with code ${code}`);
    serveProcess = null;
  });

  serveProcess.on('error', (error) => {
    console.error('❌ Error starting serve process:', error);
    serveProcess = null;
  });
}

// Function to build and serve
async function buildAndServe() {
  if (isBuilding) {
    console.log('⏳ Build already in progress, skipping...');
    return;
  }

  isBuilding = true;
  
  try {
    // Stop current serve process
    stopServe();
    
    // Run build
    await runCommand('build');
    
    // Start serve
    startServe();
    
    console.log('🎉 Build and serve completed successfully!');
  } catch (error) {
    console.error('❌ Build and serve failed:', error.message);
  } finally {
    isBuilding = false;
  }
}

// Function to handle file changes
function handleFileChange(eventType, filename) {
  console.log(`📝 File changed: ${filename} (${eventType})`);
  
  // Clear existing timeout
  if (buildTimeout) {
    clearTimeout(buildTimeout);
  }
  
  // Set new timeout to debounce rapid changes
  buildTimeout = setTimeout(() => {
    buildAndServe();
  }, DEBOUNCE_DELAY);
}

// Function to watch a directory recursively
function watchDirectory(dir) {
  const fullPath = path.join(__dirname, dir);
  
  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️  Directory ${dir} does not exist, skipping...`);
    return;
  }

  try {
    fs.watch(fullPath, { recursive: true }, handleFileChange);
    console.log(`👀 Watching: ${dir}`);
  } catch (error) {
    console.error(`❌ Error watching ${dir}:`, error.message);
  }
}

// Start watching directories
WATCH_DIRECTORIES.forEach(watchDirectory);

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping file watcher...');
  stopServe();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Stopping file watcher...');
  stopServe();
  process.exit(0);
});

// Initial build and serve
console.log('🏗️  Running initial build and serve...');
buildAndServe();