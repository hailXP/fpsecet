// ==UserScript==
// @name        Chess AI
// @match       https://www.chess.com/*
// @version     1.5
// @author      Hail
// ==/UserScript==

(() => {
    let prevState = "";
    let observer = null;

    const SERVER_URL = "http://localhost:5000";

    async function fetchBestMove(fen) {
        const response = await fetch(`${SERVER_URL}/lich`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fen: fen })
        });
        const { bestMoves, evals } = await response.json();
        return { bestMoves, evals };
    }

    async function handleBoardChange() {
        const boardElement = document.querySelector("wc-chess-board");
        if (!boardElement || !boardElement.game) return;

        const board = boardElement.game;
        if (board.getTurn() === board.getPlayingAs()) {
            const fen = board.getFEN();
            if (fen !== prevState) {
                prevState = fen;
                let { bestMoves, evals } = await fetchBestMove(fen);
                if (board.getPlayingAs() == 0) {
                    bestMoves = bestMoves.reverse();
                    evals = evals.reverse();
                }
                processMoves(board, bestMoves, evals);
            }
        }
    }

    async function manualTrigger() {
        const boardElement = document.querySelector("wc-chess-board");
        if (!boardElement || !boardElement.game) return;

        const board = boardElement.game;
        const fen = board.getFEN();
        let { bestMoves, evals } = await fetchBestMove(fen);
        if (board.getPlayingAs() == 0) {
            bestMoves = bestMoves.reverse();
            evals = evals.reverse();
        }
        processMoves(board, bestMoves, evals);
    }

    function processMoves(board, bestMoves, evals) {
        if (bestMoves && bestMoves.length > 0) {
            drawBestMove(board, bestMoves);
            updateEvalsDisplay(evals);
        } else {
            toggleObserver();
        }
    }

    function drawBestMove(board, bestMoves) {
        let arrows = [];
        for (let i = 0; i < bestMoves.length; i++) {
            let startSquare = bestMoves[i].substring(0, 2);
            let endSquare = bestMoves[i].substring(2, 4);
            arrows.push({
                data: { from: startSquare, opacity: 0.9 - (1.1 / (bestMoves.length + 1)) * i, to: endSquare },
                node: true,
                persistent: false,
                type: "arrow"
            });
        }
        board.markings.addMany(arrows);
    }

    function updateEvalsDisplay(evals) {
        const evalsContainer = document.getElementById("evals-container");
        evalsContainer.innerHTML = "";

        evals.forEach(evalValue => {
            const evalItem = document.createElement("div");
            evalItem.textContent = evalValue;
            evalItem.style.marginRight = "10px";
            evalItem.style.fontSize = "18px";
            evalItem.style.fontWeight = "bold";
            evalItem.style.color = String(evalValue).includes('-') ? "magenta" : "white";
            evalsContainer.appendChild(evalItem);
        });
    }

    function toggleObserver() {
        if (observer) {
            observer.disconnect();
            observer = null;
            updateButton("Activate Observer", "#f44336");
        } else {
            const boardElement = document.querySelector("wc-chess-board");
            if (boardElement) {
                observer = new MutationObserver(handleBoardChange);
                observer.observe(boardElement, { attributes: true, childList: true, subtree: true });
                updateButton("Deactivate Observer", "#4CAF50");
            }
        }
    }

    function updateButton(text, color) {
        const button = document.getElementById("observer-toggle-button");
        button.textContent = text;
        button.style.background = color;
    }

    async function configureEngine() {
        const depthInput = document.getElementById("depth-input").value;
        const multipvInput = document.getElementById("multipv-input").value;

        const data = {};
        if (depthInput) data.depth = parseInt(depthInput);
        if (multipvInput) data.multipv = parseInt(multipvInput);

        try {
            const response = await fetch(`${SERVER_URL}/configure`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }

            const result = await response.json();
            showToast(`Configuration updated: Depth = ${result.depth}, MultiPV = ${result.multipv}`);
        } catch (error) {
            showToast(`Error updating configuration: ${error.message}`);
            console.error(error);
        }
    }

    function showToast(message) {
        const toast = document.createElement("div");
        toast.textContent = message;
        toast.style = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #333;
            color: white;
            padding: 12px 24px;
            border-radius: 5px;
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.5s ease-in-out;
        `;
        document.body.appendChild(toast);

        void toast.offsetWidth;
        toast.style.opacity = 1;

        setTimeout(() => {
            toast.style.opacity = 0;
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 500);
        }, 3000);
    }

    function setupUI() {
        document.addEventListener('keydown', function(event) {
            if (event.key === 'q') {
                toggleObserver();
            } else if (event.key === 'w') {
                manualTrigger();
            }
        });

        const centerContainer = document.createElement("div");
        centerContainer.style = `
            position: fixed;
            top: 10px;
            left: 25%;
            transform: translateX(-25%);
            display: flex;
            align-items: center;
            background-color: rgba(0, 0, 0, 0.5);
            border-radius: 5px;
            padding: 10px;
        `;

        const evalsContainer = document.createElement("div");
        evalsContainer.id = "evals-container";
        evalsContainer.style = "display: flex; flex-direction: row; margin-right: 10px;";

        const observerButton = document.createElement("button");
        observerButton.id = "observer-toggle-button";
        observerButton.textContent = "Activate Observer";
        observerButton.onclick = toggleObserver;
        observerButton.style = "margin: 0 5px; padding: 8px 16px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer;";

        const manualButton = document.createElement("button");
        manualButton.id = "manual-trigger-button";
        manualButton.textContent = "Trigger Manually";
        manualButton.onclick = manualTrigger;
        manualButton.style = "margin: 0 5px; padding: 8px 16px; background: #008CBA; color: white; border: none; border-radius: 5px; cursor: pointer;";

        centerContainer.appendChild(evalsContainer);
        centerContainer.appendChild(observerButton);
        centerContainer.appendChild(manualButton);
        document.body.appendChild(centerContainer);

        const rightContainer = document.createElement("div");
        rightContainer.style = "position: fixed; top: 10px; right: 20px; display: flex; flex-direction: column; align-items: flex-end;";

        const configContainer = document.createElement("div");
        configContainer.style = `
            display: flex;
            align-items: center;
            margin-bottom: 10px;
            background-color: rgba(0, 0, 0, 0.5);
            border-radius: 5px;
            padding: 5px;
        `;

        const depthLabel = document.createElement("label");
        depthLabel.textContent = "Depth:";
        depthLabel.style = "color: white; margin-right: 5px;";
        const depthInput = document.createElement("input");
        depthInput.id = "depth-input";
        depthInput.type = "number";
        depthInput.min = "1";
        depthInput.style = "width: 50px; margin-right: 10px;";

        const multipvLabel = document.createElement("label");
        multipvLabel.textContent = "MultiPV:";
        multipvLabel.style = "color: white; margin-right: 5px;";
        const multipvInput = document.createElement("input");
        multipvInput.id = "multipv-input";
        multipvInput.type = "number";
        multipvInput.min = "1";
        multipvInput.style = "width: 50px; margin-right: 10px;";

        const configButton = document.createElement("button");
        configButton.textContent = "Configure";
        configButton.onclick = configureEngine;
        configButton.style = "margin: 0 5px; padding: 8px 16px; background: #FF9800; color: white; border: none; border-radius: 5px; cursor: pointer;";

        configContainer.appendChild(depthLabel);
        configContainer.appendChild(depthInput);
        configContainer.appendChild(multipvLabel);
        configContainer.appendChild(multipvInput);
        configContainer.appendChild(configButton);

        const fenPgnContainer = document.createElement("div");
        fenPgnContainer.style = "display: flex; flex-direction: column; align-items: flex-end;";

        const fenButton = document.createElement("button");
        fenButton.textContent = "Get FEN";
        fenButton.style = "margin: 5px 0; padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;";

        const fenTextbox = document.createElement("input");
        fenTextbox.type = "text";
        fenTextbox.readOnly = true;
        fenTextbox.style = "margin: 5px 0; width: 300px; padding: 8px; border: 1px solid #ccc; border-radius: 5px;";

        const pgnButton = document.createElement("button");
        pgnButton.textContent = "Get PGN";
        pgnButton.style = "margin: 5px 0; padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;";

        const pgnTextbox = document.createElement("input");
        pgnTextbox.type = "text";
        pgnTextbox.readOnly = true;
        pgnTextbox.style = "margin: 5px 0; width: 300px; padding: 8px; border: 1px solid #ccc; border-radius: 5px;";

        fenPgnContainer.appendChild(fenButton);
        fenPgnContainer.appendChild(fenTextbox);
        fenPgnContainer.appendChild(pgnButton);
        fenPgnContainer.appendChild(pgnTextbox);

        fenButton.onclick = function() {
            const boardElement = document.querySelector("wc-chess-board");
            if (!boardElement || !boardElement.game) {
                alert("Board not found");
                return;
            }

            const board = boardElement.game;
            const fen = board.getFEN();
            fenTextbox.value = fen;
        };

        pgnButton.onclick = function() {
            const boardElement = document.querySelector("wc-chess-board");
            if (!boardElement || !boardElement.game) {
                alert("Board not found");
                return;
            }

            const board = boardElement.game;
            const pgn = board.getPGN();
            pgnTextbox.value = pgn;
        };

        rightContainer.appendChild(configContainer);
        rightContainer.appendChild(fenPgnContainer);
        document.body.appendChild(rightContainer);
    }

    setupUI();
})();
