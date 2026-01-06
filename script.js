// Team Management Application
class TeamManager {
    constructor() {
        this.teamMembers = this.loadFromStorage();
        this.currentEditingId = null;
        this.zoomLevel = 1;
        this.baseZoomLevel = 1; // The zoom level that shows the entire chart (100%)
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.startX = 0;
        this.startY = 0;
        this.init();
    }

    async init() {
        // Load photos from JSON file and merge with team members
        await this.loadPhotosFromJSON();
        
        // If this is first load and we have initial team members, save them
        if (this.teamMembers.length > 0) {
            const stored = localStorage.getItem('harborTeamMembers');
            if (!stored) {
                // First time - save initial data (with photos from JSON)
                this.saveToStorage();
            } else {
                // Check if stored data has reportsTo - if not, update it
                const storedMembers = JSON.parse(stored);
                if (storedMembers.length > 0 && !storedMembers[0].hasOwnProperty('reportsTo')) {
                    // Update with new structure, but preserve photos from JSON
                    this.teamMembers = this.getInitialTeamMembers();
                    await this.loadPhotosFromJSON(); // Reload photos after resetting structure
                    this.saveToStorage();
                } else {
                    // Merge photos from JSON into existing localStorage data
                    await this.loadPhotosFromJSON();
                }
            }
        }
        this.renderTeam();
        this.setupEventListeners();
    }

    // Load photos from JSON file
    async loadPhotosFromJSON() {
        try {
            const response = await fetch('harbor-team-data.json');
            if (response.ok) {
                const jsonData = await response.json();
                this.mergePhotosFromJSON(jsonData);
            }
        } catch (error) {
            console.log('Could not load photos from JSON file:', error);
            // Continue without photos - not a critical error
        }
    }

    // Merge photos from JSON into current team members
    mergePhotosFromJSON(jsonData) {
        const jsonMap = new Map();
        jsonData.forEach(member => {
            if (member.photo) {
                jsonMap.set(member.id, member.photo);
            }
        });

        // Update team members with photos from JSON (prefer JSON photos over existing)
        this.teamMembers.forEach(member => {
            if (jsonMap.has(member.id)) {
                member.photo = jsonMap.get(member.id);
            }
        });

        // Save updated data
        this.saveToStorage();
    }

    // Load team members from localStorage
    loadFromStorage() {
        const stored = localStorage.getItem('harborTeamMembers');
        if (stored) {
            const members = JSON.parse(stored);
            // Check if members have reportsTo field - if not, reinitialize
            if (members.length > 0 && !members[0].hasOwnProperty('reportsTo')) {
                // Old data format, reinitialize with proper structure
                return this.getInitialTeamMembers();
            }
            return members;
        }
        // If no stored data, initialize with team from organizational chart
        return this.getInitialTeamMembers();
    }

