#include <iostream>
#include <string>
#include <vector>

using namespace std;

template <typename T>
T sum(T* x, size_t n) {
    T res = T();
    for (size_t i = 0; i < n; ++i) {
        res += x[i];
    }
    return res;
}

string sum(char* x, size_t n) {
    string res = "";
    for (size_t i = 0; i < n; ++i) {
        res += x[i];
    }
    return res;
}

template <typename T>
vector<T> sum(T** x, size_t n) {
    vector<T> res;
    for (size_t i = 0; i < n; ++i) {
        if (x[i] != nullptr) {
            res.push_back(x[i][0]);
        }
    }
    return res;
}

template <typename T>
ostream& operator<<(ostream& os, const vector<T>& v) {
    os << "{";
    for (size_t i = 0; i < v.size(); ++i) {
        os << v[i];
        if (i < v.size() - 1) os << ",";
    }
    os << "}";
    return os;
}

void task9() {
    int v1[] = { 1, 2, 3 };
    cout << "sum(v1,3) = " << sum(v1, 3) << "\n";

    double v2[] = { 1.0, 2.0, 3.0 };
    cout << "sum(v2,3) = " << sum(v2, 3) << "\n";

    string v3[] = { "a", "bc", "def" };
    cout << "sum(v3,3) = \"" << sum(v3, 3) << "\"\n";

    char v4[] = { 'a', 'b', 'c' };
    cout << "sum(v4,3) = \"" << sum(v4, 3) << "\"\n";

    int a1[] = {1, 4};
    int a2[] = {2};
    int a3[] = {3};
    int* v5[] = { a1, a2, a3 };
    cout << "sum(v5,3) = " << sum(v5, 3) << "\n";
    
    int* v6[] = { a1, nullptr, a3 };
    cout << "sum(v6,3) with nullptr = " << sum(v6, 3) << "\n";
}

int main() {
    task9();
    return 0;
}