#include <iostream>
#include <fstream>
#include <string>
#include <set>
#include <algorithm>
#include <iterator>

using namespace std;

void createTestFiles() {
    ofstream file1("file1.txt");
    if (file1) {
        file1 << "apple banana orange grape kiwi melon";
        file1.close();
    }

    ofstream file2("file2.txt");
    if (file2) {
        file2 << "banana kiwi mango peach apple plum";
        file2.close();
    }
}

int main() {
    createTestFiles();

    ifstream in1("file1.txt");
    ifstream in2("file2.txt");

    if (!in1.is_open() || !in2.is_open()) {
        cout << "Error opening input files.\n";
        return 1;
    }

    set<string> set1;
    set<string> set2;
    string word;

    while (in1 >> word) {
        set1.insert(word);
    }
    
    while (in2 >> word) {
        set2.insert(word);
    }

    in1.close();
    in2.close();

    cout << "--- Common words (Intersection) ---\n";
    set_intersection(set1.begin(), set1.end(),
                     set2.begin(), set2.end(),
                     ostream_iterator<string>(cout, "\n"));

    cout << "\n--- Uncommon words (Symmetric Difference) ---\n";
    set_symmetric_difference(set1.begin(), set1.end(),
                             set2.begin(), set2.end(),
                             ostream_iterator<string>(cout, "\n"));

    return 0;
}