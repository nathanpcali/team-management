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
            
            // Check if Lauren Shawe (ID: 58) exists - if not, clear and reload
            const hasLaurenShawe = members.some(m => m.id === '58');
            if (!hasLaurenShawe) {
                console.log('Lauren Shawe not found in data. Clearing localStorage and reloading...');
                localStorage.removeItem('harborTeamMembers');
                return this.getInitialTeamMembers();
            }
            
            // Migrate hierarchy changes: update reporting relationships
            const updatedMembers = this.migrateHierarchy(members);
            return updatedMembers || members;
        }
        // If no stored data, initialize with team from organizational chart
        return this.getInitialTeamMembers();
    }

    // Migrate hierarchy to match latest structure
    migrateHierarchy(members) {
        let needsUpdate = false;
        const memberMap = new Map();
        members.forEach(m => memberMap.set(m.id, m));

        // Remove EP - Bryan Cook if it exists (should not be there)
        const epBryanCook = memberMap.get('51');
        if (epBryanCook && epBryanCook.name === 'EP - Bryan Cook') {
            const index = members.findIndex(m => m.id === '51' && m.name === 'EP - Bryan Cook');
            if (index !== -1) {
                members.splice(index, 1);
                needsUpdate = true;
            }
        }

        // Add EPs if they don't exist
        const epMappings = [
            { id: '52', name: 'EP - Aaron Porzel', title: 'EP', pairedWith: '3', reportsTo: '1', position: 'left' },
            { id: '58', name: 'Lauren Shawe', title: 'EP', pairedWith: '3', reportsTo: '1', position: 'right' },
            { id: '53', name: 'EP - Art Castle', title: 'EP', pairedWith: '4', reportsTo: '1' },
            { id: '54', name: 'EP - Jesse Thompson', title: 'EP', pairedWith: '5', reportsTo: '1' },
            { id: '55', name: 'EP - Jefferson Chaney', title: 'EP', pairedWith: '6', reportsTo: '1' },
            { id: '60', name: 'Greg Zimny', title: 'EP', pairedWith: '7', reportsTo: '1', position: 'left' },
            { id: '57', name: 'EP - Nate Cali', title: 'EP', pairedWith: '8', reportsTo: '1' }
        ];

        epMappings.forEach(ep => {
            if (!memberMap.has(ep.id)) {
                // Check if the paired member exists
                if (memberMap.has(ep.pairedWith)) {
                    members.push({
                        id: ep.id,
                        name: ep.name,
                        title: ep.title,
                        photo: '',
                        notes: '',
                        links: [],
                        reportsTo: ep.reportsTo,
                        pairedWith: ep.pairedWith,
                        position: ep.position || 'left'
                    });
                    needsUpdate = true;
                }
            } else {
                // Ensure existing EP has pairedWith property and correct structure
                const existingEP = memberMap.get(ep.id);
                if (!existingEP.hasOwnProperty('pairedWith') || existingEP.pairedWith !== ep.pairedWith) {
                    existingEP.pairedWith = ep.pairedWith;
                    needsUpdate = true;
                }
                // Update position if specified
                if (ep.position && existingEP.position !== ep.position) {
                    existingEP.position = ep.position;
                    needsUpdate = true;
                }
                // Remove any old inline display properties if they exist
                if (existingEP.hasOwnProperty('inlineDisplay')) {
                    delete existingEP.inlineDisplay;
                    needsUpdate = true;
                }
            }
        });

        // Update Jefferson Chaney's team (ID: '6')
        const jeffersonChaneyId = '6';
        const jeffersonTeam = ['18', '28', '39', '47', '50']; // Dave Bauer, John Gerbec, Shane Scherholz, Nancy Zhong, Steven Barber
        
        jeffersonTeam.forEach(memberId => {
            const member = memberMap.get(memberId);
            if (member && member.reportsTo !== jeffersonChaneyId) {
                member.reportsTo = jeffersonChaneyId;
                needsUpdate = true;
            }
        });

        // Update Justin Sirizzotti's team (ID: '7')
        // Craig Holzer reports to Justin Sirizzotti
        const craigHolzer = memberMap.get('19');
        if (craigHolzer && craigHolzer.reportsTo !== '7') {
            craigHolzer.reportsTo = '7';
            needsUpdate = true;
        }
        
        // Joe Duva reports to Craig Holzer (ID: '19')
        const joeDuva = memberMap.get('29');
        if (joeDuva && joeDuva.reportsTo !== '19') {
            joeDuva.reportsTo = '19';
            needsUpdate = true;
        }
        
        // Chris Fontes reports to Julia Marshall (ID: '30')
        const chrisFontes = memberMap.get('31');
        if (chrisFontes && chrisFontes.reportsTo !== '30') {
            chrisFontes.reportsTo = '30';
            needsUpdate = true;
        }
        
        // Fix Matt Matsil - should be under Art Castle (ID: 4) as AE, not EP
        // Check if there's a Matt Matsil with wrong ID or wrong reporting
        const mattMatsilOld = memberMap.get('51');
        if (mattMatsilOld && mattMatsilOld.name === 'Matt Matsil') {
            // This is the old Matt Matsil entry - update it
            mattMatsilOld.id = '59';
            mattMatsilOld.title = 'AE';
            mattMatsilOld.reportsTo = '4';
            delete mattMatsilOld.pairedWith;
            delete mattMatsilOld.position;
            needsUpdate = true;
        }
        
        // Also check if Matt Matsil exists with ID 59 and fix if needed
        const mattMatsil = memberMap.get('59');
        if (mattMatsil && mattMatsil.name === 'Matt Matsil') {
            if (mattMatsil.reportsTo !== '4' || mattMatsil.title !== 'AE') {
                mattMatsil.reportsTo = '4';
                mattMatsil.title = 'AE';
                delete mattMatsil.pairedWith;
                delete mattMatsil.position;
                needsUpdate = true;
            }
        }

        // Save if any changes were made
        if (needsUpdate) {
            localStorage.setItem('harborTeamMembers', JSON.stringify(members));
        }
        
        return members;
    }

    // Get initial team members from organizational chart with reporting relationships
    getInitialTeamMembers() {
        return [
            // Top level - no reportsTo
            { id: '1', name: 'Bryan Cook', title: 'ECD', photo: '', notes: '', links: [], reportsTo: null },
            // Second level - report to top level
            // EPs (Executive Producers) - positioned to the left of CDs
            { id: '52', name: 'EP - Aaron Porzel', title: 'EP', photo: '', notes: '', links: [], reportsTo: '1', pairedWith: '3', position: 'left' },
            { id: '3', name: 'Aaron Porzel', title: 'CD', photo: '', notes: '', links: [], reportsTo: '1' },
            { id: '58', name: 'Lauren Shawe', title: 'EP', photo: '', notes: '', links: [], reportsTo: '1', pairedWith: '3', position: 'right' },
            { id: '53', name: 'EP - Art Castle', title: 'EP', photo: '', notes: '', links: [], reportsTo: '1', pairedWith: '4' },
            { id: '4', name: 'Art Castle', title: 'CD', photo: '', notes: '', links: [], reportsTo: '1' },
            { id: '54', name: 'EP - Jesse Thompson', title: 'EP', photo: '', notes: '', links: [], reportsTo: '1', pairedWith: '5' },
            { id: '5', name: 'Jesse Thompson', title: 'CD', photo: '', notes: '', links: [], reportsTo: '1' },
            { id: '55', name: 'EP - Jefferson Chaney', title: 'EP', photo: '', notes: '', links: [], reportsTo: '1', pairedWith: '6' },
            { id: '6', name: 'Jefferson Chaney', title: 'CD', photo: '', notes: '', links: [], reportsTo: '1' },
            { id: '60', name: 'Greg Zimny', title: 'EP', photo: '', notes: '', links: [], reportsTo: '1', pairedWith: '7', position: 'left' },
            { id: '7', name: 'Justin Sirizzotti', title: 'ACD', photo: '', notes: '', links: [], reportsTo: '1' },
            { id: '57', name: 'EP - Nate Cali', title: 'EP', photo: '', notes: '', links: [], reportsTo: '1', pairedWith: '8' },
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
            { id: '18', name: 'Dave Bauer', title: 'Senior Editor', photo: '', notes: '', links: [], reportsTo: '6' },
            { id: '19', name: 'Craig Holzer', title: 'Senior Editor', photo: '', notes: '', links: [], reportsTo: '7' },
            { id: '20', name: 'Dana Apuzzo', title: 'Senior Editor', photo: '', notes: '', links: [], reportsTo: '7' },
            { id: '21', name: 'Josh Moise', title: 'Senior Editor', photo: '', notes: '', links: [], reportsTo: '7' },
            { id: '22', name: 'Vic Barczyk', title: 'Senior Editor', photo: '', notes: '', links: [], reportsTo: '7' },
            { id: '23', name: 'Quenton Jones', title: 'Senior Editor', photo: '', notes: '', links: [], reportsTo: '8' },
            // Fourth level
            { id: '24', name: 'Cassandra Tyler', title: 'Senior Editor', photo: '', notes: '', links: [], reportsTo: '14' },
            { id: '25', name: 'Kate Hershey', title: 'AE', photo: '', notes: '', links: [], reportsTo: '15' },
            { id: '26', name: 'Karla Llompart', title: 'Editor', photo: '', notes: '', links: [], reportsTo: '16' },
            { id: '27', name: 'Stephen Noll', title: 'Editor', photo: '', notes: '', links: [], reportsTo: '17' },
            { id: '28', name: 'John Gerbec', title: 'Senior Editor', photo: '', notes: '', links: [], reportsTo: '6' },
            { id: '29', name: 'Joe Duva', title: 'AE', photo: '', notes: '', links: [], reportsTo: '19' },
            { id: '30', name: 'Julia Marshall', title: 'Editor', photo: '', notes: '', links: [], reportsTo: '20' },
            { id: '31', name: 'Chris Fontes', title: 'AE', photo: '', notes: '', links: [], reportsTo: '30' },
            { id: '32', name: 'Vanessa Aoki', title: 'Editor', photo: '', notes: '', links: [], reportsTo: '21' },
            { id: '33', name: 'Thomas Irreno Pinilla', title: 'PGD Editor', photo: '', notes: '', links: [], reportsTo: '22' },
            { id: '34', name: 'Luke Nelson', title: 'AE', photo: '', notes: '', links: [], reportsTo: '23' },
            // Fifth level
            { id: '35', name: 'Rob Sheppard', title: 'Editor', photo: '', notes: '', links: [], reportsTo: '24' },
            { id: '36', name: 'Annie Kalfas', title: 'Associate Editor', photo: '', notes: '', links: [], reportsTo: '25' },
            { id: '37', name: 'Jacob Fagliano', title: 'Editor', photo: '', notes: '', links: [], reportsTo: '26' },
            { id: '38', name: 'Louie LaFleur', title: 'Editor', photo: '', notes: '', links: [], reportsTo: '27' },
            { id: '39', name: 'Shane Scherholz', title: 'Junior Editor', photo: '', notes: '', links: [], reportsTo: '6' },
            { id: '40', name: 'Kevin Curran', title: 'Editor', photo: '', notes: '', links: [], reportsTo: '32' },
            { id: '41', name: 'Manuel Pimentel', title: 'PGD Editor', photo: '', notes: '', links: [], reportsTo: '33' },
            { id: '42', name: 'Victoria Villa', title: 'AE', photo: '', notes: '', links: [], reportsTo: '34' },
            // Sixth level
            { id: '43', name: 'Cara Ross', title: 'Editor', photo: '', notes: '', links: [], reportsTo: '35' },
            { id: '44', name: 'Jack Cronin', title: 'Associate Editor', photo: '', notes: '', links: [], reportsTo: '36' },
            { id: '45', name: 'Steve Stanton', title: 'Editor', photo: '', notes: '', links: [], reportsTo: '37' },
            { id: '46', name: 'Ryan Quinlan', title: 'AE', photo: '', notes: '', links: [], reportsTo: '38' },
            { id: '47', name: 'Nancy Zhong', title: 'Editor', photo: '', notes: '', links: [], reportsTo: '6' },
            { id: '48', name: 'Santiago Vilabano', title: 'PGD Editor', photo: '', notes: '', links: [], reportsTo: '41' },
            // Seventh level
            { id: '49', name: 'Christian Cornejo', title: 'AE', photo: '', notes: '', links: [], reportsTo: '45' },
            { id: '50', name: 'Steven Barber', title: 'AE', photo: '', notes: '', links: [], reportsTo: '6' },
            // Eighth level
            { id: '59', name: 'Matt Matsil', title: 'AE', photo: '', notes: '', links: [], reportsTo: '4' }
        ];
    }

    // Save team members to localStorage
    saveToStorage() {
        localStorage.setItem('harborTeamMembers', JSON.stringify(this.teamMembers));
    }

    // Setup event listeners
    setupEventListeners() {
        // Search functionality
        this.setupSearch();
        
        // Logo click to reset zoom
        const resetZoomLogo = document.getElementById('resetZoomLogo');
        if (resetZoomLogo) {
            resetZoomLogo.addEventListener('click', () => {
                this.resetZoom();
            });
        }
        
        // Add member button
        document.getElementById('addMemberBtn').addEventListener('click', () => {
            this.openAddModal();
        });

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
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            this.setZoom(this.zoomLevel + delta);
        }, { passive: false });

        // Pan functionality with mouse drag
        container.addEventListener('mousedown', (e) => {
            if (e.button === 0 && !e.target.closest('.member-card')) { // Left mouse button, not on a card
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
        
        // Show CD selection and populate it
        const cdGroup = document.getElementById('cdSelectionGroup');
        const cdSelect = document.getElementById('memberCD');
        cdGroup.style.display = 'block';
        this.populateCDDropdown(cdSelect);
        
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

        // Hide CD selection when editing (reporting relationship is preserved)
        document.getElementById('cdSelectionGroup').style.display = 'none';

        // Hide CD selection when editing (reporting relationship is preserved)
        document.getElementById('cdSelectionGroup').style.display = 'none';

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
        document.getElementById('cdSelectionGroup').style.display = 'none';
        this.currentEditingId = null;
    }

    // Populate CD dropdown with all Creative Directors
    populateCDDropdown(selectElement) {
        // Clear existing options except the first one
        selectElement.innerHTML = '<option value="">Select a Creative Director...</option>';
        
        // Find all CDs and ACDs (Creative Directors and Associate Creative Directors)
        const cds = this.teamMembers.filter(member => {
            const title = (member.title || '').toUpperCase();
            return title === 'CD' || title === 'ACD' || title.includes('CREATIVE DIRECTOR');
        });
        
        // Add each CD as an option
        cds.forEach(cd => {
            const option = document.createElement('option');
            option.value = cd.id;
            option.textContent = cd.name;
            selectElement.appendChild(option);
        });
    }

    // Populate CD dropdown for detail modal
    populateCDDropdownForDetail(selectElement, currentReportsTo) {
        // Clear existing options
        selectElement.innerHTML = '<option value="">Select a Creative Director...</option>';
        
        // Find all CDs and ACDs (Creative Directors and Associate Creative Directors)
        const cds = this.teamMembers.filter(member => {
            const title = (member.title || '').toUpperCase();
            return title === 'CD' || title === 'ACD' || title.includes('CREATIVE DIRECTOR');
        });
        
        // Add each CD as an option
        cds.forEach(cd => {
            const option = document.createElement('option');
            option.value = cd.id;
            option.textContent = cd.name;
            if (cd.id === currentReportsTo) {
                option.selected = true;
            }
            selectElement.appendChild(option);
        });
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
            const selectedCD = document.getElementById('memberCD').value;
            const memberData = {
                name,
                title,
                photo,
                notes,
                links,
                reportsTo: selectedCD || null // Set to selected CD or null if none selected
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

        // CD Selection Dropdown (only show if not ECD and not EP)
        const isECD = member.id === '1' || member.reportsTo === null;
        const isEP = member.title && member.title.toLowerCase() === 'ep';
        
        if (!isECD && !isEP) {
            const currentCD = member.reportsTo ? this.teamMembers.find(m => m.id === member.reportsTo) : null;
            const currentCDName = currentCD ? currentCD.name : 'None';
            
            html += `
                <div class="detail-section">
                    <h3>Reports To</h3>
                    <select id="detailCDSelect" class="detail-select">
                        <option value="">Select a Creative Director...</option>
                    </select>
                    <p class="detail-current-cd">Current: ${this.escapeHtml(currentCDName)}</p>
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

        // Links (REEL)
        if (member.links && member.links.length > 0) {
            html += `
                <div class="detail-section">
                    <h3>REEL</h3>
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
        
        // Populate CD dropdown if it exists
        if (!isECD && !isEP) {
            const cdSelect = document.getElementById('detailCDSelect');
            if (cdSelect) {
                this.populateCDDropdownForDetail(cdSelect, member.reportsTo);
                
                // Add change event listener
                cdSelect.addEventListener('change', (e) => {
                    const selectedCDId = e.target.value;
                    if (selectedCDId && selectedCDId !== member.reportsTo) {
                        member.reportsTo = selectedCDId;
                        this.saveToStorage();
                        this.renderTeam();
                        // Close modal and reopen to show updated info
                        setTimeout(() => {
                            this.openDetailModal(member);
                        }, 100);
                    }
                });
            }
        }
        
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

        // Add click listeners and drag handlers to cards
        this.setupCardInteractions(grid);
    }

    // Render organizational chart
    renderOrgChart() {
        // Build hierarchy tree
        const hierarchy = this.buildHierarchy();
        console.log('Rendering org chart with hierarchy:', hierarchy);
        // Force all EPs to use standard layout (no inline/right-side special cases)
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
        
        // For level 0, sort to ensure EPs appear with their paired members
        rootMembers.sort((a, b) => {
            // If one has a pairedWith, sort by the paired ID
            if (a.pairedWith && b.pairedWith) {
                return a.pairedWith.localeCompare(b.pairedWith);
            }
            if (a.pairedWith) {
                return a.pairedWith.localeCompare(b.id);
            }
            if (b.pairedWith) {
                return a.id.localeCompare(b.pairedWith);
            }
            return a.id.localeCompare(b.id);
        });

        return rootMembers;
    }

    // Render hierarchy level recursively
    renderHierarchyLevel(members, level, parentId = null) {
        if (!members || members.length === 0) return '';

        let html = `<div class="org-level level-${level}">`;
        
        // For level 0 and level 1, group EPs with their paired members
        if (level === 0 || level === 1) {
            const processed = new Set();
            
            // First, find all EPs and their paired CDs
            const epMap = new Map();
            members.forEach(member => {
                if (member.pairedWith) {
                    epMap.set(member.pairedWith, member);
                }
            });
            
            members.forEach(member => {
                if (processed.has(member.id)) return;
                
                // Skip EPs (they'll be rendered with their paired CD)
                if (member.pairedWith) {
                    processed.add(member.id);
                    return;
                }
                
                // Check if this member has a paired EP
                const pairedEP = epMap.get(member.id);
                
                if (pairedEP) {
                    // Check if this member has multiple EPs (like Aaron with left and right EPs)
                    const allEPs = members.filter(m => m.pairedWith === member.id);
                    const leftEP = allEPs.find(ep => ep.position === 'left' || !ep.position);
                    const rightEP = allEPs.find(ep => ep.position === 'right');
                    
                    const teamId = member.id; // Use CD's ID for team color
                    
                    if (leftEP && rightEP) {
                        // Special case: Aaron has EPs on both sides
                        html += `<div class="ep-cd-pair ep-cd-pair-both">`;
                        
                        // EP on the left
                        html += `<div class="org-node ep-node ${teamId ? 'team-' + teamId : ''}" data-team-id="${teamId || ''}">`;
                        html += this.createMemberCard(leftEP, true);
                        html += '</div>';
                        
                        // CD in the middle
                        html += `<div class="org-node ${teamId ? 'team-' + teamId : ''}" data-team-id="${teamId || ''}">`;
                        html += this.createMemberCard(member, true);
                        
                        if (member.children && member.children.length > 0) {
                            html += `<div class="org-children ${teamId ? 'team-' + teamId : ''}" data-team-id="${teamId || ''}">`;
                            html += this.renderHierarchyLevel(member.children, level + 1, teamId);
                            html += '</div>';
                        }
                        
                        html += '</div>'; // Close CD node
                        
                        // EP on the right
                        html += `<div class="org-node ep-node ep-node-right ${teamId ? 'team-' + teamId : ''}" data-team-id="${teamId || ''}">`;
                        html += this.createMemberCard(rightEP, true);
                        html += '</div>';
                        
                        html += '</div>'; // Close ep-cd-pair-both
                        
                        processed.add(member.id);
                        processed.add(leftEP.id);
                        processed.add(rightEP.id);
                    } else {
                        // Standard layout: EP on left, CD on right
                        html += `<div class="ep-cd-pair">`;
                        
                        // EP on the left
                        html += `<div class="org-node ep-node ${teamId ? 'team-' + teamId : ''}" data-team-id="${teamId || ''}">`;
                        html += this.createMemberCard(pairedEP, true);
                        html += '</div>';
                        
                        // CD on the right
                        html += `<div class="org-node ${teamId ? 'team-' + teamId : ''}" data-team-id="${teamId || ''}">`;
                        html += this.createMemberCard(member, true);
                        
                        if (member.children && member.children.length > 0) {
                            html += `<div class="org-children ${teamId ? 'team-' + teamId : ''}" data-team-id="${teamId || ''}">`;
                            html += this.renderHierarchyLevel(member.children, level + 1, teamId);
                            html += '</div>';
                        }
                        
                        html += '</div>'; // Close CD node
                        html += '</div>'; // Close ep-cd-pair
                        
                        processed.add(member.id);
                        processed.add(pairedEP.id);
                    }
                } else {
                    // Regular member without EP pair
                    const teamId = member.id;
                    html += `<div class="org-node ${teamId ? 'team-' + teamId : ''}" data-team-id="${teamId || ''}">`;
                    html += this.createMemberCard(member, true);
                    
                    if (member.children && member.children.length > 0) {
                        html += `<div class="org-children ${teamId ? 'team-' + teamId : ''}" data-team-id="${teamId || ''}">`;
                        html += this.renderHierarchyLevel(member.children, level + 1, teamId);
                        html += '</div>';
                    }
                    
                    html += '</div>';
                    processed.add(member.id);
                }
            });
        } else {
            // For other levels, render normally
            members.forEach(member => {
                const isRoot = level === 0;
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
        }
        
        html += '</div>';
        return html;
    }

    // Create member card HTML with EP name next to the name
    createMemberCardWithEP(member, ep, isOrgChart = false) {
        let photoHtml = '';
        if (member.photo) {
            photoHtml = `<img src="${member.photo}" alt="${member.name}" class="member-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`;
        }
        
        // Fallback photo with initials
        const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        const photoFallback = `<div class="member-photo-placeholder" style="display: ${member.photo ? 'none' : 'flex'};">${initials}</div>`;
        
        const titleHtml = member.title ? `<div class="member-title">${this.escapeHtml(member.title)}</div>` : '';
        
        return `
            <div class="member-card" data-member-id="${member.id}">
                ${photoHtml}
                ${photoFallback}
                <div class="member-name-container">
                    <div class="member-name">${this.escapeHtml(member.name)}</div>
                    <div class="ep-name-inline">${this.escapeHtml(ep.name)}</div>
                </div>
                ${titleHtml}
            </div>
        `;
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

    // Setup card interactions (click only)
    setupCardInteractions(grid) {
        grid.querySelectorAll('.member-card').forEach((card) => {
            const memberId = card.dataset.memberId;
            const member = this.teamMembers.find(m => m.id === memberId);
            if (!member) return;

            // Click handler
            card.addEventListener('click', (e) => {
                if (!this.isPanning) {
                    this.openDetailModal(member);
                }
            });
        });
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
        
        // Calculate the scaled dimensions
        const scaledWidth = chartWidth * this.zoomLevel;
        const scaledHeight = chartHeight * this.zoomLevel;
        
        // Center the chart horizontally
        // Since the grid is positioned at left: 50%, panX = 0 means centered
        // We'll use transform to center it initially
        this.panX = 0;
        
        // Center the chart vertically if it's smaller than the container
        if (scaledHeight < containerHeight) {
            this.panY = (containerHeight - scaledHeight) / 2;
        } else {
            this.panY = 0;
        }
        
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
            // Position at left: 50% centers it, then translate by -50% to center the element itself
            // Then apply pan and scale
            container.style.transform = `translate(calc(-50% + ${this.panX}px), ${this.panY}px) scale(${this.zoomLevel})`;
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

    // Setup search functionality
    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');

        if (!searchInput || !searchResults) return;

        let searchTimeout;

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            
            clearTimeout(searchTimeout);
            
            if (query.length === 0) {
                searchResults.style.display = 'none';
                searchResults.innerHTML = '';
                return;
            }

            // Debounce search
            searchTimeout = setTimeout(() => {
                this.performSearch(query, searchResults);
            }, 150);
        });

        // Hide results when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });

        // Handle keyboard navigation
        searchInput.addEventListener('keydown', (e) => {
            const visibleResults = searchResults.querySelectorAll('.search-result-item:not([style*="display: none"])');
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const current = searchResults.querySelector('.search-result-item.highlighted');
                if (current) {
                    current.classList.remove('highlighted');
                    const next = current.nextElementSibling || visibleResults[0];
                    if (next) {
                        next.classList.add('highlighted');
                        next.scrollIntoView({ block: 'nearest' });
                    }
                } else if (visibleResults[0]) {
                    visibleResults[0].classList.add('highlighted');
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const current = searchResults.querySelector('.search-result-item.highlighted');
                if (current) {
                    current.classList.remove('highlighted');
                    const prev = current.previousElementSibling || visibleResults[visibleResults.length - 1];
                    if (prev) {
                        prev.classList.add('highlighted');
                        prev.scrollIntoView({ block: 'nearest' });
                    }
                } else if (visibleResults[visibleResults.length - 1]) {
                    visibleResults[visibleResults.length - 1].classList.add('highlighted');
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const highlighted = searchResults.querySelector('.search-result-item.highlighted');
                if (highlighted) {
                    highlighted.click();
                } else if (visibleResults[0]) {
                    visibleResults[0].click();
                }
            } else if (e.key === 'Escape') {
                searchResults.style.display = 'none';
                searchInput.value = '';
            }
        });
    }

    // Perform search and display results
    performSearch(query, searchResults) {
        const queryLower = query.toLowerCase().trim();
        const matches = this.teamMembers.filter(member => {
            const nameLower = member.name.toLowerCase();
            const titleLower = member.title.toLowerCase();
            return nameLower.includes(queryLower) || titleLower.includes(queryLower);
        });

        if (matches.length === 0) {
            searchResults.innerHTML = '<div class="search-result-item no-results">No matches found</div>';
            searchResults.style.display = 'block';
            return;
        }

        // Sort matches: exact name matches first, then starts with query, then contains query
        matches.sort((a, b) => {
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();
            
            // Exact match
            const aExact = aName === queryLower;
            const bExact = bName === queryLower;
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            
            // Starts with query
            const aStarts = aName.startsWith(queryLower);
            const bStarts = bName.startsWith(queryLower);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            
            // Alphabetical
            return a.name.localeCompare(b.name);
        });

        searchResults.innerHTML = matches.map(member => 
            `<div class="search-result-item" data-member-id="${member.id}">
                <div class="search-result-name">${this.highlightMatch(member.name, queryLower)}</div>
                <div class="search-result-title">${member.title}</div>
            </div>`
        ).join('');

        // Add click listeners to results
        searchResults.querySelectorAll('.search-result-item[data-member-id]').forEach(item => {
            item.addEventListener('click', () => {
                const memberId = item.dataset.memberId;
                const member = this.teamMembers.find(m => m.id === memberId);
                if (member) {
                    this.zoomToMember(member);
                    searchResults.style.display = 'none';
                    document.getElementById('searchInput').value = '';
                }
            });
        });

        searchResults.style.display = 'block';
    }

    // Highlight matching text in search results
    highlightMatch(text, query) {
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    // Zoom to a specific member's card
    zoomToMember(member) {
        // Try multiple selectors to find the card
        let card = document.querySelector(`.member-card[data-member-id="${member.id}"]`);
        
        // If not found, try finding by name (case-insensitive)
        if (!card) {
            const allCards = document.querySelectorAll('.member-card');
            for (let c of allCards) {
                const cardName = c.querySelector('.member-name')?.textContent?.trim();
                if (cardName && cardName.toLowerCase() === member.name.toLowerCase()) {
                    card = c;
                    break;
                }
            }
        }
        
        if (!card) {
            console.warn(`Card not found for member: ${member.name} (ID: ${member.id})`);
            this.renderTeam();
            setTimeout(() => this.zoomToMember(member), 200);
            return;
        }

        const container = document.getElementById('orgChartContainer');
        const grid = document.getElementById('teamGrid');
        
        if (!container || !grid) return;

        // Reset to base state
        this.setZoom(this.baseZoomLevel);
        this.panX = 0;
        this.panY = 0;
        this.updateTransform();
        
        // Wait for reset to complete
        setTimeout(() => {
            // Get current positions
            const containerRect = container.getBoundingClientRect();
            const gridRect = grid.getBoundingClientRect();
            const cardRect = card.getBoundingClientRect();
            
            // Card center in viewport
            const cardCenterX = (cardRect.left + cardRect.right) / 2;
            const cardCenterY = (cardRect.top + cardRect.bottom) / 2;
            
            // Container center in viewport
            const containerCenterX = containerRect.left + containerRect.width / 2;
            const containerCenterY = containerRect.top + containerRect.height / 2;
            
            // The grid transform is: translate(calc(-50% + panX), panY) scale(zoom)
            // Transform origin is 'top center', which means scaling happens from the center-top of the grid
            // The grid is positioned at left: 50%, so its natural center is at container center horizontally
            
            // Calculate where the card is relative to the grid's transform origin (top center)
            // Grid's transform origin in viewport coordinates
            const transformOriginX = gridRect.left + gridRect.width / 2; // Center of grid
            const transformOriginY = gridRect.top; // Top of grid
            
            // Card offset from transform origin
            const offsetX = cardCenterX - transformOriginX;
            const offsetY = cardCenterY - transformOriginY;
            
            // Target zoom
            const targetZoom = 2.0;
            
            // After transform, card will be at:
            // X: transformOriginX + (offsetX * targetZoom) + panX
            // Y: transformOriginY + (offsetY * targetZoom) + panY
            
            // We want card at container center:
            // containerCenterX = transformOriginX + (offsetX * targetZoom) + panX
            // containerCenterY = transformOriginY + (offsetY * targetZoom) + panY
            
            // Solve for pan:
            this.panX = containerCenterX - transformOriginX - (offsetX * targetZoom);
            this.panY = containerCenterY - transformOriginY - (offsetY * targetZoom);
            
            // Apply
            this.setZoom(targetZoom);
            this.updateTransform();
            
            // Fine-tune with iterative correction
            const fineTune = () => {
                const newCardRect = card.getBoundingClientRect();
                const newCardCenterX = (newCardRect.left + newCardRect.right) / 2;
                const newCardCenterY = (newCardRect.top + newCardRect.bottom) / 2;
                const newContainerRect = container.getBoundingClientRect();
                const newContainerCenterX = newContainerRect.left + newContainerRect.width / 2;
                const newContainerCenterY = newContainerRect.top + newContainerRect.height / 2;
                
                const errorX = newCardCenterX - newContainerCenterX;
                const errorY = newCardCenterY - newContainerCenterY;
                
                // Correct if error is significant
                if (Math.abs(errorX) > 5 || Math.abs(errorY) > 5) {
                    this.panX -= errorX / targetZoom;
                    this.panY -= errorY / targetZoom;
                    this.updateTransform();
                    // Try one more time if still off
                    setTimeout(fineTune, 50);
                } else {
                    // Success - add animation
                    card.style.animation = 'pulse 1s ease-in-out';
                    setTimeout(() => {
                        card.style.animation = '';
                    }, 1000);
                }
            };
            
            setTimeout(fineTune, 100);
        }, 100);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new TeamManager();
});

