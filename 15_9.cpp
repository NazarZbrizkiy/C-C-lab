#include <iostream>
#include <string>
#include <vector>

using namespace std;

struct Move {
    int dx;
    int dy;
};

class Board {
private:
    int size;
    string gameName;

public:
    Board(int s, const string& name) : size(s), gameName(name) {}

    int getSize() const {
        return size;
    }

    string getGameName() const {
        return gameName;
    }

    bool isMoveValid(int startX, int startY, int dx, int dy) const {
        int newX = startX + dx;
        int newY = startY + dy;
        return (newX >= 0 && newX < size && newY >= 0 && newY < size);
    }

    void print() const {
        cout << "Board for " << gameName << ", Size: " << size << "x" << size << endl;
    }
};

class Figure {
private:
    string name;
    string gameName;
    vector<Move> possibleMoves;

public:
    Figure(const string& n, const string& g) : name(n), gameName(g) {}

    void addMove(int dx, int dy) {
        possibleMoves.push_back({dx, dy});
    }

    void printInfo() const {
        cout << "Figure: " << name << " (" << gameName << ")" << endl;
        cout << "Possible moves (dx, dy): ";
        for (const auto& move : possibleMoves) {
            cout << "[" << move.dx << ", " << move.dy << "] ";
        }
        cout << endl;
    }

    void testMoves(const Board& board, int startX, int startY) const {
        cout << "Testing moves for " << name << " from position (" << startX << ", " << startY << "):\n";
        for (const auto& move : possibleMoves) {
            bool valid = board.isMoveValid(startX, startY, move.dx, move.dy);
            cout << "Move [" << move.dx << ", " << move.dy << "] -> ";
            if (valid) {
                cout << "Valid" << endl;
            } else {
                cout << "Invalid (Out of bounds)" << endl;
            }
        }
    }
};

int main() {
    Board chessBoard(8, "Chess");
    chessBoard.print();
    cout << "-----------------------" << endl;

    Figure knight("Knight", "Chess");
    
    knight.addMove(1, 2);
    knight.addMove(2, 1);
    knight.addMove(-1, 2);
    knight.addMove(-2, 1);
    knight.addMove(1, -2);
    knight.addMove(2, -1);
    knight.addMove(-1, -2);
    knight.addMove(-2, -1);

    knight.printInfo();
    cout << "-----------------------" << endl;

    knight.testMoves(chessBoard, 0, 0);

    return 0;
}