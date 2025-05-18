import { handleDeleteEntry } from './script.js';
import { updateDoc, doc, getDoc, collection, query, orderBy, onSnapshot, deleteDoc } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";
import { getCurrentUser } from './auth.js';

// Get DOM elements needed for this module
const entriesList = document.getElementById('entries-list');

// Function to display entries
export function displayEntries(entriesToDisplay, activeFilterTags, searchInput, handleDeleteEntryCallback, handleEditClick, handleSaveClick, handleCancelClick, postDisplayCallback, db, currentUser, getLoadedEntriesCallback, displayEntriesCallback) {
    entriesList.innerHTML = ''; // Clear current list

    console.log('displayEntries received currentUser:', currentUser);
    console.log('displayEntries received activeFilterTags:', activeFilterTags);
    console.log('displayEntries received entriesToDisplay:', entriesToDisplay);

    // Ensure activeFilterTags is an array
    const safeFilterTags = Array.isArray(activeFilterTags) ? activeFilterTags : [];

    // Filter entries based on activeFilterTags (using OR condition)
    const filteredEntries = entriesToDisplay.filter(entry => {
        if (safeFilterTags.length === 0) {
            return true; // Show all entries if no filter is active
        }
        return entry.tags && entry.tags.length > 0 && safeFilterTags.some(filterTag => entry.tags.includes(filterTag));
    });

    // Further filter by search input if it's not empty
    const searchTerm = searchInput && searchInput.value ? searchInput.value.toLowerCase().trim() : '';
    const searchedEntries = filteredEntries.filter(entry => {
        if (!searchTerm) {
            return true; // No search term, include all filtered entries
        }
        const contentMatch = entry.content && entry.content.toLowerCase().includes(searchTerm);
        const tagsMatch = entry.tags && entry.tags.some(tag => tag.toLowerCase().includes(searchTerm));
        return contentMatch || tagsMatch;
    });

    if (searchedEntries.length === 0) {
        entriesList.innerHTML = '<p>No entries found matching your criteria.</p>';
        if (postDisplayCallback) {
            postDisplayCallback(searchedEntries);
        }
        return;
    }

    searchedEntries.forEach(entry => {
        const entryElement = document.createElement('div');
        entryElement.classList.add('entry');
        entryElement.dataset.id = entry.id;

        // View mode elements (initially visible)
        const viewModeDiv = document.createElement('div');
        viewModeDiv.classList.add('entry-view-mode');

        if (entry.aiTitle) {
            const titleH3 = document.createElement('h3');
            titleH3.classList.add('entry-ai-title');
            titleH3.textContent = entry.aiTitle;
            viewModeDiv.appendChild(titleH3);
        }

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('entry-content');
        contentDiv.innerHTML = entry.content.replace(/\n/g, '<br>');
        viewModeDiv.appendChild(contentDiv);

        const entryTimestampSpan = document.createElement('span');
        entryTimestampSpan.classList.add('timestamp');
        entryTimestampSpan.textContent = `Saved: ${entry.timestamp ? formatUserFriendlyTimestamp(entry.timestamp) : 'Saving...'}`;
        viewModeDiv.appendChild(entryTimestampSpan);

        const tagsDiv = document.createElement('div');
        tagsDiv.classList.add('entry-tags');
        if (entry.tags && entry.tags.length > 0) {
            tagsDiv.innerHTML = entry.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
        }
        viewModeDiv.appendChild(tagsDiv);

        // AI Insights Section
        const aiInsightsContainer = document.createElement('div');
        aiInsightsContainer.classList.add('ai-insights-container');

        const aiInsightsDiv = document.createElement('div');
        aiInsightsDiv.classList.add('ai-insights');

        if (entry.aiError) {
            aiInsightsDiv.innerHTML = `<p class="ai-error"><strong>AI Analysis:</strong> Error - ${entry.aiError}</p>`;
        } else if (entry.aiTitle || entry.aiGreeting) {
            let insightsHtml = '';
            if (entry.aiGreeting) insightsHtml += `<p class="ai-greeting"><em>${entry.aiGreeting}</em></p>`;
            if (entry.aiObservations) insightsHtml += `<p class="ai-observation"><strong>Observations:</strong> ${entry.aiObservations}</p>`;
            if (entry.aiSentimentAnalysis) insightsHtml += `<p class="ai-sentiment-analysis"><strong>Sentiment:</strong> ${entry.aiSentimentAnalysis}</p>`;
            if (entry.aiReflectivePrompt) insightsHtml += `<p class="ai-reflective-prompt"><strong>Reflect:</strong> ${entry.aiReflectivePrompt}</p>`;
            insightsHtml += '<p class="ai-timestamp">' + (entry.aiTimestamp ? `Analyzed: ${formatUserFriendlyTimestamp(entry.aiTimestamp)}` : 'Analyzing...') + '</p>';
            aiInsightsDiv.innerHTML = insightsHtml;
        } else if (entry.timestamp) {
            aiInsightsDiv.innerHTML = '<p class="ai-processing">Processing AI analysis...</p>';
        } else {
            aiInsightsDiv.innerHTML = '<p class="ai-unavailable">AI analysis not yet available.</p>';
        }

        aiInsightsContainer.appendChild(aiInsightsDiv);
        viewModeDiv.appendChild(aiInsightsContainer);

        // Edit mode elements container
        const editModeDiv = document.createElement('div');
        editModeDiv.classList.add('entry-edit-mode');
        editModeDiv.style.display = 'none';
        editModeDiv.dataset.id = entry.id;

        const editTitleInput = document.createElement('input');
        editTitleInput.type = 'text';
        editTitleInput.classList.add('edit-title-input');
        editTitleInput.placeholder = 'Edit Title (Optional)';
        editModeDiv.appendChild(editTitleInput);

        const editContentTextarea = document.createElement('textarea');
        editContentTextarea.classList.add('edit-content-textarea');
        editContentTextarea.placeholder = 'Edit your entry...';
        editModeDiv.appendChild(editContentTextarea);

        const editTagsArea = document.createElement('div');
        editTagsArea.classList.add('edit-tags-area');
        editTagsArea.innerHTML = '<p>Edit Tags:</p>';
        editModeDiv.appendChild(editTagsArea);

        const editTagInputContainer = document.createElement('div');
        editTagInputContainer.classList.add('tag-input-container');
        const editTagInput = document.createElement('input');
        editTagInput.type = 'text';
        editTagInput.classList.add('edit-tag-input');
        editTagInput.placeholder = 'Add tags...';
        const addEditTagButton = document.createElement('button');
        addEditTagButton.type = 'button';
        addEditTagButton.classList.add('button', 'is-small', 'add-edit-tag-button');
        addEditTagButton.innerHTML = '<i class="fas fa-check"></i>';
        editTagInputContainer.appendChild(editTagInput);
        editTagInputContainer.appendChild(addEditTagButton);
        editTagsArea.appendChild(editTagInputContainer);

        const currentEditTagsDiv = document.createElement('div');
        currentEditTagsDiv.classList.add('current-edit-tags');
        editTagsArea.appendChild(currentEditTagsDiv);

        // Controls for both modes
        const controlsDiv = document.createElement('div');
        controlsDiv.classList.add('entry-controls');

        const editButton = document.createElement('button');
        editButton.classList.add('edit-entry-button');
        editButton.innerHTML = '<i class="fas fa-edit"></i> Edit';
        editButton.dataset.id = entry.id;
        editButton.addEventListener('click', () => {
            console.log('Edit button clicked for entry:', entry.id);
            enterEditMode(entryElement, entry, db, currentUser, getLoadedEntriesCallback, displayEntriesCallback, searchInput, safeFilterTags);
        });

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-entry-button');
        deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i> Delete';
        deleteButton.dataset.id = entry.id;
        deleteButton.addEventListener('click', () => handleDeleteEntryCallback(entry.id));

        controlsDiv.appendChild(editButton);
        controlsDiv.appendChild(deleteButton);

        const saveButton = document.createElement('button');
        saveButton.classList.add('save-edit-button');
        saveButton.innerHTML = '<i class="fas fa-save"></i> Save';
        saveButton.style.display = 'none';
        saveButton.dataset.id = entry.id;

        const cancelButton = document.createElement('button');
        cancelButton.classList.add('cancel-edit-button');
        cancelButton.innerHTML = '<i class="fas fa-times"></i> Cancel';
        cancelButton.style.display = 'none';

        controlsDiv.appendChild(saveButton);
        controlsDiv.appendChild(cancelButton);

        // AI Toggle button
        const aiToggleButton = document.createElement('div');
        aiToggleButton.classList.add('ai-toggle-button');
        const aiToggleContent = document.createElement('span');
        aiToggleContent.classList.add('ai-toggle-content');
        aiToggleContent.innerHTML = '<i class="fas fa-chevron-down chevron-icon"></i> <i class="fas fa-star ai-icon-star"></i>';
        aiToggleButton.appendChild(aiToggleContent);
        aiToggleButton.title = 'Toggle AI Analysis Details';
        aiToggleButton.addEventListener('click', () => {
            entryElement.classList.toggle('expanded');
            const chevronIcon = aiToggleButton.querySelector('.chevron-icon');
            if (entryElement.classList.contains('expanded')) {
                chevronIcon.classList.remove('fa-chevron-down');
                chevronIcon.classList.add('fa-chevron-up');
            } else {
                chevronIcon.classList.remove('fa-chevron-up');
                chevronIcon.classList.add('fa-chevron-down');
            }
        });

        // Bottom row container
        const bottomRowDiv = document.createElement('div');
        bottomRowDiv.classList.add('entry-bottom-row');
        bottomRowDiv.appendChild(controlsDiv);
        bottomRowDiv.appendChild(aiToggleButton);

        // Append to entry element
        entryElement.appendChild(viewModeDiv);
        entryElement.appendChild(editModeDiv);
        entryElement.appendChild(bottomRowDiv);

        entriesList.appendChild(entryElement);
    });

    if (postDisplayCallback) {
        postDisplayCallback(searchedEntries);
    }
}

