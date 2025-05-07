document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const uploadForm = document.getElementById('uploadForm');
    const fileInput = document.getElementById('fileInput');
    const progressContainer = document.getElementById('progressContainer');
    const fileTree = document.getElementById('fileTree');
    const markdownModal = document.getElementById('markdownModal');
    const markdownContent = document.getElementById('markdownContent');
    const closeModal = document.getElementById('closeModal');
    const folderSelect = document.getElementById('folderSelect');
    const newFolderInput = document.getElementById('newFolderInput');
    const basePath = window.location.pathname.replace(/\/$/, '');
    const selectedFilesList = document.createElement('div');
    selectedFilesList.id = 'selectedFilesList';
    selectedFilesList.className = 'selected-files';
    uploadForm.insertAdjacentElement('afterend', selectedFilesList);

    let selectedFiles = [];

    function getIcon(filename) {
        if (filename.match(/\.(jpg|jpeg|png|gif)$/i)) return 'https://img.icons8.com/fluency/48/image.png';
        if (filename.match(/\.xml$/i)) return 'https://img.icons8.com/fluency/48/xml-file.png';
        if (filename.match(/\.pdf$/i)) return 'https://img.icons8.com/fluency/48/pdf.png';
        if (filename.match(/\.(doc|docx)$/i)) return 'https://img.icons8.com/fluency/48/word.png';
        if (filename.match(/\.(mp3|wav)$/i)) return 'https://img.icons8.com/fluency/48/music.png';
        if (filename.match(/\.(mp4|avi)$/i)) return 'https://img.icons8.com/fluency/48/video.png';
        if (filename.match(/\.(zip|rar)$/i)) return 'https://img.icons8.com/fluency/48/zip.png';
        if (filename.match(/\.md$/i)) return 'https://img.icons8.com/fluency/48/markdown.png';
        return 'https://img.icons8.com/fluency/48/file.png';
    }

    function formatSize(size) {
        return `${Math.round(size / 1024)} KB`;
    }

    function renderSelectedFiles() {
        selectedFilesList.innerHTML = '';

        if (selectedFiles.length === 0) {
            selectedFilesList.style.display = 'none';
            return;
        }

        selectedFilesList.style.display = 'block';

        selectedFiles.forEach((file, index) => {
            const row = document.createElement('div');
            row.className = 'selected-file';

            const left = document.createElement('div');
            left.style.display = 'flex';
            left.style.alignItems = 'center';
            left.style.gap = '10px';

            const icon = document.createElement('img');
            icon.src = getIcon(file.name);
            icon.style.width = '20px';
            icon.style.height = '20px';

            const label = document.createElement('span');
            label.textContent = `${file.name} (${formatSize(file.size)})`;

            left.appendChild(icon);

            if (file.type.startsWith('image/')) {
                const preview = document.createElement('img');
                preview.src = URL.createObjectURL(file);
                preview.style.width = '40px';
                preview.style.height = '40px';
                preview.style.objectFit = 'cover';
                preview.style.borderRadius = '4px';
                left.appendChild(preview);
            }

            left.appendChild(label);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-button';
            removeBtn.textContent = 'Remove';
            removeBtn.onclick = () => {
                selectedFiles.splice(index, 1);
                renderSelectedFiles();
            };

            row.appendChild(left);
            row.appendChild(removeBtn);
            selectedFilesList.appendChild(row);
        });

        const dt = new DataTransfer();
        selectedFiles.forEach(f => dt.items.add(f));
        fileInput.files = dt.files;
    }

    fileInput.addEventListener('change', () => {
        selectedFiles = Array.from(fileInput.files);
        renderSelectedFiles();
    });

    function populateFolderSelect(tree, prefix = '') {
        if (tree.type === 'folder') {
            const fullPath = prefix ? `${prefix}/${tree.name}` : tree.name;
            if (fullPath !== 'root') {
                const opt = document.createElement('option');
                opt.value = fullPath.replace(/^root\/?/, '');
                opt.textContent = fullPath.replace(/^root\/?/, '');
                folderSelect.appendChild(opt);
            }
            tree.children?.forEach(child => {
                populateFolderSelect(child, fullPath);
            });
        }
    }

    function renderTree(node, container) {
        const div = document.createElement('div');

        if (node.type === 'folder') {
            const folderLine = document.createElement('div');
            folderLine.className = 'folder';

            const folderIcon = document.createElement('img');
            folderIcon.src = 'https://img.icons8.com/fluency/48/folder-invoices--v1.png';
            folderIcon.className = 'folder-icon';

            const folderName = document.createElement('span');
            folderName.textContent = node.name === '.' ? 'root' : node.name;

            folderLine.appendChild(folderIcon);
            folderLine.appendChild(folderName);

            const subContainer = document.createElement('div');
            subContainer.className = 'folder-children';
            subContainer.style.display = 'block';

            folderLine.addEventListener('click', () => {
                subContainer.style.display = subContainer.style.display === 'none' ? 'block' : 'none';
            });

            div.appendChild(folderLine);
            node.children?.forEach(child => renderTree(child, subContainer));
            div.appendChild(subContainer);
        } else {
            const fileLine = document.createElement('div');
            fileLine.className = 'file';

            const fileIcon = document.createElement('img');
            fileIcon.src = getIcon(node.name);
            fileLine.appendChild(fileIcon);

            const encodedPath = encodeURIComponent(node.path);
            const link = document.createElement('a');
            link.href = `${basePath}/download?path=${encodedPath}`;
            link.textContent = node.name;

            if (node.name.endsWith('.md')) {
                link.onclick = e => {
                    e.preventDefault();
                    fetch(`${basePath}/download?path=${encodedPath}`)
                        .then(res => res.text())
                        .then(text => {
                            markdownContent.innerHTML = marked.parse(text);
                            markdownModal.style.display = 'flex';
                        });
                };
            }

            fileLine.appendChild(link);
            div.appendChild(fileLine);
        }

        container.appendChild(div);
    }

    function fetchTree() {
        fetch(`${basePath}/tree`)
            .then(res => res.json())
            .then(tree => {
                fileTree.innerHTML = '';
                folderSelect.innerHTML = '<option value="">Upload to root</option>';
                renderTree(tree, fileTree);
                populateFolderSelect(tree);
            })
            .catch(err => {
                console.error('Error fetching tree:', err);
            });
    }

    uploadForm.addEventListener('submit', e => {
        e.preventDefault();
        if (!selectedFiles.length) return alert('Please select files first');

        const parent = folderSelect.value;
        const newFolder = newFolderInput.value.trim();
        let fullPath = parent;

        if (newFolder) {
            fullPath = parent ? `${parent}/${newFolder}` : newFolder;
        }

        const formData = new FormData();
        formData.append('destination', fullPath);
        selectedFiles.forEach(file => formData.append('files', file));

        progressContainer.innerHTML = '';
        selectedFilesList.innerHTML = '';

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${basePath}/upload`);
        xhr.upload.addEventListener('progress', e => {
            if (e.lengthComputable) {
                const percent = (e.loaded / e.total) * 100;
                progressContainer.innerHTML = `<div class="progress-bar" style="width: ${percent}%"></div>`;
            }
        });

        xhr.onload = () => {
            if (xhr.status === 200) {
                fileInput.value = '';
                newFolderInput.value = '';
                selectedFiles = [];
                progressContainer.innerHTML = '';
                fetchTree();
            } else {
                alert('Upload failed!');
            }
        };

        xhr.send(formData);
    });

    dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        selectedFiles = Array.from(e.dataTransfer.files);
        renderSelectedFiles();
    });

    closeModal.addEventListener('click', () => {
        markdownModal.style.display = 'none';
    });

    fetchTree();

    // WebSocket auto-refresh
    try {
        const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
        const wsUrl = `${protocol}://${location.host}${basePath}/ws/`;
        const socket = new WebSocket(wsUrl);

        socket.addEventListener('message', (event) => {
            if (event.data === 'refresh') {
                console.log('[ws] Refresh message received');
                fetchTree();
            }
        });

        socket.addEventListener('open', () => {
            console.log('[ws] WebSocket connected');
        });

        socket.addEventListener('close', () => {
            console.log('[ws] WebSocket closed');
        });

        socket.addEventListener('error', (e) => {
            console.error('[ws] WebSocket error', e);
        });
    } catch (err) {
        console.warn('[ws] WebSocket not supported:', err);
    }
});
