from flask import Flask, request, jsonify
from flask_cors import CORS
import chess
import chess.engine

app = Flask(__name__)
CORS(app)

ENGINE_PATH = "Patricia.exe"
engine = chess.engine.SimpleEngine.popen_uci(ENGINE_PATH)

depth = 8
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
    player_color = data.get('color', 'white').lower()
    if not fen:
        return jsonify({'error': 'No FEN provided'}), 400

    board = chess.Board(fen)
    result = engine.analyse(board=board, limit=limit, multipv=multipv)

    moves_evaluations = []

    for res in result:
        if res['score'].is_mate():
            mate_in = res['score'].white().mate() if player_color == 'white' else res['score'].black().mate()
            eval_score = f"M{mate_in}"
            score_value = -abs(mate_in)
        else:
            eval_score = round(res['score'].white().score() / 100, 2) if player_color == 'white' else round(res['score'].black().score() / 100, 2)
            score_value = eval_score

        move_uci = res['pv'][0].uci()
        moves_evaluations.append((move_uci, eval_score, score_value))

    moves_evaluations.sort(key=lambda x: (x[2] < 0, x[2] if player_color == 'white' else -x[2]))

    move_list = [move[0] for move in moves_evaluations]
    eval_list = [move[1] for move in moves_evaluations]

    return_data = {
        'bestMoves': move_list,
        'evals': eval_list,
    }

    return jsonify(return_data)

@app.route('/')
def index():
    return jsonify({'message': 'Ping!'})

if __name__ == '__main__':
    app.run(debug=False)
