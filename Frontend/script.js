const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// WebSocket connection for real-time streaming
let ws = null;
let wsReconnectAttempts = 0;
const maxReconnectAttempts = 5;
let wsReconnectTimer = null;

// Check server health on page load
async function checkServerHealth() {
  try {
    const response = await fetch('/api/health');
    const data = await response.json();
    if (data.status === 'ok') {
      console.log('✅ Server connection OK');
      console.log('📁 Working directory:', data.workdir);
      return true;
    }
  } catch (error) {
    console.error('❌ Server connection failed:', error);
    return false;
  }
}

// Initialize WebSocket connection
function initWebSocket() {
  // Clear any existing reconnect timer
  if (wsReconnectTimer) {
    clearTimeout(wsReconnectTimer);
    wsReconnectTimer = null;
  }

  // Close existing connection if any
  if (ws) {
    ws.close();
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  console.log('🔌 Connecting to WebSocket:', wsUrl);
  
  try {
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      wsReconnectAttempts = 0;
      // Clear any reconnect messages
      const outputs = ['anvilOutput', 'forgeOutput', 'castOutput'];
      outputs.forEach(id => {
        const output = document.getElementById(id);
        if (output && output.textContent.includes('WebSocket disconnected')) {
          // Remove reconnect messages
          clearOutput(id);
        }
      });
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };
    
    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };
    
    ws.onclose = (event) => {
      console.log('🔌 WebSocket disconnected, code:', event.code);
      ws = null;
      
      // Attempt to reconnect
      if (wsReconnectAttempts < maxReconnectAttempts) {
        wsReconnectAttempts++;
        const delay = 2000 * wsReconnectAttempts;
        console.log(`🔄 Reconnecting in ${delay/1000}s... (attempt ${wsReconnectAttempts}/${maxReconnectAttempts})`);
        
        wsReconnectTimer = setTimeout(initWebSocket, delay);
      } else {
        console.error('❌ Max reconnection attempts reached');
        addOutput('anvilOutput', '❌ WebSocket disconnected. Reload page to reconnect.', 'error');
      }
    };
  } catch (error) {
    console.error('❌ Failed to create WebSocket:', error);
  }
}

// Handle WebSocket messages
function handleWebSocketMessage(data) {
  let outputId;
  
  // Determine which output to use
  if (data.command === 'anvil') {
    outputId = 'anvilOutput';
  } else if (data.command === 'build' || data.command === 'test' || data.command === 'coverage') {
    outputId = 'forgeOutput';
  } else {
    outputId = 'forgeOutput'; // default
  }

  if (data.type === 'output') {
    addOutput(outputId, data.content, 'info');
  } else if (data.type === 'error') {
    addOutput(outputId, data.content, 'error');
  } else if (data.type === 'complete') {
    addOutput(outputId, data.content, data.content.includes('❌') ? 'error' : 'success');
  }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Initializing Lazy-Foundry Web UI...');
  
  const serverOk = await checkServerHealth();
  if (serverOk) {
    initWebSocket();
  } else {
    console.error('❌ Server is not responding. Please check if the Go server is running.');
    addOutput('anvilOutput', '❌ Cannot connect to server. Make sure the Go server is running.', 'error');
    addOutput('anvilOutput', 'Run: go run cmd/lazyfoundry/main.go', 'info');
  }
});

// Tab switching
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.getAttribute('data-tab');
    
    tabBtns.forEach(b => {
      b.style.background = 'transparent';
      b.style.color = '#ffffff';
    });
    tabContents.forEach(content => content.classList.remove('active'));
    
    btn.style.background = '#00ffb3';
    btn.style.color = '#0d1117';
    document.getElementById(tab).classList.add('active');
  });
});

