// 📝 CENTRALIZED MESSAGES CONFIGURATION
// Edit all user-facing messages here for easy maintenance
const MESSAGES = {
    // 🎯 Competitive Position Messages
    competitive: {
        soloGoatAllOrNothing: '🔥 ALLES ODER NICHTS! ALLEINIGER GOAT 👑🐐 oder SCHEISSHAUFEN 💩!',
        soloGoatPotential: 'Wenn du richtig liegst, kannst du zum #1 GOAT 👑🐐 des Tages werden!',
        tiedGoatAllOrNothing: (players) => `Alles oder Nichts! Mit diesem Attempt wirst du Stand Jetzt GOAT 👑🐐 (zusammen mit ${players}) oder der Wordle-Scheißhaufen des Tages 💩!`,
        tiedGoatPotential: (players) => `🐐 Du könntest GOAT 👑🐐 werden (zusammen mit ${players})!`,
        tiedGoatWithFallback: (players) => `<br><small>Bei falschem Tipp würdest du immerhin noch ${players} schlagen</small>`,
        lastPlacePressure: '💩 Ohje... Wenn du jetzt falsch liegst verdienst du dir erstmal Wordle-Scheißhaufen des Tages zu werden. Pressure ON',
        lastPlacePressureTied: (players) => `💩 Ohje... Wenn du jetzt falsch liegst wirst du Wordle-Scheißhaufen des Tages (zusammen mit ${players}). Pressure ON`,
        alreadyLastPlace: 'Tja, Stand Jetzt bist du schon sicher Scheißhaufen des Tages. Aber streng dich trotzdem an, es können noch andere kommen 💩',
        sharedScheisshaufenOnSuccess: (players) => `💩 Bei richtigem Tipp teilst du dir immerhin den Scheißhaufen-Titel mit ${players}. Bei falschem wirst du alleiniger Scheißhaufen! 😱`,
        beatingPlayers: (players) => `schlagen: ${players}`,
        tyingWithPlayers: (players) => `gleichauf mit: ${players}`,
        wouldBeat: (actions) => `Du würdest ${actions}`,
        failScenario: (players) => `<br><small>Bei falschem Tipp würdest du immerhin noch ${players} schlagen</small>`,
        failPosition: '<br><small>Bei falschem Tipp: Position nach hinten</small>'
    },
    
    // 🏆 Game Over Messages
    gameOver: {
        winTitle: '🎉 Glückwunsch!',
        loseTitle: '😔 Schade!',
        winMessage: (word, attempts, score) => `<strong>Du hast das Wort "${word}" in ${attempts} Versuchen erraten!</strong><br><span style="color: #28a745; font-size: 1.2rem;">+${score} Punkte</span>`,
        loseMessage: (word) => `<strong>Das Wort war "${word}"</strong><br><span style="color: #dc3545;">Beim nächsten Mal klappt's bestimmt!</span>`
    },
    
    // ❌ Error Messages
    errors: {
        wordIncomplete: 'Wort muss vollständig sein!',
        invalidWord: 'Ungültiges Wort',
        submitError: 'Fehler beim Übermitteln des Wortes',
        newGameError: 'Fehler beim Starten eines neuen Spiels',
        usernameError: (error) => `Fehler: ${error}`,
        usernameSaveError: 'Fehler beim Speichern des Namens',
        leaderboardError: 'Fehler beim Laden der Bestenliste'
    },
    
    // 🖥️ UI Text
    ui: {
        welcome: 'Willkommen!',
        enterName: 'Bitte gib deinen Namen ein, um an der Bestenliste teilzunehmen:',
        namePlaceholder: 'Dein Name (max. 20 Zeichen)',
        saveButton: 'Speichern',
        newGameButton: 'Neues Spiel',
        leaderboardTitle: '🏆 Bestenliste (Heute)',
        updatedLeaderboardTitle: '🏆 Aktualisierte Bestenliste',
        noPlayersToday: 'Noch keine Spieler heute!',
        refreshTooltip: 'Bestenliste aktualisieren',
        toggleTooltip: 'Bestenliste ein-/ausblenden',
        currentUser: ' (Du)'
    },
    
    // 🔄 Word Override System
    override: {
        title: 'Wort erzwingen',
        message: 'Du kannst erzwingen, dass dieser Vorschlag angenommen wird. Bitte fair play und nur machen, wenn das ganz sicher ein deutsches, richtig geschriebenes Wort ist!',
        cancel: 'Abbrechen',
        submit: 'Trotzdem absenden',
        insistButton: 'Darauf bestehen'
    }
};

// Game state and configuration
let gameState = window.gameState;
gameState.scoreStored = false; // Initialize score tracking flag
let currentPosition = 0; // Track the currently active letter position
const API_BASE = '/api';

// DOM elements
const currentWordGrid = document.getElementById('currentWordGrid');
const attemptsContainer = document.getElementById('attemptsContainer');
const remainingAttemptsSpan = document.getElementById('remainingAttempts');
const statusSection = document.getElementById('statusSection');
const statusMessage = document.getElementById('statusMessage');
const keyboard = document.getElementById('keyboard');
const usernameModal = document.getElementById('usernameModal');
const leaderboardAside = document.querySelector('.leaderboard');
const usernameInput = document.getElementById('usernameInput');
const submitUsernameBtn = document.getElementById('submitUsername');
const gameOverModal = document.getElementById('gameOverModal');
const gameOverTitle = document.getElementById('gameOverTitle');
const gameOverMessage = document.getElementById('gameOverMessage');
const modalLeaderboardList = document.getElementById('modalLeaderboardList');
const closeGameOverModal = document.getElementById('closeGameOverModal');
const leaderboardList = document.getElementById('leaderboardList');
const toggleLeaderboard = document.getElementById('toggleLeaderboard');
const leaderboardContent = document.getElementById('leaderboardContent');
const toggleScoring = document.getElementById('toggleScoring');
const scoringInfo = document.getElementById('scoringInfo');
const currentPointsInfo = document.getElementById('currentPointsInfo');
const currentAttemptNumber = document.getElementById('currentAttemptNumber');
const pointsForAttempt = document.getElementById('pointsForAttempt');
const positionPreview = document.getElementById('positionPreview');
const playersToBeaten = document.getElementById('playersToBeaten');
const newLeaderboardPosition = document.getElementById('newLeaderboardPosition');

// Admin elements
const adminResetBtn = document.getElementById('adminResetBtn');
const adminPasswordModal = document.getElementById('adminPasswordModal');
const adminPasswordInput = document.getElementById('adminPasswordInput');
const confirmResetBtn = document.getElementById('confirmResetBtn');
const cancelResetBtn = document.getElementById('cancelResetBtn');

// Attempts viewer elements
const attemptsViewerModal = document.getElementById('attemptsViewerModal');
const attemptsViewerTitle = document.getElementById('attemptsViewerTitle');
const attemptsViewerContent = document.getElementById('attemptsViewerContent');

