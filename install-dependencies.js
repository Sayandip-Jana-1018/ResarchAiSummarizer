/**
 * This script installs the necessary dependencies for the AI Summarizer application
 * Run with: node install-dependencies.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Define the dependencies to install
const dependencies = {
  // Core dependencies
  core: [
    '@supabase/supabase-js',
    'next',
    'react',
    'react-dom',
    'typescript',
    'tailwindcss',
    'postcss',
    'autoprefixer',
    'framer-motion',
    'react-dropzone',
    'react-markdown',
    'react-icons',
    'react-toastify',
  ],
  // AI model dependencies
  ai: [
    'openai',
    '@google/generative-ai',
    '@mistralai/mistralai',
    '@anthropic/sdk',
  ],
  // Document processing dependencies
  docProcessing: [
    'pdf-parse',
    'tesseract.js',
    'docx-parser',
    'xlsx',
    'node-html-parser',
  ]
};

// Function to check if package.json exists
function checkPackageJson() {
  const packagePath = path.join(process.cwd(), 'package.json');
  return fs.existsSync(packagePath);
}

// Function to install dependencies
function installDependencies(deps) {
  console.log('\nInstalling dependencies...');
  try {
    const depsString = deps.join(' ');
    execSync(`npm install ${depsString}`, { stdio: 'inherit' });
    console.log('\n✅ Dependencies installed successfully!');
  } catch (error) {
    console.error('\n❌ Error installing dependencies:', error.message);
    process.exit(1);
  }
}

// Function to create .env.local file
function createEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (fs.existsSync(envPath)) {
    console.log('\n.env.local file already exists. Skipping creation.');
    return;
  }
  
  const envContent = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI API Keys
OPENAI_API_KEY=your_openai_api_key
GOOGLE_AI_API_KEY=your_google_ai_api_key
MISTRAL_API_KEY=your_mistral_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
`;

  try {
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ Created .env.local file. Please update it with your API keys.');
  } catch (error) {
    console.error('\n❌ Error creating .env.local file:', error.message);
  }
}

// Main function
async function main() {
  console.log('🤖 AI Summarizer - Dependency Installer');
  console.log('======================================');
  
  // Check if we're in the right directory
  if (!checkPackageJson()) {
    console.error('❌ Error: package.json not found. Make sure you run this script from the project root directory.');
    process.exit(1);
  }
  
  // Ask which dependencies to install
  rl.question('\nWhich dependencies would you like to install?\n1. All dependencies\n2. Core dependencies only\n3. AI model dependencies only\n4. Document processing dependencies only\nEnter your choice (1-4): ', (answer) => {
    let depsToInstall = [];
    
    switch (answer.trim()) {
      case '1':
        depsToInstall = [...dependencies.core, ...dependencies.ai, ...dependencies.docProcessing];
        break;
      case '2':
        depsToInstall = dependencies.core;
        break;
      case '3':
        depsToInstall = dependencies.ai;
        break;
      case '4':
        depsToInstall = dependencies.docProcessing;
        break;
      default:
        console.log('Invalid choice. Installing core dependencies only.');
        depsToInstall = dependencies.core;
    }
    
    // Install the selected dependencies
    installDependencies(depsToInstall);
    
    // Create .env.local file
    rl.question('\nWould you like to create a .env.local file with placeholders for API keys? (y/n): ', (answer) => {
      if (answer.toLowerCase() === 'y') {
        createEnvFile();
      }
      
      console.log('\n🎉 Setup complete! You can now run the application with:');
      console.log('npm run dev');
      
      rl.close();
    });
  });
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
