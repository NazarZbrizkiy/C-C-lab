#include <iostream>
#include <vector>
#include <list>
#include <cmath>
#include <stdexcept>
#include <algorithm>

using namespace std;

void task1() {
    int n;
    cout << "Enter number of customers: ";
    cin >> n;
    
    vector<double> t(n);
    cout << "Enter service times for " << n << " customers:\n";
    for(int i = 0; i < n; ++i) {
        cin >> t[i];
    }
    
    vector<double> c(n);
    double current_time = 0;
    int min_t_idx = 0;
    int max_c_idx = 0;
    
    for(int i = 0; i < n; ++i) {
        double arrival = i;
        if (current_time > arrival) {
            c[i] = current_time - arrival;
        } else {
            c[i] = 0;
            current_time = arrival;
        }
        current_time += t[i];
        
        if (t[i] < t[min_t_idx]) {
            min_t_idx = i;
        }
        if (c[i] > c[max_c_idx]) {
            max_c_idx = i;
        }
    }
    
    cout << "Queue wait times: ";
    for(int i = 0; i < n; ++i) {
        cout << c[i] << " ";
    }
    cout << "\nCustomer with minimum service time: " << (min_t_idx + 1) << "\n";
    cout << "Customer with maximum wait time: " << (max_c_idx + 1) << "\n";
}

void task2() {
    int d, n;
    cout << "Enter dimension d: ";
    cin >> d;
    cout << "Enter number of vectors n: ";
    cin >> n;
    
    double sum_norms = 0;
    for(int i = 0; i < n; ++i) {
        cout << "Enter elements for vector " << i + 1 << ": ";
        double norm_sq = 0;
        for(int j = 0; j < d; ++j) {
            double val;
            cin >> val;
            norm_sq += val * val;
        }
        sum_norms += sqrt(norm_sq);
    }
    
    cout << "Sum of vector norms: " << sum_norms << "\n";
}

class RationalFraction {
    int numerator;
    int denominator;
public:
    RationalFraction(int num = 0, int den = 1) : numerator(num), denominator(den) {
        if (den == 0) throw invalid_argument("Denominator is zero");
    }
    
    RationalFraction operator+(const RationalFraction& o) const {
        return RationalFraction(numerator * o.denominator + o.numerator * denominator, 
                                denominator * o.denominator);
    }
    
    RationalFraction operator*(const RationalFraction& o) const {
        return RationalFraction(numerator * o.numerator, denominator * o.denominator);
    }
    
    friend istream& operator>>(istream& is, RationalFraction& f) {
        is >> f.numerator >> f.denominator;
        if (f.denominator == 0) throw invalid_argument("Denominator is zero");
        return is;
    }
    
    friend ostream& operator<<(ostream& os, const RationalFraction& f) {
        os << f.numerator << "/" << f.denominator;
        return os;
    }
};

template <typename T>
class Polynomial {
    list<T> coeffs;
public:
    void input(int degree) {
        coeffs.clear();
        for(int i = 0; i <= degree; ++i) {
            T val;
            cin >> val;
            coeffs.push_back(val);
        }
    }
    
    void print() const {
        int deg = 0;
        for(auto it = coeffs.begin(); it != coeffs.end(); ++it, ++deg) {
            cout << *it;
            if (deg > 0) cout << "x^" << deg;
            auto next = it;
            if (++next != coeffs.end()) cout << " + ";
        }
        cout << "\n";
    }
    
    Polynomial<T> operator+(const Polynomial<T>& other) const {
        Polynomial<T> res;
        auto it1 = coeffs.begin();
        auto it2 = other.coeffs.begin();
        while(it1 != coeffs.end() || it2 != other.coeffs.end()) {
            T sum = T(0);
            if (it1 != coeffs.end()) { 
                sum = sum + *it1; 
                ++it1; 
            }
            if (it2 != other.coeffs.end()) { 
                sum = sum + *it2; 
                ++it2; 
            }
            res.coeffs.push_back(sum);
        }
        return res;
    }
    
