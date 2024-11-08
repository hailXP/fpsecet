import chess
import chess.engine
import time

ENGINE_PATH = 'patricia.exe'
engine = chess.engine.SimpleEngine.popen_uci(ENGINE_PATH)

engine.configure({"Threads": 6})
def test_depths(engine_path, fen, max_depth):
    with chess.engine.SimpleEngine.popen_uci(engine_path) as engine:
        board = chess.Board(fen)
        
        for depth in range(1, max_depth + 1):
            start_time = time.time()
            _ = engine.analyse(board, chess.engine.Limit(depth=depth), multipv=3)
            duration = time.time() - start_time
            
            print(f"Depth: {depth}, Duration: {duration:.2f}s")

if __name__ == "__main__":
    FEN = "2k2r1r/1ppq1p2/p2p4/3PbR1p/1Q2P3/N4R2/PPP3PP/6K1 b - - 3 19"
    MAX_DEPTH = 12
    test_depths(ENGINE_PATH, FEN, MAX_DEPTH)
