#include <iostream>
#include <string>
#include <cctype>

using namespace std;

int main() {
    string text;
    string target;

    cout << "Enter the text: ";
    getline(cin, text);

    cout << "Enter the target string: ";
    getline(cin, target);

    int substring_count = 0;
    size_t pos = 0;
    
    while ((pos = text.find(target, pos)) != string::npos) {
        substring_count++;
        pos += target.length();
    }

    int word_count = 0;
    pos = 0;
    
    while ((pos = text.find(target, pos)) != string::npos) {
        bool is_start_word = (pos == 0 || text[pos - 1] == ' ' || ispunct(text[pos - 1]));
        bool is_end_word = (pos + target.length() == text.length() || text[pos + target.length()] == ' ' || ispunct(text[pos + target.length()]));

        if (is_start_word && is_end_word) {
            word_count++;
        }
        pos += target.length();
    }

    cout << "Substring occurrences: " << substring_count << endl;
    cout << "Word occurrences: " << word_count << endl;

    return 0;
}