// Function to format user-friendly timestamp
export function formatUserFriendlyTimestamp(firestoreTimestamp) {
    if (!firestoreTimestamp || !firestoreTimestamp.toDate) {
        return 'Date not available';
    }

    const date = firestoreTimestamp.toDate();
    const now = new Date();

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const timeOptions = { hour: 'numeric', minute: 'numeric', hour12: true };
    const timeString = date.toLocaleTimeString('en-US', timeOptions);

    const entryDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (entryDateOnly.getTime() === today.getTime()) {
        return `Today, ${timeString}`;
    } else if (entryDateOnly.getTime() === yesterday.getTime()) {
        return `Yesterday, ${timeString}`;
    } else if (entryDateOnly.getTime() > sevenDaysAgo.getTime()) {
        const diffTime = Math.abs(today.getTime() - entryDateOnly.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return `${diffDays} days ago, ${timeString}`;
    } else {
        const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        const dateString = date.toLocaleDateString('en-US', dateOptions);
        return `${dateString}, ${timeString}`;
    }
}

// Helper function to render tags in the current edit tags area
function renderCurrentEditTags(tags, currentEditTagsDiv) {
    if (!currentEditTagsDiv) return;
    currentEditTagsDiv.innerHTML = '';
    const tagsArray = Array.isArray(tags) ? tags : [];
    tagsArray.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.classList.add('tag');
        tagSpan.textContent = tag;
        const removeTagSpan = document.createElement('span');
        removeTagSpan.classList.add('remove-tag');
        removeTagSpan.textContent = 'x';
        removeTagSpan.dataset.tag = tag;
        removeTagSpan.addEventListener('click', () => {
            removeTagFromEdit(tag, currentEditTagsDiv);
        });
        tagSpan.appendChild(removeTagSpan);
        currentEditTagsDiv.appendChild(tagSpan);
    });
}

