#include <iostream>
#include <string>
#include <vector>

using namespace std;

void task1() {
    string str;
    cout << "Enter string for task 1: ";
    getline(cin, str);

    int posColon = str.find(':');
    if (posColon != -1) {
        int posComma = str.find(',', posColon + 1);
        if (posComma != -1) {
            str = str.substr(posColon + 1, posComma - posColon - 1);
        } else {
            str = str.substr(posColon + 1);
        }
    }

    cout << "Result: " << str << "\n\n";
}

void task2() {
    string str;
    cout << "Enter string for task 2: ";
    getline(cin, str);

    int firstDot = str.find('.');
    int lastDot = str.rfind('.');

    if (firstDot == -1) {
        int i = 0;
        while (i < str.length() && str[i] == ' ') {
            i++;
        }
        str = str.substr(i);
    } else if (firstDot == lastDot) {
        str.erase(0, firstDot);
    } else {
        // Видаляємо від наступного символу після першої крапки 
        // і захоплюємо другу крапку, щоб не було дублювання
        str.erase(firstDot + 1, lastDot - firstDot);
    }

    cout << "Result: " << str << "\n\n";
}

void task3() {
    string str;
    cout << "Enter string for task 3: ";
    getline(cin, str);

    string res = "";
    for (int i = 0; i < str.length(); i++) {
        bool isLastInWord = false;
        
        if (str[i] != ' ') {
            if (i == str.length() - 1 || str[i + 1] == ' ') {
                isLastInWord = true;
            }
        }
        
        if (!isLastInWord) {
            res += str[i];
        }
    }

    cout << "Result: " << res << "\n\n";
}

void task6() {
    string str;
    cout << "Enter string for task 6: ";
    getline(cin, str);

    vector<string> words;
    string currentWord = "";
    
    for (int i = 0; i < str.length(); i++) {
        if (str[i] != ' ') {
            currentWord += str[i];
        } else {
            if (currentWord != "") {
                words.push_back(currentWord);
                currentWord = "";
            }
        }
    }
    
    if (currentWord != "") {
        words.push_back(currentWord);
    }

    if (words.empty()) {
        cout << "No words found\n\n";
        return;
    }

    int minLen = words[0].length();
    for (int i = 1; i < words.size(); i++) {
        if (words[i].length() < minLen) {
            minLen = words[i].length();
        }
    }

    string firstWord = "";
    string lastWord = "";

    for (int i = 0; i < words.size(); i++) {
        if (words[i].length() == minLen) {
            if (firstWord == "") {
                firstWord = words[i];
            }
            lastWord = words[i];
        }
    }

    cout << "a) First shortest: " << firstWord << "\n";
    cout << "b) Last shortest: " << lastWord << "\n";
    cout << "c) All shortest: ";
    
    for (int i = 0; i < words.size(); i++) {
        if (words[i].length() == minLen) {
            cout << words[i] << " ";
        }
    }
    cout << "\n\n";
}

int main() {
    task6();
  
    
    return 0;
}