// Output management
function addOutput(elementId, message, type = 'info', spinner = false) {
  const output = document.getElementById(elementId);
  if (!output) {
    console.error('Output element not found:', elementId);
    return null;
  }
  
  const line = document.createElement('div');
  line.className = `output-line ${type}`;
  const timestamp = new Date().toLocaleTimeString();
  
  if (spinner) {
    const spinnerEl = document.createElement('span');
    spinnerEl.className = 'spinner';
    line.appendChild(spinnerEl);
  }
  
  const textNode = document.createTextNode(`[${timestamp}] ${message}`);
  line.appendChild(textNode);
  
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
  
  return line;
}

function clearOutput(elementId) {
  const output = document.getElementById(elementId);
  if (output) {
    output.innerHTML = '';
  }
}

function setButtonProcessing(button, processing) {
  if (!button) return;
  
  if (processing) {
    button.classList.add('processing');
    button.disabled = true;
  } else {
    button.classList.remove('processing');
    button.disabled = false;
  }
}

// API communication with better error handling
async function sendCommand(mode, command, args = []) {
  try {
    console.log('📤 Sending command:', { mode, command, args });
    
    const response = await fetch('/api/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: mode,
        command: command,
        args: args
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('📥 Response:', data);
    return data;
  } catch (error) {
    console.error('❌ API Error:', error);
    return {
      success: false,
      message: 'Failed to connect to server: ' + error.message + '\n\nMake sure:\n1. The Go server is running\n2. You started it with: go run cmd/lazyfoundry/main.go\n3. The server is listening on port 3000'
    };
  }
}

// Send streaming command via WebSocket
function sendStreamingCommand(mode, command, args = []) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log('📤 Sending streaming command via WebSocket:', { mode, command, args });
    ws.send(JSON.stringify({
      mode: mode,
      command: command,
      args: args
    }));
    return true;
  } else {
    console.error('❌ WebSocket not connected (state:', ws ? ws.readyState : 'null', ')');
    return false;
  }
}

// Anvil Mode Functions
let anvilRunning = false;

async function startAnvil() {
  const btn = event.target;
  
  if (anvilRunning) {
    addOutput('anvilOutput', '⚠️  Anvil is already running!', 'error');
    return;
  }
  
  const rpcUrl = document.getElementById('rpc').value || 'http://127.0.0.1:8545';
  const privateKey = document.getElementById('key').value;
  const chainId = document.getElementById('chain').value || '31337';
  const gasFee = document.getElementById('gasfee').value || '1000000000';
  const gasLimit = document.getElementById('gaslimit').value || '30000000';
  const forkUrl = document.getElementById('forkurl').value;
  
  setButtonProcessing(btn, true);
  clearOutput('anvilOutput');
  const loadingLine = addOutput('anvilOutput', '⏳ Starting Anvil local node...', 'info', true);
  
  // Create a temporary preset if custom values are provided
  let presetName = 'local';
  const hasCustomValues = rpcUrl !== 'http://127.0.0.1:8545' || 
                          chainId !== '31337' || 
                          forkUrl || 
                          privateKey;
  
  if (hasCustomValues) {
    presetName = 'temp_web_preset';
    const args = [presetName, rpcUrl, chainId];
    if (forkUrl) args.push(forkUrl);
    if (privateKey) args.push(privateKey);
    
    const addResult = await sendCommand('anvil', 'add', args);
    if (!addResult.success) {
      loadingLine.remove();
      addOutput('anvilOutput', `❌ Failed to create preset: ${addResult.message}`, 'error');
      setButtonProcessing(btn, false);
      return;
    }
    addOutput('anvilOutput', `✅ Custom preset created: ${presetName}`, 'success');
  }
  
  const result = await sendCommand('anvil', 'start', [presetName]);
  
  loadingLine.remove();
  
  if (result.success) {
    anvilRunning = true;
    addOutput('anvilOutput', '✅ Anvil started successfully', 'success');
    
    // Display output
    if (result.output) {
      const lines = result.output.split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          addOutput('anvilOutput', line, 'info');
        }
      });
    }
  } else {
    addOutput('anvilOutput', `❌ Failed to start Anvil: ${result.message}`, 'error');
    if (result.output) {
      addOutput('anvilOutput', result.output, 'error');
    }
  }
  
  setButtonProcessing(btn, false);
}

