document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const base64Input = document.getElementById('base64Input');
    const filenameInput = document.getElementById('filenameInput');
    const convertBtn = document.getElementById('convertBtn');
    const clearBtn = document.getElementById('clearBtn');
    const copyBtn = document.getElementById('copyBtn');
    const statusMessage = document.getElementById('statusMessage');
    const downloadContainer = document.getElementById('downloadContainer');



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

        // Revoke any existing ObjectURLs before clearing
        const existingBtn = downloadContainer.querySelector('.download-btn');
        if (existingBtn && existingBtn.dataset.blobUrl) {
            URL.revokeObjectURL(existingBtn.dataset.blobUrl);
        }

        downloadContainer.innerHTML = '';
        clearStatus();
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

        // Revoke any existing ObjectURLs before creating new ones
        const existingBtn = downloadContainer.querySelector('.download-btn');
        if (existingBtn && existingBtn.dataset.blobUrl) {
            URL.revokeObjectURL(existingBtn.dataset.blobUrl);
        }

        downloadContainer.innerHTML = '';

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

            // 4. Create fresh blob with proper MIME type
            const blob = new Blob([bytes], { type: 'application/pdf' });

            // 5. Create fresh ObjectURL
            const url = URL.createObjectURL(blob);

            // 6. Get filename
            const userFilename = filenameInput.value.trim();
            const filename = userFilename.endsWith('.pdf') ? userFilename : (userFilename ? `${userFilename}.pdf` : 'converted.pdf');

            // 7. Create temporary anchor element for auto-download
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;

            // 8. Append to DOM, trigger download, and immediately remove
            document.body.appendChild(a);
            a.click();
            a.remove();

            // 9. Create visible download button for manual re-download
            const downloadBtn = document.createElement('a');
            downloadBtn.href = url;
            downloadBtn.download = filename;
            downloadBtn.className = 'download-btn';
            downloadBtn.textContent = `Download ${filename}`;

            // Store the URL in the button's dataset so we can revoke it later
            downloadBtn.dataset.blobUrl = url;
            downloadContainer.appendChild(downloadBtn);

            showStatus('PDF generated and download started.', 'success');

        } catch (e) {
            console.error(e);
            showStatus('Invalid Base64 string. Please check the input.', 'error');
        }
    });
});
