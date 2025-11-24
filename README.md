# Base64 to PDF Converter

A smart, client-side web application to convert Base64 strings, JSON responses, and uploaded files into PDF documents.

## Features

*   **Smart Extraction:** Automatically detects Base64 content in JSON API responses (e.g., `DocBase64` fields).
*   **Universal File Upload:** Upload any file type (PDF, TXT, JSON, etc.). Text files are read to extract Base64; other files are converted to Base64 for preview.
*   **Stateless Downloads:** Perform multiple conversions and downloads in a single session without page reloads or cookie issues.
*   **Client-Side Processing:** All logic runs in the browser. No data is sent to any server.
*   **Robust Error Handling:** Validates Base64 input and manages download links to prevent corruption.
*   **Dark/Light Mode:** Automatically adapts to your system's color scheme.

## Usage

1.  Open `index.html` in your web browser.
2.  **Paste Input:** Paste a raw Base64 string or a full JSON response into the textarea.
3.  **Upload File:** Click "Upload any file" to load content from your computer.
4.  **Convert:** Click "Convert to PDF".
5.  **Download:** The PDF will download automatically. You can also use the "Download" button.

## Technologies

*   HTML5
*   CSS3 (Embedded)
*   JavaScript (ES6+)

## License

MIT