async function stopAnvil() {
  const btn = event.target;
  
  if (!anvilRunning) {
    addOutput('anvilOutput', '⚠️  No Anvil instance running!', 'error');
    return;
  }
  
  setButtonProcessing(btn, true);
  const loadingLine = addOutput('anvilOutput', '⏳ Stopping Anvil...', 'info', true);
  
  const result = await sendCommand('anvil', 'stop', []);
  
  loadingLine.remove();
  
  if (result.success) {
    anvilRunning = false;
    addOutput('anvilOutput', '✅ Anvil stopped', 'success');
    if (result.output) {
      addOutput('anvilOutput', result.output, 'info');
    }
  } else {
    addOutput('anvilOutput', `❌ Failed to stop Anvil: ${result.message}`, 'error');
  }
  
  setButtonProcessing(btn, false);
}

// Forge Mode Functions
async function buildForge() {
  const btn = event.target;
  setButtonProcessing(btn, true);
  clearOutput('forgeOutput');
  
  const loadingLine = addOutput('forgeOutput', '⏳ Building project...', 'info', true);
  
  // Try to use WebSocket for streaming output
  const wsSuccess = sendStreamingCommand('forge', 'build', []);
  
  if (!wsSuccess) {
    // Fallback to regular API
    const result = await sendCommand('forge', 'build', []);
    
    loadingLine.remove();
    
    if (result.success) {
      addOutput('forgeOutput', '✅ Build completed successfully', 'success');
      if (result.output) {
        const lines = result.output.split('\n');
        lines.forEach(line => {
          if (line.trim()) addOutput('forgeOutput', line, 'info');
        });
      }
    } else {
      addOutput('forgeOutput', `❌ Build failed: ${result.message}`, 'error');
      if (result.output) {
        addOutput('forgeOutput', result.output, 'error');
      }
    }
  } else {
    loadingLine.remove();
  }
  
  setButtonProcessing(btn, false);
}

async function testForge() {
  const btn = event.target;
  setButtonProcessing(btn, true);
  clearOutput('forgeOutput');
  
  const loadingLine = addOutput('forgeOutput', '⏳ Running tests...', 'info', true);
  
  const wsSuccess = sendStreamingCommand('forge', 'test', []);
  
  if (!wsSuccess) {
    const result = await sendCommand('forge', 'test', []);
    
    loadingLine.remove();
    
    if (result.success) {
      addOutput('forgeOutput', '✅ Tests completed', 'success');
      if (result.output) {
        const lines = result.output.split('\n');
        lines.forEach(line => {
          if (line.trim()) addOutput('forgeOutput', line, 'info');
        });
      }
    } else {
      addOutput('forgeOutput', `❌ Tests failed: ${result.message}`, 'error');
      if (result.output) {
        addOutput('forgeOutput', result.output, 'error');
      }
    }
  } else {
    loadingLine.remove();
  }
  
  setButtonProcessing(btn, false);
}

async function coverageForge() {
  const btn = event.target;
  setButtonProcessing(btn, true);
  clearOutput('forgeOutput');
  
  const loadingLine = addOutput('forgeOutput', '⏳ Generating coverage report...', 'info', true);
  
  const wsSuccess = sendStreamingCommand('forge', 'coverage', []);
  
  if (!wsSuccess) {
    const result = await sendCommand('forge', 'coverage', []);
    
    loadingLine.remove();
    
    if (result.success) {
      addOutput('forgeOutput', '✅ Coverage report generated', 'success');
      if (result.output) {
        const lines = result.output.split('\n');
        lines.forEach(line => {
          if (line.trim()) addOutput('forgeOutput', line, 'info');
        });
      }
    } else {
      addOutput('forgeOutput', `❌ Coverage failed: ${result.message}`, 'error');
      if (result.output) {
        addOutput('forgeOutput', result.output, 'error');
      }
    }
  } else {
    loadingLine.remove();
  }
  
  setButtonProcessing(btn, false);
}

