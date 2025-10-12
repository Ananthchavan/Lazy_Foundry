const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

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

function addOutput(elementId, message, type = 'info', spinner = false) {
  const output = document.getElementById(elementId);
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

function setButtonProcessing(button, processing) {
  if (processing) {
    button.classList.add('processing');
  } else {
    button.classList.remove('processing');
  }
}

let anvilRunning = false;

function startAnvil() {
  const btn = event.target;
  
  if (anvilRunning) {
    addOutput('anvilOutput', 'Anvil is already running!', 'error');
    return;
  }
  
  setButtonProcessing(btn, true);
  const loadingLine = addOutput('anvilOutput', 'Starting Anvil local node...', 'info', true);
  
  setTimeout(() => {
    loadingLine.remove();
    anvilRunning = true;
    addOutput('anvilOutput', '✓ Anvil started successfully', 'success');
    
    setTimeout(() => addOutput('anvilOutput', 'RPC: http://127.0.0.1:8545', 'info'), 200);
    setTimeout(() => addOutput('anvilOutput', 'Chain ID: 31337', 'info'), 400);
    setTimeout(() => addOutput('anvilOutput', 'Available Accounts: 10', 'info'), 600);
    
    setButtonProcessing(btn, false);
  }, 1500);
}

function stopAnvil() {
  const btn = event.target;
  
  if (!anvilRunning) {
    addOutput('anvilOutput', 'No Anvil instance running!', 'error');
    return;
  }
  
  setButtonProcessing(btn, true);
  const loadingLine = addOutput('anvilOutput', 'Stopping Anvil...', 'info', true);
  
  setTimeout(() => {
    loadingLine.remove();
    anvilRunning = false;
    addOutput('anvilOutput', '✓ Anvil stopped', 'success');
    setButtonProcessing(btn, false);
  }, 1000);
}

function buildForge() {
  const btn = event.target;
  setButtonProcessing(btn, true);
  
  const loadingLine = addOutput('forgeOutput', 'Building project...', 'info', true);
  
  setTimeout(() => {
    loadingLine.remove();
    addOutput('forgeOutput', '✓ Compiling contracts...', 'success');
  }, 800);
  
  setTimeout(() => {
    addOutput('forgeOutput', '✓ Solc 0.8.19 finished', 'success');
  }, 1200);
  
  setTimeout(() => {
    addOutput('forgeOutput', '✓ Build completed successfully', 'success');
    setButtonProcessing(btn, false);
  }, 1800);
}

function testForge() {
  const btn = event.target;
  setButtonProcessing(btn, true);
  
  const loadingLine = addOutput('forgeOutput', 'Running tests...', 'info', true);
  
  setTimeout(() => {
    loadingLine.remove();
    addOutput('forgeOutput', '✓ Running 5 tests', 'info');
  }, 800);
  
  setTimeout(() => {
    addOutput('forgeOutput', '✓ Test Suite: Contract.t.sol', 'success');
  }, 1200);
  
  setTimeout(() => {
    addOutput('forgeOutput', '  ✓ testExample (gas: 12345)', 'success');
  }, 1500);
  
  setTimeout(() => {
    addOutput('forgeOutput', '  ✓ testAnotherCase (gas: 23456)', 'success');
  }, 1800);
  
  setTimeout(() => {
    addOutput('forgeOutput', '✓ All tests passed!', 'success');
    setButtonProcessing(btn, false);
  }, 2200);
}

function deployForge() {
  const btn = event.target;
  setButtonProcessing(btn, true);
  
  const loadingLine = addOutput('forgeOutput', 'Deploying contract...', 'info', true);
  
  setTimeout(() => {
    loadingLine.remove();
    const mockAddress = '0x' + Math.random().toString(16).substr(2, 40);
    addOutput('forgeOutput', '✓ Contract deployed!', 'success');
  }, 1200);
  
  setTimeout(() => {
    const mockAddress = '0x' + Math.random().toString(16).substr(2, 40);
    addOutput('forgeOutput', `Address: ${mockAddress}`, 'info');
  }, 1600);
  
  setTimeout(() => {
    addOutput('forgeOutput', 'Transaction hash: 0x' + Math.random().toString(16).substr(2, 64), 'info');
    setButtonProcessing(btn, false);
  }, 2000);
}

function callCast() {
  const btn = event.target;
  const func = document.getElementById('castFunc').value;
  const args = document.getElementById('castArgs').value;
  
  if (!func) {
    addOutput('castOutput', 'Please enter a function name!', 'error');
    return;
  }
  
  setButtonProcessing(btn, true);
  
  addOutput('castOutput', `Calling function: ${func}`, 'info');
  
  if (args) {
    setTimeout(() => {
      addOutput('castOutput', `Arguments: ${args}`, 'info');
    }, 300);
  }
  
  const loadingLine = addOutput('castOutput', 'Executing call...', 'info', true);
  
  setTimeout(() => {
    loadingLine.remove();
    addOutput('castOutput', '✓ Call successful', 'success');
  }, args ? 1200 : 900);
  
  setTimeout(() => {
    addOutput('castOutput', `Return value: 0x${Math.random().toString(16).substr(2, 16)}`, 'info');
    setButtonProcessing(btn, false);
  }, args ? 1600 : 1300);
}

const presets = {};

function savePreset() {
  const btn = event.target;
  const rpc = document.getElementById('rpc').value;
  const key = document.getElementById('key').value;
  const chain = document.getElementById('chain').value;
  
  if (!rpc || !key || !chain) {
    addOutput('presetOutput', 'Please fill all fields!', 'error');
    return;
  }
  
  setButtonProcessing(btn, true);
  const loadingLine = addOutput('presetOutput', 'Saving preset...', 'info', true);
  
  setTimeout(() => {
    loadingLine.remove();
    presets.current = { rpc, key, chain };
    addOutput('presetOutput', '✓ Preset saved successfully', 'success');
  }, 800);
  
  setTimeout(() => {
    addOutput('presetOutput', `RPC: ${rpc}`, 'info');
  }, 1100);
  
  setTimeout(() => {
    addOutput('presetOutput', `Chain ID: ${chain}`, 'info');
    setButtonProcessing(btn, false);
  }, 1400);
}

function loadPreset() {
  const btn = event.target;
  
  if (!presets.current) {
    addOutput('presetOutput', 'No preset saved!', 'error');
    return;
  }
  
  setButtonProcessing(btn, true);
  const loadingLine = addOutput('presetOutput', 'Loading preset...', 'info', true);
  
  setTimeout(() => {
    loadingLine.remove();
    document.getElementById('rpc').value = presets.current.rpc;
    document.getElementById('key').value = presets.current.key;
    document.getElementById('chain').value = presets.current.chain;
    
    addOutput('presetOutput', '✓ Preset loaded successfully', 'success');
  }, 800);
  
  setTimeout(() => {
    addOutput('presetOutput', `RPC: ${presets.current.rpc}`, 'info');
  }, 1100);
  
  setTimeout(() => {
    addOutput('presetOutput', `Chain ID: ${presets.current.chain}`, 'info');
    setButtonProcessing(btn, false);
  }, 1400);
}