// Load the dictionary data
fetch('dict.json')
    .then(response => response.json())
    .then(data => {
        const dictionary = data;

        // Add event listener to the input field
        const inputField = document.getElementById('pinyin-input');
        const suggestionsList = document.getElementById('suggestions');

        inputField.addEventListener('input', () => {
            const query = inputField.value.trim().toLowerCase();
            
            // Clear previous suggestions
            suggestionsList.innerHTML = '';

            if (query) {
                // Filter dictionary based on the query
                const matches = dictionary.filter(entry => entry.Pinyin.startsWith(query));

                // Sort matches by frequency (descending)
                matches.sort((a, b) => b.Frequency - a.Frequency);

                // Display top 10 suggestions
                matches.slice(0, 10).forEach(match => {
                    const listItem = document.createElement('li');
                    listItem.textContent = `${match.Chinese} (${match.Pinyin})`;
                    suggestionsList.appendChild(listItem);
                });
            }
        });
    })
    .catch(error => console.error('Error loading dictionary:', error));