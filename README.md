# Arcadia - Doc Editor

A web-based document editor.

## Features
- **Rich Text Editing**: Support for Bold, Italic, Underline, and custom text color.
- **File Operations**:
  - **New**: Clears the editor content.
  - **Save as TXT**: Downloads the current text as a `.txt` file.
  - **Save**: Sends a POST request to a local API endpoint (currently configured with mock data).

## Tech Stack
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla).
- **Styling**: Bootstrap 5 (loaded via CDN).

## Known Issues / TODOs
- The script `htmltopdf.js` is referenced in `editor.html` but is missing from the workspace.
- The "Save" functionality sends hardcoded dummy data (`Id`, `Customer`, `Quantity`, `Price`) to `http://127.0.0.1:5000/api/arcadia/save` instead of the actual editor content.
