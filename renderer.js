document.addEventListener('DOMContentLoaded', () => {
  const chooseDirectoryBtn = document.getElementById('choose-directory');
  const directoryDisplay = document.getElementById('directory-display');
  const convertBtn = document.getElementById('convert-button');
  const maxKbInput = document.getElementById('max-kb');
  const fileListDiv = document.getElementById('file-list');
  const filesContainer = document.getElementById('files-container');
  const statusDiv = document.getElementById('status');
  const progressContainer = document.getElementById('progress-container');
  const progressBar = document.getElementById('progress');
  const progressText = document.getElementById('progress-text');
  
  let selectedDirectory = null;
  let pngFiles = [];
  
  // Choose directory button click handler
  chooseDirectoryBtn.addEventListener('click', async () => {
    const directory = await window.electronAPI.chooseDirectory();
    if (directory) {
      selectedDirectory = directory;
      directoryDisplay.value = directory;
      
      // Get PNG files from the selected directory
      pngFiles = await window.electronAPI.getPngFiles(directory);
      
      // Display the PNG files
      displayPngFiles(pngFiles);
      
      // Enable/disable convert button based on if we found PNG files
      convertBtn.disabled = pngFiles.length === 0;
    }
  });
  
  // Display PNG files function
  function displayPngFiles(files) {
    filesContainer.innerHTML = '';
    
    if (files.length === 0) {
      filesContainer.innerHTML = '<p>No PNG files found in the selected directory.</p>';
      fileListDiv.style.display = 'block';
      return;
    }
    
    files.forEach(file => {
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item';
      fileItem.textContent = file.name;
      filesContainer.appendChild(fileItem);
    });
    
    fileListDiv.style.display = 'block';
  }
  
  // Convert button click handler
  convertBtn.addEventListener('click', async () => {
    if (!selectedDirectory || pngFiles.length === 0) return;
    
    const maxKB = parseInt(maxKbInput.value, 10);
    if (isNaN(maxKB) || maxKB <= 0) {
      setStatus('Please enter a valid maximum file size.', 'error');
      return;
    }
    
    // Disable inputs during conversion
    chooseDirectoryBtn.disabled = true;
    convertBtn.disabled = true;
    maxKbInput.disabled = true;
    
    // Setup progress tracking
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    progressText.textContent = `0/${pngFiles.length} files converted`;
    
    // Clear previous status
    statusDiv.style.display = 'none';
    
    let successful = 0;
    let failed = 0;
    let totalSize = 0;
    
    // Process each PNG file
    for (let i = 0; i < pngFiles.length; i++) {
      const file = pngFiles[i];
      
      // Update progress
      progressBar.style.width = `${(i / pngFiles.length) * 100}%`;
      progressText.textContent = `${i}/${pngFiles.length} files converted`;
      
      try {
        // Convert the file
        const result = await window.electronAPI.convertToGif({
          pngFilePath: file.path,
          outputDir: selectedDirectory,
          maxKB: maxKB
        });
        
        if (result.success) {
          successful++;
          totalSize += result.originalSize;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Error converting ${file.name}:`, error);
        failed++;
      }
    }
    
    // Update final progress
    progressBar.style.width = '100%';
    progressText.textContent = `${pngFiles.length}/${pngFiles.length} files converted`;
    
    // Show final status
    if (successful > 0) {
      setStatus(`Conversion complete! ${successful} files converted successfully, ${failed} failed. Average file size: ${(totalSize / successful).toFixed(2)} KB`, 'success');
    } else {
      setStatus('Conversion failed. No files were converted successfully.', 'error');
    }
    
    // Re-enable inputs
    chooseDirectoryBtn.disabled = false;
    convertBtn.disabled = false;
    maxKbInput.disabled = false;
  });
  
  // Set status function
  function setStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
    statusDiv.style.display = 'block';
  }
});