    Polynomial<T> operator*(const Polynomial<T>& other) const {
        vector<T> v1(coeffs.begin(), coeffs.end());
        vector<T> v2(other.coeffs.begin(), other.coeffs.end());
        vector<T> v3(v1.size() + v2.size() - 1, T(0));
        
        for(size_t i = 0; i < v1.size(); ++i) {
            for(size_t j = 0; j < v2.size(); ++j) {
                v3[i+j] = v3[i+j] + (v1[i] * v2[j]);
            }
        }
        
        Polynomial<T> res;
        res.coeffs.assign(v3.begin(), v3.end());
        return res;
    }
    
    T evaluate(T x) const {
        T res = T(0);
        T current_x = T(1);
        for(auto it = coeffs.begin(); it != coeffs.end(); ++it) {
            res = res + (*it) * current_x;
            current_x = current_x * x;
        }
        return res;
    }
};

template<typename T>
void testPolynomial(const string& typeName) {
    Polynomial<T> p1, p2;
    int d1, d2;
    
    cout << "--- Testing " << typeName << " Polynomial ---\n";
    cout << "Degree of Poly 1: "; cin >> d1;
    cout << "Enter " << d1 + 1 << " coefficients (lowest to highest): "; 
    p1.input(d1);
    
    cout << "Degree of Poly 2: "; cin >> d2;
    cout << "Enter " << d2 + 1 << " coefficients (lowest to highest): "; 
    p2.input(d2);
    
    Polynomial<T> sum = p1 + p2;
    Polynomial<T> prod = p1 * p2;
    
    cout << "Poly 1: "; p1.print();
    cout << "Poly 2: "; p2.print();
    cout << "Sum: "; sum.print();
    cout << "Product: "; prod.print();
    
    T x;
    cout << "Enter x to evaluate Poly 1: "; 
    cin >> x;
    cout << "Poly 1 at x = " << p1.evaluate(x) << "\n\n";
}

void task3() {
    try {
        testPolynomial<double>("Double");
        testPolynomial<int>("Integer");
        testPolynomial<RationalFraction>("Rational Fraction (format: num den)");
    } catch(const exception& e) {
        cout << "Error in task 3: " << e.what() << "\n";
    }
}

void task4() {
    int n, m;
    cout << "Enter matrix dimensions n and m (<100): ";
    cin >> n >> m;
    
    if (n >= 100 || m >= 100) {
        cout << "Dimensions must be < 100\n";
        return;
    }
    
    vector<list<double>> mat(n);
    vector<pair<double, int>> maxes(n);
    
    for(int i = 0; i < n; ++i) {
        cout << "Enter " << m << " elements for row " << i + 1 << ": ";
        double r_max = 0;
        for(int j = 0; j < m; ++j) {
            double val;
            cin >> val;
            mat[i].push_back(val);
            if (j == 0 || val > r_max) {
                r_max = val;
            }
        }
        maxes[i] = {r_max, i};
    }
    
    sort(maxes.begin(), maxes.end(), [](const pair<double, int>& a, const pair<double, int>& b) {
        return a.first > b.first;
    });
    
    vector<list<double>> sorted_mat(n);
    for(int i = 0; i < n; ++i) {
        sorted_mat[i] = mat[maxes[i].second];
    }
    
    cout << "Sorted matrix (by max row element descending):\n";
    for(int i = 0; i < n; ++i) {
        for(auto it = sorted_mat[i].begin(); it != sorted_mat[i].end(); ++it) {
            cout << *it << " ";
        }
        cout << "\n";
    }
}

int main() {
    int choice;
    cout << "Select task to run (1-4, 0 to exit): ";
    
    while (cin >> choice && choice != 0) {
        switch (choice) {
            case 1:
                cout << "\n--- Running Task 1 ---\n";
                task1();
                break;
            case 2:
                cout << "\n--- Running Task 2 ---\n";
                task2();
                break;
            case 3:
                cout << "\n--- Running Task 3 ---\n";
                task3();
                break;
            case 4:
                cout << "\n--- Running Task 4 ---\n";
                task4();
                break;
            default:
                cout << "Invalid choice.\n";
                break;
        }
        cout << "\nSelect task to run (1-4, 0 to exit): ";
    }
    
    return 0;
}