async function createForge() {
  const btn = event.target;
  
  const contractName = prompt('Enter contract name (e.g., MyContract):');
  if (!contractName) {
    addOutput('forgeOutput', '⚠️  Contract creation cancelled', 'error');
    return;
  }
  
  setButtonProcessing(btn, true);
  clearOutput('forgeOutput');
  const loadingLine = addOutput('forgeOutput', `⏳ Creating contract: ${contractName}...`, 'info', true);
  
  const result = await sendCommand('forge', 'create', [contractName]);
  
  loadingLine.remove();
  
  if (result.success) {
    addOutput('forgeOutput', '✅ Contract created successfully', 'success');
    if (result.output) {
      const lines = result.output.split('\n');
      lines.forEach(line => {
        if (line.trim()) addOutput('forgeOutput', line, 'info');
      });
    }
  } else {
    addOutput('forgeOutput', `❌ Create failed: ${result.message}`, 'error');
    if (result.output) {
      addOutput('forgeOutput', result.output, 'error');
    }
  }
  
  setButtonProcessing(btn, false);
}

async function initForge() {
  const btn = event.target;
  setButtonProcessing(btn, true);
  clearOutput('forgeOutput');
  
  const loadingLine = addOutput('forgeOutput', '⏳ Initializing Forge project...', 'info', true);
  
  const result = await sendCommand('forge', 'init', []);
  
  loadingLine.remove();
  
  if (result.success) {
    addOutput('forgeOutput', '✅ Project initialized successfully', 'success');
    if (result.output) {
      const lines = result.output.split('\n');
      lines.forEach(line => {
        if (line.trim()) addOutput('forgeOutput', line, 'info');
      });
    }
  } else {
    addOutput('forgeOutput', `❌ Init failed: ${result.message}`, 'error');
    if (result.output) {
      addOutput('forgeOutput', result.output, 'error');
    }
  }
  
  setButtonProcessing(btn, false);
}

async function installForge() {
  const btn = event.target;
  
  const packageName = prompt('Enter package name (e.g., OpenZeppelin/openzeppelin-contracts):');
  if (!packageName) {
    addOutput('forgeOutput', '⚠️  Installation cancelled', 'error');
    return;
  }
  
  setButtonProcessing(btn, true);
  clearOutput('forgeOutput');
  const loadingLine = addOutput('forgeOutput', `⏳ Installing ${packageName}...`, 'info', true);
  
  const result = await sendCommand('forge', 'install', [packageName]);
  
  loadingLine.remove();
  
  if (result.success) {
    addOutput('forgeOutput', '✅ Package installed successfully', 'success');
    if (result.output) {
      const lines = result.output.split('\n');
      lines.forEach(line => {
        if (line.trim()) addOutput('forgeOutput', line, 'info');
      });
    }
  } else {
    addOutput('forgeOutput', `❌ Install failed: ${result.message}`, 'error');
    if (result.output) {
      addOutput('forgeOutput', result.output, 'error');
    }
  }
  
  setButtonProcessing(btn, false);
}

async function scriptForge() {
  const btn = event.target;
  
  const scriptPath = prompt('Enter script path (e.g., script/Deploy.s.sol):');
  if (!scriptPath) {
    addOutput('forgeOutput', '⚠️  Script execution cancelled', 'error');
    return;
  }
  
  setButtonProcessing(btn, true);
  clearOutput('forgeOutput');
  const loadingLine = addOutput('forgeOutput', `⏳ Running script: ${scriptPath}...`, 'info', true);
  
  const result = await sendCommand('forge', 'script', [scriptPath]);
  
  loadingLine.remove();
  
  if (result.success) {
    addOutput('forgeOutput', '✅ Script executed successfully', 'success');
    if (result.output) {
      const lines = result.output.split('\n');
      lines.forEach(line => {
        if (line.trim()) addOutput('forgeOutput', line, 'info');
      });
    }
  } else {
    addOutput('forgeOutput', `❌ Script failed: ${result.message}`, 'error');
    if (result.output) {
      addOutput('forgeOutput', result.output, 'error');
    }
  }
  
  setButtonProcessing(btn, false);
}

