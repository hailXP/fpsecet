from flask import Flask, request, jsonify
from flask_cors import CORS
import chess
import chess.engine

app = Flask(__name__)
CORS(app)

ENGINE_PATH = "Patricia.exe"
engine = chess.engine.SimpleEngine.popen_uci(ENGINE_PATH)

depth = 9
multipv = 3
limit = chess.engine.Limit(depth=depth)

def update_engine_config(depth, pv):
    global limit, multipv

    limit = chess.engine.Limit(depth=depth)
    multipv = pv

@app.route('/configure', methods=['POST'])
def configure():
    data = request.json
    new_depth = data.get('depth')
    new_multipv = data.get('multipv')

    if new_depth is not None:
        depth = int(new_depth)
    if new_multipv is not None:
        multipv = int(new_multipv)

    update_engine_config(depth, multipv)

    return jsonify({'message': 'Configuration updated successfully', 'depth': depth, 'multipv': multipv}), 200

@app.route('/lich', methods=['POST'])
def lich():
    data = request.json
    fen = data.get('fen')
    if not fen:
        return jsonify({'error': 'No FEN provided'}), 400

    move_list = []
    eval_list = []

    board = chess.Board(fen)
    result = engine.analyse(board=board, limit=limit, multipv=multipv)

    for res in result:
        if res['score'].is_mate():
            mate_score = res['score'].white().mate()
            eval_list.append(f"M{mate_score}")
        else:
            eval_score = res['score'].white().score() / 100.0
            eval_list.append(round(eval_score, 2))
        move_list.append(res['pv'][0].uci())

    # Get side to move ('w' or 'b')
    side_to_move = fen.split()[1]

    # Combine evals and moves into a list of tuples
    entries = list(zip(eval_list, move_list))

    # Function to convert evals to numerical values for sorting
    def eval_to_sort_value(eval_str, side_to_move):
        if isinstance(eval_str, str) and eval_str.startswith('M'):
            mate_in = int(eval_str[1:])
            if side_to_move == 'w':
                # For White to move, positive mate_in is good
                return -float('inf') + mate_in if mate_in > 0 else float('inf') + mate_in
            else:
                # For Black to move, negative mate_in is good
                return -float('inf') - mate_in if mate_in < 0 else float('inf') - mate_in
        else:
            return eval_str

    # Sort entries based on side to move
    entries.sort(key=lambda x: eval_to_sort_value(x[0], side_to_move), reverse=(side_to_move == 'w'))

    # Unpack sorted entries back into eval_list and move_list
    eval_list_sorted = [x[0] for x in entries]
    move_list_sorted = [x[1] for x in entries]

    # Remove evaluations with absolute value greater than 100
    filtered_evals = []
    filtered_moves = []
    for eval_val, move in zip(eval_list_sorted, move_list_sorted):
        if isinstance(eval_val, str) and eval_val.startswith('M'):
            filtered_evals.append(eval_val)
            filtered_moves.append(move)
        elif abs(eval_val) <= 100:
            filtered_evals.append(eval_val)
            filtered_moves.append(move)

    return_data = {
        'bestMoves': filtered_moves,
        'evals': filtered_evals,
    }

    return jsonify(return_data)

@app.route('/')
def index():
    return jsonify({'message': 'Ping!'})

if __name__ == '__main__':
    app.run(debug=False)