    // Get initial team members from organizational chart with reporting relationships
    getInitialTeamMembers() {
        return [
            // Top level - no reportsTo
            { id: '1', name: 'Bryan Cook', title: 'ECD', photo: '', notes: '', links: [], reportsTo: null },
            // Second level - report to top level
            { id: '3', name: 'Aaron Porzel', title: 'CD', photo: '', notes: '', links: [], reportsTo: '1' },
            { id: '4', name: 'Art Castle', title: 'CD', photo: '', notes: '', links: [], reportsTo: '1' },
            { id: '5', name: 'Jesse Thompson', title: 'CD', photo: '', notes: '', links: [], reportsTo: '1' },
            { id: '6', name: 'Jefferson Chaney', title: 'CD', photo: '', notes: '', links: [], reportsTo: '1' },
            { id: '7', name: 'Justin Sirizzotti', title: 'ACD', photo: '', notes: '', links: [], reportsTo: '1' },
            { id: '8', name: 'Nate Cali', title: 'CD', photo: '', notes: '', links: [], reportsTo: '1' },
            { id: '9', name: 'Ben Reesing', title: 'Senior Editor', photo: '', notes: '', links: [], reportsTo: '1' },
            { id: '10', name: 'Paul Oh', title: 'Editor', photo: '', notes: '', links: [], reportsTo: '1' },
            { id: '11', name: 'Vicente Lopez', title: 'Editor', photo: '', notes: '', links: [], reportsTo: '1' },
            { id: '12', name: 'Lissette Schuster', title: 'Editor', photo: '', notes: '', links: [], reportsTo: '1' },
            { id: '13', name: 'Arianna Nasi', title: 'Editor', photo: '', notes: '', links: [], reportsTo: '1' },
            // Third level
            { id: '14', name: 'Greg Somerlot', title: 'Senior Editor', photo: '', notes: '', links: [], reportsTo: '3' },
            { id: '15', name: 'Luke Sloma', title: 'Senior Editor', photo: '', notes: '', links: [], reportsTo: '3' },
            { id: '16', name: 'Ryan Linich', title: 'Editor', photo: '', notes: '', links: [], reportsTo: '4' },
            { id: '17', name: 'Bert Cambridge', title: 'Senior Editor', photo: '', notes: '', links: [], reportsTo: '5' },
            { id: '18', name: 'Dave Bauer', title: 'Senior Editor', photo: '', notes: '', links: [], reportsTo: '5' },
            { id: '19', name: 'Craig Holzer', title: 'Senior Editor', photo: '', notes: '', links: [], reportsTo: '6' },
            { id: '20', name: 'Dana Apuzzo', title: 'Senior Editor', photo: '', notes: '', links: [], reportsTo: '7' },
            { id: '21', name: 'Josh Moise', title: 'Senior Editor', photo: '', notes: '', links: [], reportsTo: '7' },
            { id: '22', name: 'Vic Barczyk', title: 'Senior Editor', photo: '', notes: '', links: [], reportsTo: '7' },
            { id: '23', name: 'Quenton Jones', title: 'Senior Editor', photo: '', notes: '', links: [], reportsTo: '8' },
            // Fourth level
            { id: '24', name: 'Cassandra Tyler', title: 'Senior Editor', photo: '', notes: '', links: [], reportsTo: '14' },
            { id: '25', name: 'Kate Hershey', title: 'AE', photo: '', notes: '', links: [], reportsTo: '15' },
            { id: '26', name: 'Karla Llompart', title: 'Editor', photo: '', notes: '', links: [], reportsTo: '16' },
            { id: '27', name: 'Stephen Noll', title: 'Editor', photo: '', notes: '', links: [], reportsTo: '17' },
            { id: '28', name: 'John Gerbec', title: 'Senior Editor', photo: '', notes: '', links: [], reportsTo: '18' },
            { id: '29', name: 'Joe Duva', title: 'AE', photo: '', notes: '', links: [], reportsTo: '19' },
            { id: '30', name: 'Julia Marshall', title: 'Editor', photo: '', notes: '', links: [], reportsTo: '20' },
            { id: '31', name: 'Chris Fontes', title: 'AE', photo: '', notes: '', links: [], reportsTo: '21' },
            { id: '32', name: 'Vanessa Aoki', title: 'Editor', photo: '', notes: '', links: [], reportsTo: '21' },
            { id: '33', name: 'Thomas Irreno Pinilla', title: 'PGD Editor', photo: '', notes: '', links: [], reportsTo: '22' },
            { id: '34', name: 'Luke Nelson', title: 'AE', photo: '', notes: '', links: [], reportsTo: '23' },
            // Fifth level
            { id: '35', name: 'Rob Sheppard', title: 'Editor', photo: '', notes: '', links: [], reportsTo: '24' },
            { id: '36', name: 'Annie Kalfas', title: 'Associate Editor', photo: '', notes: '', links: [], reportsTo: '25' },
            { id: '37', name: 'Jacob Fagliano', title: 'Editor', photo: '', notes: '', links: [], reportsTo: '26' },
            { id: '38', name: 'Louie LaFleur', title: 'Editor', photo: '', notes: '', links: [], reportsTo: '27' },
            { id: '39', name: 'Shane Scherholz', title: 'Junior Editor', photo: '', notes: '', links: [], reportsTo: '28' },
            { id: '40', name: 'Kevin Curran', title: 'Editor', photo: '', notes: '', links: [], reportsTo: '32' },
            { id: '41', name: 'Manuel Pimentel', title: 'PGD Editor', photo: '', notes: '', links: [], reportsTo: '33' },
            { id: '42', name: 'Victoria Villa', title: 'AE', photo: '', notes: '', links: [], reportsTo: '34' },
            // Sixth level
            { id: '43', name: 'Cara Ross', title: 'Editor', photo: '', notes: '', links: [], reportsTo: '35' },
            { id: '44', name: 'Jack Cronin', title: 'Associate Editor', photo: '', notes: '', links: [], reportsTo: '36' },
            { id: '45', name: 'Steve Stanton', title: 'Editor', photo: '', notes: '', links: [], reportsTo: '37' },
            { id: '46', name: 'Ryan Quinlan', title: 'AE', photo: '', notes: '', links: [], reportsTo: '38' },
            { id: '47', name: 'Nancy Zhong', title: 'Editor', photo: '', notes: '', links: [], reportsTo: '39' },
            { id: '48', name: 'Santiago Vilabano', title: 'PGD Editor', photo: '', notes: '', links: [], reportsTo: '41' },
            // Seventh level
            { id: '49', name: 'Christian Cornejo', title: 'AE', photo: '', notes: '', links: [], reportsTo: '45' },
            { id: '50', name: 'Steven Barber', title: 'AE', photo: '', notes: '', links: [], reportsTo: '47' },
            // Eighth level
            { id: '51', name: 'Matt Matsil', title: 'AE', photo: '', notes: '', links: [], reportsTo: '49' }
        ];
    }

