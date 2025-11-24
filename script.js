document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const base64Input = document.getElementById('base64Input');
    const filenameInput = document.getElementById('filenameInput');
    const convertBtn = document.getElementById('convertBtn');
    const clearBtn = document.getElementById('clearBtn');
    const copyBtn = document.getElementById('copyBtn');
    const statusMessage = document.getElementById('statusMessage');
    const downloadContainer = document.getElementById('downloadContainer');

    let lastCreatedUrl = null; // Variable to hold the last created object URL

    // --- Helper Functions ---

    function showStatus(message, type = 'info') {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
    }

    function clearStatus() {
        statusMessage.textContent = '';
        statusMessage.className = 'status-message';
        statusMessage.style.display = 'none';
    }

    function arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    // --- Event Listeners ---

    // File Upload Handler
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        showStatus(`Reading ${file.name}...`, 'info');
        downloadContainer.innerHTML = ''; // Clear previous download

        try {
            const fileName = file.name.toLowerCase();
            let content = '';

            // If it's a text or JSON file, read as text (user likely uploaded the Base64 string itself)
            if (fileName.endsWith('.txt') || fileName.endsWith('.json') || fileName.endsWith('.xml')) {
                content = await file.text();
                base64Input.value = content.trim();
                showStatus('Text file loaded. Ready to convert.', 'success');
            } else {
                // For other files (PDF, images, etc.), convert file content TO Base64
                const arrayBuffer = await file.arrayBuffer();
                content = arrayBufferToBase64(arrayBuffer);
                base64Input.value = content;
                showStatus('File converted to Base64. Ready to convert to PDF.', 'success');
            }

            // Auto-fill filename if empty
            if (!filenameInput.value) {
                filenameInput.value = file.name.replace(/\.[^/.]+$/, "") + ".pdf";
            }

        } catch (err) {
            console.error(err);
            showStatus('Error reading file.', 'error');
        }

        // Reset input so same file can be selected again
        fileInput.value = '';
    });

    // Clear Input
    clearBtn.addEventListener('click', () => {
        base64Input.value = '';
        filenameInput.value = '';
        downloadContainer.innerHTML = '';
        clearStatus();
        if (lastCreatedUrl) {
            URL.revokeObjectURL(lastCreatedUrl);
            lastCreatedUrl = null;
        }
    });

    // Copy Base64
    copyBtn.addEventListener('click', () => {
        if (!base64Input.value) return;
        base64Input.select();
        document.execCommand('copy');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = originalText, 2000);
    });

    // Convert to PDF Handler
    convertBtn.addEventListener('click', () => {
        const rawInput = base64Input.value.trim();
        if (!rawInput) {
            showStatus('Please provide Base64 input.', 'error');
            return;
        }

        showStatus('Processing...', 'info');
        downloadContainer.innerHTML = '';

        // Revoke previous URL if it exists
        if (lastCreatedUrl) {
            URL.revokeObjectURL(lastCreatedUrl);
            lastCreatedUrl = null;
        }

        let base64String = rawInput;

        // 1. Smart Extraction
        // Try JSON parsing first
        try {
            const json = JSON.parse(rawInput);
            // Look for common Base64 keys
            const keys = ['DocBase64', 'DocumentBase64', 'FileBase64', 'PdfBase64', 'Data', 'PdfData'];
            for (const key of keys) {
                if (json[key] && typeof json[key] === 'string') {
                    base64String = json[key];
                    showStatus(`Found Base64 in JSON field "${key}".`, 'success');
                    break;
                }
            }
        } catch (e) {
            // Not valid JSON, fall back to regex search if input seems too "dirty"
            // Simple check: if it contains many spaces or non-base64 chars, try to find a block
            if (/[^A-Za-z0-9+/=]/.test(rawInput)) {
                // Regex for long continuous Base64 string (min 100 chars)
                const match = rawInput.match(/[A-Za-z0-9+/=]{100,}/);
                if (match) {
                    base64String = match[0];
                    showStatus('Extracted Base64 block from text.', 'success');
                }
            }
        }

        // 2. Cleanup
        // Remove data URI prefix if present
        base64String = base64String.replace(/^data:application\/pdf;base64,/, '');
        // Remove whitespace
        base64String = base64String.replace(/\s/g, '');

        // 3. Validation & Generation
        try {
            const binaryString = atob(base64String);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            lastCreatedUrl = url; // Store the new URL

            // 4. Download Setup
            const userFilename = filenameInput.value.trim();
            const filename = userFilename.endsWith('.pdf') ? userFilename : (userFilename ? `${userFilename}.pdf` : 'converted.pdf');

            // Create visible download button
            const downloadBtn = document.createElement('a');
            downloadBtn.href = url;
            downloadBtn.download = filename;
            downloadBtn.className = 'download-btn';
            downloadBtn.textContent = `Download ${filename}`;
            downloadContainer.appendChild(downloadBtn);

            // Auto-trigger download via hidden link to avoid pop-up blockers/state issues
            const hiddenLink = document.createElement('a');
            hiddenLink.style.display = 'none';
            hiddenLink.href = url;
            hiddenLink.download = filename;
            document.body.appendChild(hiddenLink);
            hiddenLink.click();

            // Cleanup hidden link
            setTimeout(() => {
                document.body.removeChild(hiddenLink);
            }, 1000); // Delay removal slightly to ensure download starts

            if (statusMessage.className !== 'status-message error') {
                showStatus('PDF generated and download started.', 'success');
            }

        } catch (e) {
            console.error(e);
            showStatus('Invalid Base64 string. Please check the input.', 'error');
        }
    });
});
