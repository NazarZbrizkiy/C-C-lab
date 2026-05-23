#include <iostream>
#include <fstream>
#include <string>
#include <map>
#include <set>
#include <vector>
#include <cmath>
#include <algorithm>
#include <cctype>

using namespace std;

void task1() {
    ifstream checkFile("input_text.txt");
    if (!checkFile) {
        ofstream newFile("input_text.txt");
        newFile << "Apple banana Apple orange Banana apple orange grape!";
        newFile.close();
        cout << "Created default 'input_text.txt' for testing.\n";
    } else {
        checkFile.close();
    }

    ifstream file("input_text.txt");
    if (!file) {
        cout << "Error opening input_text.txt\n";
        return;
    }

    map<string, int> wordFrequency;
    string word;

    while (file >> word) {
        string cleanWord = "";
        for (char c : word) {
            if (isalpha(c)) {
                cleanWord += c;
            }
        }
        if (!cleanWord.empty()) {
            wordFrequency[cleanWord]++;
        }
    }
    file.close();

    cout << "Word frequencies (case-sensitive):\n";
    for (const auto& pair : wordFrequency) {
        cout << pair.first << ": " << pair.second << "\n";
    }
}

void task2() {
    multiset<double> numbers;
    cout << "Enter numbers (type 'q' to stop):\n";
    double num;
    
    while (cin >> num) {
        numbers.insert(num);
    }
    
    cin.clear();
    string dummy;
    cin >> dummy;

    while (numbers.size() > 1) {
        multiset<double> next_numbers;
        auto it = numbers.begin();
        
        cout << "Current set state: ";
        for (double n : numbers) {
            cout << n << " ";
        }
        cout << "\n";

        while (it != numbers.end()) {
            double v1 = *it;
            ++it;
            if (it != numbers.end()) {
                double v2 = *it;
                next_numbers.insert(v1 + v2);
                ++it;
            } else {
                next_numbers.insert(v1);
            }
        }
        numbers = next_numbers;
    }

    if (!numbers.empty()) {
        cout << "Final result: " << *numbers.begin() << "\n";
    }
}

struct Point {
    int x, y;
};

struct Segment {
    Point p1, p2;
    double length;
};

void task3() {
    ifstream checkFile("points.txt");
    if (!checkFile) {
        ofstream newFile("points.txt");
        newFile << "( 0 , 0 ) ( 3 , 4 ) , ( 1 , 1 ) ( 4 , 5 )";
        newFile.close();
        cout << "Created default 'points.txt' for testing.\n";
    } else {
        checkFile.close();
    }

    ifstream inFile("points.txt");
    if (!inFile) {
        cout << "Error opening points.txt\n";
        return;
    }

    vector<Point> points;
    char ch;
    int x, y;
    
    while (inFile >> ch) {
        if (ch == '(') {
            inFile >> x >> ch >> y >> ch;
            points.push_back({x, y});
        }
    }
    inFile.close();

    vector<Segment> segments;
    for (size_t i = 0; i < points.size(); ++i) {
        for (size_t j = i + 1; j < points.size(); ++j) {
            double len = sqrt(pow(points[i].x - points[j].x, 2) + pow(points[i].y - points[j].y, 2));
            segments.push_back({points[i], points[j], len});
        }
    }

    sort(segments.begin(), segments.end(), [](const Segment& a, const Segment& b) {
        return a.length < b.length;
    });

    ofstream outFile("segments.txt");
    if (!outFile) {
        cout << "Error opening segments.txt for writing\n";
        return;
    }

    for (const auto& seg : segments) {
        outFile << "(" << seg.p1.x << ", " << seg.p1.y << ") to (" 
                << seg.p2.x << ", " << seg.p2.y << ") -> Length: " << seg.length << "\n";
    }
    outFile.close();
    
    cout << "Segments calculated and sorted by length. Written to segments.txt.\n";
}

int main() {
    task3();

    
    return 0;
}