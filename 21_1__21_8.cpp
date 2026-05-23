#include <iostream>
#include <vector>
#include <list>
#include <algorithm>
#include <ctime>
#include <string>
#include <cctype>
#include <iterator>
#include <sstream>

using namespace std;

class BoolVector {
    vector<bool> v;

public:
    BoolVector() {}
    
    BoolVector(const vector<bool>& vec) : v(vec) {}

    BoolVector operator&(const BoolVector& other) const {
        size_t min_s = min(v.size(), other.v.size());
        vector<bool> res(min_s);
        for (size_t i = 0; i < min_s; ++i) {
            res[i] = v[i] && other.v[i];
        }
        return BoolVector(res);
    }

    BoolVector operator|(const BoolVector& other) const {
        size_t max_s = max(v.size(), other.v.size());
        vector<bool> res(max_s, false);
        for (size_t i = 0; i < v.size(); ++i) res[i] = res[i] || v[i];
        for (size_t i = 0; i < other.v.size(); ++i) res[i] = res[i] || other.v[i];
        return BoolVector(res);
    }

    BoolVector operator~() const {
        vector<bool> res(v.size());
        for (size_t i = 0; i < v.size(); ++i) {
            res[i] = !v[i];
        }
        return BoolVector(res);
    }

    int countOnes() const {
        int c = 0;
        for (bool b : v) {
            if (b) c++;
        }
        return c;
    }

    int countZeros() const {
        int c = 0;
        for (bool b : v) {
            if (!b) c++;
        }
        return c;
    }

    void print() const {
        for (bool b : v) {
            cout << b;
        }
        cout << "\n";
    }
};

void task1() {
    vector<bool> vb1 = {true, false, true, true};
    vector<bool> vb2 = {false, false, true, false, true};
    
    BoolVector bv1(vb1);
    BoolVector bv2(vb2);

    cout << "Vector 1: "; bv1.print();
    cout << "Vector 2: "; bv2.print();

    cout << "Conjunction (AND): "; (bv1 & bv2).print();
    cout << "Disjunction (OR): "; (bv1 | bv2).print();
    cout << "Negation (NOT V1): "; (~bv1).print();
    
    cout << "V1 Ones: " << bv1.countOnes() << ", Zeros: " << bv1.countZeros() << "\n";
}

void task2() {
    list<int> lst;
    int n, val, x;
    
    cout << "Enter number of elements: ";
    cin >> n;
    
    cout << "Enter " << n << " elements: ";
    for (int i = 0; i < n; ++i) {
        cin >> val;
        lst.push_back(val);
    }
    
    cout << "Enter X: ";
    cin >> x;

    partition(lst.begin(), lst.end(), [x](int a) { return a <= x; });

    cout << "Rearranged list: ";
    for (int v : lst) {
        cout << v << " ";
    }
    cout << "\n";
}

struct Task3Result {
    long long sumMax;
    vector<int> minArray;
};

Task3Result processVector(const vector<int>& vec, size_t k) {
    if (k > vec.size()) {
        return {0, vector<int>()};
    }
    
    vector<int> vecCopy = vec;
    sort(vecCopy.begin(), vecCopy.end());
    
    vector<int> mins(vecCopy.begin(), vecCopy.begin() + k);
    
    long long sum = 0;
    for (size_t i = vecCopy.size() - k; i < vecCopy.size(); ++i) {
        sum += vecCopy[i];
    }
    
    return {sum, mins};
}

void task3() {
    int n;
    size_t k;
    cout << "Enter number of elements in vector: ";
    cin >> n;
    
    vector<int> vec(n);
    cout << "Enter elements: ";
    for (int i = 0; i < n; ++i) {
        cin >> vec[i];
    }
    
    cout << "Enter k: ";
    cin >> k;
    
    Task3Result res = processVector(vec, k);
    
    cout << "Sum of largest " << k << " elements: " << res.sumMax << "\n";
    cout << "Array of smallest " << k << " elements: ";
    if (res.minArray.empty()) {
        cout << "[Empty]\n";
    } else {
        for (int v : res.minArray) cout << v << " ";
        cout << "\n";
    }
}

clock_t clockGenerator() {
    for (volatile int i = 0; i < 1000000; ++i); 
    return clock();
}

void task4() {
    list<clock_t> clk_list;
    generate_n(back_inserter(clk_list), 10, clockGenerator);
    
    clk_list.sort();
    clk_list.unique();
    
    cout << "Unique clock_t values: ";
    copy(clk_list.begin(), clk_list.end(), ostream_iterator<clock_t>(cout, " "));
    cout << "\n";
}

void task5() {
    string s;
    cout << "Enter a string: ";
    cin.ignore();
    getline(cin, s);
    
    transform(s.begin(), s.end(), s.begin(), [](unsigned char c) { return toupper(c); });
    
    cout << "Uppercase string: " << s << "\n";
}

template <typename T>
struct Sum {
    T total;
    Sum() : total(0) {}
    void operator()(T val) {
        total += val;
    }
};

void task6() {
    int n;
    cout << "Enter number of elements to sum: ";
    cin >> n;
    
    vector<double> v(n);
    cout << "Enter elements: ";
    for (int i = 0; i < n; ++i) {
        cin >> v[i];
    }
    
    Sum<double> s = for_each(v.begin(), v.end(), Sum<double>());
    cout << "Accumulated sum: " << s.total << "\n";
}

void task7() {
    string word;
    cout << "Enter a word for permutations: ";
    cin >> word;
    
    sort(word.begin(), word.end());
    
    cout << "Permutations:\n";
    do {
        cout << word << "\n";
    } while (next_permutation(word.begin(), word.end()));
}

void task8() {
    string sentence;
    cout << "Enter a sentence for word permutations: ";
    cin.ignore();
    getline(cin, sentence);
    
    vector<string> words;
    stringstream ss(sentence);
    string w;
    while (ss >> w) {
        words.push_back(w);
    }
    
    sort(words.begin(), words.end());
    
    cout << "Sentence Permutations:\n";
    do {
        for (size_t i = 0; i < words.size(); ++i) {
            cout << words[i] << (i == words.size() - 1 ? "" : " ");
        }
        cout << "\n";
    } while (next_permutation(words.begin(), words.end()));
}

int main() {
    task1();

return 0;
}