// Word Override Modal Elements
const overrideModal = document.getElementById('overrideModal');
const overrideWordDisplay = document.getElementById('overrideWordDisplay');
const cancelOverrideBtn = document.getElementById('cancelOverride');
const submitOverrideBtn = document.getElementById('submitOverride');
const closeAttemptsViewer = document.getElementById('closeAttemptsViewer');

// All-Time Leaderboard Elements
const toggleAlltime = document.getElementById('toggleAlltime');
const alltimeContent = document.getElementById('alltimeContent');
const alltimeList = document.getElementById('alltimeList');
const alltimeToggleIcon = document.querySelector('.alltime-toggle-icon');

// Initialize game
document.addEventListener('DOMContentLoaded', function() {
    setupUsernameModal();
    setupOverrideModal(); // Initialize word override system
    setupAlltimeLeaderboard(); // Initialize all-time leaderboard
    initializeGame();
    setupEventListeners();
    loadLeaderboardState();
    loadScoringState();
    updateAdminButtonVisibility(); // Initialize admin button visibility
    
    // Auto-refresh leaderboard every 10 seconds for near real-time updates
    setInterval(async () => {
        await updateLeaderboard();
    }, 10000);
    
    // More frequent updates during active gameplay
    setInterval(async () => {
        if (!gameState.gameOver && gameState.username) {
            await updateLeaderboard();
        }
    }, 5000);
});

function setupUsernameModal() {
    if (!gameState.username) {
        showUsernameModal();
    }
    
    submitUsernameBtn.addEventListener('click', submitUsername);
    usernameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            submitUsername();
        }
    });
    
    // Format username as user types (with slight delay)
    usernameInput.addEventListener('input', function(e) {
        setTimeout(() => formatUsernameInput(), 50);
    });
}

function showUsernameModal() {
    usernameModal.style.display = 'flex';
    // Hide leaderboard to prevent spoiling
    if (leaderboardAside) {
        leaderboardAside.style.display = 'none';
    }
    usernameInput.focus();
}

function hideUsernameModal() {
    usernameModal.style.display = 'none';
    // Show leaderboard again after username is set
    if (leaderboardAside) {
        leaderboardAside.style.display = 'block';
    }
    
    // Show current attempt input area and keyboard for new players (not returning players)
    // This will be hidden again if the game is already over
    const currentWordSection = document.querySelector('.current-word-section');
    const keyboardSection = document.querySelector('.keyboard-section');
    if (currentWordSection) {
        currentWordSection.style.display = 'block';
    }
    if (keyboardSection) {
        keyboardSection.style.display = 'block';
    }
}

function isUsernameModalOpen() {
    return usernameModal.style.display === 'flex';
}

function formatUsernameInput() {
    const currentValue = usernameInput.value;
    const cursorPosition = usernameInput.selectionStart;
    
    // Format to title case
    const formattedValue = toTitleCase(currentValue);
    
    if (formattedValue !== currentValue) {
        usernameInput.value = formattedValue;
        // Restore cursor position
        usernameInput.setSelectionRange(cursorPosition, cursorPosition);
    }
}

function toTitleCase(str) {
    return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

async function submitUsername() {
    let username = usernameInput.value.trim();
    
    if (!username) {
        alert('Bitte gib einen Namen ein!');
        return;
    }
    
    if (username.length > 20) {
        alert('Name darf maximal 20 Zeichen haben!');
        return;
    }
    
    // Format username before sending
    username = toTitleCase(username);
    
    try {
        const response = await fetch(`${API_BASE}/set_username`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: username })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Check if user has already played today
            if (result.already_played) {
                // User has already played - load their game state
                const loadedState = result.game_state;
                gameState = {
                    username: username,
                    wordLength: loadedState.word_length,
                    attempts: loadedState.attempts || [],
                    currentWord: loadedState.current_word || "",
                    gameOver: loadedState.game_over || false,
                    won: loadedState.won || false,
                    keyboardColors: loadedState.keyboard_colors || {},
                    remainingAttempts: loadedState.remaining_attempts || 0,
                    targetWord: loadedState.target_word,
                    scoreStored: true // Mark as already stored
                };
                
                hideUsernameModal();
                updatePointsDisplay();
                updateAdminButtonVisibility();
                
                // Update UI to show their previous attempts
                updateCurrentWordDisplay();
                updateAttemptsDisplay();
                updateKeyboardColors();
                updateRemainingAttempts();
                
                // Show game over status with target word
                showGameOverStatus(gameState.won, gameState.targetWord, true);
                
                // Show message about returning player and automatically open results modal
                alert(`${result.message}\n\nDeine Versuche von heute werden angezeigt.`);
                
                // Update leaderboard and automatically show results modal
                updateLeaderboard();
                
                // Automatically open the results modal after a short delay
                setTimeout(() => {
                    showGameOverModal(gameState.won, gameState.targetWord);
                }, 500);
                
                return;
            }
            
            // Check for warning about duplicate username (fallback case)
            if (result.warning) {
                if (confirm(`⚠️ ${result.warning}\n\nTrotzdem mit diesem Namen spielen?`)) {
                    gameState.username = username;
                    hideUsernameModal();
                    updatePointsDisplay();
                    updateAdminButtonVisibility(); // Show/hide admin button based on username
                } else {
                    // User declined, keep modal open
                    usernameInput.focus();
                    return;
                }
            } else {
                gameState.username = username;
                hideUsernameModal();
                updatePointsDisplay(); // Update points display when username is set
                updateAdminButtonVisibility(); // Show/hide admin button based on username
                updateLeaderboard(); // Refresh leaderboard to show updated data
            }
        } else {
            alert(MESSAGES.errors.usernameError(result.error));
        }
    } catch (error) {
        console.error('Error setting username:', error);
        alert(MESSAGES.errors.usernameSaveError);
    }
}

function initializeGame() {
    updateCurrentWordDisplay();
    updateAttemptsDisplay();
    updateKeyboardColors();
    updateRemainingAttempts();
    updatePointsDisplay();
    
    if (gameState.gameOver) {
        showGameOverStatus();
    } else {
        updateLeaderboard();
    }
}

