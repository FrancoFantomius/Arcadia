// Arcadia WYSIWYG Editor
// A4 pagination, toolbar commands, font switching,
// image insertion, PDF export, localStorage persistence.

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('pages-container');
    const toolbarButtons = document.querySelectorAll('.tool-button[data-command]');
    const fontSelect = document.getElementById('fontSelect');
    const fontSizeSelect = document.getElementById('fontSizeSelect');
    const imageInput = document.getElementById('imageInput');
    const imageBtn = document.getElementById('imageBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');

    // A4 content height in px (297mm - 2 × 25.4mm margins = 246.2mm)
    // 1mm ≈ 3.7795px at 96dpi → 246.2mm ≈ 930px
    const PAGE_CONTENT_HEIGHT = 930;

    // --- Page helpers ---
    function getPages() {
        return Array.from(container.querySelectorAll('.page'));
    }

    function createPage() {
        const page = document.createElement('div');
        page.className = 'page';
        page.contentEditable = 'true';
        page.spellcheck = true;
        container.appendChild(page);
        bindPageEvents(page);
        return page;
    }

    function getActivePage() {
        const sel = window.getSelection();
        if (sel.rangeCount) {
            let node = sel.anchorNode;
            while (node && !node.classList?.contains('page')) {
                node = node.parentNode;
            }
            return node || getPages().at(-1);
        }
        return getPages().at(-1);
    }

    // --- Overflow detection & pagination ---
    function checkOverflow() {
        const pages = getPages();
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            while (page.scrollHeight > page.clientHeight && page.childNodes.length > 1) {
                // Get or create next page
                let next = pages[i + 1];
                if (!next) {
                    next = createPage();
                    pages.push(next);
                }
                // Move the last child node to the beginning of the next page
                const overflow = page.lastChild;
                next.insertBefore(overflow, next.firstChild);
            }
        }
        // Clean up empty trailing pages (keep at least one)
        const updated = getPages();
        for (let i = updated.length - 1; i > 0; i--) {
            if (updated[i].innerHTML.trim() === '') {
                updated[i].remove();
            } else {
                break;
            }
        }
    }

    // --- Pull content back up when deleting ---
    function checkUnderflow() {
        const pages = getPages();
        for (let i = 0; i < pages.length - 1; i++) {
            const page = pages[i];
            const next = pages[i + 1];
            // Try pulling content from the next page into this page
            while (next.firstChild && page.scrollHeight <= page.clientHeight) {
                const child = next.firstChild;
                page.appendChild(child);
                // If it now overflows, put it back
                if (page.scrollHeight > page.clientHeight) {
                    next.insertBefore(child, next.firstChild);
                    break;
                }
            }
        }
        // Clean up empty trailing pages
        const updated = getPages();
        for (let i = updated.length - 1; i > 0; i--) {
            if (updated[i].innerHTML.trim() === '') {
                updated[i].remove();
            } else {
                break;
            }
        }
    }

    // --- Bind events on each page ---
    function bindPageEvents(page) {
        page.addEventListener('input', () => {
            checkOverflow();
            checkUnderflow();
            saveContent();
            updateActiveStates();
        });
        page.addEventListener('keyup', updateActiveStates);
        page.addEventListener('mouseup', updateActiveStates);

        // Navigate between pages with arrow keys
        page.addEventListener('keydown', (e) => {
            const pages = getPages();
            const idx = pages.indexOf(page);

            if (e.key === 'Backspace') {
                // If at start of a non-first page and it's empty, move to previous
                const sel = window.getSelection();
                if (idx > 0 && sel.anchorOffset === 0 && page.textContent === '') {
                    e.preventDefault();
                    page.remove();
                    const prev = pages[idx - 1];
                    placeCursorAtEnd(prev);
                    saveContent();
                }
            }
        });
    }

    function placeCursorAtEnd(el) {
        el.focus();
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
    }

    // --- Persistence ---
    const STORAGE_KEY = 'arcadia-wysiwyg-content';

    function saveContent() {
        const pages = getPages();
        const data = pages.map(p => p.innerHTML);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function loadContent() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        try {
            const data = JSON.parse(raw);
            if (!Array.isArray(data) || data.length === 0) return;
            // Clear existing pages
            container.innerHTML = '';
            data.forEach(html => {
                const page = createPage();
                page.innerHTML = html;
            });
        } catch {
            // Legacy: single string content
            const firstPage = getPages()[0];
            if (firstPage) firstPage.innerHTML = raw;
        }
    }

    window.addEventListener('beforeunload', saveContent);

    // --- Toolbar Command Execution ---
    const exec = (command, value = null) => {
        document.execCommand(command, false, value);
        const active = getActivePage();
        if (active) active.focus();
        updateActiveStates();
        // Re-check pagination after formatting changes
        requestAnimationFrame(() => {
            checkOverflow();
            checkUnderflow();
            saveContent();
        });
    };

    toolbarButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const cmd = btn.dataset.command;
            if (cmd === 'formatBlock') {
                exec(cmd, btn.dataset.value);
            } else if (cmd === 'createLink') {
                const url = prompt('Enter URL', 'https://');
                if (url) exec(cmd, url);
            } else if (cmd === 'foreColor' || cmd === 'backColor') {
                const color = prompt('Enter hex color (e.g., #ff0000)', '#');
                if (color) exec(cmd, color);
            } else {
                exec(cmd);
            }
        });
    });

    // --- Font Family & Size ---
    fontSelect.addEventListener('change', () => {
        exec('fontName', fontSelect.value);
    });
    fontSizeSelect.addEventListener('change', () => {
        exec('fontSize', fontSizeSelect.value);
    });

    // --- Image Insertion ---
    imageBtn.addEventListener('click', () => {
        imageInput.click();
    });
    imageInput.addEventListener('change', () => {
        const file = imageInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            exec('insertImage', e.target.result);
        };
        reader.readAsDataURL(file);
        imageInput.value = '';
    });

    // --- PDF Export ---
    exportPdfBtn.addEventListener('click', async () => {
        if (typeof html2pdf === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
            script.onload = () => generatePdf();
            document.body.appendChild(script);
        } else {
            generatePdf();
        }
    });

    function generatePdf() {
        const opt = {
            margin: 0,
            filename: 'ArcadiaDocument.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['css', 'legacy'], after: '.page' }
        };
        html2pdf().from(container).set(opt).save();
    }

    // --- Active State UI ---
    function updateActiveStates() {
        toolbarButtons.forEach(btn => btn.classList.remove('active'));
        if (document.queryCommandState('bold')) document.querySelector('[data-command="bold"]')?.classList.add('active');
        if (document.queryCommandState('italic')) document.querySelector('[data-command="italic"]')?.classList.add('active');
        if (document.queryCommandState('underline')) document.querySelector('[data-command="underline"]')?.classList.add('active');
    }

    // --- Init ---
    // Bind events on the first page
    const firstPage = getPages()[0];
    if (firstPage) bindPageEvents(firstPage);

    // Load saved content
    loadContent();
});