// Helper function to add a tag to the current edit tags list in the UI
function addTagToEdit(tag, currentEditTagsDiv, editTagInput) {
    if (!currentEditTagsDiv || !editTagInput) return;
    const lowerCaseTag = tag.toLowerCase().trim();

    if (lowerCaseTag === '') {
        editTagInput.value = '';
        return;
    }

    const currentTags = Array.from(currentEditTagsDiv.querySelectorAll('.tag'))
        .map(tagSpan => tagSpan.textContent.replace(/x$/, '').trim());

    if (!currentTags.includes(lowerCaseTag)) {
        currentTags.push(lowerCaseTag);
        renderCurrentEditTags(currentTags, currentEditTagsDiv);
    }
    editTagInput.value = '';
}

// Helper function to remove a tag from the current edit tags list in the UI
function removeTagFromEdit(tagToRemove, currentEditTagsDiv) {
    if (!currentEditTagsDiv || !tagToRemove) return;
    const currentTags = Array.from(currentEditTagsDiv.querySelectorAll('.tag'))
        .map(tagSpan => tagSpan.textContent.replace(/x$/, '').trim());
    const updatedTags = currentTags.filter(t => t !== tagToRemove);
    renderCurrentEditTags(updatedTags, currentEditTagsDiv);
}

// Function to enter edit mode
export function enterEditMode(entryElement, entry, db, currentUser, getLoadedEntriesCallback, displayEntriesCallback, searchInput, activeFilterTags) {
    console.log('Entering edit mode for entry ID:', entry.id);
    const viewModeDiv = entryElement.querySelector('.entry-view-mode');
    const editModeDiv = entryElement.querySelector('.entry-edit-mode');
    const editTitleInput = editModeDiv.querySelector('.edit-title-input');
    const editContentTextarea = editModeDiv.querySelector('.edit-content-textarea');
    const currentEditTagsDiv = editModeDiv.querySelector('.current-edit-tags');
    const editTagInput = editModeDiv.querySelector('.edit-tag-input');
    const addEditTagButton = editModeDiv.querySelector('.add-edit-tag-button');

    editTitleInput.value = entry.aiTitle || '';
    editContentTextarea.value = entry.content || '';
    renderCurrentEditTags(entry.tags || [], currentEditTagsDiv);

    const addTagHandler = () => addTagToEdit(editTagInput.value, currentEditTagsDiv, editTagInput);
    addEditTagButton.addEventListener('click', addTagHandler);
    editTagInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTagHandler();
        }
    });

    viewModeDiv.style.display = 'none';
    editModeDiv.style.display = 'block';

    const controlsDiv = entryElement.querySelector('.entry-controls');
    const editButton = controlsDiv.querySelector('.edit-entry-button');
    const deleteButton = controlsDiv.querySelector('.delete-entry-button');
    const saveButton = controlsDiv.querySelector('.save-edit-button');
    const cancelButton = controlsDiv.querySelector('.cancel-edit-button');

    if (editButton) editButton.style.display = 'none';
    if (deleteButton) deleteButton.style.display = 'none';
    if (saveButton) saveButton.style.display = 'inline-block';
    if (cancelButton) cancelButton.style.display = 'inline-block';

    saveButton.addEventListener('click', async () => {
        const updatedContent = editContentTextarea.value.trim();
        const updatedTitle = editTitleInput.value.trim();
        const updatedTags = Array.from(currentEditTagsDiv.querySelectorAll('.tag'))
            .map(tagSpan => tagSpan.textContent.replace(/x$/, '').trim());
        await saveEntryChanges(entry.id, entryElement, db, getLoadedEntriesCallback, displayEntriesCallback, searchInput, activeFilterTags, updatedContent, updatedTitle, updatedTags);
    });

    cancelButton.addEventListener('click', () => cancelEditMode(entryElement));

    editTitleInput.focus();
}

