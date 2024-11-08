from flask import Flask, request, jsonify
from flask_cors import CORS
import chess
import chess.engine

app = Flask(__name__)
CORS(app)

ENGINE_PATH = "Patricia.exe"
engine = chess.engine.SimpleEngine.popen_uci(ENGINE_PATH)
engine.configure({"Threads": 6})


limit = chess.engine.Limit(depth=12)

@app.route('/lich', methods=['POST'])
def lich():
    data = request.json
    fen = data.get('fen')
    if not fen:
        return jsonify({'error': 'No FEN provided'}), 400
    
    # params = {
    #     'variant': 'standard',
    #     'fen': fen,
    #     'speeds': 'bullet,blitz,rapid,classical,correspondence',
    #     'ratings': '1000,1200,1400,1600,1800,2000,2200,2500',
    #     'source': 'analysis',
    # }
    
    # response = requests.get('https://explorer.lichess.ovh/lichess', params=params)
    
    move_list = []
    eval_list = []

    # moves = response.json().get('moves')
    # move_list = [move['uci'] for move in moves]
    if not move_list:
        board = chess.Board(fen)
        result = engine.analyse(board=board, limit=limit, multipv=3)

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