function setupEventListeners() {
    // Keyboard clicks
    keyboard.addEventListener('click', handleKeyboardClick);
    
    // Input action buttons (moved outside keyboard)
    const backspaceKey = document.getElementById('backspaceKey');
    const enterKey = document.getElementById('enterKey');
    if (backspaceKey) {
        backspaceKey.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            handleKeyboardClick({ target: backspaceKey });
        });
    }
    if (enterKey) {
        enterKey.addEventListener('click', () => handleKeyboardClick({ target: enterKey }));
    }
    
    // Physical keyboard
    document.addEventListener('keydown', handlePhysicalKeyboard);
    
    // Leaderboard toggle
    toggleLeaderboard.addEventListener('click', toggleLeaderboardVisibility);
    
    // Scoring info toggle
    toggleScoring.addEventListener('click', toggleScoringVisibility);
    
    // Game over modal close
    closeGameOverModal.addEventListener('click', hideGameOverModal);
    
    // Leaderboard refresh button
    const refreshLeaderboard = document.getElementById('refreshLeaderboard');
    if (refreshLeaderboard) {
        refreshLeaderboard.addEventListener('click', async () => {
            // Add visual feedback
            const icon = refreshLeaderboard.querySelector('.refresh-icon');
            icon.style.animation = 'spin 1s linear';
            
            // Clear cache and refresh
            try {
                await fetch(`${API_BASE}/clear-cache`);
                await updateLeaderboard();
            } catch (error) {
                console.error('Error refreshing leaderboard:', error);
            }
            
            // Reset animation
            setTimeout(() => {
                icon.style.animation = '';
            }, 1000);
        });
    }
    
    // Admin reset functionality
    if (adminResetBtn) {
        adminResetBtn.addEventListener('click', showAdminPasswordModal);
    }
    if (confirmResetBtn) {
        confirmResetBtn.addEventListener('click', confirmAdminReset);
    }
    if (cancelResetBtn) {
        cancelResetBtn.addEventListener('click', hideAdminPasswordModal);
    }
    if (adminPasswordInput) {
        adminPasswordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                confirmAdminReset();
            }
        });
    }
    
    // Attempts viewer functionality
    if (closeAttemptsViewer) {
        closeAttemptsViewer.addEventListener('click', hideAttemptsViewer);
    }
}

function handleKeyboardClick(event) {
    if (gameState.gameOver) return;
    
    const key = event.target;
    if (!key.classList.contains('key')) return;
    
    if (key.id === 'enterKey') {
        submitGuess();
    } else if (key.id === 'backspaceKey') {
        removeLetter();
    } else {
        const letter = key.dataset.key;
        if (letter) {
            addLetter(letter);
        }
    }
}

function handlePhysicalKeyboard(event) {
    // Don't handle keyboard events if any modal is open or game is over
    if (isUsernameModalOpen() || isAdminPasswordModalOpen() || gameState.gameOver) return;
    
    const key = event.key.toUpperCase();
    
    if (key === 'ENTER') {
        event.preventDefault();
        submitGuess();
    } else if (key === 'BACKSPACE') {
        event.preventDefault();
        removeLetter();
    } else if (key === 'ARROWLEFT') {
        event.preventDefault();
        setActivePosition(currentPosition - 1);
    } else if (key === 'ARROWRIGHT') {
        event.preventDefault();
        setActivePosition(currentPosition + 1);
    } else if (/^[A-ZÄÖÜ]$/.test(key)) {
        event.preventDefault();
        addLetter(key);
    }
}

function isAdminPasswordModalOpen() {
    return adminPasswordModal && adminPasswordModal.style.display === 'flex';
}

function setActivePosition(position) {
    if (gameState.gameOver) return;
    
    currentPosition = Math.max(0, Math.min(position, gameState.wordLength - 1));
    updateCurrentWordDisplay();
}

function advanceCursor() {
    if (currentPosition < gameState.wordLength - 1) {
        currentPosition++;
        updateCurrentWordDisplay();
    }
}

function retreatCursor() {
    if (currentPosition > 0) {
        currentPosition--;
        updateCurrentWordDisplay();
    }
}

async function addLetter(letter) {
    if (currentPosition >= gameState.wordLength) return;
    
    try {
        const response = await fetch(`${API_BASE}/add_letter_at_position`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                letter: letter,
                position: currentPosition 
            })
        });
        
        const data = await response.json();
        gameState.currentWord = data.current_word;
        
        // Auto-advance cursor to next position
        advanceCursor();
        
        // Always update display to ensure the letter shows up, even if cursor didn't advance
        updateCurrentWordDisplay();
        updatePointsDisplay(); // Update points display when typing
    } catch (error) {
        console.error('Error adding letter:', error);
    }
}

async function removeLetter() {
    if (gameState.gameOver) return;
    
    try {
        // Check if current position has a letter (non-empty block)
        const hasLetterAtCurrentPosition = currentPosition < gameState.currentWord.length && 
                                         gameState.currentWord[currentPosition] !== ' ' &&
                                         gameState.currentWord[currentPosition] !== '';
        
        let positionToDelete = currentPosition;
        let shouldMoveCursor = false;
        
        // Case 1: Empty block - delete letter before and move cursor back
        if (!hasLetterAtCurrentPosition && currentPosition > 0) {
            positionToDelete = currentPosition - 1;
            shouldMoveCursor = true;
        }
        // Case 2: Block with letter - delete current letter and stay at position
        // (positionToDelete already set to currentPosition, shouldMoveCursor already false)
        
        const response = await fetch(`${API_BASE}/remove_letter_at_position`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                position: positionToDelete 
            })
        });
        
        const data = await response.json();
        gameState.currentWord = data.current_word;
        
        // Move cursor back only if we deleted the letter before (Case 1)
        if (shouldMoveCursor) {
            currentPosition--;
        }
        
        updateCurrentWordDisplay();
        updatePointsDisplay(); // Update points display when deleting
    } catch (error) {
        console.error('Error removing letter:', error);
    }
}

async function submitGuess() {
    if (gameState.currentWord.length !== gameState.wordLength) {
        showError(MESSAGES.errors.wordIncomplete);
        return;
    }
    
    // Prevent double submission
    if (gameState.submitting) {
        return;
    }
    gameState.submitting = true;
    
    try {
        const response = await fetch(`${API_BASE}/submit_guess`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ guess: gameState.currentWord })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            // Check if session was reset due to word mismatch
            if (response.status === 409 && data.reset_required) {
                console.warn('⚠️ Session reset due to daily word mismatch');
                showError('Das Spiel wurde zurückgesetzt, da ein neues Tageswort verfügbar ist.');
                
                // Update game state with the reset data
                if (data.game_state) {
                    gameState.wordLength = data.game_state.word_length;
                    gameState.attempts = data.game_state.attempts;
                    gameState.currentWord = data.game_state.current_word;
                    gameState.gameOver = data.game_state.game_over;
                    gameState.won = data.game_state.won;
                    gameState.keyboardColors = data.game_state.keyboard_colors;
                    gameState.remainingAttempts = data.game_state.remaining_attempts;
                    gameState.username = data.game_state.username;
                    
                    // Reset position and update display
                    currentPosition = 0;
                    updateCurrentWordDisplay();
                    updateAttemptsDisplay();
                    updateKeyboardColors();
                    updateRemainingAttempts();
                    updatePointsDisplay();
                }
                
                gameState.submitting = false;
                return;
            }
            
            // Show error with option to insist
            showWordValidationError(data.error || MESSAGES.errors.invalidWord, gameState.currentWord);
            gameState.submitting = false;
            return;
        }
        
        // Update game state
        gameState.attempts.push({
            word: gameState.currentWord,
            feedback: data.feedback
        });
        gameState.currentWord = '';
        gameState.gameOver = data.game_over;
        gameState.won = data.won;
        gameState.keyboardColors = data.keyboard_colors;
        gameState.remainingAttempts = data.remaining_attempts;
        
        // Reset cursor position for next word
        currentPosition = 0;
        
        // Update UI
        updateCurrentWordDisplay();
        updateAttemptsDisplay();
        updateKeyboardColors();
        updateRemainingAttempts();
        updatePointsDisplay(); // Update points display after each guess
        
        if (data.game_over) {
            showGameOverStatus(data.won, data.target_word);
        }
        
    } catch (error) {
        console.error('Error submitting guess:', error);
        showError(MESSAGES.errors.submitError);
    } finally {
        // Reset submitting flag
        gameState.submitting = false;
    }
}

