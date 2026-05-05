#include <iostream>
#include <cmath>
#include <iomanip>
#include <string>
#include <vector>
#include <fstream>

using namespace std;

void task1() {
    double x, y;
    
    cout << "Enter x: ";
    cin >> x;
    
    cout << "Enter y: ";
    cin >> y;
    
    double result = pow(x, y);
    
    cout << "Decimal representation: " << fixed << result << "\n";
    cout << "Scientific representation: " << scientific << result << "\n";
}

void task2() {
    int n;
    cout << "Enter n: ";
    cin >> n;
    
    cout << "Enter " << 10 * n << " digits: ";
    string digits;
    cin >> digits;
    
    if (digits.length() < 10 * n) {
        cout << "Error: not enough digits provided.\n";
        return;
    }
    
    vector<unsigned long long> arr(n);
    unsigned long long sum = 0;
    
    for (int i = 0; i < n; ++i) {
        string part = digits.substr(i * 10, 10);
        arr[i] = stoull(part);
        sum += arr[i];
    }
    
    cout << "Sum: " << sum << "\n";
}

void task3() {
    int n;
    cout << "Enter n: ";
    cin >> n;
    
    string border(n * 6 + 1, '+');
    
    cout << border << "\n";
    
    for (int i = 1; i <= n; ++i) {
        cout << setw(6) << i;
    }
    cout << "\n" << border << "\n";
    
    for (int i = 1; i <= n; ++i) {
        double root = sqrt(i);
        if (root == floor(root)) {
            cout << setw(6) << defaultfloat << setprecision(6) << (int)root;
        } else {
            cout << setw(6) << fixed << setprecision(2) << root;
        }
    }
    cout << "\n" << border << "\n";
}

void task4() {
    int n;
    cout << "Enter n: ";
    if (!(cin >> n) || n <= 0) {
        cout << "Invalid input for n.\n";
        return;
    }
    
    vector<int> m(n);
    cout << "Enter " << n << " integers for the array: ";
    for (int i = 0; i < n; ++i) {
        cin >> m[i];
    }
    
    string inFileName, outFileName;
    cout << "Enter input file name: ";
    cin >> inFileName;
    
    ifstream inFile(inFileName);
    if (!inFile.is_open()) {
        cout << "Error: Could not open or find input file.\n";
        return;
    }
    
    vector<double> x(n);
    for (int i = 0; i < n; ++i) {
        if (!(inFile >> x[i])) {
            cout << "Error: File data is incorrect or insufficient.\n";
            return;
        }
    }
    inFile.close();
    
    cout << "Enter output file name: ";
    cin >> outFileName;
    
    ofstream outFile(outFileName);
    if (!outFile.is_open()) {
        cout << "Error: Could not create output file.\n";
        return;
    }
    
    for (int i = 0; i < n; ++i) {
        outFile << pow(x[i], m[i]) << " ";
    }
    outFile.close();
    
    cout << "Success: Data written to output file.\n";
}

void task5() {
    vector<unsigned long long> numbers;
    unsigned long long temp;
    
    cout << "Enter numbers (Ctrl+D or non-number to stop):\n";
    
    while (cin >> temp) {
        numbers.push_back(temp);
    }
    
    cout << fixed << setprecision(3);
    
    for (int i = numbers.size() - 1; i >= 0; --i) {
        cout << sqrt(numbers[i]) << "\n";
    }
}

int main() {
    task2();
    
    return 0;
}