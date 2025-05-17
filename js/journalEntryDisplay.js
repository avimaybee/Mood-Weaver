import { handleDeleteEntry } from './script.js';

// Get DOM elements needed for this module
const entriesList = document.getElementById('entries-list');
const searchInput = document.getElementById('search-input');

// Function to display entries
export function displayEntries(entriesToDisplay, activeFilterTags, searchInput, handleDeleteEntryCallback) {
    entriesList.innerHTML = ''; // Clear current list

    // Filter entries based on activeFilterTags
    const filteredEntries = entriesToDisplay.filter(entry => {
        if (activeFilterTags.length === 0) {
            return true; // Show all entries if no filter is active
        }
        // Check if entry has ALL activeFilterTags
        return activeFilterTags.every(filterTag => 
            entry.tags && entry.tags.includes(filterTag) && entry.tags.length > 0
        );
    });

    // Further filter by search input if it's not empty
    const searchTerm = searchInput.value.toLowerCase(); // Access searchInput here
    const searchedEntries = filteredEntries.filter(entry => {
        if (searchTerm === '') {
            return true; // No search term, include all filtered entries
        }
        // Check if content or any tag includes the search term
        const contentMatch = entry.content && entry.content.toLowerCase().includes(searchTerm);
        const tagsMatch = entry.tags && entry.tags.some(tag => tag.toLowerCase().includes(searchTerm));
        return contentMatch || tagsMatch;
    });

    if (searchedEntries.length === 0) {
        entriesList.innerHTML = '<p>No entries found matching your criteria.</p>';
        return;
    }

    searchedEntries.forEach(entry => {
        const entryElement = document.createElement('div');
        entryElement.classList.add('entry');
        entryElement.dataset.id = entry.id;

        if (entry.aiTitle) {
            const titleH3 = document.createElement('h3');
            titleH3.classList.add('entry-ai-title');
            titleH3.textContent = entry.aiTitle;
            entryElement.appendChild(titleH3);
        }

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('entry-content');
        contentDiv.innerHTML = entry.content.replace(/\n/g, '<br>');
        entryElement.appendChild(contentDiv);

        // Timestamp for the entry itself
        const entryTimestampSpan = document.createElement('span');
        entryTimestampSpan.classList.add('timestamp');
        entryTimestampSpan.textContent = `Saved: ${entry.timestamp ? formatUserFriendlyTimestamp(entry.timestamp) : 'Saving...'}`;
        entryElement.appendChild(entryTimestampSpan);

        // Display tags
        const tagsDiv = document.createElement('div');
        tagsDiv.classList.add('entry-tags');
        if (entry.tags && entry.tags.length > 0) {
            tagsDiv.innerHTML = entry.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
        }

        // AI Insights Section
        const aiInsightsContainer = document.createElement('div');
        aiInsightsContainer.classList.add('ai-insights-container');

        const aiInsightsDiv = document.createElement('div');
        aiInsightsDiv.classList.add('ai-insights');

        if (entry.aiError) {
            aiInsightsDiv.innerHTML = `<p class="ai-error"><strong>AI Analysis:</strong> Error - ${entry.aiError}</p>`;
        } else if (entry.aiTitle || entry.aiGreeting) {
            let insightsHtml = '';
            if (entry.aiGreeting) {
                insightsHtml += `<p class="ai-greeting"><em>${entry.aiGreeting}</em></p>`;
                }
            if (entry.aiObservations) {
                insightsHtml += `<p class="ai-observation"><strong>Observations:</strong> ${entry.aiObservations}</p>`;
                }
            if (entry.aiSentimentAnalysis) {
                insightsHtml += `<p class="ai-sentiment-analysis"><strong>Sentiment:</strong> ${entry.aiSentimentAnalysis}</p>`;
                }
            if (entry.aiReflectivePrompt) {
                insightsHtml += `<p class="ai-reflective-prompt"><strong>Reflect:</strong> ${entry.aiReflectivePrompt}</p>`;
                }
            insightsHtml += '<p class="ai-timestamp">' + (entry.aiTimestamp ? `Analyzed: ${formatUserFriendlyTimestamp(entry.aiTimestamp)}` : 'Analyzing...') + '</p>';
            aiInsightsDiv.innerHTML = insightsHtml;
        } else if (entry.timestamp) { // Check if there's at least a timestamp to indicate processing
             aiInsightsDiv.innerHTML = '<p class="ai-processing">Processing AI analysis...</p>';
        } else {
            aiInsightsDiv.innerHTML = '<p class="ai-unavailable">AI analysis not yet available.</p>';
        }

        aiInsightsContainer.appendChild(aiInsightsDiv);
        entryElement.appendChild(aiInsightsContainer);

        const controlsDiv = document.createElement('div');
        controlsDiv.classList.add('entry-controls');

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-entry-button');
        deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i> Delete';
        deleteButton.dataset.id = entry.id;
        // Attach listener using the passed handleDeleteEntryCallback
        deleteButton.addEventListener('click', () => handleDeleteEntryCallback(entry.id));

        controlsDiv.appendChild(deleteButton);

        // Add AI Toggle button/icon and label
        const aiToggleButton = document.createElement('div');
        aiToggleButton.classList.add('ai-toggle-button');
        const aiToggleContent = document.createElement('span');
        aiToggleContent.classList.add('ai-toggle-content');
        aiToggleContent.innerHTML = '<i class="fas fa-chevron-down"></i> <i class="fas fa-star ai-icon-star"></i>';
        aiToggleButton.appendChild(aiToggleContent);
        aiToggleButton.title = 'Toggle AI Analysis Details';
        aiToggleButton.addEventListener('click', () => {
            entryElement.classList.toggle('expanded');
            const icon = aiToggleButton.querySelector('i.fa-chevron-down, i.fa-chevron-up');
            const starIcon = aiToggleButton.querySelector('.ai-icon-star');

             if (entryElement.classList.contains('expanded')) {
                 icon.classList.remove('fa-chevron-down');
                 icon.classList.add('fa-chevron-up');
             } else {
                 icon.classList.remove('fa-chevron-up');
                 icon.classList.add('fa-chevron-down');
              }
          });

        // Create a container for tags and controls
        const bottomRowDiv = document.createElement('div');
        bottomRowDiv.classList.add('entry-bottom-row');

        // Need tagsDiv here, which is created within displayEntries currently
        // Let's create it here for now, assuming tags are part of the entry object
         const entryTagsDiv = document.createElement('div');
        entryTagsDiv.classList.add('entry-tags');
        if (entry.tags && entry.tags.length > 0) {
            entryTagsDiv.innerHTML = entry.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
        }

        // Append elements to bottomRowDiv in correct order
        bottomRowDiv.appendChild(controlsDiv);
        bottomRowDiv.appendChild(entryTagsDiv); // Use entryTagsDiv here
        bottomRowDiv.appendChild(aiToggleButton);

        // Append the bottomRowDiv to the main entry element
        entryElement.appendChild(bottomRowDiv);

        entriesList.appendChild(entryElement);
    });

    // Note: Calling renderAvailableTags and renderFilterTags will need to be done from the main script or tagging module
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
    } else if (entryDateOnly.getTime() > sevenDaysAgo.getTime()) { // Check if the entry date is AFTER sevenDaysAgo (i.e., within the last 7 days)
        const diffTime = Math.abs(today.getTime() - entryDateOnly.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return `${diffDays} days ago, ${timeString}`;
    } else {
        const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        const dateString = date.toLocaleDateString('en-US', dateOptions);
        return `${dateString}, ${timeString}`;
    }
} 