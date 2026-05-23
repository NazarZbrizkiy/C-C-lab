#include <iostream>
#include <vector>
#include <algorithm>
#include <numeric>
#include <functional>
#include <stdexcept>

using namespace std;

template <typename T>
class Matrix {
    vector<vector<T>> data;

public:
    Matrix(size_t rows, size_t cols, T init_val = T()) : data(rows, vector<T>(cols, init_val)) {}
    
    Matrix(const vector<vector<T>>& v) : data(v) {}

    friend ostream& operator<<(ostream& os, const Matrix<T>& m) {
        for (const auto& row : m.data) {
            for (const auto& el : row) {
                os << el << "\t";
            }
            os << "\n";
        }
        return os;
    }

    Matrix<T> operator+(const Matrix<T>& other) const {
        if (data.size() != other.data.size() || data[0].size() != other.data[0].size()) {
            throw invalid_argument("Matrix dimensions must match for addition.");
        }
        Matrix<T> result(data.size(), data[0].size());
        for (size_t i = 0; i < data.size(); ++i) {
            transform(data[i].begin(), data[i].end(), other.data[i].begin(), result.data[i].begin(), plus<T>());
        }
        return result;
    }

    vector<T> operator*(const vector<T>& vec) const {
        if (data[0].size() != vec.size()) {
            throw invalid_argument("Matrix columns must match vector size.");
        }
        vector<T> result(data.size());
        for (size_t i = 0; i < data.size(); ++i) {
            result[i] = inner_product(data[i].begin(), data[i].end(), vec.begin(), T(0));
        }
        return result;
    }

    Matrix<T> operator*(const Matrix<T>& other) const {
        if (data[0].size() != other.data.size()) {
            throw invalid_argument("Matrix A columns must match Matrix B rows.");
        }
        Matrix<T> result(data.size(), other.data[0].size());
        
        vector<vector<T>> transposed(other.data[0].size(), vector<T>(other.data.size()));
        for (size_t i = 0; i < other.data.size(); ++i) {
            for (size_t j = 0; j < other.data[0].size(); ++j) {
                transposed[j][i] = other.data[i][j];
            }
        }

        for (size_t i = 0; i < data.size(); ++i) {
            for (size_t j = 0; j < transposed.size(); ++j) {
                result.data[i][j] = inner_product(data[i].begin(), data[i].end(), transposed[j].begin(), T(0));
            }
        }
        return result;
    }
};

template <typename T>
ostream& operator<<(ostream& os, const vector<T>& v) {
    os << "[ ";
    for (const auto& el : v) {
        os << el << " ";
    }
    os << "]\n";
    return os;
}

void task12() {
    try {
        cout << "--- Testing Matrix<int> ---\n";
        vector<vector<int>> v1 = {{1, 2}, {3, 4}};
        vector<vector<int>> v2 = {{5, 6}, {7, 8}};
        
        Matrix<int> m1(v1);
        Matrix<int> m2(v2);
        
        cout << "Matrix 1:\n" << m1;
        cout << "Matrix 2:\n" << m2;
        
        cout << "Matrix 1 + Matrix 2:\n" << m1 + m2;
        
        vector<int> vecInt = {2, 3};
        cout << "Vector:\n" << vecInt;
        cout << "Matrix 1 * Vector:\n" << m1 * vecInt;
        
        cout << "Matrix 1 * Matrix 2:\n" << m1 * m2;

        cout << "\n--- Testing Matrix<float> ---\n";
        vector<vector<float>> v3 = {{1.5f, 2.5f}, {3.5f, 4.5f}};
        vector<vector<float>> v4 = {{0.5f, 1.5f}, {2.5f, 3.5f}};
        
        Matrix<float> m3(v3);
        Matrix<float> m4(v4);
        
        cout << "Matrix 3:\n" << m3;
        cout << "Matrix 4:\n" << m4;
        
        cout << "Matrix 3 + Matrix 4:\n" << m3 + m4;
        
        vector<float> vecFloat = {1.0f, 2.0f};
        cout << "Vector:\n" << vecFloat;
        cout << "Matrix 3 * Vector:\n" << m3 * vecFloat;
        
        cout << "Matrix 3 * Matrix 4:\n" << m3 * m4;

    } catch (const exception& e) {
        cout << "Error: " << e.what() << "\n";
    }
}

int main() {
    task12();
    return 0;
}