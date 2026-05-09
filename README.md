# Arcadia

Arcadia is a premium, web-based WYSIWYG document editor designed for a clean, distraction-free writing experience. It mimics the familiar layout of desktop word processors (like MS Word) while operating entirely within the browser.

## Features

- **A4 Pagination**: Dynamic content pagination that automatically handles page overflow and underflow to maintain a professional A4 layout.
- **Local Auto-Save**: Your documents are automatically saved directly in your browser's local storage. No cloud dependency, ensuring complete privacy.
- **PDF Export**: Export your documents to pixel-perfect A4 PDF files with a single click (powered by `html2pdf.js`).
- **Rich Text Editing**: Full suite of formatting tools including bold, italic, underline, custom text colors, text alignment, lists, links, and image insertion.
- **Modern Aesthetics**: A stunning landing page with a glassmorphism design and a clean, focused editor interface.

## Tech Stack

- **Frontend**: HTML5, Vanilla JavaScript.
- **Styling**: Custom CSS3 (no external UI frameworks like Bootstrap or Tailwind).
- **Typography**: Inter, Google Sans, and Material Symbols Outlined.
- **Libraries**: `html2pdf.js` (loaded dynamically via CDN for PDF generation).

## Project Structure

- `index.html`: The landing page with a modern glassmorphism design.
- `editor.html`: The main document editor interface.
- `privacy.html` & `terms.html`: Static legal pages.
- `css/`: Contains custom stylesheets (`index.css`, `editor.css`).
- `js/`: Contains the editor logic (`editor.js`).
- `icons/`: Favicon and application icons.

## Getting Started

Since Arcadia is a purely static web application, you can run it without any build steps or server dependencies:

1. Clone or download this repository.
2. Open `index.html` in any modern web browser to view the landing page, or open `editor.html` directly to start editing.

Alternatively, you can serve it using any local development server (e.g., Live Server in VS Code, or `npx serve`).

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