async function startNewGame() {
    try {
        const response = await fetch(`${API_BASE}/new_game`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const data = await response.json();
        
        // Update game state
        gameState = {
            wordLength: data.word_length,
            attempts: data.attempts,
            currentWord: data.current_word,
            gameOver: data.game_over,
            won: data.won,
            keyboardColors: data.keyboard_colors,
            remainingAttempts: data.remaining_attempts
        };
        
        // Reset cursor position
        currentPosition = 0;
        
        // Update UI
        updateCurrentWordDisplay();
        updateAttemptsDisplay();
        updateKeyboardColors();
        updateRemainingAttempts();
        hideGameOverStatus();
        updatePointsDisplay(); // Add points display update
        
        // Update page subtitle
        document.querySelector('.subtitle').textContent = 
            `Heute ist ein ${data.word_length}-Buchstaben Wort zu erraten!`;
        
    } catch (error) {
        console.error('Error starting new game:', error);
        showError(MESSAGES.errors.newGameError);
    }
}

function updateCurrentWordDisplay() {
    currentWordGrid.innerHTML = '';
    
    for (let i = 0; i < gameState.wordLength; i++) {
        const letterBox = document.createElement('div');
        letterBox.className = 'letter-box';
        letterBox.dataset.position = i;
        
        // Add click handler for position selection
        letterBox.addEventListener('click', () => setActivePosition(i));
        
        if (i < gameState.currentWord.length) {
            letterBox.textContent = gameState.currentWord[i];
            letterBox.classList.add('filled');
            
            // Add color based on keyboard feedback
            const letter = gameState.currentWord[i];
            const colorStatus = gameState.keyboardColors[letter];
            if (colorStatus) {
                letterBox.classList.add(colorStatus);
            }
        }
        
        // Add active cursor indicator
        if (i === currentPosition) {
            letterBox.classList.add('active-cursor');
        }
        
        currentWordGrid.appendChild(letterBox);
    }
}

function updateAttemptsDisplay() {
    attemptsContainer.innerHTML = '';
    
    gameState.attempts.forEach(attempt => {
        const attemptRow = document.createElement('div');
        attemptRow.className = 'attempt-row';
        
        attempt.feedback.forEach(item => {
            const letterBox = document.createElement('div');
            letterBox.className = `letter-box ${item.status}`;
            letterBox.textContent = item.letter;
            attemptRow.appendChild(letterBox);
        });
        
        attemptsContainer.appendChild(attemptRow);
    });
}

function updateKeyboardColors() {
    const keys = keyboard.querySelectorAll('.key[data-key]');
    
    keys.forEach(key => {
        const letter = key.dataset.key;
        const colorStatus = gameState.keyboardColors[letter];
        
        // Remove existing color classes
        key.classList.remove('correct', 'present', 'absent');
        
        // Add new color class if exists
        if (colorStatus) {
            key.classList.add(colorStatus);
        }
    });
}

function updateRemainingAttempts() {
    remainingAttemptsSpan.textContent = gameState.remainingAttempts;
}

async function showGameOverStatus(won = gameState.won, targetWord = null, isReturningPlayer = false) {
    statusSection.style.display = 'block';
    
    // Store targetWord in gameState for later use
    if (targetWord) {
        gameState.targetWord = targetWord;
    }
    
    // Hide current attempt input area and keyboard when game is over
    const currentWordSection = document.querySelector('.current-word-section');
    const keyboardSection = document.querySelector('.keyboard-section');
    if (currentWordSection) {
        currentWordSection.style.display = 'none';
    }
    if (keyboardSection) {
        keyboardSection.style.display = 'none';
    }
    
    // Clear any existing content
    statusMessage.innerHTML = '';
    
    if (won) {
        statusMessage.innerHTML = 'Gewonnen! 🎉';
        statusMessage.className = 'status-message win';
    } else {
        const displayWord = targetWord || gameState.targetWord || 'UNBEKANNT';
        statusMessage.innerHTML = `Verloren! Das Wort war: ${displayWord}`;
        statusMessage.className = 'status-message lose';
    }
    
    // Add "Ergebnisse anzeigen" button for returning players or after storing score
    if (isReturningPlayer || gameState.scoreStored) {
        const buttonContainer = document.createElement('div');
        buttonContainer.style.marginTop = '15px';
        buttonContainer.style.textAlign = 'center';
        
        const showResultsBtn = document.createElement('button');
        showResultsBtn.textContent = 'Ergebnisse anzeigen';
        showResultsBtn.className = 'primary-btn';
        showResultsBtn.style.padding = '10px 20px';
        showResultsBtn.style.fontSize = '1rem';
        showResultsBtn.addEventListener('click', () => {
            showGameOverModal(won, targetWord);
        });
        
        buttonContainer.appendChild(showResultsBtn);
        statusMessage.appendChild(buttonContainer);
    }
    
    // Store score if user has a username and score hasn't been stored yet
    if (gameState.username && !gameState.scoreStored && !isReturningPlayer) {
        try {
            gameState.scoreStored = true; // Mark as stored to prevent duplicates
            await fetch(`${API_BASE}/finish_game`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            // Refresh leaderboard after storing score
            await updateLeaderboard();
            
            // Add the "Ergebnisse anzeigen" button after storing score
            const buttonContainer = document.createElement('div');
            buttonContainer.style.marginTop = '15px';
            buttonContainer.style.textAlign = 'center';
            
            const showResultsBtn = document.createElement('button');
            showResultsBtn.textContent = 'Ergebnisse anzeigen';
            showResultsBtn.className = 'primary-btn';
            showResultsBtn.style.padding = '10px 20px';
            showResultsBtn.style.fontSize = '1rem';
            showResultsBtn.addEventListener('click', () => {
                showGameOverModal(won, targetWord);
            });
            
            buttonContainer.appendChild(showResultsBtn);
            statusMessage.appendChild(buttonContainer);
            
            // Auto-show modal after storing score and updating leaderboard
            setTimeout(() => showGameOverModal(won, targetWord), 2000);
            
        } catch (error) {
            console.error('Error storing score:', error);
            gameState.scoreStored = false; // Reset on error to allow retry
        }
    } else if (gameState.username && !isReturningPlayer) {
        // If score was already stored, still show the modal after delay
        setTimeout(() => showGameOverModal(won, targetWord), 2000);
    }
}

function hideGameOverStatus() {
    statusSection.style.display = 'none';
    
    // Show "Reopen Results" button if game is over
    if (gameState.gameOver) {
        showReopenResultsButton();
    }
}

function showReopenResultsButton() {
    // Check if button already exists
    let reopenBtn = document.getElementById('reopenResultsBtn');
    if (!reopenBtn) {
        // Create reopen button
        reopenBtn = document.createElement('button');
        reopenBtn.id = 'reopenResultsBtn';
        reopenBtn.textContent = '📊 Ergebnisse anzeigen';
        reopenBtn.className = 'primary-btn';
        reopenBtn.style.cssText = `
            margin-top: 20px;
            display: block;
            margin-left: auto;
            margin-right: auto;
            background-color: #28a745;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
        `;
        reopenBtn.addEventListener('click', () => {
            showGameOverModal(gameState.won, gameState.targetWord);
            reopenBtn.style.display = 'none';
        });
        
        // Add after the status section
        statusSection.parentNode.insertBefore(reopenBtn, statusSection.nextSibling);
    }
    reopenBtn.style.display = 'block';
}

function hideReopenResultsButton() {
    const reopenBtn = document.getElementById('reopenResultsBtn');
    if (reopenBtn) {
        reopenBtn.style.display = 'none';
    }
}

function showError(message) {
    // Create temporary error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #dc3545;
        color: white;
        padding: 12px 24px;
        border-radius: 6px;
        font-weight: bold;
        z-index: 1000;
        animation: fadeInOut 3s ease-in-out;
    `;
    
    // Add CSS animation
    if (!document.querySelector('#errorAnimation')) {
        const style = document.createElement('style');
        style.id = 'errorAnimation';
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                20% { opacity: 1; transform: translateX(-50%) translateY(0); }
                80% { opacity: 1; transform: translateX(-50%) translateY(0); }
                100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(errorDiv);
    
    // Remove after animation
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 3000);
}

// Leaderboard functions
async function updateLeaderboard() {
    try {
        const response = await fetch(`${API_BASE}/leaderboard`);
        if (response.ok) {
            const data = await response.json();
            displayLeaderboard(data.leaderboard);
        }
    } catch (error) {
        console.error('Error updating leaderboard:', error);
    }
}

function displayLeaderboard(leaderboard) {
    if (!leaderboard || leaderboard.length === 0) {
        leaderboardList.innerHTML = '<p class="no-scores">Noch keine Spieler heute!</p>';
        return;
    }
    
    // Filter out current user from regular leaderboard to avoid premature spoilers
    const filteredLeaderboard = leaderboard.filter(entry => entry.username !== gameState.username);
    
    if (filteredLeaderboard.length === 0) {
        leaderboardList.innerHTML = '<p class="no-scores">Noch keine anderen Spieler!</p>';
        return;
    }
    
    const tableHeader = `
        <table class="leaderboard-table">
            <thead>
                <tr>
                    <th class="rank-col">#</th>
                    <th class="player-col">Player</th>
                    <th class="attempts-col">Attempts</th>
                    <th class="points-col">Points</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    const tableRows = filteredLeaderboard.map((entry, index) => {
        // Calculate proper ranking with ties
        let rank = 1;
        let rankDisplay;
        
        // Count how many players are better in the filtered leaderboard
        for (let i = 0; i < index; i++) {
            if (filteredLeaderboard[i].score > entry.score) {
                rank++;
            }
        }
        
        // Determine if this player shares first place in filtered leaderboard
        const firstPlaceScore = filteredLeaderboard[0].score;
        const isFirstPlace = entry.score === firstPlaceScore;
        
        // Determine if this player shares last place in filtered leaderboard
        const lastPlaceScore = filteredLeaderboard[filteredLeaderboard.length - 1].score;
        const isLastPlace = entry.score === lastPlaceScore && filteredLeaderboard.length > 1;
        
        if (isFirstPlace) {
            rankDisplay = '👑🐐';
        } else if (isLastPlace) {
            rankDisplay = '💩';
        } else {
            rankDisplay = `${rank}.`;
        }
        
        return `
            <tr class="leaderboard-entry">
                <td class="rank">${rankDisplay}</td>
                <td class="username">${entry.username}</td>
                <td class="attempts">${entry.won ? entry.attempts : '❌'}</td>
                <td class="score">${entry.score}P</td>
            </tr>
        `;
    }).join('');
    
    const tableFooter = `
            </tbody>
        </table>
    `;
    
    leaderboardList.innerHTML = tableHeader + tableRows + tableFooter;
}

// Points and position prediction functions
function calculateScore(attempts) {
    if (attempts === 1) return 6;
    if (attempts === 2) return 5;
    if (attempts === 3) return 4;
    if (attempts === 4) return 3;
    if (attempts === 5) return 2;
    if (attempts === 6) return 1;
    return 0;
}

function updatePointsDisplay() {
    if (gameState.gameOver || !gameState.username) {
        currentPointsInfo.style.display = 'none';
        return;
    }
    
    const currentAttempt = gameState.attempts.length + 1;
    const pointsForCurrentAttempt = calculateScore(currentAttempt);
    
    currentPointsInfo.style.display = 'block';
    currentAttemptNumber.textContent = currentAttempt;
    pointsForAttempt.textContent = pointsForCurrentAttempt;
    
    // Update position prediction if we have leaderboard data
    updatePositionPreview(pointsForCurrentAttempt);
}

async function updatePositionPreview(potentialScore) {
    if (!gameState.username || potentialScore === 0) {
        positionPreview.style.display = 'none';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/leaderboard`);
        if (response.ok) {
            const data = await response.json();
            const leaderboard = data.leaderboard;
            
            const currentAttempt = gameState.attempts.length + 1;
            const successScore = calculateScore(currentAttempt);
            const failScore = currentAttempt < 6 ? calculateScore(currentAttempt + 1) : 0;
            
            // Filter out current user from leaderboard
            const filteredLeaderboard = leaderboard.filter(entry => entry.username !== gameState.username);
            
            // Calculate positions for both scenarios
            const successResult = calculatePosition(successScore, filteredLeaderboard);
            const failResult = calculatePosition(failScore, filteredLeaderboard);
            
            // Create message
            let message = createPositionMessage(successResult, failResult, currentAttempt);
            
            if (message) {
                positionPreview.style.display = 'block';
                positionPreview.innerHTML = `<div class="special-message">${message}</div>`;
            } else {
                positionPreview.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error updating position preview:', error);
        positionPreview.style.display = 'none';
    }
}

function calculatePosition(score, leaderboard) {
    if (leaderboard.length === 0) {
        return { rank: 1, isFirst: true, isLast: false, tiedWith: [] };
    }
    
    let rank = 1;
    let tiedWith = [];
    
    // Count players with better scores
    for (const player of leaderboard) {
        if (player.score > score) {
            rank++;
        } else if (player.score === score) {
            tiedWith.push(player.username);
        }
    }
    
    const isFirst = rank === 1;
    const wouldBeLowestScore = score <= Math.min(...leaderboard.map(p => p.score));
    const isLast = wouldBeLowestScore;
    
    return { rank, isFirst, isLast, tiedWith };
}

function createPositionMessage(successResult, failResult, currentAttempt) {
    // Check for all special high-stakes scenarios first
    
    // Case 1: Solo GOAT all-or-nothing (success = alone first, fail = alone last)
    if (successResult.isFirst && successResult.tiedWith.length === 0 && 
        currentAttempt < 6 && failResult.isLast && failResult.tiedWith.length === 0) {
        return MESSAGES.competitive.soloGoatAllOrNothing;
    }
    
    // Case 2: Solo GOAT potential (without last place risk)
    if (successResult.isFirst && successResult.tiedWith.length === 0) {
        return MESSAGES.competitive.soloGoatPotential;
    }
    
    // Case 3: Tied GOAT all-or-nothing (success = tied GOAT, fail = alone last place)
    if (successResult.isFirst && successResult.tiedWith.length > 0 && 
        currentAttempt < 6 && failResult.isLast && failResult.tiedWith.length === 0) {
        return MESSAGES.competitive.tiedGoatAllOrNothing(successResult.tiedWith.join(', '));
    }
    
    // Case 4: Tied GOAT potential with fallback
    if (successResult.isFirst && successResult.tiedWith.length > 0) {
        let message = MESSAGES.competitive.tiedGoatPotential(successResult.tiedWith.join(', '));
        if (currentAttempt < 6 && !failResult.isLast) {
            let failDesc = createPositionDescription(failResult);
            message += `<br><small>Bei falschem Tipp: ${failDesc}</small>`;
        }
        return message;
    }
    
    // Case 5: Shared Scheißhaufen on success, alone Scheißhaufen on fail
    if (successResult.isLast && successResult.tiedWith.length > 0 && 
        currentAttempt < 6 && failResult.isLast && failResult.tiedWith.length === 0) {
        return MESSAGES.competitive.sharedScheisshaufenOnSuccess(successResult.tiedWith.join(', '));
    }
    
    // Case 6: Already guaranteed last place
    if (successResult.isLast && failResult.isLast) {
        return MESSAGES.competitive.alreadyLastPlace;
    }
    
    // Case 7: Last place pressure scenarios
    if (currentAttempt < 6 && failResult.isLast) {
        if (failResult.tiedWith.length > 0) {
            return MESSAGES.competitive.lastPlacePressureTied(failResult.tiedWith.join(', '));
        } else {
            return MESSAGES.competitive.lastPlacePressure;
        }
    }
    
    // Case 8: All remaining scenarios - use detailed position info
    let successDesc = createPositionDescription(successResult);
    
    if (currentAttempt === 6) {
        return `🎯 Jetzt oder nie: ${successDesc}`;
    } else {
        let failDesc = createPositionDescription(failResult);
        return `🎯 Wenn du richtig liegst: ${successDesc}<br>💀 Bei falschem Tipp: ${failDesc}`;
    }
}

function createPositionDescription(result) {
    if (result.isFirst) {
        if (result.tiedWith.length > 0) {
            return `Platz ${result.rank} - GOAT 👑🐐 (gleichauf mit ${result.tiedWith.join(', ')})`;
        } else {
            return `Platz ${result.rank} - alleiniger GOAT 👑🐐`;
        }
    } else if (result.isLast) {
        if (result.tiedWith.length > 0) {
            return `Platz ${result.rank} - Scheißhaufen 💩 (gleichauf mit ${result.tiedWith.join(', ')})`;
        } else {
            return `Platz ${result.rank} - alleiniger Scheißhaufen 💩`;
        }
    } else {
        if (result.tiedWith.length > 0) {
            return `Platz ${result.rank} (gleichauf mit ${result.tiedWith.join(', ')})`;
        } else {
            return `Platz ${result.rank}`;
        }
    }
}

// Leaderboard toggle functionality
function toggleLeaderboardVisibility() {
    const leaderboard = document.querySelector('.leaderboard');
    const isCollapsed = leaderboard.classList.contains('collapsed');
    
    if (isCollapsed) {
        leaderboard.classList.remove('collapsed');
        // Store preference
        localStorage.setItem('leaderboardCollapsed', 'false');
    } else {
        leaderboard.classList.add('collapsed');
        // Store preference
        localStorage.setItem('leaderboardCollapsed', 'true');
    }
}

// Load leaderboard state from localStorage
function loadLeaderboardState() {
    const isCollapsed = localStorage.getItem('leaderboardCollapsed') === 'true';
    const leaderboard = document.querySelector('.leaderboard');
    
    // Only collapse if explicitly set to true, otherwise keep expanded by default
    if (isCollapsed) {
        leaderboard.classList.add('collapsed');
    } else {
        leaderboard.classList.remove('collapsed');
    }
}

// Scoring toggle functionality
function toggleScoringVisibility() {
    const isCollapsed = scoringInfo.classList.contains('collapsed');
    const toggleIcon = toggleScoring.querySelector('.toggle-icon');
    
    if (isCollapsed) {
        scoringInfo.classList.remove('collapsed');
        toggleIcon.textContent = '▼';
        localStorage.setItem('scoringCollapsed', 'false');
    } else {
        scoringInfo.classList.add('collapsed');
        toggleIcon.textContent = '▶';
        localStorage.setItem('scoringCollapsed', 'true');
    }
}

// Load scoring state from localStorage
function loadScoringState() {
    const isCollapsed = localStorage.getItem('scoringCollapsed') !== 'false'; // Default to collapsed
    const toggleIcon = toggleScoring.querySelector('.toggle-icon');
    
    if (isCollapsed) {
        scoringInfo.classList.add('collapsed');
        toggleIcon.textContent = '▶';
    } else {
        scoringInfo.classList.remove('collapsed');
        toggleIcon.textContent = '▼';
    }
}

// Game Over Modal functions
async function showGameOverModal(won, targetWord) {
    if (!gameState.username) return; // Don't show if no username set
    
    // Use stored targetWord if parameter is undefined
    const actualTargetWord = targetWord || gameState.targetWord || 'UNBEKANNT';
    
    // Always refresh leaderboard before showing modal to ensure latest data
    await updateLeaderboard();
    
    // Set title and message based on game result
    if (won) {
        gameOverTitle.textContent = MESSAGES.gameOver.winTitle;
        const attempts = gameState.attempts.length;
        const score = calculateScore(attempts);
        gameOverMessage.innerHTML = MESSAGES.gameOver.winMessage(actualTargetWord, attempts, score);
    } else {
        gameOverTitle.textContent = MESSAGES.gameOver.loseTitle;
        gameOverMessage.innerHTML = MESSAGES.gameOver.loseMessage(actualTargetWord);
    }
    
    // Fetch and display updated leaderboard for modal
    try {
        const response = await fetch(`${API_BASE}/leaderboard`);
        
        if (response.ok) {
            const data = await response.json();
            
            if (data && data.leaderboard) {
                displayModalLeaderboard(data.leaderboard);
            } else {
                console.error('Invalid leaderboard data structure:', data);
                modalLeaderboardList.innerHTML = '<p class="no-scores">Noch keine Spieler heute!</p>';
            }
        } else {
            console.error('Failed to fetch leaderboard:', response.status, response.statusText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error fetching leaderboard for modal:', error);
        modalLeaderboardList.innerHTML = `<p>${MESSAGES.errors.leaderboardError}</p>`;
    }
    
    // Show modal
    gameOverModal.style.display = 'flex';
    // Hide reopen button when modal is shown
    hideReopenResultsButton();
}

function hideGameOverModal() {
    gameOverModal.style.display = 'none';
    // Show reopen button when modal is closed
    if (gameState.gameOver) {
        showReopenResultsButton();
    }
}

function displayModalLeaderboard(leaderboard) {
    // Clear container first to prevent duplicates
    modalLeaderboardList.innerHTML = '';
    
    if (!leaderboard || leaderboard.length === 0) {
        modalLeaderboardList.innerHTML = '<p class="no-scores">Noch keine Spieler heute!</p>';
        return;
    }
    
    const tableHeader = `
        <table class="leaderboard-table">
            <thead>
                <tr>
                    <th class="rank-col">#</th>
                    <th class="player-col">Player</th>
                    <th class="attempts-col">Attempts</th>
                    <th class="points-col">Points</th>
                    <th class="solution-col">Lösungsweg</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    const tableRows = leaderboard.map((entry, index) => {
        // Calculate proper ranking with ties
        let rank = 1;
        let rankDisplay;
        
        // Count how many players are better
        for (let i = 0; i < index; i++) {
            if (leaderboard[i].score > entry.score) {
                rank++;
            }
        }
        
        // Determine if this player shares first place
        const firstPlaceScore = leaderboard[0].score;
        const isFirstPlace = entry.score === firstPlaceScore;
        
        // Determine if this player shares last place
        const lastPlaceScore = leaderboard[leaderboard.length - 1].score;
        const isLastPlace = entry.score === lastPlaceScore && leaderboard.length > 1;
        
        if (isFirstPlace) {
            rankDisplay = '👑🐐';
        } else if (isLastPlace) {
            rankDisplay = '💩';
        } else {
            rankDisplay = `${rank}.`;
        }
        
        // Highlight current user
        const isCurrentUser = entry.username === gameState.username;
        let rowClass = 'leaderboard-entry';
        if (isCurrentUser) {
            rowClass += ' current-user';
        }
        
        // Solution button logic - only show for other users, not current user
        let solutionButton = '';
        if (!isCurrentUser) {
            solutionButton = `<button class="solution-btn" onclick="showAttemptsViewer('${entry.username}')">Anzeigen</button>`;
        }
        
        return `
            <tr class="${rowClass}">
                <td class="rank">${rankDisplay}</td>
                <td class="username">${entry.username}${isCurrentUser ? ' (Du)' : ''}</td>
                <td class="attempts">${entry.won ? entry.attempts : '❌'}</td>
                <td class="score">${entry.score}P</td>
                <td class="solution">${solutionButton}</td>
            </tr>
        `;
    }).join('');
    
    const tableFooter = `
            </tbody>
        </table>
    `;
    
    modalLeaderboardList.innerHTML = tableHeader + tableRows + tableFooter;
}

// Admin Reset Functions
function showAdminPasswordModal() {
    adminPasswordModal.style.display = 'flex';
    adminPasswordInput.focus();
    adminPasswordInput.value = '';
}

function hideAdminPasswordModal() {
    adminPasswordModal.style.display = 'none';
    adminPasswordInput.value = '';
}

async function confirmAdminReset() {
    const password = adminPasswordInput.value;
    
    if (!password) {
        alert('❌ Bitte Passwort eingeben!');
        return;
    }
    
    if (!confirm('⚠️ Wirklich neues Wort des Tages generieren?\n\nDies wird das aktuelle Wort und ALLE heutigen Scores löschen!')) {
        hideAdminPasswordModal();
        return;
    }
    
    try {
        // Show loading state
        confirmResetBtn.disabled = true;
        confirmResetBtn.textContent = 'Generiere...';
        
        const response = await fetch(`${API_BASE}/admin/reset-daily-word`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password: password })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('✅ Neues Wort des Tages wurde generiert!\n\nDie Seite wird neu geladen...');
            // Reload the page to get the new word
            window.location.reload();
        } else {
            alert(`❌ Fehler: ${result.error}`);
        }
    } catch (error) {
        console.error('Error resetting daily word:', error);
        alert('❌ Fehler beim Generieren des neuen Wortes!');
    } finally {
        // Reset button state
        confirmResetBtn.disabled = false;
        confirmResetBtn.textContent = 'Bestätigen';
        hideAdminPasswordModal();
    }
}

// Admin visibility control - controlled by backend
function updateAdminButtonVisibility() {
    // Admin button visibility is now controlled by backend
    // The button will only be rendered in HTML if user has admin rights
    if (adminResetBtn) {
        // Check if backend indicated admin status
        const isAdmin = gameState.is_admin || false;
        adminResetBtn.style.display = isAdmin ? 'block' : 'none';
    }
}

// Attempts Viewer Functions
function showAttemptsViewer(username) {
    attemptsViewerTitle.textContent = `Versuche von ${username}`;
    attemptsViewerModal.style.display = 'flex';
    
    // Show loading state
    attemptsViewerContent.innerHTML = '<p>Lade Versuche...</p>';
    
    // Fetch player attempts
    fetch(`${API_BASE}/player-attempts/${encodeURIComponent(username)}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayPlayerAttempts(data.attempts, data.won, username);
            } else {
                attemptsViewerContent.innerHTML = '<p>Keine detaillierten Versuche für diesen Spieler verfügbar.</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching player attempts:', error);
            attemptsViewerContent.innerHTML = '<p>Fehler beim Laden der Versuche.</p>';
        });
}

function hideAttemptsViewer() {
    attemptsViewerModal.style.display = 'none';
}

function displayPlayerAttempts(attempts, won, username) {
    if (!attempts || attempts.length === 0) {
        attemptsViewerContent.innerHTML = '<p>Keine Versuche vorhanden.</p>';
        return;
    }
    
    let html = `<div class="attempts-display">`;
    
    attempts.forEach((attempt, index) => {
        html += `
            <div class="attempt-row-header">
                <span class="attempt-number">Versuch ${index + 1}:</span>
                <span class="attempt-word">${attempt.word}</span>
            </div>
            <div class="attempt-row-viewer">
                ${attempt.feedback.map(item => `
                    <div class="letter-box ${item.status}">${item.letter}</div>
                `).join('')}
            </div>
        `;
    });
    
    html += `</div>`;
    
    if (won) {
        html += `<p style="color: #28a745; font-weight: bold; text-align: center; margin-top: 15px;">🎉 ${username} hat das Wort in ${attempts.length} Versuchen erraten!</p>`;
    } else {
        html += `<p style="color: #dc3545; font-weight: bold; text-align: center; margin-top: 15px;">❌ ${username} hat das Wort nicht erraten.</p>`;
    }
    
    attemptsViewerContent.innerHTML = html;
}

// Word Override System
function showWordValidationError(errorMessage, rejectedWord) {
    // Show error with confirmation prompt
    const userWantsToInsist = confirm(`${errorMessage}\n\n${MESSAGES.override.insistButton}?`);
    
    if (userWantsToInsist) {
        showOverrideModal(rejectedWord);
    }
}

function showOverrideModal(word) {
    overrideWordDisplay.textContent = word.toUpperCase();
    overrideModal.style.display = 'flex';
}

function hideOverrideModal() {
    overrideModal.style.display = 'none';
}

function setupOverrideModal() {
    if (cancelOverrideBtn) {
        cancelOverrideBtn.addEventListener('click', hideOverrideModal);
    }
    
    if (submitOverrideBtn) {
        submitOverrideBtn.addEventListener('click', () => {
            submitGuessWithOverride(gameState.currentWord);
            hideOverrideModal();
        });
    }
}

async function submitGuessWithOverride(word) {
    try {
        const response = await fetch(`${API_BASE}/submit_guess`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                guess: word, 
                override: true // Flag to force acceptance
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showError(data.error || 'Fehler beim Erzwingen des Wortes');
            return;
        }
        
        // Update game state (same as normal submission)
        gameState.attempts.push({
            word: gameState.currentWord,
            feedback: data.feedback
        });
        gameState.currentWord = '';
        gameState.gameOver = data.game_over;
        gameState.won = data.won;
        gameState.keyboardColors = data.keyboard_colors;
        gameState.remainingAttempts = data.remaining_attempts;
        
        // Reset cursor position for next word
        currentPosition = 0;
        
        // Update UI
        updateCurrentWordDisplay();
        updateAttemptsDisplay();
        updateKeyboardColors();
        updateRemainingAttempts();
        updatePointsDisplay();
        
        if (data.game_over) {
            showGameOverStatus(data.won, data.target_word);
        }
        
    } catch (error) {
        console.error('Override submission error:', error);
        showError(MESSAGES.errors.submitError);
    }
}

// All-Time Leaderboard System
function setupAlltimeLeaderboard() {
    if (toggleAlltime) {
        toggleAlltime.addEventListener('click', toggleAlltimeLeaderboard);
        // Also make the header clickable
        const alltimeHeader = document.querySelector('.alltime-header');
        if (alltimeHeader) {
            alltimeHeader.style.cursor = 'pointer';
            alltimeHeader.addEventListener('click', toggleAlltimeLeaderboard);
        }
        
        // Auto-load monthly leaderboard since it's expanded by default
        loadMonthlyLeaderboard();
    }
}

function toggleAlltimeLeaderboard() {
    const isVisible = alltimeContent.style.display === 'block' || alltimeContent.style.display === '';
    
    if (isVisible) {
        // Hide all-time leaderboard
        alltimeContent.style.display = 'none';
        if (alltimeToggleIcon) {
            alltimeToggleIcon.textContent = '▶';
        }
    } else {
        // Show all-time leaderboard and load data
        alltimeContent.style.display = 'block';
        if (alltimeToggleIcon) {
            alltimeToggleIcon.textContent = '▼';
        }
        loadMonthlyLeaderboard();
    }
}

async function loadMonthlyLeaderboard() {
    const loadingDiv = document.querySelector('.alltime-loading');
    const listDiv = alltimeList;
    
    // Show loading state
    if (loadingDiv) loadingDiv.style.display = 'block';
    if (listDiv) listDiv.style.display = 'none';
    
    try {
        const response = await fetch(`${API_BASE}/monthly_leaderboard`);
        if (response.ok) {
            const data = await response.json();
            updateMonthlyTitle(data.month);
            displayMonthlyLeaderboard(data.leaderboard);
        } else {
            console.error('Failed to load monthly leaderboard');
            if (loadingDiv) loadingDiv.textContent = 'Fehler beim Laden der Statistiken';
        }
    } catch (error) {
        console.error('Error loading monthly leaderboard:', error);
        if (loadingDiv) loadingDiv.textContent = 'Fehler beim Laden der Statistiken';
    }
}

function updateMonthlyTitle(monthString) {
    const germanMonths = {
        '01': 'Januar', '02': 'Februar', '03': 'März', '04': 'April',
        '05': 'Mai', '06': 'Juni', '07': 'Juli', '08': 'August',
        '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Dezember'
    };
    
    if (monthString) {
        const [year, month] = monthString.split('-');
        const germanMonth = germanMonths[month] || month;
        const title = `📊 ${germanMonth} ${year} Bestenliste`;
        
        const titleElement = document.querySelector('.alltime-header h3');
        if (titleElement) {
            titleElement.textContent = title;
        }
        
        const toggleButton = document.getElementById('toggleAlltime');
        if (toggleButton) {
            toggleButton.title = `${germanMonth} ${year} Bestenliste ein-/ausblenden`;
        }
    }
}

function displayMonthlyLeaderboard(leaderboard) {
    const loadingDiv = document.querySelector('.alltime-loading');
    const listDiv = alltimeList;
    
    // Hide loading state
    if (loadingDiv) loadingDiv.style.display = 'none';
    
    if (!leaderboard || leaderboard.length === 0) {
        if (listDiv) {
            listDiv.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 20px;">Noch keine Statistiken verfügbar</div>';
            listDiv.style.display = 'block';
        }
        return;
    }
    
    let html = `
        <table class="alltime-table">
            <thead>
                <tr>
                    <th class="rank-col">#</th>
                    <th class="player-col">Player</th>
                    <th class="stat-col">Games</th>
                    <th class="stat-col">Points</th>
                    <th class="stat-col">Ø&nbsp;Points</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    leaderboard.forEach((player, index) => {
        const rank = index + 1;
        let rankDisplay;
        
        // Add medals and emojis for rankings
        if (rank === 1) {
            rankDisplay = '👑🐐'; // Crown + GOAT
        } else if (rank === 2) {
            rankDisplay = '🥈'; // Silver medal
        } else if (rank === 3) {
            rankDisplay = '🥉'; // Bronze medal
        } else if (rank === leaderboard.length && leaderboard.length > 3) {
            rankDisplay = '💩'; // Last place gets poop emoji
        } else {
            rankDisplay = `${rank}.`;
        }
        
        html += `
            <tr class="alltime-entry">
                <td class="rank">${rankDisplay}</td>
                <td class="player-col">${player.username}</td>
                <td class="stat-col">${player.games_played}</td>
                <td class="stat-col">${player.total_points}</td>
                <td class="stat-col">${player.avg_points.toFixed(2)}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    if (listDiv) {
        listDiv.innerHTML = html;
        listDiv.style.display = 'block';
    }
}