// Cast Mode Functions
async function callCast() {
  const btn = event.target;
  const func = document.getElementById('castFunc').value;
  const args = document.getElementById('castArgs').value;
  
  if (!func) {
    addOutput('castOutput', '⚠️  Please enter a function name!', 'error');
    return;
  }
  
  setButtonProcessing(btn, true);
  clearOutput('castOutput');
  
  addOutput('castOutput', `📞 Calling function: ${func}`, 'info');
  
  if (args) {
    addOutput('castOutput', `📝 Arguments: ${args}`, 'info');
  }
  
  const loadingLine = addOutput('castOutput', '⏳ Executing call...', 'info', true);
  
  // Note: Cast functionality needs backend implementation
  setTimeout(() => {
    loadingLine.remove();
    addOutput('castOutput', '⚠️  Cast mode integration pending backend implementation', 'error');
    addOutput('castOutput', '💡 This feature will be available in a future update', 'info');
    setButtonProcessing(btn, false);
  }, 1000);
}

// Preset Management Functions
async function savePreset() {
  const btn = event.target;
  const rpc = document.getElementById('rpc').value;
  const key = document.getElementById('key').value;
  const chain = document.getElementById('chain').value;
  const forkUrl = document.getElementById('forkurl').value;
  
  if (!rpc || !chain) {
    addOutput('anvilOutput', '⚠️  Please fill RPC URL and Chain ID!', 'error');
    return;
  }
  
  const presetName = prompt('Enter preset name:', 'my_preset');
  if (!presetName) {
    addOutput('anvilOutput', '⚠️  Save cancelled', 'error');
    return;
  }
  
  setButtonProcessing(btn, true);
  const loadingLine = addOutput('anvilOutput', '⏳ Saving configuration...', 'info', true);
  
  const args = [presetName, rpc, chain];
  if (forkUrl) args.push(forkUrl);
  if (key) args.push(key);
  
  const result = await sendCommand('anvil', 'add', args);
  
  loadingLine.remove();
  
  if (result.success) {
    addOutput('anvilOutput', `✅ Preset '${presetName}' saved successfully`, 'success');
    addOutput('anvilOutput', `📍 RPC: ${rpc}`, 'info');
    addOutput('anvilOutput', `🔗 Chain ID: ${chain}`, 'info');
    if (forkUrl) addOutput('anvilOutput', `🍴 Fork: ${forkUrl}`, 'info');
  } else {
    addOutput('anvilOutput', `❌ Failed to save preset: ${result.message}`, 'error');
  }
  
  setButtonProcessing(btn, false);
}

async function loadPreset() {
  const btn = event.target;
  
  setButtonProcessing(btn, true);
  const loadingLine = addOutput('anvilOutput', '⏳ Fetching presets...', 'info', true);
  
  const result = await sendCommand('anvil', 'list', []);
  
  loadingLine.remove();
  
  if (result.success) {
    addOutput('anvilOutput', '✅ Available presets:', 'success');
    if (result.output) {
      addOutput('anvilOutput', result.output, 'info');
    }
    
    const presetName = prompt('Enter preset name to load:');
    if (presetName) {
      const showResult = await sendCommand('anvil', 'show', [presetName]);
      if (showResult.success && showResult.output) {
        addOutput('anvilOutput', showResult.output, 'info');
        addOutput('anvilOutput', '💡 Use "Start Local Node" to start with this preset', 'info');
      } else {
        addOutput('anvilOutput', `❌ Failed to load preset: ${showResult.message}`, 'error');
      }
    }
  } else {
    addOutput('anvilOutput', `❌ Failed to list presets: ${result.message}`, 'error');
  }
  
  setButtonProcessing(btn, false);
}
