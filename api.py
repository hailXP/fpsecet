from flask import Flask, request, jsonify
from flask_cors import CORS
import chess
import chess.engine

app = Flask(__name__)
CORS(app)

ENGINE_PATH = "stockfish.exe"
engine = chess.engine.SimpleEngine.popen_uci(ENGINE_PATH)

depth = 12
multipv = 3
limit = chess.engine.Limit(depth=depth)

def update_engine_config(depth=depth, pv=multipv):
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

    if not move_list:
        board = chess.Board(fen)
        result = engine.analyse(board=board, limit=limit, multipv=multipv)

        eval_list = []
        move_list = []
        for res in result:
            if res['score'].is_mate():
                eval_list.append(f"M{res['score'].white().mate()}")
            else:
                eval_list.append(round(res['score'].white().score()/100, 2))
            move_list.append(res['pv'][0].uci())

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