// Function to cancel edit mode
export function cancelEditMode(entryElement) {
    console.log('Canceling edit mode.');
    const viewModeDiv = entryElement.querySelector('.entry-view-mode');
    const editModeDiv = entryElement.querySelector('.entry-edit-mode');

    if (editModeDiv) editModeDiv.style.display = 'none';
    if (viewModeDiv) viewModeDiv.style.display = 'block';

    const controlsDiv = entryElement.querySelector('.entry-controls');
    const editButton = controlsDiv.querySelector('.edit-entry-button');
    const deleteButton = controlsDiv.querySelector('.delete-entry-button');
    const saveButton = controlsDiv.querySelector('.save-edit-button');
    const cancelButton = controlsDiv.querySelector('.cancel-edit-button');

    if (saveButton) saveButton.style.display = 'none';
    if (cancelButton) cancelButton.style.display = 'none';
    if (editButton) editButton.style.display = 'inline-block';
    if (deleteButton) deleteButton.style.display = 'inline-block';

    const editTagInput = editModeDiv ? editModeDiv.querySelector('.edit-tag-input') : null;
    const currentEditTagsDiv = editModeDiv ? editModeDiv.querySelector('.current-edit-tags') : null;
    if (editTagInput) editTagInput.value = '';
    if (currentEditTagsDiv) currentEditTagsDiv.innerHTML = '';
}

