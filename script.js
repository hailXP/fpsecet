
(() => {
    let prevState = "";
    let observer = null;

    async function fetchBestMove(fen) {
        const response = await fetch("http://localhost:5000/lich", {
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

        evals.forEach(eval => {
            const evalItem = document.createElement("div");
            evalItem.textContent = eval;
            evalItem.style.marginRight = "10px";
            evalItem.style.fontSize = "18px";
            evalItem.style.fontWeight = "bold";
            evalItem.style.color = String(eval).includes('-') ? "magenta" : "white";
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

    function setupUI() {
        document.addEventListener('keydown', function(event) {
            if (event.key === 'q') {
                toggleObserver();
            } else if (event.key === 'w') {
                manualTrigger();
            }
        });

        const buttonContainer = document.createElement("div");
        buttonContainer.style = "position: fixed; top: 10px; left: 20%; display: flex; align-items: flex-start;";

        const evalsContainer = document.createElement("div");
        evalsContainer.id = "evals-container";
        evalsContainer.style = "display: flex; flex-direction: row; margin-right: 10px; margin-top: 0; background-color: rgba(0, 0, 0, 0.5); border-radius: 5px; padding: 5px;";

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

        buttonContainer.appendChild(evalsContainer);
        buttonContainer.appendChild(observerButton);
        buttonContainer.appendChild(manualButton);
        document.body.appendChild(buttonContainer);
    }

    setupUI();
})();