    // Save team members to localStorage
    saveToStorage() {
        localStorage.setItem('harborTeamMembers', JSON.stringify(this.teamMembers));
    }

    // Setup event listeners
    setupEventListeners() {
        // Add member button
        document.getElementById('addMemberBtn').addEventListener('click', () => {
            this.openAddModal();
        });

        // Reset data button
        const resetBtn = document.getElementById('resetDataBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('This will reset all team data to the organizational chart structure. Continue?')) {
                    localStorage.removeItem('harborTeamMembers');
                    this.teamMembers = this.getInitialTeamMembers();
                    this.saveToStorage();
                    this.renderTeam();
                }
            });
        }

        // Zoom controls
        document.getElementById('zoomInBtn').addEventListener('click', () => {
            this.zoomIn();
        });

        document.getElementById('zoomOutBtn').addEventListener('click', () => {
            this.zoomOut();
        });

        document.getElementById('resetZoomBtn').addEventListener('click', () => {
            this.resetZoom();
        });

        // Mouse wheel zoom
        const container = document.getElementById('orgChartContainer');
        container.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                this.setZoom(this.zoomLevel + delta);
            }
        }, { passive: false });

        // Pan functionality with mouse drag
        container.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left mouse button
                this.isPanning = true;
                this.startX = e.clientX - this.panX;
                this.startY = e.clientY - this.panY;
                container.style.cursor = 'grabbing';
            }
        });

        container.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                this.panX = e.clientX - this.startX;
                this.panY = e.clientY - this.startY;
                this.updateTransform();
            }
        });

        container.addEventListener('mouseup', () => {
            this.isPanning = false;
            container.style.cursor = 'grab';
        });

        container.addEventListener('mouseleave', () => {
            this.isPanning = false;
            container.style.cursor = 'grab';
        });

        container.style.cursor = 'grab';

        // Modal close buttons
        document.querySelector('.close').addEventListener('click', () => {
            this.closeMemberModal();
        });

        document.querySelector('.close-detail').addEventListener('click', () => {
            this.closeDetailModal();
        });

        // Close modals when clicking outside
        document.getElementById('memberModal').addEventListener('click', (e) => {
            if (e.target.id === 'memberModal') {
                this.closeMemberModal();
            }
        });

        document.getElementById('detailModal').addEventListener('click', (e) => {
            if (e.target.id === 'detailModal') {
                this.closeDetailModal();
            }
        });

        // Form submission
        document.getElementById('memberForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveMember();
        });

        // Cancel button
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.closeMemberModal();
        });

        // Photo upload
        document.getElementById('photoUpload').addEventListener('change', (e) => {
            this.handlePhotoUpload(e);
        });

        // Add link button
        document.getElementById('addLinkBtn').addEventListener('click', () => {
            this.addLinkField();
        });

        // Edit and delete buttons in detail modal
        document.getElementById('editMemberBtn').addEventListener('click', () => {
            this.editCurrentMember();
        });

        document.getElementById('deleteMemberBtn').addEventListener('click', () => {
            this.deleteCurrentMember();
        });
    }

    // Handle photo upload
    handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('memberPhoto').value = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    // Open add member modal
    openAddModal() {
        this.currentEditingId = null;
        document.getElementById('modalTitle').textContent = 'Add Team Member';
        document.getElementById('memberForm').reset();
        document.getElementById('memberId').value = '';
        document.getElementById('linksContainer').innerHTML = '';
        document.getElementById('memberModal').classList.add('show');
    }

    // Open edit modal
    openEditModal(member) {
        this.currentEditingId = member.id;
        document.getElementById('modalTitle').textContent = 'Edit Team Member';
        document.getElementById('memberId').value = member.id;
        document.getElementById('memberName').value = member.name;
        document.getElementById('memberTitle').value = member.title || '';
        document.getElementById('memberPhoto').value = member.photo || '';
        document.getElementById('memberNotes').value = member.notes || '';

        // Populate links
        const linksContainer = document.getElementById('linksContainer');
        linksContainer.innerHTML = '';
        if (member.links && member.links.length > 0) {
            member.links.forEach(link => {
                this.addLinkField(link);
            });
        }

        document.getElementById('memberModal').classList.add('show');
    }

    // Close member modal
    closeMemberModal() {
        document.getElementById('memberModal').classList.remove('show');
        document.getElementById('memberForm').reset();
        this.currentEditingId = null;
    }

    // Add link field
    addLinkField(linkValue = '') {
        const container = document.getElementById('linksContainer');
        const linkItem = document.createElement('div');
        linkItem.className = 'link-item';
        linkItem.innerHTML = `
            <input type="url" class="link-input" placeholder="https://example.com" value="${linkValue}">
            <button type="button" class="remove-link-btn">Remove</button>
        `;
        container.appendChild(linkItem);

        linkItem.querySelector('.remove-link-btn').addEventListener('click', () => {
            linkItem.remove();
        });
    }

    // Save member
    saveMember() {
        const name = document.getElementById('memberName').value.trim();
        if (!name) {
            alert('Please enter a name');
            return;
        }

        const title = document.getElementById('memberTitle').value.trim();
        const photo = document.getElementById('memberPhoto').value.trim();
        const notes = document.getElementById('memberNotes').value.trim();

        // Collect links
        const linkInputs = document.querySelectorAll('.link-input');
        const links = Array.from(linkInputs)
            .map(input => input.value.trim())
            .filter(link => link !== '');

        if (this.currentEditingId) {
            // Update existing member
            const index = this.teamMembers.findIndex(m => m.id === this.currentEditingId);
            if (index !== -1) {
                const existingMember = this.teamMembers[index];
                const memberData = {
                    name,
                    title,
                    photo,
                    notes,
                    links,
                    reportsTo: existingMember.reportsTo || null // Preserve reporting relationship
                };
                this.teamMembers[index] = { ...existingMember, ...memberData };
            }
        } else {
            // Add new member
            const memberData = {
                name,
                title,
                photo,
                notes,
                links,
                reportsTo: null // New members default to no manager
            };
            memberData.id = Date.now().toString();
            this.teamMembers.push(memberData);
        }

        this.saveToStorage();
        this.renderTeam();
        this.closeMemberModal();
    }

    // Delete member
    deleteMember(id) {
        if (confirm('Are you sure you want to delete this team member?')) {
            this.teamMembers = this.teamMembers.filter(m => m.id !== id);
            this.saveToStorage();
            this.renderTeam();
            this.closeDetailModal();
        }
    }

    // Delete current member (from detail modal)
    deleteCurrentMember() {
        if (this.currentEditingId) {
            this.deleteMember(this.currentEditingId);
        }
    }

    // Edit current member (from detail modal)
    editCurrentMember() {
        if (this.currentEditingId) {
            const member = this.teamMembers.find(m => m.id === this.currentEditingId);
            if (member) {
                this.closeDetailModal();
                this.openEditModal(member);
            }
        }
    }

    // Open detail modal
    openDetailModal(member) {
        this.currentEditingId = member.id;
        const modal = document.getElementById('detailModal');
        const content = document.getElementById('detailContent');
        const nameEl = document.getElementById('detailName');

        nameEl.textContent = member.name;

        let html = '';

        // Photo
        if (member.photo) {
            html += `<img src="${member.photo}" alt="${member.name}" class="detail-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`;
            html += `<div class="detail-photo-placeholder" style="display: none;">${member.name.charAt(0).toUpperCase()}</div>`;
        } else {
            html += `<div class="detail-photo-placeholder">${member.name.charAt(0).toUpperCase()}</div>`;
        }

        // Title
        if (member.title) {
            html += `
                <div class="detail-section">
                    <h3>Title</h3>
                    <p>${this.escapeHtml(member.title)}</p>
                </div>
            `;
        }

        // Notes
        if (member.notes) {
            html += `
                <div class="detail-section">
                    <h3>Notes</h3>
                    <p>${this.escapeHtml(member.notes)}</p>
                </div>
            `;
        }

        // Links
        if (member.links && member.links.length > 0) {
            html += `
                <div class="detail-section">
                    <h3>Links</h3>
                    <div class="detail-links">
            `;
            member.links.forEach(link => {
                const domain = this.extractDomain(link);
                html += `
                    <a href="${link}" target="_blank" rel="noopener noreferrer" class="detail-link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                        ${this.escapeHtml(domain || link)}
                    </a>
                `;
            });
            html += `
                    </div>
                </div>
            `;
        }

        content.innerHTML = html;
        modal.classList.add('show');
    }

    // Close detail modal
    closeDetailModal() {
        document.getElementById('detailModal').classList.remove('show');
        this.currentEditingId = null;
    }

    // Render team grid
    renderTeam() {
        const grid = document.getElementById('teamGrid');
        const emptyState = document.getElementById('emptyState');

        if (this.teamMembers.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        grid.style.display = 'block';
        emptyState.style.display = 'none';

        // Render as hierarchical org chart
        grid.innerHTML = this.renderOrgChart();

        // Calculate and set optimal zoom to fit entire chart after rendering
        setTimeout(() => {
            this.calculateOptimalZoom();
        }, 100);

        // Add click listeners to cards
        grid.querySelectorAll('.member-card').forEach((card) => {
            const memberId = card.dataset.memberId;
            const member = this.teamMembers.find(m => m.id === memberId);
            if (member) {
                card.addEventListener('click', (e) => {
                    // Don't open modal if panning
                    if (!this.isPanning) {
                        this.openDetailModal(member);
                    }
                });
            }
        });
    }

    // Render organizational chart
    renderOrgChart() {
        // Build hierarchy tree
        const hierarchy = this.buildHierarchy();
        console.log('Rendering org chart with hierarchy:', hierarchy);
        let html = '<div class="org-chart">';
        html += this.renderHierarchyLevel(hierarchy, 0, null);
        html += '</div>';
        return html;
    }

    // Get title priority for sorting (lower number = higher priority)
    getTitlePriority(title) {
        if (!title) return 999;
        const titleLower = title.toLowerCase();
        if (titleLower.includes('senior editor')) return 1;
        if (titleLower.includes('editor') && !titleLower.includes('senior') && !titleLower.includes('junior') && !titleLower.includes('associate') && !titleLower.includes('pgd')) return 2;
        if (titleLower.includes('junior editor')) return 3;
        if (titleLower === 'ae' || titleLower.includes('assistant editor')) return 4;
        if (titleLower.includes('associate editor')) return 5;
        if (titleLower.includes('pgd editor')) return 6;
        return 7; // Other titles
    }

    // Sort children by title priority
    sortChildrenByTitle(children) {
        return children.sort((a, b) => {
            const priorityA = this.getTitlePriority(a.title);
            const priorityB = this.getTitlePriority(b.title);
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
            // If same priority, sort alphabetically by name
            return a.name.localeCompare(b.name);
        });
    }

    // Recursively sort all children in the hierarchy
    sortHierarchyRecursive(members) {
        members.forEach(member => {
            if (member.children && member.children.length > 0) {
                // Sort this level's children
                this.sortChildrenByTitle(member.children);
                // Recursively sort children's children
                this.sortHierarchyRecursive(member.children);
            }
        });
    }

    // Build hierarchy tree structure
    buildHierarchy() {
        const memberMap = new Map();
        const rootMembers = [];

        // Create map of all members
        this.teamMembers.forEach(member => {
            memberMap.set(member.id, { ...member, children: [] });
        });

        // Build tree structure
        this.teamMembers.forEach(member => {
            const node = memberMap.get(member.id);
            if (!member.reportsTo || member.reportsTo === null) {
                rootMembers.push(node);
            } else {
                const parent = memberMap.get(member.reportsTo);
                if (parent) {
                    parent.children.push(node);
                } else {
                    // If parent not found, treat as root
                    rootMembers.push(node);
                }
            }
        });

        // Sort all children recursively by title priority
        this.sortHierarchyRecursive(rootMembers);

        return rootMembers;
    }

    // Render hierarchy level recursively
    renderHierarchyLevel(members, level, parentId = null) {
        if (!members || members.length === 0) return '';

        let html = `<div class="org-level level-${level}">`;
        
        members.forEach(member => {
            const isRoot = level === 0;
            // For level 1 (CDs), use their ID as the team identifier
            const teamId = level === 1 ? member.id : parentId;
            html += `<div class="org-node ${isRoot ? 'root-node' : ''} ${teamId ? 'team-' + teamId : ''}" data-team-id="${teamId || ''}">`;
            html += this.createMemberCard(member, true);
            
            if (member.children && member.children.length > 0) {
                html += `<div class="org-children ${teamId ? 'team-' + teamId : ''}" data-team-id="${teamId || ''}">`;
                html += this.renderHierarchyLevel(member.children, level + 1, teamId);
                html += '</div>';
            }
            
            html += '</div>';
        });
        
        html += '</div>';
        return html;
    }

    // Create member card HTML
    createMemberCard(member, isOrgChart = false) {
        let photoHtml = '';
        if (member.photo) {
            photoHtml = `<img src="${member.photo}" alt="${member.name}" class="member-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`;
            photoHtml += `<div class="member-photo-placeholder" style="display: none;">${member.name.charAt(0).toUpperCase()}</div>`;
        } else {
            photoHtml = `<div class="member-photo-placeholder">${member.name.charAt(0).toUpperCase()}</div>`;
        }

        let titleHtml = '';
        if (member.title) {
            titleHtml = `<div class="member-title">${this.escapeHtml(member.title)}</div>`;
        }

        let notesHtml = '';
        if (member.notes && !isOrgChart) {
            notesHtml = `<div class="member-notes">${this.escapeHtml(member.notes)}</div>`;
        }

        let linksHtml = '';
        if (member.links && member.links.length > 0 && !isOrgChart) {
            linksHtml = '<div class="member-links">';
            member.links.slice(0, 3).forEach(link => {
                const domain = this.extractDomain(link);
                linksHtml += `
                    <a href="${link}" target="_blank" rel="noopener noreferrer" class="link-badge" onclick="event.stopPropagation()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                        ${this.escapeHtml(domain || link)}
                    </a>
                `;
            });
            if (member.links.length > 3) {
                linksHtml += `<span class="link-badge">+${member.links.length - 3} more</span>`;
            }
            linksHtml += '</div>';
        }

        return `
            <div class="member-card" data-member-id="${member.id}">
                ${photoHtml}
                <div class="member-name">${this.escapeHtml(member.name)}</div>
                ${titleHtml}
                ${notesHtml}
                ${linksHtml}
            </div>
        `;
    }

    // Utility: Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Utility: Extract domain from URL
    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace('www.', '');
        } catch (e) {
            return url;
        }
    }

    // Zoom functionality
    zoomIn() {
        this.setZoom(Math.min(this.zoomLevel + 0.1, 2));
    }

    zoomOut() {
        this.setZoom(Math.max(this.zoomLevel - 0.1, 0.3));
    }

    resetZoom() {
        this.calculateOptimalZoom();
    }

    calculateOptimalZoom() {
        const container = document.getElementById('orgChartContainer');
        const grid = document.getElementById('teamGrid');
        const orgChart = grid.querySelector('.org-chart');
        
        if (!container || !grid || !orgChart) return;

        // Get container dimensions
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // Get the actual rendered size of the org chart
        const chartWidth = orgChart.scrollWidth;
        const chartHeight = orgChart.scrollHeight;

        // Calculate zoom to fit both width and height with some padding
        const padding = 60; // pixels of padding on each side
        const zoomX = (containerWidth - padding * 2) / chartWidth;
        const zoomY = (containerHeight - padding * 2) / chartHeight;
        
        // Use the smaller zoom to ensure everything fits
        const optimalZoom = Math.min(zoomX, zoomY, 1); // Don't zoom in beyond 100%
        
        // Make it 25% bigger for the base zoom (100% view)
        const adjustedZoom = optimalZoom * 1.25;
        
        // Store this as the base zoom (100% view)
        this.baseZoomLevel = Math.max(0.2, Math.min(adjustedZoom, 1)); // Cap at 1.0
        
        // Set the zoom to the base level and center the chart
        this.zoomLevel = this.baseZoomLevel;
        this.panX = 0;
        this.panY = 0;
        this.updateTransform();
        this.updateZoomDisplay();
    }

    setZoom(level) {
        this.zoomLevel = Math.max(0.3, Math.min(2, level));
        this.updateTransform();
        this.updateZoomDisplay();
    }

    updateTransform() {
        const container = document.getElementById('teamGrid');
        if (container) {
            container.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
            container.style.transformOrigin = 'top center';
        }
    }

    updateZoomDisplay() {
        const zoomDisplay = document.getElementById('zoomLevel');
        if (zoomDisplay) {
            // Calculate percentage relative to base zoom (100% = entire chart visible)
            const percentage = Math.round((this.zoomLevel / this.baseZoomLevel) * 100);
            zoomDisplay.textContent = percentage + '%';
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new TeamManager();
});

