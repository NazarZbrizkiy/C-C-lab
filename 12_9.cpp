#include <iostream>
#include <fstream>
#include <vector>

using namespace std;

int main() {
    string filename = "numbers.txt";
    ifstream inFile(filename);

    if (!inFile) {
        cout << "Error opening file for reading!" << endl;
        return 1;
    }

    vector<long long> numbers;
    long long num;
    
    while (inFile >> num) {
        numbers.push_back(num);
    }
    inFile.close();

    if (numbers.empty()) {
        cout << "File is empty." << endl;
        return 0;
    }

    for (size_t i = 0; i < numbers.size() - 1; ++i) {
        if (numbers[i] > numbers[i + 1]) {
            numbers[i] = numbers[i] * numbers[i];
        }
    }

    ofstream outFile(filename);
    
    if (!outFile) {
        cout << "Error opening file for writing!" << endl;
        return 1;
    }

    for (size_t i = 0; i < numbers.size(); ++i) {
        outFile << numbers[i] << (i < numbers.size() - 1 ? " " : "");
    }
    outFile.close();

    cout << "File successfully updated." << endl;

    return 0;
}