// Function to save entry changes
export async function saveEntryChanges(entryId, entryElement, db, getLoadedEntriesCallback, displayEntriesCallback, searchInput, activeFilterTags, updatedContent, updatedTitle, updatedTags) {
    console.log('Attempting to save changes for entry ID:', entryId);
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.uid) {
        console.error('Attempted to save changes without logged-in user.');
        return;
    }

    console.log('Saving entry changes. ID:', entryId, 'Title:', updatedTitle, 'Content:', updatedContent, 'Tags:', updatedTags);

    const entryRef = doc(db, `users/${currentUser.uid}/entries`, entryId);
    console.log('Entry Reference Path:', entryRef.path);

    try {
        let existingDocData = null;
        try {
            const existingDoc = await getDoc(entryRef);
            if (existingDoc.exists()) {
                existingDocData = existingDoc.data();
                console.log('Existing document data before update:', existingDocData);
            } else {
                console.log('Document does not exist before update.');
            }
        } catch (fetchError) {
            console.error('Error fetching existing document before update:', fetchError);
        }

        await updateDoc(entryRef, {
            aiTitle: updatedTitle,
            content: updatedContent,
            tags: updatedTags,
        });

        console.log('Entry successfully updated in Firebase:', entryId);

        const loadedEntries = getLoadedEntriesCallback();
        const entryIndex = loadedEntries.findIndex(entry => entry.id === entryId);

        if (entryIndex !== -1) {
            loadedEntries[entryIndex].aiTitle = updatedTitle;
            loadedEntries[entryIndex].content = updatedContent;
            loadedEntries[entryIndex].tags = updatedTags;

            const viewModeDiv = entryElement.querySelector('.entry-view-mode');
            if (viewModeDiv) {
                const titleH3 = viewModeDiv.querySelector('.entry-ai-title');
                const contentDiv = viewModeDiv.querySelector('.entry-content');
                const tagsDiv = viewModeDiv.querySelector('.entry-tags');

                if (titleH3) {
                    if (updatedTitle) {
                        titleH3.textContent = updatedTitle;
                        titleH3.style.display = 'block';
                    } else {
                        titleH3.style.display = 'none';
                    }
                }
                if (contentDiv) contentDiv.innerHTML = updatedContent.replace(/\n/g, '<br>');
                if (tagsDiv) tagsDiv.innerHTML = updatedTags.map(tag => `<span class="tag">${tag}</span>`).join('');
            }
        }

        cancelEditMode(entryElement);
        // Re-render entries to reflect the updated tags
        displayEntriesCallback(
            loadedEntries,
            activeFilterTags,
            searchInput,
            (entryId) => handleDeleteEntry(entryId, currentUser, document.getElementById('entry-success'), db),
            (entryId) => enterEditMode(
                document.querySelector(`.entry[data-id="${entryId}"]`),
                loadedEntries.find(e => e.id === entryId),
                db,
                currentUser,
                getLoadedEntriesCallback,
                displayEntriesCallback,
                searchInput,
                activeFilterTags
            ),
            (entryId) => saveEntryChanges(
                entryId,
                document.querySelector(`.entry[data-id="${entryId}"]`),
                db,
                getLoadedEntriesCallback,
                displayEntriesCallback,
                searchInput,
                activeFilterTags,
                editContentTextarea.value.trim(),
                editTitleInput.value.trim(),
                Array.from(currentEditTagsDiv.querySelectorAll('.tag')).map(tagSpan => tagSpan.textContent.replace(/x$/, '').trim())
            ),
            (entryId) => cancelEditMode(document.querySelector(`.entry[data-id="${entryId}"]`)),
            displayEntriesCallback,
            db,
            currentUser,
            getLoadedEntriesCallback,
            displayEntriesCallback
        );
    } catch (error) {
        console.error('Error updating entry in Firebase:', error);
        throw error; // Let the caller handle the error
    }
}