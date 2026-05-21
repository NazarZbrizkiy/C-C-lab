#include <iostream>
#include <fstream>
#include <string>
#include <vector>
#include <sstream>
#include <stdexcept>

using namespace std;

class TextFileManager {
    string filename;
    int numCount;
    int lineCount;

    void updateStats() {
        ifstream file(filename);
        if (!file.is_open()) {
            numCount = 0;
            lineCount = 0;
            return;
        }
        numCount = 0;
        lineCount = 0;
        string line;
        while (getline(file, line)) {
            lineCount++;
            stringstream ss(line);
            string token;
            while (ss >> token) {
                try {
                    size_t pos;
                    stod(token, &pos);
                    if (pos != token.length()) {
                        throw invalid_argument("Non-real number encountered in file.");
                    }
                    numCount++;
                } catch (...) {
                    throw invalid_argument("Non-real number encountered in file.");
                }
            }
        }
    }

public:
    TextFileManager(string fn) : filename(fn), numCount(0), lineCount(0) {
        updateStats();
    }

    void inputFromConsole() {
        ofstream file(filename);
        if (!file.is_open()) throw runtime_error("Problem creating file.");
        
        cout << "Enter lines of real numbers (type 'STOP' to end):\n";
        string line;
        while (getline(cin, line) && line != "STOP") {
            stringstream ss(line);
            string token;
            while (ss >> token) {
                try {
                    size_t pos;
                    stod(token, &pos);
                    if (pos != token.length()) {
                        throw invalid_argument("Invalid input: not a real number.");
                    }
                } catch (...) {
                    throw invalid_argument("Invalid input: not a real number.");
                }
            }
            file << line << "\n";
        }
        file.close();
        updateStats();
    }

    void createFrom2DArray(const vector<vector<double>>& arr) {
        ofstream file(filename);
        if (!file.is_open()) throw runtime_error("Problem creating file.");
        for (size_t i = 0; i < arr.size(); ++i) {
            for (size_t j = 0; j < arr[i].size(); ++j) {
                file << arr[i][j] << (j == arr[i].size() - 1 ? "" : " ");
            }
            file << "\n";
        }
        file.close();
        updateStats();
    }

    double printAndGetByIndex(int index) {
        ifstream file(filename);
        if (!file.is_open()) throw runtime_error("Problem reading from file.");
        
        cout << "--- File Content ---\n";
        string line;
        vector<double> allNums;
        while (getline(file, line)) {
            cout << line << "\n";
            stringstream ss(line);
            string token;
            while (ss >> token) {
                try {
                    size_t pos;
                    double val = stod(token, &pos);
                    if (pos != token.length()) {
                        throw invalid_argument("Non-real number encountered in file.");
                    }
                    allNums.push_back(val);
                } catch (...) {
                    throw invalid_argument("Non-real number encountered in file.");
                }
            }
        }
        cout << "--------------------\n";
        
        if (index < 0 || index >= allNums.size()) {
            throw out_of_range("Invalid number index.");
        }
        return allNums[index];
    }

    void appendArray(const vector<double>& arr) {
        ofstream file(filename, ios::app);
        if (!file.is_open()) throw runtime_error("Problem opening file for appending.");
        
        for (size_t i = 0; i < arr.size(); ++i) {
            file << arr[i] << (i == arr.size() - 1 ? "" : " ");
        }
        file << "\n";
        file.close();
        updateStats();
    }

    void deleteNumber(int rowIndex, int colIndex) {
        ifstream file(filename);
        if (!file.is_open()) throw runtime_error("Problem reading from file.");

        vector<vector<double>> data;
        string line;
        while (getline(file, line)) {
            vector<double> rowData;
            stringstream ss(line);
            string token;
            while (ss >> token) {
                try {
                    size_t pos;
                    double val = stod(token, &pos);
                    if (pos != token.length()) {
                        throw invalid_argument("Non-real number encountered in file.");
                    }
                    rowData.push_back(val);
                } catch (...) {
                    throw invalid_argument("Non-real number encountered in file.");
                }
            }
            data.push_back(rowData);
        }
        file.close();

        if (rowIndex < 0 || rowIndex >= data.size()) {
            throw out_of_range("Invalid row index.");
        }
        if (colIndex < 0 || colIndex >= data[rowIndex].size()) {
            throw out_of_range("Invalid position in row.");
        }

        data[rowIndex].erase(data[rowIndex].begin() + colIndex);

        if (data[rowIndex].empty()) {
            data.erase(data.begin() + rowIndex);
        }

        createFrom2DArray(data);
    }

    void printStats() const {
        cout << "Statistics -> File: " << filename 
             << " | Lines: " << lineCount 
             << " | Numbers: " << numCount << "\n";
    }
};

int main() {
    try {
        TextFileManager manager("numbers.txt");

        vector<vector<double>> initialData = {
            {1.1, 2.5, 3.8},
            {4.0, -5.2},
            {6.7, 7.1, 8.9, 9.3}
        };
        cout << "Creating file from 2D array...\n";
        manager.createFrom2DArray(initialData);
        manager.printStats();

        int targetIndex = 4;
        cout << "\nFetching number at index " << targetIndex << "...\n";
        double val = manager.printAndGetByIndex(targetIndex);
        cout << "Value at index " << targetIndex << ": " << val << "\n";

        cout << "\nAppending new array...\n";
        vector<double> newRow = {10.5, 11.0, 12.75};
        manager.appendArray(newRow);
        manager.printStats();

        cout << "\nDeleting number at row 1, col 0...\n";
        manager.deleteNumber(1, 0);
        manager.printStats();

        cout << "\nFinal file state:\n";
        manager.printAndGetByIndex(0);

    } catch (const exception& e) {
        cout << "Exception caught: " << e.what() << "\n";
    }

    return 0;
}