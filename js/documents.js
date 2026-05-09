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

    function findParentPage(node) {
        while (node && !node.classList?.contains('page')) {
            node = node.parentNode;
        }
        return node;
    }

    // --- Overflow detection & pagination ---
    function checkOverflow() {
        const pages = getPages();
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            
            let next = pages[i + 1];
            if (!next && page.scrollHeight > page.clientHeight) {
                next = createPage();
                pages.push(next);
            }

            while (page.scrollHeight > page.clientHeight && page.childNodes.length > 0) {
                const lastChild = page.lastChild;

                if (lastChild.nodeType === Node.TEXT_NODE) {
                    const words = lastChild.textContent.split(/(\s+)/);
                    const movedText = [];
                    while (words.length > 0 && page.scrollHeight > page.clientHeight) {
                        movedText.unshift(words.pop());
                        lastChild.textContent = words.join('');
                    }
                    if (movedText.length > 0) {
                        const newTextNode = document.createTextNode(movedText.join(''));
                        next.insertBefore(newTextNode, next.firstChild);
                    }
                    if (lastChild.textContent === '') lastChild.remove();
                    continue;
                }

                if (lastChild.nodeType === Node.ELEMENT_NODE) {
                    // Do not split unbreakable elements
                    if (['IMG', 'BR', 'HR', 'TABLE'].includes(lastChild.tagName)) {
                        next.insertBefore(lastChild, next.firstChild);
                        continue;
                    }

                    let targetNode = next.firstChild;
                    // Only reuse targetNode if it's specifically marked as a split continuation
                    if (!targetNode || targetNode.tagName !== lastChild.tagName || !targetNode.hasAttribute('data-split')) {
                        targetNode = lastChild.cloneNode(false);
                        targetNode.setAttribute('data-split', 'true');
                        next.insertBefore(targetNode, next.firstChild);
                    }

                    let splitHappened = false;
                    while (lastChild.childNodes.length > 0 && page.scrollHeight > page.clientHeight) {
                        const innerLast = lastChild.lastChild;

                        if (innerLast.nodeType === Node.TEXT_NODE) {
                            const words = innerLast.textContent.split(/(\s+)/);
                            const movedText = [];
                            
                            while (words.length > 0 && page.scrollHeight > page.clientHeight) {
                                movedText.unshift(words.pop());
                                innerLast.textContent = words.join('');
                            }
                            
                            if (movedText.length > 0) {
                                const newTextNode = document.createTextNode(movedText.join(''));
                                targetNode.insertBefore(newTextNode, targetNode.firstChild);
                                splitHappened = true;
                            }
                            if (innerLast.textContent === '') innerLast.remove();
                        } else {
                            targetNode.insertBefore(innerLast, targetNode.firstChild);
                            splitHappened = true;
                        }
                    }

                    if (lastChild.childNodes.length === 0) {
                        lastChild.remove();
                    } else if (!splitHappened) {
                        // Could not split further (e.g. single giant word)
                        next.insertBefore(lastChild, next.firstChild);
                        // If we moved the whole thing, remove the empty targetNode we created
                        if (targetNode.childNodes.length === 0) {
                            targetNode.remove();
                        }
                    }
                } else {
                    next.insertBefore(lastChild, next.firstChild);
                }
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
                
                // Check if we can merge it with page.lastChild
                const lastChild = page.lastChild;
                if (lastChild && lastChild.nodeType === Node.ELEMENT_NODE && 
                    child.nodeType === Node.ELEMENT_NODE && 
                    lastChild.tagName === child.tagName) {
                    
                    // Merge children
                    while (child.firstChild) {
                        lastChild.appendChild(child.firstChild);
                    }
                    child.remove();
                    
                    // Normalize to combine adjacent text nodes
                    lastChild.normalize();
                } else {
                    page.appendChild(child);
                }
                
                if (page.scrollHeight > page.clientHeight) {
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
    function saveCursor() {
        const sel = window.getSelection();
        if (!sel.rangeCount) return null;
        const range = sel.getRangeAt(0);
        const marker = document.createElement('span');
        marker.id = '_arcadia_cursor';
        marker.style.display = 'none';
        range.insertNode(marker);
        return marker;
    }

    function restoreCursor(marker) {
        if (!marker || !marker.parentNode) return;
        const sel = window.getSelection();
        const range = document.createRange();
        range.setStartAfter(marker);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        marker.remove();
    }

    function bindPageEvents(page) {
        page.addEventListener('input', () => {
            const marker = saveCursor();
            checkOverflow();
            checkUnderflow();
            restoreCursor(marker);
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
        const sel = window.getSelection();
        const pages = getPages();

        // Check if the selection spans multiple pages
        let multiPage = false;
        if (sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            const startPage = findParentPage(range.startContainer);
            const endPage = findParentPage(range.endContainer);

            if (startPage && endPage && startPage !== endPage) {
                multiPage = true;
                const startIdx = pages.indexOf(startPage);
                const endIdx = pages.indexOf(endPage);
                // Save boundary info before we manipulate selections
                const origStartContainer = range.startContainer;
                const origStartOffset = range.startOffset;
                const origEndContainer = range.endContainer;
                const origEndOffset = range.endOffset;

                for (let i = startIdx; i <= endIdx; i++) {
                    const page = pages[i];
                    const pageRange = document.createRange();

                    if (i === startIdx) {
                        pageRange.setStart(origStartContainer, origStartOffset);
                        if (page.lastChild) {
                            pageRange.setEndAfter(page.lastChild);
                        } else {
                            pageRange.setEnd(page, page.childNodes.length);
                        }
                    } else if (i === endIdx) {
                        if (page.firstChild) {
                            pageRange.setStartBefore(page.firstChild);
                        } else {
                            pageRange.setStart(page, 0);
                        }
                        pageRange.setEnd(origEndContainer, origEndOffset);
                    } else {
                        pageRange.selectNodeContents(page);
                    }

                    page.focus();
                    sel.removeAllRanges();
                    sel.addRange(pageRange);
                    document.execCommand(command, false, value);
                }

                // Restore cross-page selection so it stays visible
                // and subsequent commands continue to work across all pages
                const updatedPages = getPages();
                const first = updatedPages[startIdx];
                const last = updatedPages[Math.min(endIdx, updatedPages.length - 1)];
                if (first && last) {
                    const restoreRange = document.createRange();
                    restoreRange.setStartBefore(first.firstChild || first);
                    restoreRange.setEndAfter(last.lastChild || last);
                    sel.removeAllRanges();
                    sel.addRange(restoreRange);
                }
            }
        }

        if (!multiPage) {
            document.execCommand(command, false, value);
            const active = getActivePage();
            if (active) active.focus();
        }

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
    // Dynamically load a script and return a promise
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(s);
        });
    }

    async function ensurePdfLibs() {
        const libs = [
            'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
            'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js'
        ];
        for (const src of libs) {
            await loadScript(src);
        }
    }

    exportPdfBtn.addEventListener('click', async () => {
        // Disable button & show feedback
        exportPdfBtn.disabled = true;
        const icon = exportPdfBtn.querySelector('.material-symbols-outlined');
        const origIcon = icon.textContent;
        icon.textContent = 'hourglass_empty';

        try {
            await ensurePdfLibs();
            await generatePdf();
        } catch (err) {
            console.error('PDF export failed:', err);
            alert('PDF export failed. Check the console for details.');
        } finally {
            exportPdfBtn.disabled = false;
            icon.textContent = origIcon;
        }
    });

    async function generatePdf() {
        const { jsPDF } = window.jspdf;
        // A4 dimensions in mm
        const pageWidthMM = 210;
        const pageHeightMM = 297;

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        const pages = getPages();

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];

            // Render each page element to a high-resolution canvas
            const canvas = await html2canvas(page, {
                scale: 2,                  // 2× resolution for crisp text
                useCORS: true,             // allow cross-origin images
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                // Capture the full A4 page including padding
                width: page.offsetWidth,
                height: page.offsetHeight,
                windowWidth: page.offsetWidth,
                windowHeight: page.offsetHeight
            });

            const imgData = canvas.toDataURL('image/png');

            // Scale the canvas image to fill the A4 page exactly
            if (i > 0) {
                pdf.addPage('a4', 'portrait');
            }

            pdf.addImage(imgData, 'PNG', 0, 0, pageWidthMM, pageHeightMM);
        }

        // Use the document title input value as the filename
        const titleInput = document.querySelector('header input[type="text"]');
        const docName = (titleInput && titleInput.value.trim())
            ? titleInput.value.trim().replace(/[^a-zA-Z0-9_\- ]/g, '')
            : 'ArcadiaDocument';
        pdf.save(`${docName}.pdf`);
    }

    // --- Active State UI ---
    function updateActiveStates() {
        toolbarButtons.forEach(btn => btn.classList.remove('active'));
        if (document.queryCommandState('bold')) document.querySelector('[data-command="bold"]')?.classList.add('active');
        if (document.queryCommandState('italic')) document.querySelector('[data-command="italic"]')?.classList.add('active');
        if (document.queryCommandState('underline')) document.querySelector('[data-command="underline"]')?.classList.add('active');
    }

    // --- Select All across pages ---
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            const pages = getPages();
            if (pages.length <= 1) return; // let native behaviour handle single page
            e.preventDefault();
            const first = pages[0];
            const last = pages[pages.length - 1];
            const sel = window.getSelection();
            const range = document.createRange();
            range.setStartBefore(first.firstChild || first);
            range.setEndAfter(last.lastChild || last);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    });

    // --- Init ---
    // Bind events on the first page
    const firstPage = getPages()[0];
    if (firstPage) bindPageEvents(firstPage);

    // Load saved content
    loadContent();
});
